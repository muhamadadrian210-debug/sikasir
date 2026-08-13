import { api } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('ai-chat-btn');
  const windowEl = document.getElementById('ai-chat-window');
  const closeBtn = document.getElementById('ai-chat-close');
  const form = document.getElementById('ai-chat-form');
  const input = document.getElementById('ai-chat-input');
  const messages = document.getElementById('ai-chat-messages');

  if (!btn || !windowEl || !closeBtn || !form || !input || !messages) return;

  const toggleChat = () => {
    windowEl.classList.toggle('hidden');
    if (!windowEl.classList.contains('hidden')) {
      input.focus();
    }
  };

  btn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', () => windowEl.classList.add('hidden'));

  // Keyboard shortcut: Alt+A or Ctrl+Space to toggle AI Copilot
  document.addEventListener('keydown', (e) => {
    if ((e.altKey && e.key.toLowerCase() === 'a') || (e.ctrlKey && e.code === 'Space')) {
      e.preventDefault();
      toggleChat();
    }
  });

  // Suggestion chips handler
  document.querySelectorAll('.ai-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      if (prompt) {
        input.value = prompt;
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
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
    appendMessage('✨ SiKasir AI sedang berpikir & menganalisis data...', 'bot-msg', loadingId);

    try {
      const data = await api('/ai/chat', {
        method: 'POST',
        body: { prompt },
      });

      removeMessage(loadingId);

      if (data && data.reply) {
        appendMessage(data.reply, 'bot-msg');

        // Jika AI melakukan aksi update_stock atau add_new_product, trigger refresh realtime ke UI!
        if (data.actionPerformed === 'update_stock' || data.actionPerformed === 'add_new_product') {
          console.log('[SiKasir AI] Stock/Product modified by AI. Triggering realtime UI refresh...');
          window.dispatchEvent(new CustomEvent('sikasir:product-updated', { detail: data }));
          if (typeof window.reloadProductsTable === 'function') {
            window.reloadProductsTable();
          }
        }
      } else if (data && data.error) {
        appendMessage('Error: ' + data.error, 'bot-msg text-error');
      }
    } catch (err) {
      removeMessage(loadingId);
      appendMessage(err.message || 'Koneksi AI terputus. Pastikan internet dan API key aktif.', 'bot-msg text-error');
    }
  });

  function appendMessage(text, className, id = '') {
    const div = document.createElement('div');
    div.className = `ai-msg ${className}`;
    
    // Parse simple markdown bold and newlines
    let formatted = escapeHtml(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    div.innerHTML = formatted;
    
    if (id) div.id = id;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
