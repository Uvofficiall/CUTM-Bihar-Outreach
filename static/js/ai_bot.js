document.addEventListener('DOMContentLoaded', () => {
    const aiChatBtn = document.getElementById('aiChatBtn');
    const aiChatWindow = document.getElementById('aiChatWindow');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const aiChatMessages = document.getElementById('aiChatMessages');
    const quickReplyBtns = document.querySelectorAll('.ai-quick-reply');
    const aiChatInput = document.getElementById('aiChatInput');
    const aiChatSendBtn = document.getElementById('aiChatSendBtn');
    const whatsappContainer = document.querySelector('.whatsapp-container');
    const callContainer = document.querySelector('.call-container');

    // Toggle Chat Window
    aiChatBtn.addEventListener('click', () => {
        aiChatWindow.classList.toggle('d-none');
        if (!aiChatWindow.classList.contains('d-none')) {
            // Trigger animation
            setTimeout(() => {
                aiChatWindow.classList.add('active');
                aiChatInput.focus();
                if (whatsappContainer) whatsappContainer.style.display = 'none'; // Hide WhatsApp
                if (callContainer) callContainer.style.display = 'none'; // Hide Call
            }, 10);
        } else {
            aiChatWindow.classList.remove('active');
            if (whatsappContainer) whatsappContainer.style.display = 'flex'; // Show WhatsApp
            if (callContainer) callContainer.style.display = 'flex'; // Show Call
        }
    });

    closeChatBtn.addEventListener('click', () => {
        aiChatWindow.classList.remove('active');
        setTimeout(() => {
            aiChatWindow.classList.add('d-none');
            if (whatsappContainer) whatsappContainer.style.display = 'flex'; // Show WhatsApp
            if (callContainer) callContainer.style.display = 'flex'; // Show Call
        }, 300); // Wait for transition
    });

    // Helper to add a message to the chat UI
    function addMessage(text, isUser = false) {
        const msgWrapper = document.createElement('div');
        msgWrapper.className = `chat-message ${isUser ? 'user-message' : 'bot-message'}`;

        const bubble = document.createElement('div');
        bubble.className = `msg-bubble p-3 rounded-3 shadow-sm ${isUser ? 'bg-primary text-white' : 'bg-white text-dark'}`;
        bubble.style.fontSize = '0.9rem';

        // Remove bottom corner radius based on sender
        if (isUser) {
            bubble.style.borderBottomRightRadius = '0';
        } else {
            bubble.style.borderBottomLeftRadius = '0';
        }

        bubble.innerHTML = text; // Allow HTML rendering for links/formatting
        msgWrapper.appendChild(bubble);
        aiChatMessages.appendChild(msgWrapper);

        // Auto-scroll to bottom
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }

    // AI Knowledge Base (Keyword matching engine)
    const knowledgeBase = [
        {
            keywords: ["register", "apply", "admission", "form", "enroll", "join"],
            response: `It's simple! Just fill out the <strong>Student Registration Form</strong> on this page.<br><br>
                       1️⃣ Enter your exact Name & Mobile Number<br>
                       2️⃣ Click "Send OTP" to verify your number<br>
                       3️⃣ Choose your District, Qualification, and Course<br>
                        4️⃣ Hit "Submit"!<br><br>👉 <strong>Bihar Student's Credit Card Accepted!</strong><br>Our admission counselors will reach out to you directly.`
        },
        {
            keywords: ["course", "program", "degree", "branch", "subject", "study", "courses offered"],
            response: `We offer leading industry-aligned programs! These include:<br>
                       🎓 <strong>B.Tech</strong> (Engineering)<br>
                       💻 <strong>BCA</strong> (Computer Applications)<br>
                       📊 <strong>BBA</strong> (Business Administration)<br>
                       💼 <strong>MBA</strong> (MBA in Agribusiness)<br>
                       ⚙️ <strong>Diploma Engineering</strong><br>
                       
                       📢 <strong>IMPORTANT NOTICE</strong> 😀<br>
                       Good news for Bihar students! Bihar Student's Credit Card facility is available for B.Tech, BCA, BBA, and Diploma courses.`
        },
        {
            keywords: ["fee", "cost", "price", "money", "payment", "hostel fee"],
            response: `Tuition fees and hostel charges vary depending on the course you select.<br><br>
                       Once you complete the short <strong>registration form</strong> on this page, an admissions official will contact you to provide the exact breakdown and any current scholarship opportunities!`
        },
        {
            keywords: ["campus", "location", "address", "where", "situate"],
            response: `The main Centurion University of Technology and Management (CUTM) campus is located in 📍 <strong>Paralakhemundi, Odisha</strong>.<br><br>
                       It features state-of-the-art academic blocks, residential facilities, and a secure environment!`
        },
        {
            keywords: ["contact", "number", "phone", "email", "call", "help"],
            response: `You can reach our Bihar Outreach Team instantly at:<br>
                       📞 Phone: <a href="tel:+919124619842">+91 9124619842</a><br>
                       📧 Email: <a href="mailto:admissions@cutm.ac.in">admissions@cutm.ac.in</a><br>
                       Or use the WhatsApp button on the bottom right!`
        },
        {
            keywords: ["hi", "hello", "hey", "greetings"],
            response: `Hello there! 👋 I'm your virtual guide for CUTM Bihar Outreach. How can I help you regarding admissions today?`
        },
        {
            keywords: ["thank", "thanks", "ok", "okay", "bye"],
            response: `You're very welcome! Feel free to ask if you need anything else, or fill out the form above to get started.`
        }
    ];

    // AI Knowledge Base (Keyword matching engine)
    const quickReplyMap = {
        "How to register?": knowledgeBase[0].response,
        "What courses are offered?": knowledgeBase[1].response,
        "Where is the campus?": knowledgeBase[3].response
    };

    // Core AI Logic Function
    function getAIResponse(userText) {
        let text = userText.trim();
        
        // 1. Check for exact Quick Reply Match first
        if (quickReplyMap[text]) {
            console.log('Explicit Quick Reply Match:', text);
            return quickReplyMap[text];
        }

        // 2. Fallback to Keyword matching
        let lowerText = text.toLowerCase();
        for (let entry of knowledgeBase) {
            for (let keyword of entry.keywords) {
                if (lowerText.includes(keyword)) {
                    console.log('Keyword Match Found:', keyword);
                    return entry.response;
                }
            }
        }

        // 3. Last fallback
        console.log('No Match Found for:', text);
        return `I'm an automated assistant and I might not have understood that. <br><br>
                For specific queries, please complete the <strong>registration form</strong> so our counselors can call you, or contact us directly at 📞 <strong>+91 9124619842</strong>.`;
    }

    // Process User Submission
    function handleUserMessage(message) {
        if (!message.trim()) return;

        // 1. Show User Message
        addMessage(message, true);

        // Clear input
        aiChatInput.value = '';

        // 2. Disable inputs while AI "thinks"
        const optionsArea = document.querySelector('.ai-chat-options');
        optionsArea.style.opacity = '0.5';
        optionsArea.style.pointerEvents = 'none';
        aiChatInput.disabled = true;
        aiChatSendBtn.disabled = true;

        // 3. Simulate "AI Thinking" delay
        setTimeout(() => {
            // Show AI Response
            const responseText = getAIResponse(message);
            addMessage(responseText, false);

            // Re-enable inputs
            optionsArea.style.opacity = '1';
            optionsArea.style.pointerEvents = 'auto';
            aiChatInput.disabled = false;
            aiChatSendBtn.disabled = false;
            aiChatInput.focus();

            // Auto Scroll to form if registration is mentioned
            if (message.toLowerCase().includes("register") || message.toLowerCase().includes("apply") || message.toLowerCase().includes("form")) {
                document.getElementById('registrationForm').scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Highlight the form briefly
                const card = document.querySelector('.registration-card');
                card.style.transition = 'box-shadow 0.5s';
                card.style.boxShadow = '0 0 30px rgba(10, 50, 84, 0.4)';
                setTimeout(() => {
                    card.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.08)';
                }, 2000);
            }
        }, Math.random() * 500 + 500); // Random delay between 500ms and 1000ms
    }

    // Handle standard Text Input sends
    aiChatSendBtn.addEventListener('click', () => {
        handleUserMessage(aiChatInput.value);
    });

    aiChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserMessage(aiChatInput.value);
        }
    });

    // Enhanced Event Delegation for Quick Reply Clicks
    const chatOptions = document.querySelector('.ai-chat-options');
    if (chatOptions) {
        chatOptions.addEventListener('click', function(e) {
            // Find the button (or the button parent if a child like 📚 was clicked)
            const btn = e.target.closest('.ai-quick-reply');
            if (!btn) return;
            
            const question = btn.getAttribute('data-question');
            if (question) {
                console.log('AI Quick Reply Clicked:', question);
                handleUserMessage(question);
            }
        });
    }
}); 

