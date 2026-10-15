/**
 * AI Study Advisor Chat Widget & Controller
 */

const ChatManager = {
  history: [],
  aiStatus: { watsonxConfigured: false, activeMode: 'demo' },

  init() {
    this.history = StorageManager.getChatHistory();
    this.bindEvents();
    this.checkAiStatus();
    this.renderMessages();

    // If chat is empty, send an initial greeting
    if (this.history.length === 0) {
      this.addMessage(
        'bot',
        `👋 **Welcome to StudyMate AI!**\n\nI am your personalized college study planning coach. I can help you prioritize tough units, establish spaced revision cycles, plan around your exam deadlines, and conquer study fatigue.\n\nTry clicking any of the suggested prompt chips below or type your question!`
      );
    }
  },

  bindEvents() {
    const sendBtn = document.getElementById('chat-send-btn');
    const inputField = document.getElementById('chat-input-field');
    const clearBtn = document.getElementById('chat-clear-btn');

    if (sendBtn && inputField) {
      sendBtn.addEventListener('click', () => this.sendMessage());
      inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearHistory());
    }

    // Quick chip buttons
    const chips = document.querySelectorAll('.chip-btn');
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        const promptText = e.target.getAttribute('data-prompt') || e.target.textContent.trim();
        if (inputField) {
          inputField.value = promptText;
          this.sendMessage();
        }
      });
    });
  },

  async checkAiStatus() {
    try {
      const res = await fetch('/api/chat/status');
      if (res.ok) {
        this.aiStatus = await res.json();
        this.updateAiBadge();
      }
    } catch (e) {
      console.warn('Could not fetch AI status, defaulting to demo mode:', e);
      this.updateAiBadge();
    }
  },

  updateAiBadge() {
    const badge = document.getElementById('ai-status-badge');
    const badgeText = document.getElementById('ai-status-text');
    const noticeBanner = document.getElementById('chat-mode-notice-banner');
    const noticeIcon = document.getElementById('chat-mode-notice-icon');
    const noticeText = document.getElementById('chat-mode-notice-text');

    if (this.aiStatus.watsonxConfigured) {
      if (badge) {
        badge.className = 'ai-badge watsonx';
        badge.title = `Model: ${this.aiStatus.modelId || 'IBM Granite'}`;
      }
      if (badgeText) badgeText.textContent = 'IBM watsonx.ai Connected';
      if (noticeBanner) noticeBanner.className = 'ai-mode-notice watsonx';
      if (noticeIcon) noticeIcon.textContent = '✨';
      if (noticeText) noticeText.textContent = `Real AI Connected: Powered by IBM watsonx.ai foundation model (${this.aiStatus.modelId || 'ibm/granite-13b-chat-v2'}).`;
    } else {
      if (badge) {
        badge.className = 'ai-badge demo';
        badge.title = 'IBM watsonx.ai credentials not configured in .env. Running on built-in Heuristic Advisor.';
      }
      if (badgeText) badgeText.textContent = 'AI Demo Mode (watsonx.ai not connected)';
      if (noticeBanner) noticeBanner.className = 'ai-mode-notice demo';
      if (noticeIcon) noticeIcon.textContent = 'ℹ️';
      if (noticeText) noticeText.textContent = 'Offline Demo Mode: IBM watsonx.ai credentials are not configured in .env. Running on built-in Heuristic Academic Advisor with active recall & follow-up questions.';
    }
  },

  buildStudentContext() {
    const subjects = StorageManager.getSubjects();
    let totalTopics = 0;
    let completedTopics = 0;
    let hardTopicsCount = 0;

    subjects.forEach(s => {
      (s.units || []).forEach(u => {
        (u.topics || []).forEach(t => {
          totalTopics++;
          if (t.completed) completedTopics++;
          if (t.difficulty === 'Hard' && !t.completed) hardTopicsCount++;
        });
      });
    });

    const completionPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const dailyHours = StorageManager.getDailyHours();

    return {
      totalSubjects: subjects.length,
      completionPercentage,
      dailyHours,
      pendingTopics: totalTopics - completedTopics,
      hardTopicsCount,
      subjects: subjects.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        examDate: s.examDate,
        units: (s.units || []).map(u => ({
          id: u.id,
          title: u.title,
          difficulty: u.difficulty,
          completed: u.completed,
          topics: (u.topics || []).map(t => ({
            id: t.id,
            name: typeof t === 'string' ? t : t.name,
            difficulty: t.difficulty,
            completed: t.completed
          }))
        }))
      }))
    };
  },

  async sendMessage() {
    const inputField = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('chat-send-btn');
    if (!inputField) return;

    const message = inputField.value.trim();
    if (!message) return;

    // Render user message
    this.addMessage('user', message);
    inputField.value = '';

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = 'Thinking...';
    }

    // Add typing placeholder
    const typingIndicator = this.showTypingIndicator();

    try {
      const studentContext = this.buildStudentContext();
      const historyContext = this.history.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: historyContext,
          studentContext
        })
      });

      const data = await response.json();
      this.removeTypingIndicator(typingIndicator);

      if (response.ok && data.success) {
        this.addMessage('bot', data.reply, data.mode);
      } else {
        const errorMsg = data.errors ? data.errors.join(' ') : (data.message || 'Error communicating with AI service.');
        this.addMessage('bot', `⚠️ **Error:** ${errorMsg}\n\nPlease try again or check your server configuration.`);
      }
    } catch (err) {
      this.removeTypingIndicator(typingIndicator);
      console.error('Chat request error:', err);
      this.addMessage('bot', '⚠️ Connection failed. Please check if your backend server is running on `http://localhost:3000`.');
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = 'Send';
      }
      inputField.focus();
    }
  },

  addMessage(sender, text, mode = null) {
    const msgObj = {
      id: 'msg_' + Date.now(),
      sender,
      text,
      mode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    this.history.push(msgObj);
    StorageManager.saveChatHistory(this.history);
    this.appendMessageElement(msgObj);
    this.scrollToBottom();
  },

  showTypingIndicator() {
    const container = document.getElementById('chat-messages-container');
    if (!container) return null;

    const div = document.createElement('div');
    div.className = 'chat-msg bot typing-node';
    div.innerHTML = `
      <div class="msg-bubble" style="color: var(--text-muted); font-style: italic;">
        StudyMate AI is drafting advice...
      </div>
    `;
    container.appendChild(div);
    this.scrollToBottom();
    return div;
  },

  removeTypingIndicator(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  },

  renderMessages() {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    container.innerHTML = '';
    this.history.forEach(msg => {
      this.appendMessageElement(msg);
    });
    this.scrollToBottom();
  },

  appendMessageElement(msg) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-msg ${msg.sender}`;

    const formattedContent = this.formatMarkdown(msg.text);
    const modeBadge = msg.mode === 'watsonx' 
      ? '<span style="color:#2563eb; font-weight:600;">[watsonx.ai]</span> ' 
      : (msg.mode === 'demo' ? '<span style="color:#059669; font-weight:600;">[Demo Mode]</span> ' : '');

    div.innerHTML = `
      <div class="msg-bubble">
        ${formattedContent}
      </div>
      <div class="msg-meta">
        ${modeBadge}${msg.timestamp || ''}
      </div>
    `;

    container.appendChild(div);
  },

  formatMarkdown(raw) {
    if (!raw) return '';
    let text = escapeHtml(raw);

    // Headers: ### Header
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^# (.*$)/gim, '<h3>$1</h3>');

    // Bold: **text**
    text = text.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

    // Italics: *text*
    text = text.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // Bullet points: - item or * item
    text = text.replace(/^\s*[-•]\s+(.*)$/gim, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
    // Clean nested ul if consecutive
    text = text.replace(/<\/ul>\s*<ul>/gims, '');

    // Numbered lists: 1. item
    text = text.replace(/^\s*(\d+)\.\s+(.*)$/gim, '<li>$2</li>');

    // Paragraph line breaks
    text = text.replace(/\n\n/g, '<br/><br/>');
    text = text.replace(/\n/g, '<br/>');

    return text;
  },

  clearHistory() {
    if (confirm('Clear entire study advisor chat history?')) {
      this.history = [];
      StorageManager.clearChatHistory();
      this.renderMessages();
      this.addMessage('bot', 'Chat history cleared. How can I help you today?');
    }
  },

  scrollToBottom() {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
};
