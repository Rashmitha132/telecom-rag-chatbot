const STORAGE_KEY = 'nokia-abc-chat-history';
  const SESSION_ID = crypto.randomUUID();
  const BACKEND_URL = 'http://127.0.0.1:8000/chat';
  const FEEDBACK_URL = 'http://127.0.0.1:8000/feedback';
  let history = [];
  let isLoading = false;
  let savedChats = [];
  let activeChatId = null;
  let menuChatId = null;
  let pendingDeleteChatId = null;

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function createChatId() {
    return 'chat-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function chatTitleFrom(messages) {
    const firstUserMessage = messages.find(msg => msg.role === 'user')?.content || '';
    const text = messages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content || '')
      .join(' ')
      .toLowerCase();

    if (/(who\s*(are|r)\s*(you|u)|what\s*(are|r)\s*(you|u)|introduce|yourself|what can you do|help me with)/.test(text)) {
      return 'Assistant Introduction';
    }
    if (/(difference|compare|comparison|versus| vs )/.test(text) && /\bmt\b/.test(text) && /\bsaf\b/.test(text) && /\bfaf\b/.test(text)) {
      return 'MT SAF FAF Comparison';
    }
    if (/(choose|select|right|best|suitable)/.test(text) && /(solution|framework|testing)/.test(text)) {
      return 'Testing Solution Selection';
    }
    if (/(calculate|estimate|requirement|how many)/.test(text) && /(\bue\b|ues|cells?|sites?)/.test(text)) {
      return 'UE Requirement Estimate';
    }
    if (/(prerequisite|dependency|before|required)/.test(text) && /\bfaf\b/.test(text)) {
      return 'FAF Prerequisites';
    }
    if (/(prerequisite|dependency|before|required)/.test(text) && /\bsaf\b/.test(text)) {
      return 'SAF Prerequisites';
    }
    if (/(manual|mt)/.test(text) && /(test|testing|validation)/.test(text)) {
      return 'Manual Testing Guidance';
    }
    if (/(sanity|saf)/.test(text) && /(automation|check|framework)/.test(text)) {
      return 'SAF Sanity Checks';
    }
    if (/(full|faf)/.test(text) && /(automation|framework|deployment)/.test(text)) {
      return 'FAF Automation Guidance';
    }
    if (/(logical design|ldd|template|documentation)/.test(text)) {
      return 'Logical Design Template';
    }
    if (/(material|inventory|estimation|estimate)/.test(text)) {
      return 'Material Inventory Estimate';
    }
    const stopWords = new Set([
      'what', 'which', 'when', 'where', 'why', 'who', 'how', 'is', 'are', 'the', 'and', 'or', 'to',
      'for', 'of', 'in', 'on', 'with', 'between', 'difference', 'explain', 'tell', 'about',
      'please', 'need', 'want', 'can', 'you', 'your', 'yourself', 'me', 'a', 'an', 'this', 'that'
    ]);
    const keywords = firstUserMessage
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word.toLowerCase()))
      .slice(0, 4);

    if (!keywords.length) return 'New chat';
    return keywords.map(word => {
      const upper = word.toUpperCase();
      if (['MT', 'SAF', 'FAF', 'UE', 'UES', 'LDD', 'ABC', 'LM'].includes(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  }

  function renderWelcomeMessage() {
    const msgs = document.getElementById('messages');
    msgs.innerHTML = `
      <div class="msg-row bot">
        <div class="avatar">AI</div>
        <div class="bubble-wrap">
          <div class="bubble">
Hi! I'm your Nokia ABC Testing assistant, powered by <strong>Llama 3.2</strong> running locally via LM Studio.

I can help you with:
- Choosing between <strong>MT</strong>, <strong>SAF</strong>, and <strong>FAF</strong> testing solutions
- Calculating UE requirements for multi-site setups
- Understanding prerequisites and dependencies
- Generating Logical Design Data templates
- Material Inventory estimations

What would you like to know?
          </div>
          <div class="msg-time" id="welcome-time">${now()}</div>
        </div>
      </div>`;
  }

  function loadSavedChats() {
    try {
      savedChats = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      savedChats = [];
    }
    savedChats = savedChats.map(chat => ({
      ...chat,
      title: chatTitleFrom(chat.messages || [])
    }));
    persistSavedChats();
    renderChatHistory();
  }

  function persistSavedChats() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedChats));
  }

  function renderChatHistory() {
    const list = document.getElementById('chat-history-list');
    if (!list) return;

    if (!savedChats.length) {
      list.innerHTML = '<div class="chat-history-empty">Your saved chats will appear here after you start a conversation.</div>';
      return;
    }

    list.innerHTML = savedChats.map(chat => `
      <div class="chat-history-item ${chat.id === activeChatId ? 'active' : ''}" onclick="openChat('${chat.id}')">
        <div class="chat-history-main">
          <span class="chat-history-title">${escapeHtml(chat.title)}</span>
          <span class="chat-history-meta">${new Date(chat.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <button class="chat-history-menu" onclick="openChatMenu(event, '${chat.id}')" aria-label="Chat options">...</button>
      </div>
    `).join('');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function saveActiveChat() {
    if (!history.length) return;

    if (!activeChatId) activeChatId = createChatId();

    const existingIndex = savedChats.findIndex(chat => chat.id === activeChatId);
    const chat = {
      id: activeChatId,
      title: chatTitleFrom(history),
      updatedAt: Date.now(),
      messages: history
    };

    if (existingIndex >= 0) savedChats.splice(existingIndex, 1);
    savedChats.unshift(chat);
    persistSavedChats();
    renderChatHistory();
  }

  function startNewChat() {
    if (isLoading) return;
    activeChatId = null;
    history = [];
    renderWelcomeMessage();
    const qp = document.getElementById('quick-prompts');
    if (qp) qp.style.display = 'flex';
    setStatus('online');
    renderChatHistory();
    textarea.focus();
  }

  function openChat(chatId) {
    if (isLoading) return;
    const chat = savedChats.find(item => item.id === chatId);
    if (!chat) return;

    activeChatId = chat.id;
    history = [...chat.messages];
    const msgs = document.getElementById('messages');
    msgs.innerHTML = '';
    // Note: message_id isn't persisted in localStorage, so feedback buttons
    // don't reappear on reopened past chats -- only on fresh replies.
    history.forEach(msg => addMessage(msg.role === 'user' ? 'user' : 'bot', msg.content));
    const qp = document.getElementById('quick-prompts');
    if (qp) qp.style.display = 'none';
    setStatus('online');
    renderChatHistory();
  }

  function openChatMenu(event, chatId) {
    event.stopPropagation();
    const chat = savedChats.find(item => item.id === chatId);
    if (!chat) return;

    menuChatId = chatId;
    const menu = document.getElementById('chat-action-menu');
    const rect = event.currentTarget.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${Math.max(12, rect.right - 132)}px`;
    menu.classList.add('show');
  }

  function closeChatMenu() {
    menuChatId = null;
    document.getElementById('chat-action-menu').classList.remove('show');
  }

  function requestDeleteChat() {
    const chat = savedChats.find(item => item.id === menuChatId);
    if (!chat) return;

    pendingDeleteChatId = menuChatId;
    document.getElementById('delete-chat-title').textContent = `"${chat.title}"`;
    closeChatMenu();
    document.getElementById('delete-modal').classList.add('show');
  }

  function closeDeleteModal() {
    pendingDeleteChatId = null;
    document.getElementById('delete-modal').classList.remove('show');
  }

  function confirmDeleteChat() {
    if (!pendingDeleteChatId) return;
    const chatId = pendingDeleteChatId;

    savedChats = savedChats.filter(item => item.id !== chatId);
    persistSavedChats();

    if (activeChatId === chatId) {
      activeChatId = null;
      history = [];
      renderWelcomeMessage();
      const qp = document.getElementById('quick-prompts');
      if (qp) qp.style.display = 'flex';
    }

    closeDeleteModal();
    renderChatHistory();
  }

  function setStatus(state) {
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    dot.className = 'status-dot ' + (state === 'online' ? '' : state === 'loading' ? 'loading' : 'offline');
    text.textContent = state === 'online' ? 'Connected' : state === 'loading' ? 'Thinking...' : 'Offline';
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle('theme-dark');
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = isDark ? 'Light Theme' : 'Dark Theme';
  }

  function usePrompt(btn) {
    const input = document.getElementById('user-input');
    input.value = btn.textContent;
    autoResize(input);
    input.focus();
  }

  function clearChat() {
    if (activeChatId) {
      savedChats = savedChats.filter(chat => chat.id !== activeChatId);
      persistSavedChats();
    }
    activeChatId = null;
    history = [];
    renderWelcomeMessage();
    const qp = document.getElementById('quick-prompts');
    if (qp) qp.style.display = 'flex';
    setStatus('online');
    renderChatHistory();
  }

  function addMessage(role, text, messageId) {
    const msgs = document.getElementById('messages');
    const row = document.createElement('div');
    row.className = 'msg-row ' + role;

    const av = document.createElement('div');
    av.className = 'avatar';
    av.textContent = role === 'user' ? 'You' : 'AI';

    const wrap = document.createElement('div');
    wrap.className = 'bubble-wrap';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;

    const time = document.createElement('div');
    time.className = 'msg-time';
    time.textContent = now();

    wrap.appendChild(bubble);

    // Only bot replies that came from a real backend call (have a messageId)
    // get feedback buttons -- the static welcome message doesn't.
    if (role === 'bot' && messageId) {
      const feedbackRow = document.createElement('div');
      feedbackRow.className = 'feedback-row';
      feedbackRow.dataset.messageId = messageId;
      feedbackRow.innerHTML = `
        <button class="feedback-btn" data-rating="up" onclick="handleFeedbackClick(this)" aria-label="Good response">👍</button>
        <button class="feedback-btn" data-rating="down" onclick="handleFeedbackClick(this)" aria-label="Bad response">👎</button>
      `;
      wrap.appendChild(feedbackRow);
    }

    wrap.appendChild(time);
    row.appendChild(av);
    row.appendChild(wrap);
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
    return bubble;
  }

  function handleFeedbackClick(btnEl) {
    if (btnEl.classList.contains('active')) return; // already selected, no-op

    const row = btnEl.closest('.feedback-row');
    const messageId = Number(row.dataset.messageId);
    const rating = btnEl.dataset.rating;
    const buttons = row.querySelectorAll('.feedback-btn');

    // Allow switching your mind: clear the other button's active state
    buttons.forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');

    // Remove any existing comment box (e.g. switching from down -> up)
    const existingBox = row.parentElement.querySelector('.feedback-comment-box');
    if (existingBox) existingBox.remove();

    if (rating === 'down') {
      // Thumbs down: ask what could be improved before saving anything
      const box = document.createElement('div');
      box.className = 'feedback-comment-box';
      box.innerHTML = `
        <input type="text" class="feedback-comment-input" placeholder="What could be improved? (optional)" />
        <button class="feedback-submit-btn" onclick="submitFeedback(${messageId}, 'down', this)">Submit</button>
      `;
      row.insertAdjacentElement('afterend', box);
      box.querySelector('.feedback-comment-input').focus();
    } else {
      // Thumbs up: no comment needed, save immediately
      submitFeedback(messageId, 'up', null);
    }
  }

  async function submitFeedback(messageId, rating, submitBtnEl) {
    let comment = null;
    let box = null;

    if (submitBtnEl) {
      box = submitBtnEl.closest('.feedback-comment-box');
      const input = box.querySelector('.feedback-comment-input');
      comment = input.value.trim() || null;
      submitBtnEl.disabled = true;
      submitBtnEl.textContent = 'Saving...';
    }

    try {
      const res = await fetch(FEEDBACK_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId,
          session_id: SESSION_ID,
          rating: rating,
          comment: comment
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      if (box) {
        box.innerHTML = '<span class="feedback-saved-note">Thanks for the feedback!</span>';
      }

    } catch (err) {
      console.error('Feedback failed:', err.message);
      if (submitBtnEl) {
        submitBtnEl.disabled = false;
        submitBtnEl.textContent = 'Submit';
      }
    }
  }

  function showTyping() {
    const msgs = document.getElementById('messages');
    const row = document.createElement('div');
    row.className = 'msg-row bot';
    row.id = 'typing-row';
    row.innerHTML = `
      <div class="avatar">AI</div>
      <div class="bubble-wrap">
        <div class="bubble">
          <div class="typing-bubble">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>`;
    msgs.appendChild(row);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('typing-row');
    if (t) t.remove();
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 130) + 'px';
  }

  const textarea = document.getElementById('user-input');
  textarea.addEventListener('input', () => autoResize(textarea));
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  document.getElementById('delete-modal').addEventListener('click', e => {
    if (e.target.id === 'delete-modal') closeDeleteModal();
  });
  document.addEventListener('click', e => {
    const menu = document.getElementById('chat-action-menu');
    if (!menu.contains(e.target)) closeChatMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeChatMenu();
      closeDeleteModal();
    }
  });

  async function sendMessage() {
    if (isLoading) return;
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    input.style.height = 'auto';
    document.getElementById('send-btn').disabled = true;
    isLoading = true;

    // Hide quick prompts after first message
    const qp = document.getElementById('quick-prompts');
    if (qp) qp.style.display = 'none';

    addMessage('user', text);
    history.push({ role: 'user', content: text });
    saveActiveChat();
    setStatus('loading');
    showTyping();

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: SESSION_ID
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      removeTyping();

      const reply = data.answer || 'No response received.';
      addMessage('bot', reply, data.message_id);

      history.push({ role: 'assistant', content: reply });
      saveActiveChat();
      setStatus('online');

    } catch (err) {
      removeTyping();
      const errorReply = `Could not reach the chatbot backend.\n\nMake sure:\n1. Your FastAPI server is running (uvicorn main:app --reload)\n2. LM Studio is open with its local server started\n3. MySQL is running\n\nError: ${err.message}`;
      history.push({ role: 'assistant', content: errorReply });
      addMessage('bot', errorReply);
      saveActiveChat();
      setStatus('offline');
    }

    document.getElementById('send-btn').disabled = false;
    isLoading = false;
    textarea.focus();
  }

  renderWelcomeMessage();
  loadSavedChats();
  setStatus('online');