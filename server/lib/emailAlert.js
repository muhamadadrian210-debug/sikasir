const nodemailer = require('nodemailer');

function createTransport() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

async function sendAlert(subject, text) {
  const to = process.env.ALERT_EMAIL;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localhost';
  const tx = createTransport();
  if (!tx || !to) {
    console.warn('[ALERT]', subject, text);
    return;
  }
  try {
    await tx.sendMail({ from, to, subject, text });
  } catch (e) {
    console.error('sendAlert failed', e.message);
    console.warn('[ALERT fallback]', subject, text);
  }
}

module.exports = { sendAlert };
