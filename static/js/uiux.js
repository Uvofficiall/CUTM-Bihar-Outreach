document.addEventListener('DOMContentLoaded', () => {
    // Fetch JSON data
    fetch('/static/data.json')
        .then(response => response.json())
        .then(data => {
            renderStats(data.stats);
            renderSchools(data.schools);
            renderPrograms(data.programs);
            renderPlacements(data.placements);
        })
        .catch(err => {
            console.error('Error fetching data.json', err);
            // Fallback for missing local server
            document.querySelectorAll('.loading-text').forEach(el => {
                el.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Must use Live Server to load data.json';
                el.style.color = 'var(--red)';
            });
        });

    function renderStats(stats) {
        const statsGrid = document.getElementById('stats-grid');
        if (!statsGrid) return;
        statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-box reveal-item">
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('');
    }

    function renderSchools(schools) {
        const schoolsContainer = document.getElementById('schools-container');
        if (!schoolsContainer) return;
        schoolsContainer.innerHTML = schools.map(school => `
            <div class="school-card reveal-item">
                <div class="school-icon-wrapper">
                    <i class="${school.icon}"></i>
                </div>
                <h3>${school.name}</h3>
                <a href="#" class="btn-discover">Discover Programs</a>
            </div>
        `).join('');
    }

    function renderPrograms(programsData) {
        const contentArea = document.getElementById('programs-content-area');
        const tabBtns = document.querySelectorAll('.tab-btn');
        if (!contentArea || !tabBtns.length || !programsData) return;

        function loadTab(target) {
            const list = programsData[target] || [];
            if (list.length === 0) {
                contentArea.innerHTML = '<div class="empty-tab-msg">No programs available currently.</div>';
                return;
            }
            
            const gridHtml = list.map(prog => `
                <div class="program-card">
                    <div class="program-icon"><i class="${prog.icon}"></i></div>
                    <div class="program-text">
                        <span class="program-prefix">${prog.prefix}</span>
                        <span class="program-name">${prog.name}</span>
                    </div>
                </div>
            `).join('');
            
            contentArea.innerHTML = `<div class="programs-grid">${gridHtml}</div>`;
        }

        // Initialize active tab
        const activeBtn = document.querySelector('.tab-btn.active');
        if (activeBtn) loadTab(activeBtn.dataset.target);

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => b.classList.remove('active'));
                const target = e.target.dataset.target;
                e.target.classList.add('active');
                loadTab(target);
            });
        });
    }

    function renderPlacements(placements) {
        const placementsContainer = document.getElementById('placements-container');
        if (!placementsContainer) return;
        placementsContainer.innerHTML = placements.map(company => `
            <div class="placement-logo-wrap">
                <img src="${company.img}" alt="${company.name}">
            </div>
        `).join('');
    }

    // Slider Logic for Glimpses
    const glimpsesSlider = document.getElementById('glimpses-slider');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    if (glimpsesSlider && prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            glimpsesSlider.scrollBy({ left: -(glimpsesSlider.clientWidth / 1.5), behavior: 'smooth' });
        });
        nextBtn.addEventListener('click', () => {
            glimpsesSlider.scrollBy({ left: (glimpsesSlider.clientWidth / 1.5), behavior: 'smooth' });
        });
    }

    // Testimonials Slider Logic
    const testiSlider = document.getElementById('testimonials-slider');
    const prevTestiBtn = document.querySelector('.prev-testi-btn');
    const nextTestiBtn = document.querySelector('.next-testi-btn');
    const dots = document.querySelectorAll('.testi-dots .dot');

    if (testiSlider && prevTestiBtn && nextTestiBtn) {
        prevTestiBtn.addEventListener('click', () => {
            testiSlider.scrollBy({ left: -(testiSlider.clientWidth / 1.5), behavior: 'smooth' });
        });
        nextTestiBtn.addEventListener('click', () => {
            testiSlider.scrollBy({ left: (testiSlider.clientWidth / 1.5), behavior: 'smooth' });
        });

        testiSlider.addEventListener('scroll', () => {
            const scrollPos = testiSlider.scrollLeft;
            const itemWidth = testiSlider.clientWidth / 3; // Approx 3 items visible
            // Normalize active index calculation safely
            let activeIndex = Math.round(scrollPos / itemWidth);
            if (activeIndex > dots.length - 1) activeIndex = dots.length - 1;
            
            dots.forEach((dot, index) => {
                if(index === activeIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        });
    }

    // Enquiry Modal Logic
    const openEnquiryBtn = document.getElementById('openEnquiryModalSticky');
    const closeEnquiryBtn = document.getElementById('closeEnquiryModal');
    const enquiryModal = document.getElementById('enquiryModal');
    
    if (openEnquiryBtn && closeEnquiryBtn && enquiryModal) {
        openEnquiryBtn.addEventListener('click', () => {
            enquiryModal.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        });

        const closeModal = () => {
            enquiryModal.classList.remove('active');
            document.body.style.overflow = '';
        };

        closeEnquiryBtn.addEventListener('click', closeModal);

        // Close on clicking outside the modal container
        enquiryModal.addEventListener('click', (e) => {
            if (e.target === enquiryModal) {
                closeModal();
            }
        });
    }

    // Modal Form Submission Animation
    const modalForm = document.getElementById('admissionFormModal');
    if (modalForm) {
        modalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = modalForm.querySelector('.btn-submit');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
            btn.style.opacity = '0.8';
            
            setTimeout(() => {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Success!';
                btn.style.background = '#4CAF50';
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.style.opacity = '1';
                    modalForm.reset();
                    document.getElementById('closeEnquiryModal').click();
                }, 2000);
            }, 1000);
        });
    }

    // --- PROFESSIONAL UI EFFECTS ---
    
    // 1. Scroll Reveal Animations (Intersection Observer)
    const revealElements = document.querySelectorAll('.reveal');
    if (revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    
                    // Add staggered delay to children with .reveal-item
                    const children = entry.target.querySelectorAll('.reveal-item');
                    children.forEach((child, index) => {
                        child.style.transitionDelay = `${index * 0.1}s`;
                    });
                    
                    // Stop observing once revealed for better performance
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: "0px 0px -50px 0px" // Trigger slightly before it comes into view
        });

        revealElements.forEach(el => revealObserver.observe(el));
    }


});

// Global function to select a program tab by index
window.selectProgramTab = function(index) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    if (tabBtns && tabBtns[index]) {
        tabBtns[index].click();
    }
};
