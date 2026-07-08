import { api } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('ai-chat-btn');
  const windowEl = document.getElementById('ai-chat-window');
  const closeBtn = document.getElementById('ai-chat-close');
  const form = document.getElementById('ai-chat-form');
  const input = document.getElementById('ai-chat-input');
  const messages = document.getElementById('ai-chat-messages');

  if (!btn || !windowEl || !closeBtn || !form || !input || !messages) return;

  btn.addEventListener('click', () => {
    windowEl.classList.toggle('hidden');
    if (!windowEl.classList.contains('hidden')) {
      input.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    windowEl.classList.add('hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) return;

    // Tambah pesan user
    appendMessage(prompt, 'user-msg');
    input.value = '';

    // Munculin animasi loading
    const loadingId = 'loading-' + Date.now();
    appendMessage('Sedang memproses...', 'bot-msg', loadingId);

    try {
      // Gunakan fungsi api() yang sudah handle CSRF & Signature di SiKasir
      const data = await api('/ai/chat', {
        method: 'POST',
        body: { prompt }
      });

      removeMessage(loadingId);

      if (data && data.reply) {
        appendMessage(data.reply, 'bot-msg');
      } else if (data && data.error) {
        appendMessage('Error: ' + data.error, 'bot-msg text-error');
      }
    } catch (err) {
      removeMessage(loadingId);
      appendMessage(err.message || 'Wah koneksi error nih, coba lagi ya.', 'bot-msg text-error');
    }
  });

  function appendMessage(text, className, id = '') {
    const div = document.createElement('div');
    div.className = `ai-msg ${className}`;
    div.textContent = text;
    if (id) div.id = id;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }
});
