/* ═══════════════════════════════════════════
   BEYOND THE SCALE — DIY Guide
   Chat interface logic
   ═══════════════════════════════════════════ */

const messagesEl  = document.getElementById('messages');
const inputEl     = document.getElementById('user-input');
const sendBtn     = document.getElementById('send-btn');
const startersEl  = document.getElementById('starters');

// Conversation history sent to the API (excludes system prompt — handled server-side)
let history = [];
let isLoading = false;

// ── AUTO-RESIZE TEXTAREA ──────────────────
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
});

// ── SEND ON ENTER (shift+enter for newline) ──
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

// ── STARTER BUTTONS ───────────────────────
document.querySelectorAll('.starter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const q = btn.dataset.q;
    inputEl.value = q;
    sendMessage();
  });
});

// ── SEND MESSAGE ─────────────────────────
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || isLoading) return;

  // Hide starters after first message
  if (startersEl) startersEl.style.display = 'none';

  // Append user bubble
  appendMessage('user', text);
  history.push({ role: 'user', content: text });

  // Clear input
  inputEl.value = '';
  inputEl.style.height = 'auto';

  // Show typing indicator
  const typingEl = appendTyping();
  isLoading = true;
  sendBtn.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });

    const data = await res.json().catch(() => ({}));

    typingEl.remove();

    if (!res.ok) {
      appendMessage('guide', 'I\'m sorry, something went wrong. Please try again in a moment.');
      return;
    }

    const reply = data.reply || '';
    appendMessage('guide', reply, data.showReferral);
    history.push({ role: 'assistant', content: reply });

  } catch {
    typingEl.remove();
    appendMessage('guide', 'I\'m having trouble connecting right now. Please check your connection and try again.');
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

// ── APPEND MESSAGE ────────────────────────
function appendMessage(role, text, showReferral = false) {
  const wrap = document.createElement('div');
  wrap.className = `message message--${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message__avatar';
  avatar.textContent = role === 'guide' ? 'G' : 'You';

  const bubble = document.createElement('div');
  bubble.className = 'message__bubble';

  if (role === 'guide') {
    bubble.innerHTML = formatMarkdown(text);

    if (showReferral) {
      const nudge = document.createElement('div');
      nudge.className = 'referral-nudge';
      nudge.innerHTML = 'Ready to take the next step? <a href="https://www.beyondthescaleclinic.co.za" target="_blank" rel="noopener">Book a consultation</a> with the Beyond the Scale clinical team.';
      bubble.appendChild(nudge);
    }
  } else {
    bubble.textContent = text;
  }

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });

  return wrap;
}

// ── TYPING INDICATOR ──────────────────────
function appendTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'message message--guide';

  const avatar = document.createElement('div');
  avatar.className = 'message__avatar';
  avatar.textContent = 'G';

  const bubble = document.createElement('div');
  bubble.className = 'message__bubble';

  const dots = document.createElement('div');
  dots.className = 'typing';
  dots.innerHTML = '<span></span><span></span><span></span>';

  bubble.appendChild(dots);
  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  wrap.scrollIntoView({ behavior: 'smooth', block: 'end' });

  return wrap;
}

// ── SIMPLE MARKDOWN FORMATTER ─────────────
function formatMarkdown(text) {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Headings (##)
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    // Unordered lists
    .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Numbered lists
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    // Paragraphs (double newlines)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^(?!<[hul])/, '<p>')
    .replace(/(?<!\>)$/, '</p>')
    // Single newlines within a paragraph
    .replace(/\n/g, '<br>');
}
