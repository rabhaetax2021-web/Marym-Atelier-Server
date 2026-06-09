import { useEffect } from 'react';
import { useLang } from '../contexts/LanguageProvider';
import { createPortal } from 'react-dom';
import { X, CalendarX } from 'lucide-react';

export default function RentedDateModal({ isOpen, onClose, dressName, rentDate }) {
  const { t, lang } = useLang();
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

  if (!isOpen) return null;

  return createPortal(
    <div className="rented-date-overlay" onClick={onClose}>
      <div className="rented-date-panel" onClick={(e) => e.stopPropagation()} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <button type="button" className="rented-date-close" onClick={onClose} aria-label="إغلاق">
          <X size={20} />
        </button>
        <div className="rented-date-icon">
          <CalendarX size={36} />
        </div>
        <h2>{t('whatsapp.dateBlockedTitle')}</h2>
        <p>
          {dressName ? (
            <>{t('whatsapp.dateBlockedMessagePrefix')} <strong>{dressName}</strong> مُؤجَّر بالفعل في تاريخ </>
          ) : (
            <>{t('whatsapp.dateBlockedMessagePrefix')} مُؤجَّر بالفعل في تاريخ </>
          )}
          <strong>{rentDate}</strong>.
        </p>
        <p className="rented-date-hint">{t('whatsapp.dateBlockedHint')}</p>
        <button type="button" className="glass-button w-full py-3 mt-2" onClick={onClose}>
          {t('whatsapp.dateBlockedOk')}
        </button>
      </div>
    </div>,
    document.body
  );
}
