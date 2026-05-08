$(document).ready(function () {

    // Global chart instances and data
    let distChart = null;
    let crsChart = null;
    let dataTable = null;
    let allLeadsData = []; // Store the full data set
    
    const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    // Fetch data from API
    fetchLeadsData();

    async function fetchLeadsData() {
        try {
            const response = await fetch('/api/leads');
            const result = await response.json();

            if (response.ok && result.success) {
                allLeadsData = result.data; // Save the data globally
                updateDashboard(allLeadsData);
                // Reset active filter on fresh load
                $('.filter-btn').removeClass('active');
                $('.filter-btn[data-status="all"]').addClass('active');
            } else {
                console.error("API Error:", result.message);
                if (result.message.includes("Database disconnected")) {
                    $('#dbWarning').removeClass('d-none');
                    $('#tableBody').html('<tr><td colspan="9" class="text-center text-danger py-4"><i class="bi bi-x-circle me-2"></i>Database Error. Check MongoDB connection/IP Whitelist.</td></tr>');
                } else {
                    $('#tableBody').html(`<tr><td colspan="9" class="text-center text-danger py-4">Error fetching data.</td></tr>`);
                }
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            $('#tableBody').html('<tr><td colspan="9" class="text-center text-danger py-4">Failed to connect to server.</td></tr>');
        }
    }

    // Filter Button Handler
    $('.filter-btn').on('click', function() {
        const targetStatus = $(this).data('status');
        
        // Update UI
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        
        // Filter Data
        let filteredData = allLeadsData;
        if (targetStatus !== 'all') {
            filteredData = allLeadsData.filter(lead => lead.status === targetStatus);
        }
        
        // Re-render only table
        renderTable(filteredData);
    });

    function updateDashboard(data) {
        // 1. Update Stats
        $('#totalLeadsCount').text(data.length);

        if (data.length === 0) {
            $('#tableBody').html('<tr><td colspan="9" class="text-center py-4">No leads found.</td></tr>');
            return;
        }

        // Processing frequencies for district and course
        const distCount = {};
        const courseCount = {};

        data.forEach(item => {
            const d = item.district || 'Unknown';
            const c = item.course || 'Unknown';

            distCount[d] = (distCount[d] || 0) + 1;
            courseCount[c] = (courseCount[c] || 0) + 1;
        });

        // 2. Find Top District and Course
        const topDist = Object.keys(distCount).reduce((a, b) => distCount[a] > distCount[b] ? a : b);
        const topCrs = Object.keys(courseCount).reduce((a, b) => courseCount[a] > courseCount[b] ? a : b);

        $('#topDistrict').text(topDist);
        $('#topCourse').text(topCrs);

        // 3. Render Charts
        renderDistrictChart(distCount);
        renderCourseChart(courseCount);

        // 4. Render Table
        renderTable(data);
    }

    function getStatusClass(status) {
        switch (status) {
            case 'confirm': return 'status-confirm';
            case 'ready for campus': return 'status-ready-for-campus';
            case 'pending': return 'status-pending';
            case 'not ready': return 'status-not-ready';
            default: return '';
        }
    }

    function renderTable(data) {
        // Destroy DataTable BEFORE modifying the DOM so it doesn't restore old elements
        if (dataTable) {
            dataTable.destroy();
        }

        const tbody = $('#tableBody');
        tbody.empty();

        data.forEach(item => {
            const status = item.status || 'pending';
            const statusClass = getStatusClass(status);
            const tr = `
                <tr>
                    <td class="fw-medium">${item.name || '-'}</td>
                    <td><span class="badge bg-info text-dark">${item.gender || '-'}</span></td>
                    <td><a href="tel:${item.mobile || ''}" class="text-decoration-none">${item.mobile || '-'}</a></td>
                    <td>${item.district || '-'}</td>
                    <td><span class="badge bg-secondary">${item.class || '-'}</span></td>
                    <td><span class="badge bg-primary">${item.course || '-'}</span></td>
                    <td>
                        <select class="form-select form-select-sm status-select ${statusClass}" data-id="${item.id}" style="width: auto;">
                            <option value="pending" ${status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirm" ${status === 'confirm' ? 'selected' : ''}>Confirm</option>
                            <option value="ready for campus" ${status === 'ready for campus' ? 'selected' : ''}>Ready for Campus</option>
                            <option value="not ready" ${status === 'not ready' ? 'selected' : ''}>Not Ready</option>
                        </select>
                    </td>
                    <td class="text-muted small">${item.created_at_fmt || '-'}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-primary edit-lead-btn me-1" data-id="${item.id}" title="Edit Lead">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-lead-btn" data-id="${item.id}" title="Delete Lead">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.append(tr);
        });

        // Initialize DataTable with nice UI features

        dataTable = $('#leadsTable').DataTable({
            pageLength: 10,
            responsive: true,
            order: [[7, "desc"]], // Default order by Date desc (index 7 now)
            language: {
                search: "_INPUT_",
                searchPlaceholder: "Search records..."
            },
            dom: "<'row mb-3'<'col-md-6'l><'col-md-6 d-flex justify-content-end'f>>" +
                "<'row'<'col-sm-12'tr>>" +
                "<'row mt-3'<'col-md-5'i><'col-md-7'p>>"
        });

        // Event for status change
        $('#tableBody').off('change', '.status-select').on('change', '.status-select', async function() {
            const leadId = $(this).data('id');
            const newStatus = $(this).val();
            
            // Update UI color immediately
            $(this).removeClass('status-confirm status-ready-for-campus status-pending status-not-ready');
            $(this).addClass(getStatusClass(newStatus));
            
            await updateLeadStatus(leadId, newStatus);
        });

        // Event for edit lead
        $('#tableBody').off('click', '.edit-lead-btn').on('click', '.edit-lead-btn', function() {
            const leadId = $(this).data('id');
            const lead = allLeadsData.find(l => l.id === leadId);
            
            if (lead) {
                $('#editLeadId').val(lead.id);
                $('#editStudentName').val(lead.name);
                $('#editStudentGender').val(lead.gender);
                $('#editStudentMobile').val(lead.mobile);
                $('#editStudentDistrict').val(lead.district);
                $('#editStudentClass').val(lead.class);
                $('#editStudentCourse').val(lead.course);
                $('#editStudentStatus').val(lead.status || 'pending');
                
                $('#editLeadModal').modal('show');
            }
        });

        // Event for delete lead
        $('#tableBody').off('click', '.delete-lead-btn').on('click', '.delete-lead-btn', function() {
            const leadId = $(this).data('id');
            const lead = allLeadsData.find(l => l.id === leadId);
            const leadName = lead ? lead.name : 'this lead';

            Swal.fire({
                title: 'Are you sure?',
                text: `You are about to delete the record for "${leadName}". This action cannot be undone!`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#0A3254',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'No, keep it'
            }).then((result) => {
                if (result.isConfirmed) {
                    deleteLead(leadId);
                }
            });
        });
    }

    // Update lead logic
    $('#updateLeadBtn').on('click', async function() {
        const leadId = $('#editLeadId').val();
        const formData = {
            name: $('#editStudentName').val(),
            gender: $('#editStudentGender').val(),
            mobile: $('#editStudentMobile').val(),
            district: $('#editStudentDistrict').val(),
            class: $('#editStudentClass').val(),
            course: $('#editStudentCourse').val(),
            status: $('#editStudentStatus').val()
        };

        if (!formData.name || !formData.mobile || !formData.gender || !formData.district || !formData.class || !formData.course) {
            Swal.fire('Incomplete Form', 'All fields are mandatory!', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/leads/${leadId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (response.ok && result.success) {
                $('#editLeadModal').modal('hide');
                Swal.fire('Updated!', 'Lead information has been saved.', 'success');
                fetchLeadsData(); // Refresh the table
            } else {
                Swal.fire('Error!', result.message || 'Failed to update lead', 'error');
            }
        } catch (error) {
            console.error("Update lead error:", error);
            Swal.fire('Error!', 'Failed to connect to server.', 'error');
        }
    });


    async function updateLeadStatus(id, status) {
        try {
            const response = await fetch(`/api/leads/${id}/status`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ status: status })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Status Updated',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
                console.log("Status updated");
            } else {
                Swal.fire('Error!', result.message || 'Failed to update status', 'error');
            }
        } catch (error) {
            console.error("Status update error:", error);
            Swal.fire('Error!', 'Failed to connect to server.', 'error');
        }
    }

    async function deleteLead(id) {
        try {
            const response = await fetch(`/api/leads/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });
            const result = await response.json();
            if (response.ok && result.success) {
                Swal.fire(
                    'Deleted!',
                    'The student record has been removed successfully.',
                    'success'
                );
                fetchLeadsData(); // Refresh the table
            } else {
                Swal.fire('Error!', result.message || 'Failed to delete lead', 'error');
            }
        } catch (error) {
            console.error("Delete error:", error);
            Swal.fire('Error!', 'Failed to connect to server.', 'error');
        }
    }

    // Manual add lead logic
    $('#saveLeadBtn').on('click', async function() {
        const formData = {
            name: $('#studentName').val(),
            gender: $('#studentGender').val(),
            mobile: $('#studentMobile').val(),
            district: $('#studentDistrict').val(),
            class: $('#studentClass').val(),
            course: $('#studentCourse').val(),
            status: $('#studentStatus').val()
        };

        if (!formData.name || !formData.mobile || !formData.gender || !formData.district || !formData.class || !formData.course) {
            Swal.fire('Incomplete Form', 'All fields are mandatory! Please fill in all details.', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (response.ok && result.success) {
                $('#addLeadModal').modal('hide');
                $('#addLeadForm')[0].reset();
                Swal.fire('Success!', 'New lead has been added successfully.', 'success');
                fetchLeadsData(); // Refresh the table
            } else {
                Swal.fire('Error!', result.message || 'Failed to add lead', 'error');
            }
        } catch (error) {
            console.error("Add lead error:", error);
            Swal.fire('Error!', 'Failed to connect to server.', 'error');
        }
    });

    function renderDistrictChart(dataObj) {
        const ctx = document.getElementById('districtChart').getContext('2d');

        // Sort data by values desc and take top 10
        const sorted = Object.entries(dataObj).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const labels = sorted.map(i => i[0]);
        const data = sorted.map(i => i[1]);

        if (distChart) distChart.destroy();

        distChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Leads',
                    data: data,
                    backgroundColor: 'rgba(10, 50, 84, 0.8)', // Primary Blue
                    borderColor: '#0A3254',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }

    function renderCourseChart(dataObj) {
        const ctx = document.getElementById('courseChart').getContext('2d');

        const labels = Object.keys(dataObj);
        const data = Object.values(dataObj);

        // CUTM theme colors generated array
        const bgColors = [
            '#F57200', // Orange
            '#0A3254', // Dark Blue
            '#1f77b4', // Light Blue
            '#ff7f0e', // Light orange
            '#2ca02c', // Green
            '#8c564b'  // Brown
        ];

        if (crsChart) crsChart.destroy();

        crsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: bgColors.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                },
                cutout: '70%'
            }
        });
    }

    // --- Security: Auto Logout for Inactivity ---
    setupInactivityTimer();

    function setupInactivityTimer() {
        let idleTime = 0;
        const idleLimit = 10; // 10 minutes

        // Increment the idle time counter every minute
        const idleInterval = setInterval(timerIncrement, 60000); 

        // Zero the idle time on mouse movement, keypresses, etc.
        $(document).on('mousemove mousedown keypress scroll touchstart', function() {
            idleTime = 0;
        });

        function timerIncrement() {
            idleTime++;
            if (idleTime >= idleLimit) {
                clearInterval(idleInterval);
                handleAutoLogout();
            }
        }

        function handleAutoLogout() {
            Swal.fire({
                title: 'Session Expired',
                text: 'You have been logged out due to inactivity for security reasons.',
                icon: 'info',
                confirmButtonText: 'Login Again',
                confirmButtonColor: '#0A3254',
                allowOutsideClick: false,
                allowEscapeKey: false
            }).then(() => {
                window.location.href = '/admin/logout';
            });

            // Fallback: auto-redirect if user doesn't click OK
            setTimeout(() => {
                window.location.href = '/admin/logout';
            }, 5000);
        }
    }
});
 
