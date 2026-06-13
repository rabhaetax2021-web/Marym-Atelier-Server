// Footer with WhatsApp contact button. Set VITE_WHATSAPP_SUPPORT_NUMBER in .env for your number
export default function Footer() {
  const supportNumber = import.meta.env.VITE_WHATSAPP_SUPPORT_NUMBER || '201012345678';
  const message = encodeURIComponent('مرحباً، أحتاج إلى مساعدة بخصوص الحجز.');
  const waLink = `https://wa.me/${supportNumber}?text=${message}`;

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 10000 }}>
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contact support on WhatsApp"
        title="Contact support on WhatsApp"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: 9999,
          background: '#25D366',
          boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
          border: '3px solid rgba(255,255,255,0.06)',
          textDecoration: 'none',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="white" aria-hidden>
          <path d="M20.52 3.48A11.94 11.94 0 0012 0C5.373 0 .02 5.354.02 12a11.9 11.9 0 001.67 6.01L0 24l6.15-1.61A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12 0-3.2-1.25-6.21-3.48-8.52zM12 22.1c-1.7 0-3.35-.44-4.78-1.27l-.34-.2-3.66.96.98-3.57-.22-.36A9.02 9.02 0 012.9 12c0-4.99 4.06-9.05 9.1-9.05 2.43 0 4.71.95 6.42 2.67A8.99 8.99 0 0121 12c0 4.97-4.03 9.1-9 9.1z"/>
          <path d="M17.56 14.01c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.34.22-.63.07a5.6 5.6 0 01-1.66-.99 6.86 6.86 0 01-1.27-1.58c-.13-.22-.01-.34.1-.45.1-.1.22-.27.33-.4.11-.13.15-.22.22-.37.07-.15 0-.28-.02-.4-.03-.12-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.28.3-1.06 1.04-1.06 2.53 0 1.48 1.09 2.92 1.24 3.12.15.2 2.14 3.3 5.18 4.62 3.04 1.33 3.04.89 3.59.83.55-.07 1.77-.72 2.02-1.41.25-.69.25-1.28.18-1.41-.07-.13-.27-.2-.57-.35z"/>
        </svg>
      </a>
    </div>
  );
}
