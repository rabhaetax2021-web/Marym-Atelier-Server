import { useEffect, useState, useRef } from 'react';
import { X, Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useLang } from '../contexts/LanguageProvider';

/**
 * QRCodeModal — shown after order confirmation.
 * Displays a QR code per dress in the reservation so the client
 * can save them and scan at the atelier for dress fitting.
 *
 * Each QR encodes the dress detail page URL:  {origin}/dress/{dressId}
 */
export default function QRCodeModal({ isOpen, onClose, dresses = [] }) {
  const { t } = useLang();
  const [qrDataUrls, setQrDataUrls] = useState({});
  const containerRef = useRef(null);

  // Generate QR data URIs whenever the modal opens with dresses
  useEffect(() => {
    if (!isOpen || dresses.length === 0) return;

    const origin = window.location.origin;
    const generate = async () => {
      const map = {};
      for (const d of dresses) {
        const url = `${origin}/dress/${encodeURIComponent(d.id)}`;
        try {
          map[d.id] = await QRCode.toDataURL(url, {
            width: 280,
            margin: 2,
            color: { dark: '#0a1612', light: '#FFFFFF' },
            errorCorrectionLevel: 'M',
          });
        } catch (err) {
          console.error('QR generation error for', d.id, err);
        }
      }
      setQrDataUrls(map);
    };
    generate();
  }, [isOpen, dresses]);

  // Lock body scroll & ESC to close
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev || '';
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || dresses.length === 0) return null;

  const handleDownload = (dressId, dressName) => {
    const dataUrl = qrDataUrls[dressId];
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR-${dressName || dressId}.png`;
    a.click();
  };

  const handleDownloadAll = () => {
    for (const d of dresses) {
      handleDownload(d.id, d.name);
    }
  };

  return (
    <div
      className="qr-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="qr-modal-content"
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        dir={t('langDir') || 'rtl'}
      >
        {/* Header */}
        <div className="qr-modal-header">
          <div className="qr-modal-header-text">
            <div className="qr-modal-icon-wrapper">
              <QrCode size={22} />
            </div>
            <div>
              <h2>{t('qrModal.title')}</h2>
              <p>{t('qrModal.subtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="qr-modal-close">
            <X size={20} />
          </button>
        </div>

        {/* Body — scrollable list of QR codes */}
        <div className="qr-modal-body">
          <div className="qr-modal-instruction">
            <div className="qr-modal-instruction-icon">📱</div>
            <p>{t('qrModal.instruction')}</p>
          </div>

          <div className="qr-modal-grid">
            {dresses.map((d) => (
              <div key={d.id} className="qr-card">
                <div className="qr-card-image-row">
                  {d.images?.[0] && (
                    <img
                      src={d.images[0]}
                      alt={d.name}
                      className="qr-card-dress-thumb"
                    />
                  )}
                  <div className="qr-card-info">
                    <span className="qr-card-name">{d.name}</span>
                    <span className="qr-card-code">{d.id}</span>
                  </div>
                </div>

                <div className="qr-card-qr-wrap">
                  {qrDataUrls[d.id] ? (
                    <img
                      src={qrDataUrls[d.id]}
                      alt={`QR - ${d.name}`}
                      className="qr-card-qr-img"
                    />
                  ) : (
                    <div className="qr-card-qr-loading">
                      <div className="qr-spinner" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="qr-card-download"
                  onClick={() => handleDownload(d.id, d.name)}
                >
                  <Download size={14} />
                  {t('qrModal.downloadOne')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="qr-modal-footer">
          <button type="button" className="qr-modal-download-all" onClick={handleDownloadAll}>
            <Download size={16} />
            {t('qrModal.downloadAll')}
          </button>
          <button type="button" className="qr-modal-done" onClick={onClose}>
            {t('qrModal.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
