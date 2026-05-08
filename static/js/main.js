document.addEventListener('DOMContentLoaded', () => {

    // --- Firebase Client Setup for Phone Auth ---
    // IMPORTANT: Replace this config with YOUR actual Firebase project configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
        apiKey: "AIzaSyCXfUfGu6hQURr8f8LOHwKgWhusTE9rGSw",
        authDomain: "bihar-outreach.firebaseapp.com",
        projectId: "bihar-outreach",
        storageBucket: "bihar-outreach.firebasestorage.app",
        messagingSenderId: "520369481431",
        appId: "1:520369481431:web:163e2573f88044a511b292",
        measurementId: "G-WYKJ551HXH"
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    let confirmationResult = null;
    let isPhoneVerified = false;

    // Setup reCAPTCHA 
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
    });

    // Prerender to remove OTP send delay
    window.recaptchaVerifier.render().then((widgetId) => {
        window.recaptchaWidgetId = widgetId;
    });

    // --- Populate Districts ---
    const districts = [
        "Araria - अररिया", "Arwal - अरवल", "Aurangabad - औरंगाबाद", "Banka - बांका",
        "Begusarai - बेगूसराय", "Bhagalpur - भागलपुर", "Bhojpur - भोजपुर", "Buxar - बक्सर",
        "Darbhanga - दरभंगा", "East Champaran - पूर्वी चम्पारण", "Gaya - गया",
        "Gopalganj - गोपालगंज", "Jamui - जमुई", "Jehanabad - जहानाबाद", "Kaimur - कैमूर",
        "Katihar - कटिहार", "Khagaria - खगड़िया", "Kishanganj - किशनगंज", "Lakhisarai - लखीसराय",
        "Madhepura - मधेपुरा", "Madhubani - मधुबनी", "Munger - मुंगेर", "Muzaffarpur - मुजफ्फरपुर",
        "Nalanda - नालंदा", "Nawada - नवादा", "West Champaran - पश्चिमी चम्पारण", "Patna - पटना",
        "Purnia - पूर्णिया", "Rohtas - रोहतास", "Saharsa - सहरसा", "Samastipur - समस्तीपुर",
        "Saran - सारन", "Sheikhpura - शेखपुरा", "Sheohar - शिवहर", "Sitamarhi - सीतामढ़ी",
        "Siwan - सीवान", "Supaul - सुपौल", "Vaishali - वैशाली"
    ];

    const districtSelect = document.getElementById('district');
    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
    });

    // --- Form Elements ---
    const form = document.getElementById('registrationForm');
    const mobileInput = document.getElementById('mobileNumber');
    const mobileError = document.querySelector('.invalid-mobile');
    const sendOtpBtn = document.getElementById('sendOtpBtn');

    const otpSection = document.getElementById('otpSection');
    const otpInput = document.getElementById('otpInput');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const otpSuccessMsg = document.getElementById('otpSuccessMsg');
    const otpErrorMsg = document.getElementById('otpErrorMsg');

    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('lblSubmit');
    const submitSpinner = document.getElementById('submitSpinner');
    const successModal = new bootstrap.Modal(document.getElementById('successModal'));

    const fullNameInput = document.getElementById('fullName');

    // --- Enable Submit only when all mandatory fields are filled ---
    submitBtn.disabled = true;
    const updateSubmitButtonState = () => {
        const isNameFilled = fullNameInput.value.trim() !== '';
        const isGenderSelected = document.getElementById('gender').value !== '';
        const isMobileValid = /^\d{10}$/.test(mobileInput.value.replace(/\s+/g, ''));
        const isDistrictSelected = document.getElementById('district').value !== '';
        const isCourseSelected = document.getElementById('course').value !== '';
        const isAgreementChecked = document.getElementById('agreement').checked;

        if (isNameFilled && isGenderSelected && isMobileValid && isPhoneVerified && isDistrictSelected && isCourseSelected && isAgreementChecked) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    };

    ['input', 'change'].forEach(evt => {
        form.addEventListener(evt, updateSubmitButtonState);
    });

    // --- OTP Logic ---
    sendOtpBtn.addEventListener('click', () => {
        const rawMobileVal = mobileInput.value;
        const mobileVal = rawMobileVal.replace(/\s+/g, ''); // Strip spaces

        // Validate mobile
        if (!/^\d{10}$/.test(mobileVal)) {
            mobileInput.classList.add('is-invalid');
            if (mobileError) mobileError.style.display = 'block';
            return;
        } else {
            mobileInput.classList.remove('is-invalid');
            if (mobileError) mobileError.style.display = 'none';
        }

        const phoneNumber = "+91" + mobileVal;
        const appVerifier = window.recaptchaVerifier;

        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending...';

        firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier)
            .then((confResult) => {
                // SMS sent. Prompt user to type the code from the message.
                window.confirmationResult = confResult;
                otpSection.style.display = 'block';
                
                // Start a 60-second countdown timer
                let timeLeft = 60;
                sendOtpBtn.textContent = `Resend in ${timeLeft}s`;
                const timer = setInterval(() => {
                    timeLeft--;
                    if (timeLeft > 0) {
                        sendOtpBtn.textContent = `Resend in ${timeLeft}s`;
                    } else {
                        clearInterval(timer);
                        sendOtpBtn.disabled = false;
                        sendOtpBtn.textContent = 'Resend OTP';
                    }
                }, 1000);

            }).catch((error) => {
                console.error("SMS not sent error:", error);
                
                let userFriendlyMsg = "Error sending OTP. Please try again.";
                if (error.code === 'auth/invalid-phone-number') {
                    userFriendlyMsg = "The phone number is invalid. Please check and try again.";
                } else if (error.code === 'auth/captcha-check-failed') {
                    userFriendlyMsg = "reCAPTCHA verification failed. Please try again.";
                } else if (error.code === 'auth/too-many-requests') {
                    userFriendlyMsg = "Too many OTP attempts. Please try again later.";
                } else {
                    userFriendlyMsg += " (" + (error.message || error.code) + ")";
                }
                
                alert(userFriendlyMsg);
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = 'Send OTP';
                
                // Reset recaptcha if error occurs
                if (window.recaptchaVerifier) {
                    window.recaptchaVerifier.render().then(function(widgetId) {
                        grecaptcha.reset(widgetId);
                    });
                }
            });
    });

    verifyOtpBtn.addEventListener('click', () => {
        const code = otpInput.value.trim();

        if (code.length !== 6) {
            otpErrorMsg.textContent = "Please enter a valid 6-digit OTP";
            otpErrorMsg.classList.remove('d-none');
            return;
        }

        // If dummy bypassed
        if (isPhoneVerified) {
            otpSuccessMsg.classList.remove('d-none');
            verifyOtpBtn.disabled = true;
            updateSubmitButtonState();
            return;
        }

        verifyOtpBtn.disabled = true;
        verifyOtpBtn.textContent = 'Checking...';

        window.confirmationResult.confirm(code).then((result) => {
            // User signed in successfully
            isPhoneVerified = true;
            otpSuccessMsg.classList.remove('d-none');
            otpErrorMsg.classList.add('d-none');
            // Lock inputs
            mobileInput.readOnly = true;
            otpInput.readOnly = true;
            verifyOtpBtn.textContent = 'Verified';
            updateSubmitButtonState();

            // Meta Pixel: Track OTP Verification as CompleteRegistration
            if (typeof fbq === 'function') {
                fbq('track', 'CompleteRegistration', {
                    content_name: 'OTP Verified',
                    status: 'success'
                });
            }
        }).catch((error) => {
            console.error("OTP verification failed", error);
            otpErrorMsg.textContent = "Invalid OTP code";
            otpErrorMsg.classList.remove('d-none');
            verifyOtpBtn.disabled = false;
            verifyOtpBtn.textContent = 'Verify';
        });
    });

    // --- Main Form Submission Logic ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let isValid = true;

        // Custom mobile validation
        const rawMobileVal = mobileInput.value;
        const mobileVal = rawMobileVal.replace(/\s+/g, '');
        if (!/^\d{10}$/.test(mobileVal)) {
            mobileInput.classList.add('is-invalid');
            mobileError.style.display = 'block';
            isValid = false;
        } else {
            mobileInput.classList.remove('is-invalid');
            mobileError.style.display = 'none';
        }

        // Bootstrap standard validation
        if (!form.checkValidity()) {
            isValid = false;
        }

        if (!isPhoneVerified) {
            alert('Please verify your mobile number with OTP first.');
            isValid = false;
        }

        form.classList.add('was-validated');

        // Check agreement
        const agreementChecked = document.getElementById('agreement').checked;
        if (!agreementChecked) {
            alert('Please agree to the terms and privacy policy to continue.');
            isValid = false;
        }

        if (isValid) {
            // Set Loading state
            submitBtn.disabled = true;
            submitText.textContent = 'Submitting...';
            submitSpinner.classList.remove('d-none');

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                // Retrieve CSRF token
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // --- NEW: Switch to Thank You View ---
                    const thankYouView = document.getElementById('thankYouView');
                    const registrationForm = document.getElementById('registrationForm');
                    const modalTitle = document.querySelector('.modal-premium-title');
                    
                    if (registrationForm && thankYouView) {
                        registrationForm.classList.add('d-none');
                        thankYouView.classList.remove('d-none');
                        if (modalTitle) modalTitle.classList.add('d-none'); // Hide title during thank you
                    }
                    
                    // Meta Pixel: Track successful registration as Lead
                    if (typeof fbq === 'function') {
                        fbq('track', 'Lead', {
                            content_category: 'Admission',
                            content_name: data.course || 'General'
                        });
                    }

                    // Reset form internally so it's ready for 'Register Another'
                    form.reset();
                    form.classList.remove('was-validated');
                    
                    // Reset mobile verification state for next registration
                    isPhoneVerified = false;
                    if (otpSection) otpSection.style.display = 'none';
                    if (mobileInput) mobileInput.readOnly = false;
                    if (otpInput) otpInput.readOnly = false;
                    if (verifyOtpBtn) {
                        verifyOtpBtn.disabled = false;
                        verifyOtpBtn.textContent = 'Verify';
                    }
                    if (otpSuccessMsg) otpSuccessMsg.classList.add('d-none');
                    if (otpErrorMsg) otpErrorMsg.classList.add('d-none');
                    if (sendOtpBtn) {
                        sendOtpBtn.disabled = false;
                        sendOtpBtn.textContent = 'Send OTP';
                    }
                    submitBtn.disabled = true;
                } else {
                    alert(result.message || 'Error submitting registration.');
                }
            } catch (error) {
                console.error("Error:", error);
                alert("An error occurred while connecting to the server.");
            } finally {
                // Reset loading state
                submitBtn.disabled = false;
                submitText.textContent = 'Submit Application';
                submitSpinner.classList.add('d-none');
            }
        }
    });

    // Auto remove mobile error on typing
    mobileInput.addEventListener('input', () => {
        const val = mobileInput.value.replace(/\s+/g, '');
        if (/^\d{10}$/.test(val)) {
            mobileInput.classList.remove('is-invalid');
            mobileError.style.display = 'none';
        }
    });

    // --- Language Switch Demo Logic ---
    const langBtn = document.getElementById('langSwitchBtn');
    const langText = document.getElementById('langText');
    let isHindi = false;

    // For demo purposes, translating a few UI elements
    const elementsToTranslate = {
        bannerTitle: { en: "Build Your Future!", hi: "अपना भविष्य संवारें!" },
        bannerSub: { en: "Register now for admission in Centurion University of Technology and Management, Paralakhemundi, Odisha", hi: "सेंचुरियन यूनिवर्सिटी ऑफ टेक्नोलॉजी एंड मैनेजमेंट, पारलाखेमुंडी, ओडिशा में प्रवेश के लिए अभी पंजीकरण करें" },
        formTitle: { en: "Student Registration", hi: "छात्र पंजीकरण" },
        formSub: { en: "Fill out the details below and our counseling team will contact you shortly.", hi: "नीचे विवरण भरें और हमारी परामर्श टीम जल्द ही आपसे संपर्क करेगी।" },
        lblFullName: { en: '<i class="bi bi-person me-2"></i>Full Name', hi: '<i class="bi bi-person me-2"></i>पूरा नाम' },
        lblMobile: { en: "Mobile Number", hi: "मोबाइल नंबर" },
        lblDistrict: { en: '<i class="bi bi-geo-alt me-2"></i>District', hi: '<i class="bi bi-geo-alt me-2"></i>ज़िला' },
        lblClass: { en: '<i class="bi bi-mortarboard me-2"></i>Current Qualification', hi: '<i class="bi bi-mortarboard me-2"></i>वर्तमान योग्यता' },
        lblCourse: { en: '<i class="bi bi-journal-text me-2"></i>Interested Course', hi: '<i class="bi bi-journal-text me-2"></i>इच्छुक पाठ्यक्रम' },
        bannerCreditCard: { en: '<i class="bi bi-credit-card-2-front-fill me-1"></i> Bihar Student\'s Credit Card Accepted', hi: '<i class="bi bi-credit-card-2-front-fill me-1"></i> बिहार स्टूडेंट क्रेडिट कार्ड स्वीकार्य है' },
        lblSubmit: { en: "Submit Application", hi: "आवेदन जमा करें" }
    };

    if (langBtn) {
        langBtn.addEventListener('click', () => {
            isHindi = !isHindi;
            langText.textContent = isHindi ? "English" : "Hindi";

            for (const [id, langs] of Object.entries(elementsToTranslate)) {
                const el = document.getElementById(id);
                if (el) {
                    el.innerHTML = isHindi ? langs.hi : langs.en;
                }
            }
        });
    }

    // --- Meta Pixel: Track Contact Events (WhatsApp & Call) ---
    const trackContact = (type) => {
        if (typeof fbq === 'function') {
            fbq('track', 'Contact', {
                content_category: 'Contact',
                content_name: type
            });
        }
    };

    const whatsappBtn = document.querySelector('.whatsapp-float');
    const callBtn = document.querySelector('.call-float');

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => trackContact('WhatsApp'));
    }
    if (callBtn) {
        callBtn.addEventListener('click', () => trackContact('Call'));
    }

    // --- Scroll Reveal Logic ---
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: stop observing once revealed
                // revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: '0px 0px -50px 0px' // Trigger slightly before it hits the viewport
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // --- Global Click Feedback (Ripple/Scale) ---
    // Already partially handled by CSS :active, but we can add more if needed.
    // For now, the CSS :active scale(0.95) should be enough for "smooth clicking".

    // --- NEW: Register Another Student Functionality ---
    const btnRegisterAnother = document.getElementById('btnRegisterAnother');
    if (btnRegisterAnother) {
        btnRegisterAnother.addEventListener('click', () => {
            const thankYouView = document.getElementById('thankYouView');
            const registrationForm = document.getElementById('registrationForm');
            const modalTitle = document.querySelector('.modal-premium-title');

            if (thankYouView && registrationForm) {
                thankYouView.classList.add('d-none');
                registrationForm.classList.remove('d-none');
                if (modalTitle) modalTitle.classList.remove('d-none');
                
                // Clear any leftover validation styles
                registrationForm.classList.remove('was-validated');
                
                // Scroll the modal to the top
                const modalContainer = document.querySelector('.modal-container-premium');
                if (modalContainer) modalContainer.scrollTop = 0;
            }
        });
    }
});
