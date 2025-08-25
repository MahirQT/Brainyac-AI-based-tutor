// ============================================================================
// MAIN JAVASCRIPT FILE - AI Education Platform
// ============================================================================

// Global variables
let currentUser = null;
let currentTab = 'learnings';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Show alert messages
function showAlert(message, type = 'success') {
    console.log('Showing alert:', message, 'Type:', type);
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alertDiv, container.firstChild);
        console.log('Alert added to container');
    } else {
        console.error('Container not found for alert');
        // Fallback: append to body
        document.body.appendChild(alertDiv);
        console.log('Alert added to body as fallback');
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
            console.log('Alert removed');
        }
    }, 5000);
}

// Format date for display
function formatDate(dateString) {
    try {
        if (!dateString) {
            console.warn('No date string provided to formatDate');
            return 'Unknown date';
        }
        
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            console.warn('Invalid date string:', dateString);
            return 'Invalid date';
        }
        
        const formatted = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        console.log('Formatted date:', dateString, '->', formatted);
        return formatted;
    } catch (error) {
        console.error('Error formatting date:', dateString, error);
        return 'Date error';
    }
}

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

function showTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Special handling for Dobby tab - redirect to dedicated page
    if (tabName === 'doubtbot') {
        console.log('Redirecting to Dobby interface');
        window.location.href = '/dobby';
        return;
    }
    
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
        console.log('Hiding tab:', content.id);
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        console.log('Showing tab:', tabName);
    } else {
        console.error('Tab not found:', tabName);
    }
    
    // Make clicked button active
    const clickedButton = document.querySelector(`.tab-button[onclick="showTab('${tabName}')"]`);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
    
    currentTab = tabName;
    
    // Load tab-specific data
    loadTabData(tabName);
}

