// ===== AGRIFLOW AI CHAT FUNCTIONALITY =====

let conversationHistory = [];

// Send message function
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const welcomeSection = document.getElementById('welcomeSection');
    const errorMessage = document.getElementById('errorMessage');

    // Validate input
    if (!message) {
        showError('कृपया कुछ लिखें / Please type a message');
        return;
    }

    // Remove welcome section on first message
    if (welcomeSection) {
        welcomeSection.remove();
    }

    // Clear previous errors
    errorMessage.innerHTML = '';

    // Add user message to chat
    addMessage(message, 'user');

    // Clear input
    messageInput.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '⏳ Sending...';

    // Add conversation to history
    conversationHistory.push({
        role: 'user',
        content: message
    });

    try {
        // Send message to backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error('Server error: ' + response.status);
        }

        const data = await response.json();

        if (data.success) {
            const aiResponse = data.response;

            // Add AI response to chat
            addMessage(aiResponse, 'ai');

            // Add to history
            conversationHistory.push({
                role: 'assistant',
                content: aiResponse
            });
        } else {
            throw new Error(data.error || 'Failed to get response');
        }
    } catch (error) {
        console.error('Chat Error:', error);
        showError('❌ ' + (error.message || 'Unable to get response. Please try again.'));
        addMessage('Sorry, I encountered an error. Please try again.', 'ai');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = '📤 Send';
        messageInput.focus();
    }
}

// Add message to chat display
function addMessage(message, sender) {
    const chatMessages = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    // Format message with line breaks
    messageContent.innerHTML = formatMessage(message);

    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageTime);

    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 10);
}

// Format message with line breaks and basic markdown
function formatMessage(message) {
    // Escape HTML
    let formatted = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Convert bold (**text**)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert lists (- item)
    formatted = formatted.replace(/^- (.*?)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>');

    return formatted;
}

// Show error message
function showError(errorText) {
    const errorContainer = document.getElementById('errorMessage');
    errorContainer.innerHTML = `<div class="error-message">${errorText}</div>`;

    // Auto-clear error after 5 seconds
    setTimeout(() => {
        errorContainer.innerHTML = '';
    }, 5000);
}

// Send suggestion
function sendSuggestion(suggestion) {
    document.getElementById('messageInput').value = suggestion;
    sendMessage();
}

// Clear chat
function clearChat() {
    if (confirm('क्या आप चैट साफ़ करना चाहते हैं? / Clear all messages?')) {
        document.getElementById('chatMessages').innerHTML = `
      <div class="welcome-section" id="welcomeSection">
        <div class="welcome-icon">🤖</div>
        <h2 class="welcome-title">AgriFlow AI Assistant</h2>
        <p class="welcome-subtitle">Ask me anything about farming, crops, weather, loans, and soil management!</p>
        
        <div class="suggestion-pills">
          <div class="suggestion-pill" onclick="sendSuggestion('बारिश के मौसम में कौन सी फसल उगानी चाहिए?')">
            🌧️ Best crop for rainy season?
          </div>
          <div class="suggestion-pill" onclick="sendSuggestion('धान की खेती के लिए सही मिट्टी कौन सी है?')">
            🌾 Right soil for rice farming?
          </div>
          <div class="suggestion-pill" onclick="sendSuggestion('गर्मी में सिंचाई कितनी बार करनी चाहिए?')">
            💧 How often to irrigate in summer?
          </div>
          <div class="suggestion-pill" onclick="sendSuggestion('जैविक खाद कैसे बनाते हैं?')">
            🍃 How to make organic fertilizer?
          </div>
          <div class="suggestion-pill" onclick="sendSuggestion('फसल बीमा के लिए कैसे आवेदन करें?')">
            🛡️ How to apply for crop insurance?
          </div>
          <div class="suggestion-pill" onclick="sendSuggestion('मेरी फसल हर साल सूख जाती है, क्या करूँ?')">
            😟 Why does my crop dry up?
          </div>
        </div>
      </div>
    `;
        conversationHistory = [];
        document.getElementById('messageInput').focus();
    }
}

// Allow sending message with Enter key
document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('messageInput');

    messageInput.addEventListener('keyup', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });

    // Focus input
    messageInput.focus();

    // Load previous conversation from localStorage (optional)
    const savedHistory = localStorage.getItem('agriflowChatHistory');
    if (savedHistory) {
        try {
            conversationHistory = JSON.parse(savedHistory);
        } catch (e) {
            console.log('Could not restore chat history');
        }
    }
});

// Save conversation periodically
setInterval(() => {
    if (conversationHistory.length > 0) {
        localStorage.setItem('agriflowChatHistory', JSON.stringify(conversationHistory));
    }
}, 30000); // Save every 30 seconds
