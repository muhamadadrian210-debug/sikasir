import sys

css_path = 'public/css/app.css'

# CSS yang harus ditambahkan
new_css = '''
/* ============ Modal Overlay (untuk 3 opsi tambah produk, AI modal) ============ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgb(30 58 95 / 0.5);
  backdrop-filter: blur(4px);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 250;
  padding: 1rem;
}

.modal-overlay.open {
  display: flex;
}

.modal-overlay .modal-content {
  background: var(--bg);
  border-radius: var(--radius);
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.25);
  animation: popIn 0.25s ease-out;
}

/* ============ Enhanced Mobile / Tablet / Desktop Responsive ============ */

/* --- Mobile (< 640px) --- */
@media (max-width: 639px) {
  body {
    font-size: 14px;
  }

  .content {
    padding: 0.75rem;
  }

  .topbar {
    padding: 0.5rem 0.75rem;
  }

  .topbar h2 {
    font-size: 1rem;
  }

  .panel {
    padding: 0.85rem;
    border-radius: 10px;
  }

  .actions-inline {
    flex-direction: column;
  }

  .actions-inline input[type="search"] {
    max-width: 100% !important;
    width: 100% !important;
  }

  .actions-inline .btn {
    width: 100%;
    justify-content: center;
  }

  .btn {
    padding: 0.75rem 1rem;
    font-size: 0.95rem;
  }

  .grid-2 {
    grid-template-columns: 1fr !important;
  }

  .cart-total {
    font-size: 1.1rem;
  }

  /* Tabel: tampilan scrollable horizontal */
  .table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table.data {
    font-size: 0.8rem;
    min-width: 600px;
  }

  table.data th,
  table.data td {
    padding: 0.45rem 0.5rem;
    white-space: nowrap;
  }

  /* Modal overlay full screen di mobile */
  .modal-overlay .modal-content {
    max-width: 100%;
    border-radius: 14px;
    margin: 0.5rem;
  }

  .modal-backdrop .modal {
    max-width: 100%;
    border-radius: 14px;
    margin: 0.5rem;
  }

  /* Scan video bigger on mobile */
  .scan-video-wrap {
    max-width: 100%;
  }

  /* Cybersecurity grid mobile */
  .cyber-grid {
    grid-template-columns: 1fr !important;
  }

  .simulator-buttons {
    grid-template-columns: 1fr !important;
  }

  /* AI Chat Window */
  #ai-chat-window {
    width: calc(100vw - 2rem);
    right: -10px;
  }

  /* POS layout mobile */
  #view-pos .grid-2 {
    grid-template-columns: 1fr !important;
  }
}

/* --- Tablet (640px - 899px) --- */
@media (min-width: 640px) and (max-width: 899px) {
  .content {
    padding: 1rem;
  }

  .grid-2 {
    grid-template-columns: 1fr 1fr;
  }

  table.data {
    font-size: 0.85rem;
  }

  .modal-overlay .modal-content {
    max-width: 450px;
  }

  .sidebar {
    width: 220px;
  }

  /* Cyber grid tablet */
  .cyber-grid {
    grid-template-columns: 1fr !important;
  }
}

/* --- Desktop (900px+) --- */
@media (min-width: 900px) {
  .content {
    padding: 1.25rem 1.5rem;
  }

  .modal-overlay .modal-content {
    max-width: 500px;
  }
}

/* --- Large Desktop (1200px+) --- */
@media (min-width: 1200px) {
  .content {
    padding: 1.5rem 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
}

/* ============ Touch-friendly tap targets ============ */
@media (pointer: coarse) {
  .btn {
    min-height: 44px;
    min-width: 44px;
  }

  .sidebar-nav button {
    padding: 0.85rem 1.25rem;
    min-height: 48px;
  }

  table.data td .btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }

  input, select, textarea {
    font-size: 16px !important; /* Prevents zoom on iOS */
  }
}
'''

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

content += new_css

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('CSS updated successfully')