function loadTabData(tabName) {
    console.log('Loading data for tab:', tabName);
    
    switch(tabName) {
        case 'learnings':
            loadLearningTopics();
            break;
        case 'doubtbot':
            console.log('Dobby tab - redirecting to dedicated interface');
            window.location.href = '/dobby';
            break;
        case 'doubts':
            loadMyDoubts();
            break;
        case 'flashcards':
            // Clear previous flashcards
            const container = document.getElementById('flashcard-container');
            if (container) {
                container.innerHTML = '';
                console.log('Cleared flashcard container');
            }
            break;
        case 'qna':
            console.log('QnA tab - no data loading needed');
            break;
        case 'points':
            loadPointsHistory();
            break;
        default:
            console.log('Unknown tab:', tabName);
    }
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

async function checkAuthStatus() {
    console.log('Checking authentication status...');
    try {
        const response = await fetch('/api/user/profile');
        console.log('Auth response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Auth data:', data);
        
        if (data.success) {
            currentUser = data.user;
            updateUserDisplay();
            console.log('Authentication successful, user:', currentUser);
            return true;
        } else {
            console.log('Authentication failed, redirecting to auth page');
            window.location.href = '/auth';
            return false;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        console.log('Redirecting to auth page due to error');
        window.location.href = '/auth';
        return false;
    }
}

function updateUserDisplay() {
    console.log('Updating user display for user:', currentUser);
    if (currentUser) {
        const userNameElements = document.querySelectorAll('#userName, #welcomeName');
        const userPointsElements = document.querySelectorAll('#userPoints, #totalPoints');
        const totalDoubtsElement = document.getElementById('totalDoubts');
        const qnaSessionsElement = document.getElementById('qnaSessions');
        
        console.log('Found userName elements:', userNameElements.length);
        console.log('Found userPoints elements:', userPointsElements.length);
        
        userNameElements.forEach(el => {
            if (el) {
                el.textContent = currentUser.name;
                console.log('Updated userName element:', el.id, 'to:', currentUser.name);
            }
        });
        
        userPointsElements.forEach(el => {
            if (el) {
                el.textContent = currentUser.points || 0;
                console.log('Updated userPoints element:', el.id, 'to:', currentUser.points || 0);
            }
        });
        
        // Update doubts and QnA session counters
        if (totalDoubtsElement) {
            totalDoubtsElement.textContent = currentUser.doubts_asked || 0;
            console.log('Updated totalDoubts element to:', currentUser.doubts_asked || 0);
        }
        
        if (qnaSessionsElement) {
            qnaSessionsElement.textContent = currentUser.qna_sessions || 0;
            console.log('Updated qnaSessions element to:', currentUser.qna_sessions || 0);
        }
        
        console.log('User display updated successfully');
    } else {
        console.warn('No current user to display');
    }
}

async function logout() {
    console.log('Logging out...');
    try {
        const response = await fetch('/api/logout');
        console.log('Logout response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Logout data:', data);
        
        if (data.success) {
            console.log('Logout successful, redirecting to auth page');
            window.location.href = '/auth';
        } else {
            console.error('Logout failed:', data.error);
            showAlert('Logout failed: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Logout failed:', error);
        showAlert('Logout failed: ' + error.message, 'error');
        // Still redirect to auth page even if logout API fails
        window.location.href = '/auth';
    }
}

// ============================================================================
// LEARNING TOPICS FUNCTIONS
// ============================================================================

async function loadLearningTopics() {
    console.log('Loading learning topics...');
    try {
        const response = await fetch('/api/learning-topics');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Learning topics data:', data);
        
        if (data.success) {
            renderLearningTopics(data.topics);
        } else {
            console.error('API returned error:', data.error);
            showAlert('Failed to load learning topics: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Failed to load learning topics:', error);
        showAlert('Failed to load learning topics: ' + error.message, 'error');
    }
}

function renderLearningTopics(topics) {
    console.log('Rendering learning topics:', topics);
    const container = document.querySelector('#learnings .tab-content');
    if (!container) {
        console.error('Learning topics container not found!');
        return;
    }
    
    if (!topics || topics.length === 0) {
        container.innerHTML = `
            <div class="card">
                <p>No learning topics yet. Add your first topic below!</p>
            </div>
        `;
        console.log('No learning topics to display');
        return;
    }
    
    const topicsHTML = topics.map(topic => `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">${topic.topic}</h3>
                <span class="badge ${topic.completed ? 'badge-success' : 'badge-warning'}">
                    ${topic.completed ? 'Completed' : 'In Progress'}
                </span>
            </div>
            <p>${topic.description || 'No description available'}</p>
            <p><strong>Points Earned:</strong> ${topic.points_earned || 0}</p>
            <p><strong>Created:</strong> ${formatDate(topic.created_at)}</p>
        </div>
    `).join('');
    
    container.innerHTML = topicsHTML;
    console.log('Learning topics rendered successfully');
}

async function addLearningTopic(event) {
    event.preventDefault();
    console.log('Adding learning topic...');
    
    const form = event.target;
    const formData = new FormData(form);
    const topic = formData.get('topic');
    const description = formData.get('description');
    
    console.log('Topic:', topic, 'Description:', description);
    
    try {
        const response = await fetch('/api/learning-topics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, description })
        });
        
        console.log('Add topic response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Add topic data:', data);
        
        if (data.success) {
            showAlert('Topic added successfully!');
            form.reset();
            loadLearningTopics();
        } else {
            showAlert(data.error || 'Failed to add topic', 'error');
        }
    } catch (error) {
        console.error('Failed to add topic:', error);
        showAlert('Failed to add topic: ' + error.message, 'error');
    }
}

// ============================================================================
// DOUBTS FUNCTIONS
// ============================================================================

async function loadDoubts() {
    console.log('Loading doubts...');
    try {
        const response = await fetch('/api/doubts');
        console.log('Doubts response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Doubts data:', data);
        
        if (data.success) {
            renderDoubts(data.doubts);
        } else {
            console.error('API returned error:', data.error);
            showAlert('Failed to load doubts: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Failed to load doubts:', error);
        showAlert('Failed to load doubts: ' + error.message, 'error');
    }
}

function renderDoubts(doubts) {
    console.log('Rendering doubts:', doubts);
    const container = document.querySelector('#doubts .tab-content');
    if (!container) {
        console.error('Doubts container not found!');
        return;
    }
    
    if (!doubts || doubts.length === 0) {
        container.innerHTML = `
            <div class="card">
                <p>No doubts submitted yet.</p>
            </div>
        `;
        console.log('No doubts to display');
        return;
    }
    
    const doubtsHTML = doubts.map(doubt => `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">${doubt.topic}</h3>
                <span class="badge ${doubt.status === 'answered' ? 'badge-success' : 'badge-warning'}">
                    ${doubt.status}
                </span>
            </div>
            <p><strong>Question:</strong> ${doubt.question}</p>
            ${doubt.answer ? `<p><strong>Answer:</strong> ${doubt.answer}</p>` : ''}
            <p><strong>Submitted:</strong> ${formatDate(doubt.created_at)}</p>
        </div>
    `).join('');
    
    container.innerHTML = doubtsHTML;
    console.log('Doubts rendered successfully');
}

async function submitDoubt(event) {
    event.preventDefault();
    console.log('Submitting doubt...');
    
    const form = event.target;
    const formData = new FormData(form);
    const topic = formData.get('topic');
    const question = formData.get('question');
    const questionImage = formData.get('question_image');
    
    console.log('Doubt topic:', topic, 'Question:', question, 'Image:', questionImage);
    
    try {
        const response = await fetch('/api/doubts', {
            method: 'POST',
            body: formData // Send as FormData to handle file upload
        });
        
        console.log('Submit doubt response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Submit doubt data:', data);
        
        if (data.success) {
            showAlert('Doubt submitted successfully!');
            form.reset();
            // Clear file preview
            const filePreview = document.getElementById('file-preview');
            if (filePreview) {
                filePreview.innerHTML = '';
                filePreview.classList.remove('has-file');
            }
            loadMyDoubts();
        } else {
            showAlert(data.error || 'Failed to submit doubt', 'error');
        }
    } catch (error) {
        console.error('Failed to submit doubt:', error);
        showAlert('Failed to submit doubt: ' + error.message, 'error');
    }
}

// ============================================================================
// DOUBTBOT CHAT FUNCTIONS
// ============================================================================

async function sendChatMessage(event) {
    event.preventDefault();
    console.log('Sending chat message...');
    
    const input = event.target.querySelector('input');
    const message = input.value.trim();
    if (!message) return;
    
    console.log('Chat message:', message);
    
    // Add user message to chat
    addChatMessage(message, 'user');
    input.value = '';
    
    try {
        const response = await fetch('/api/doubtbot/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        console.log('Chat response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Chat data:', data);
        
        if (data.success) {
            addChatMessage(data.response, 'bot');
        } else {
            addChatMessage('Sorry, I encountered an error. Please try again.', 'bot');
        }
    } catch (error) {
        console.error('Chat failed:', error);
        addChatMessage('Sorry, I encountered an error. Please try again.', 'bot');
    }
}

function addChatMessage(message, sender) {
    console.log('Adding chat message:', message, 'from:', sender);
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) {
        console.error('Chat messages container not found!');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = message;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    console.log('Chat message added successfully');
}

// ============================================================================
// FLASHCARD FUNCTIONS
// ============================================================================

async function generateFlashcards(event) {
    event.preventDefault();
    console.log('Generating flashcards...');
    
    const form = event.target;
    const topicInput = form.querySelector('#flashcard-topic-input');
    const generateBtn = form.querySelector('#generate-flashcards-btn');
    const flashcardContainer = document.getElementById('flashcard-container');
    const loader = document.getElementById('flashcard-loader');
    
    const topic = topicInput.value.trim();
    if (!topic) return;
    
    console.log('Flashcard topic:', topic);
    
    // Show loading state
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    flashcardContainer.innerHTML = '';
    if (loader) loader.style.display = 'block';
    
    try {
        const response = await fetch('/api/flashcards/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic })
        });
        
        console.log('Flashcard response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Flashcard data:', data);
        
        if (data.success) {
            renderFlashcards(data.flashcards);
        } else {
            flashcardContainer.innerHTML = `<p class="alert alert-error">Error: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('Error generating flashcards:', error);
        flashcardContainer.innerHTML = `<p class="alert alert-error">An unexpected error occurred. Please try again.</p>`;
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-bolt"></i> Generate';
        if (loader) loader.style.display = 'none';
    }
}

function renderFlashcards(flashcards) {
    console.log('Rendering flashcards:', flashcards);
    const flashcardContainer = document.getElementById('flashcard-container');
    if (!flashcardContainer) {
        console.error('Flashcard container not found!');
        return;
    }
    
    flashcardContainer.innerHTML = '';
    
    if (!flashcards || flashcards.length === 0) {
        flashcardContainer.innerHTML = '<p>No flashcards could be generated for this topic.</p>';
        console.log('No flashcards to display');
        return;
    }
    
    flashcards.forEach(cardData => {
        const flashcard = document.createElement('div');
        flashcard.className = 'flashcard';
        
        flashcard.innerHTML = `
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <p>${cardData.term}</p>
                </div>
                <div class="flashcard-back">
                    <p>${cardData.definition}</p>
                </div>
            </div>
        `;
        
        // Add click event for flipping
        flashcard.addEventListener('click', () => {
            flashcard.classList.toggle('is-flipped');
        });
        
        flashcardContainer.appendChild(flashcard);
    });
    
    console.log('Flashcards rendered successfully');
}

// ============================================================================
// QnA FUNCTIONS
// ============================================================================

async function startQnASession(event) {
    event.preventDefault();
    console.log('Starting QnA session...');
    
    const form = event.target;
    const topicInput = form.querySelector('#qna-topic-input');
    const difficultySelect = form.querySelector('#qna-difficulty');
    const startBtn = form.querySelector('#start-qna-btn');
    
    const topic = topicInput.value.trim();
    const difficulty = difficultySelect.value;
    
    if (!topic) return;
    
    console.log('QnA topic:', topic, 'Difficulty:', difficulty);
    
    // Redirect to dedicated quiz page with parameters
    const quizUrl = `/qna-quiz?topic=${encodeURIComponent(topic)}&difficulty=${encodeURIComponent(difficulty)}`;
    console.log('Redirecting to quiz page:', quizUrl);
    window.location.href = quizUrl;
}

function renderQnAQuestions(questions, sessionId, difficulty) {
    console.log('Rendering QnA questions:', questions, 'Session ID:', sessionId, 'Difficulty:', difficulty);
    const container = document.querySelector('#qna .tab-content');
    if (!container) {
        console.error('QnA container not found!');
        return;
    }
    
    const difficultyBadge = {
        'easy': '<span class="badge badge-success">Easy</span>',
        'medium': '<span class="badge badge-warning">Medium</span>',
        'hard': '<span class="badge badge-error">Hard</span>'
    };
    
    const questionsHTML = questions.map((question, index) => `
        <div class="card question-card" data-question="${index}">
            <div class="question-header">
                <h3>Question ${index + 1}</h3>
                ${difficultyBadge[difficulty] || ''}
            </div>
            <p class="question-text">${question.question}</p>
            <div class="options-container">
                ${question.options.map((option, optIndex) => `
                    <label class="option-label">
                        <input type="radio" name="q${index}" value="${optIndex}" class="option-input">
                        <span class="option-text">${option}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = `
        <div class="card session-info">
            <h3><i class="fas fa-play-circle"></i> Quiz Session Started</h3>
            <p><strong>Topic:</strong> ${questions[0]?.topic || 'General'}</p>
            <p><strong>Difficulty:</strong> ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</p>
            <p><strong>Questions:</strong> ${questions.length}</p>
            <p><strong>Points per correct answer:</strong> 10</p>
        </div>
        ${questionsHTML}
        <div class="quiz-actions">
            <button class="btn btn-primary" onclick="submitQnAAnswers('${sessionId}')">
                <i class="fas fa-check-circle"></i> Submit Quiz
            </button>
                    <button class="btn btn-secondary" onclick="resetQnA()">
            <i class="fas fa-redo"></i> Reset
        </button>
    </div>
`;
    console.log('QnA questions rendered successfully');
}

async function submitQnAAnswers(sessionId) {
    console.log('Submitting QnA answers for session:', sessionId);
    
    // Collect all answers
    const answers = {};
    const questionCards = document.querySelectorAll('.question-card');
    
    questionCards.forEach((card, index) => {
        const selectedOption = card.querySelector('input[type="radio"]:checked');
        if (selectedOption) {
            answers[index] = parseInt(selectedOption.value);
        } else {
            answers[index] = -1; // No answer selected
        }
    });
    
    // Check if all questions are answered
    const unansweredCount = Object.values(answers).filter(a => a === -1).length;
    if (unansweredCount > 0) {
        showAlert(`Please answer all ${unansweredCount} remaining questions before submitting.`, 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/qna/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, answers: answers })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            renderQnAResults(data);
        } else {
            showAlert(data.error || 'Failed to submit answers', 'error');
        }
    } catch (error) {
        console.error('Error submitting answers:', error);
        showAlert('Failed to submit answers: ' + error.message, 'error');
    }
}

function renderQnAResults(data) {
    console.log('Rendering QnA results:', data);
    const container = document.querySelector('#qna .tab-content');
    
    const resultsHTML = `
        <div class="card results-summary">
            <h3><i class="fas fa-trophy"></i> Quiz Results</h3>
            <div class="results-stats">
                <div class="stat-item">
                    <span class="stat-label">Score:</span>
                    <span class="stat-value">${data.score}/${data.total_questions}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Percentage:</span>
                    <span class="stat-value">${data.percentage}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Points Earned:</span>
                    <span class="stat-value points-earned">+${data.points_earned}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Difficulty:</span>
                    <span class="stat-value">${data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1)}</span>
                </div>
            </div>
        </div>
        ${data.results.map((result, index) => `
            <div class="card question-result ${result.is_correct ? 'correct' : 'incorrect'}">
                <div class="result-header">
                    <h4>Question ${index + 1}</h4>
                    <span class="result-badge ${result.is_correct ? 'correct' : 'incorrect'}">
                        ${result.is_correct ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                </div>
                <p class="question-text">${result.question}</p>
                <div class="options-review">
                    ${result.options.map((option, optIndex) => `
                        <div class="option-review ${optIndex === result.correct_answer ? 'correct-answer' : 
                                                   optIndex === result.user_answer ? 'user-answer' : ''}">
                            <span class="option-label">${String.fromCharCode(65 + optIndex)}.</span>
                            <span class="option-text">${option}</span>
                            ${optIndex === result.correct_answer ? '<span class="correct-mark">✓</span>' : ''}
                            ${optIndex === result.user_answer && !result.is_correct ? '<span class="incorrect-mark">✗</span>' : ''}
                        </div>
                    `).join('')}
                </div>
                ${!result.is_correct ? `
                    <div class="explanation">
                        <strong>Explanation:</strong> ${result.explanation}
                    </div>
                ` : ''}
            </div>
        `).join('')}
        <div class="quiz-actions">
            <button class="btn btn-primary" onclick="startNewQuiz()">
                <i class="fas fa-plus"></i> Start New Quiz
            </button>
            <button class="btn btn-secondary" onclick="resetQnA()">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
    
    container.innerHTML = resultsHTML;
    
    // Show points notification if points earned
    if (data.points_earned > 0) {
        showPointsNotification(data.points_earned);
    }
}

function resetQnA() {
    const container = document.querySelector('#qna .tab-content');
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">QnA Quiz Session</h3>
            </div>
            <p>Test your knowledge with AI-generated MCQ questions on any topic. Choose difficulty and earn points!</p>
            <form id="qna-form">
                <div class="form-group">
                    <label for="qna-topic-input">Topic for Quiz</label>
                    <input type="text" id="qna-topic-input" name="topic" placeholder="e.g., Machine Learning, World History, Chemistry" required>
                </div>
                <div class="form-group">
                    <label for="qna-difficulty">Difficulty Level</label>
                    <select id="qna-difficulty" name="difficulty" required>
                        <option value="easy">Easy - Basic concepts & definitions</option>
                        <option value="medium" selected>Medium - Application & analysis</option>
                        <option value="hard">Hard - Advanced concepts & synthesis</option>
                    </select>
                </div>
                <button type="submit" id="start-qna-btn" class="btn">
                    <i class="fas fa-play"></i> Start Quiz
                </button>
            </form>
        </div>
    `;
    
    // Re-add event listener
    const form = document.getElementById('qna-form');
    if (form) {
        form.addEventListener('submit', startQnASession);
    }
}

function startNewQuiz() {
    resetQnA();
}

function showPointsNotification(points) {
    const notification = document.createElement('div');
    notification.className = 'points-notification';
    notification.innerHTML = `
        <i class="fas fa-star"></i>
        <span>+${points} Points Earned!</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ============================================================================
// POINTS FUNCTIONS
// ============================================================================

async function loadPointsHistory() {
    console.log('Loading points history...');
    try {
        const response = await fetch('/api/points/transactions');
        console.log('Points response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Points data:', data);
        
        if (data.success) {
            renderPointsHistory(data.transactions);
        } else {
            console.error('API returned error:', data.error);
            showAlert('Failed to load points history: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Failed to load points history:', error);
        showAlert('Failed to load points history: ' + error.message, 'error');
    }
}

function renderPointsHistory(transactions) {
    console.log('Rendering points history:', transactions);
    const container = document.querySelector('#points .tab-content');
    if (!container) {
        console.error('Points container not found!');
        return;
    }
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = `
            <div class="card">
                <p>No points transactions yet.</p>
            </div>
        `;
        console.log('No points transactions to display');
        return;
    }
    
    const transactionsHTML = transactions.map(transaction => `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">${transaction.reason}</h3>
                <span class="badge ${transaction.amount > 0 ? 'badge-success' : 'badge-warning'}">
                    ${transaction.amount > 0 ? '+' : ''}${transaction.amount} points
                </span>
            </div>
            <p><strong>Date:</strong> ${formatDate(transaction.created_at)}</p>
        </div>
    `).join('');
    
    container.innerHTML = transactionsHTML;
    console.log('Points history rendered successfully');
}

// ============================================================================
// ANIMATION FUNCTIONS
// ============================================================================

function initializeAnimations() {
    console.log('Initializing animations...');
    try {
        // Animate feature cards on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        });

        const featureCards = document.querySelectorAll('.feature-card');
        console.log('Found feature cards:', featureCards.length);
        
        featureCards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });
        
        console.log('Animations initialized successfully');
    } catch (error) {
        console.error('Error initializing animations:', error);
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // Initialize animations
    initializeAnimations();
    
    // Check authentication if on protected pages
    if (window.location.pathname.includes('dashboard')) {
        console.log('Dashboard detected, checking auth...');
        checkAuthStatus();
    }
    
    // Add event listeners for forms
    setupEventListeners();
});

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Learning topics form
    const learningForm = document.getElementById('learning-form');
    if (learningForm) {
        learningForm.addEventListener('submit', addLearningTopic);
        console.log('Learning form listener added');
    } else {
        console.warn('Learning form not found');
    }
    
    // Doubts form
    const doubtForm = document.getElementById('doubt-form');
    if (doubtForm) {
        doubtForm.addEventListener('submit', submitDoubt);
        console.log('Doubt form listener added');
        
        // Add file upload preview functionality
        const doubtImageInput = document.getElementById('doubt-image');
        if (doubtImageInput) {
            doubtImageInput.addEventListener('change', handleFileUpload);
            console.log('Doubt image upload listener added');
        }
    } else {
        console.warn('Doubt form not found');
    }
    
    // Chat form
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', sendChatMessage);
        console.log('Chat form listener added');
    } else {
        console.warn('Chat form not found');
    }
    
    // Flashcard form
    const flashcardForm = document.getElementById('flashcardForm');
    if (flashcardForm) {
        flashcardForm.addEventListener('submit', generateFlashcards);
        console.log('Flashcard form listener added');
    } else {
        console.warn('Flashcard form not found');
    }
    
    // QnA form
    const qnaForm = document.getElementById('qna-form');
    if (qnaForm) {
        qnaForm.addEventListener('submit', startQnASession);
        console.log('QnA form listener added');
    } else {
        console.warn('QnA form not found');
    }
}

// ============================================================================
// DOUBT FEEDBACK FUNCTIONS
// ============================================================================

async function loadMyDoubts() {
    console.log('Loading my doubts...');
    try {
        const response = await fetch('/api/doubts');
        console.log('My doubts response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('My doubts data:', data);
        
        if (data.success) {
            renderMyDoubts(data.doubts);
        } else {
            console.error('API returned error:', data.error);
            showAlert('Failed to load doubts: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Failed to load my doubts:', error);
        showAlert('Failed to load doubts: ' + error.message, 'error');
    }
}

function renderMyDoubts(doubts) {
    console.log('Rendering my doubts:', doubts);
    const container = document.getElementById('my-doubts-container');
    if (!container) {
        console.error('My doubts container not found!');
        return;
    }
    
    if (!doubts || doubts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox" style="font-size: 3rem; color: #6c757d; margin-bottom: 20px;"></i>
                <h3>No Doubts Yet</h3>
                <p>Submit your first doubt above to get help from teachers!</p>
            </div>
        `;
        console.log('No doubts to display');
        return;
    }
    
    const doubtsHTML = doubts.map(doubt => `
        <div class="doubt-item ${doubt.status}">
            <div class="doubt-header">
                <h4>${doubt.topic}</h4>
                <span class="status-badge ${doubt.status}">${doubt.status}</span>
            </div>
            <p class="doubt-question"><strong>Question:</strong> ${doubt.question}</p>
            ${doubt.question_image ? `
                <div class="question-image">
                    <h6><i class="fas fa-image"></i> Question Image:</h6>
                    <img src="/uploads/questions/${doubt.question_image}" alt="Question Image" style="max-width: 100%; max-height: 300px; border-radius: 8px; margin: 10px 0;">
                </div>
            ` : ''}
            <p class="doubt-date"><strong>Submitted:</strong> ${formatDate(doubt.created_at)}</p>
            
            ${doubt.answer ? `
                <div class="teacher-answer">
                    <h5><i class="fas fa-chalkboard-teacher"></i> Teacher's Answer:</h5>
                    <p>${doubt.answer}</p>
                    ${doubt.answer_image ? `
                        <div class="answer-image">
                            <h6><i class="fas fa-image"></i> Answer Image:</h6>
                            <img src="/uploads/answers/${doubt.answer_image}" alt="Answer Image" style="max-width: 100%; max-height: 300px; border-radius: 8px; margin: 10px 0;">
                        </div>
                    ` : ''}
                    <p class="answer-date"><small>Answered: ${formatDate(doubt.answered_at)}</small></p>
                    
                    ${doubt.status === 'answered' && !doubt.upvoted && !doubt.downvoted ? `
                        <div class="feedback-section">
                            <h6>Was this answer helpful?</h6>
                            <div class="feedback-buttons">
                                <button class="btn btn-success" onclick="rateAnswer(${doubt.id}, true)">
                                    <i class="fas fa-thumbs-up"></i> Yes, Upvote
                                </button>
                                <button class="btn btn-warning" onclick="showCommentForm(${doubt.id})">
                                    <i class="fas fa-thumbs-down"></i> No, Downvote
                                </button>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${doubt.upvoted ? `
                        <div class="upvote-success">
                            <i class="fas fa-check-circle text-success"></i> 
                            <strong>Thank you for the upvote! Teacher earned 10 points.</strong>
                            <span class="rating-badge">✓ Resolved</span>
                        </div>
                    ` : ''}
                    
                    ${doubt.downvoted ? `
                        <div class="communication-section">
                            <h6>Communication with Teacher</h6>
                            ${doubt.student_comment ? `
                                <div class="student-comment">
                                    <strong>Your Comment:</strong> ${doubt.student_comment}
                                </div>
                            ` : ''}
                            ${doubt.teacher_reply ? `
                                <div class="teacher-reply">
                                    <strong>Teacher's Reply:</strong> ${doubt.teacher_reply}
                                </div>
                            ` : ''}
                            
                            ${!doubt.final_upvoted ? `
                                <div class="final-feedback">
                                    <h6>Final Rating</h6>
                                    <div class="rating-input">
                                        <label>Rate the final solution:</label>
                                        <select id="final-rating-${doubt.id}">
                                            <option value="1">1 Star</option>
                                            <option value="2">2 Stars</option>
                                            <option value="3">3 Stars</option>
                                            <option value="4">4 Stars</option>
                                            <option value="5">5 Stars</option>
                                        </select>
                                    </div>
                                    <button class="btn btn-primary" onclick="submitFinalRating(${doubt.id})">
                                        Submit Final Rating
                                    </button>
                                </div>
                            ` : `
                                <div class="final-rating-display">
                                    <strong>Final Rating:</strong> ${doubt.final_rating}/5 stars
                                    <span class="rating-badge">✓ Resolved</span>
                                </div>
                            `}
                        </div>
                    ` : ''}
                </div>
            ` : `
                <div class="waiting-status">
                    <i class="fas fa-clock"></i> Waiting for teacher response...
                </div>
            `}
        </div>
    `).join('');
    
    container.innerHTML = doubtsHTML;
    console.log('My doubts rendered successfully');
}

function showCommentForm(doubtId) {
    // Replace the feedback section with a comment form
    const feedbackSection = document.querySelector(`[onclick="showCommentForm(${doubtId})"]`).closest('.feedback-section');
    feedbackSection.innerHTML = `
        <div class="comment-form">
            <h6>Please provide feedback</h6>
            <div class="form-group">
                <label>Rate the answer (1-5 stars):</label>
                <select id="rating-${doubtId}" class="form-control">
                    <option value="1">1 Star - Very Poor</option>
                    <option value="2">2 Stars - Poor</option>
                    <option value="3" selected>3 Stars - Average</option>
                    <option value="4">4 Stars - Good</option>
                    <option value="5">5 Stars - Excellent</option>
                </select>
            </div>
            <div class="form-group">
                <label>Your Comment:</label>
                <textarea id="comment-${doubtId}" class="form-control" rows="3" placeholder="Please explain why the answer wasn't helpful..."></textarea>
            </div>
            <div class="form-actions">
                <button class="btn btn-primary" onclick="submitComment(${doubtId})">
                    <i class="fas fa-paper-plane"></i> Submit Feedback
                </button>
                <button class="btn btn-secondary" onclick="cancelComment(${doubtId})">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
}

function cancelComment(doubtId) {
    // Reload the doubts to restore original feedback section
    loadMyDoubts();
}

async function submitComment(doubtId) {
    const rating = parseInt(document.getElementById(`rating-${doubtId}`).value);
    const comment = document.getElementById(`comment-${doubtId}`).value.trim();
    
    if (!comment) {
        showAlert('Please provide a comment explaining your feedback', 'error');
        return;
    }
    
    if (rating < 1 || rating > 5) {
        showAlert('Please enter a valid rating between 1 and 5', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/student/rate-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doubt_id: doubtId,
                rating: rating,
                upvoted: false,
                comment: comment
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            showAlert('Feedback submitted. Teacher will reply soon.');
            loadMyDoubts(); // Refresh the doubts display
        } else {
            showAlert(data.error || 'Failed to submit feedback', 'error');
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showAlert('Failed to submit feedback: ' + error.message, 'error');
    }
}

async function rateAnswer(doubtId, upvoted) {
    // Prevent multiple submissions
    if (ratingSubmitting) {
        console.log('Rating submission already in progress...');
        return;
    }
    
    console.log('Rating answer:', doubtId, 'Upvoted:', upvoted);
    ratingSubmitting = true;
    
    try {
        const response = await fetch('/api/student/rate-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doubt_id: doubtId,
                rating: 5, // Default 5 stars for upvote
                upvoted: true,
                comment: ''
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            showAlert('Thank you for the upvote! Teacher earned 10 points.');
            loadMyDoubts(); // Refresh the doubts display
        } else {
            showAlert(data.error || 'Failed to submit rating', 'error');
        }
    } catch (error) {
        console.error('Error rating answer:', error);
        showAlert('Failed to submit rating: ' + error.message, 'error');
    } finally {
        ratingSubmitting = false;
    }
}

// Track submission state to prevent multiple submissions
let finalRatingSubmitting = false;
let ratingSubmitting = false;

async function submitFinalRating(doubtId) {
    // Prevent multiple submissions
    if (finalRatingSubmitting) {
        console.log('Final rating submission already in progress...');
        return;
    }
    
    console.log('Submitting final rating for doubt:', doubtId);
    finalRatingSubmitting = true;
    
    // Disable the submit button
    const submitButton = document.querySelector(`button[onclick="submitFinalRating(${doubtId})"]`);
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
    }
    
    const ratingSelect = document.getElementById(`final-rating-${doubtId}`);
    const rating = parseInt(ratingSelect.value);
    const upvoted = rating >= 4; // Consider 4-5 stars as upvote
    
    try {
        const response = await fetch('/api/student/final-rating', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doubt_id: doubtId,
                final_rating: rating,
                final_upvoted: upvoted
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            showAlert(upvoted ? 'Final rating submitted! Teacher earned 10 points.' : 'Final rating submitted.');
            loadMyDoubts(); // Refresh the doubts display
        } else {
            showAlert(data.error || 'Failed to submit final rating', 'error');
        }
    } catch (error) {
        console.error('Error submitting final rating:', error);
        showAlert('Failed to submit final rating: ' + error.message, 'error');
    } finally {
        // Re-enable the submit button
        finalRatingSubmitting = false;
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Final Rating';
        }
    }
}

// ============================================================================
// FILE UPLOAD HANDLING FUNCTIONS
// ============================================================================

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const filePreview = document.getElementById('file-preview');
    if (!filePreview) return;
    
    // Check file size (16MB limit)
    if (file.size > 16 * 1024 * 1024) {
        showAlert('File size must be less than 16MB', 'error');
        event.target.value = '';
        return;
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        showAlert('Please upload only JPG, PNG, GIF, or PDF files', 'error');
        event.target.value = '';
        return;
    }
    
    // Create preview
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            filePreview.innerHTML = `
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <button class="remove-file" onclick="removeFile('doubt-image')">Remove</button>
                </div>
                <img src="${e.target.result}" alt="Preview">
            `;
            filePreview.classList.add('has-file');
        };
        reader.readAsDataURL(file);
    } else {
        // PDF file
        filePreview.innerHTML = `
            <div class="file-info">
                <span class="file-name">${file.name}</span>
                <button class="remove-file" onclick="removeFile('doubt-image')">Remove</button>
            </div>
            <div style="padding: 20px; text-align: center; background: #f1f5f9; border-radius: 6px;">
                <i class="fas fa-file-pdf" style="font-size: 3rem; color: #ef4444;"></i>
                <p style="margin: 10px 0 0 0; font-weight: 600;">PDF Document</p>
                <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #6c757d;">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
        `;
        filePreview.classList.add('has-file');
    }
}

function removeFile(inputId) {
    const input = document.getElementById(inputId);
    const filePreview = document.getElementById('file-preview');
    
    if (input) input.value = '';
    if (filePreview) {
        filePreview.innerHTML = '';
        filePreview.classList.remove('has-file');
    }
}