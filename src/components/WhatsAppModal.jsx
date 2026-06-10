import { useEffect, useState } from 'react';
import { X, Calendar, Clock, User, Phone, MessageSquare } from 'lucide-react';
import { notifyNewOrder } from '../services/whatsappNotify';
import RentedDateModal from './RentedDateModal';
import QRCodeModal from './QRCodeModal';
import { useLang } from '../contexts/LanguageProvider';

export default function WhatsAppModal({
  isOpen,
  onClose,
  dress,
  cart = null,
  onReserve,
  reservations = [],
  onOpenQR,
}) {
  const { t } = useLang();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [trialDate, setTrialDate] = useState('');
  const [rentDate, setRentDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showRentedPopup, setShowRentedPopup] = useState(false);
  const [blockedDate, setBlockedDate] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrDresses, setQrDresses] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // avoid synchronous setState calls inside effect to satisfy lint rules
      const id = setTimeout(() => {
        setName('');
        setPhone('');
        setTrialDate('');
        setRentDate('');
        setTime('');
        setNotes('');
        setSuccessMessage('');
        setErrorMessage('');
        setSending(false);
        setShowRentedPopup(false);
        setBlockedDate('');
        setShowQRModal(false);
        setQrDresses([]);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [isOpen, dress]);

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

  const checkDateConflict = (date, d) => {
    const target = d || dress;
    if (!date || !target) return false;
    return reservations.some(
      (reservation) => reservation.dressId === target.id && reservation.rentDate === date && reservation.status === 'confirmed'
    );
  };

  const handleRentDateChange = (date) => {
    setRentDate(date);
    if (checkDateConflict(date)) {
      setBlockedDate(date);
      setShowRentedPopup(true);
      setRentDate('');
    }
  };

  const finishSuccess = (message, reservedDresses) => {
    setSuccessMessage(message);
    setSending(false);
    // After a short delay showing success, open the QR modal
    setTimeout(() => {
      setSuccessMessage('');
      // If parent provided a handler, use it so the QR modal can be rendered at top-level.
      if (typeof onOpenQR === 'function') {
        onOpenQR(reservedDresses || []);
      } else {
        setQrDresses(reservedDresses || []);
        setShowQRModal(true);
      }
    }, 1800);
  };

  const handleQRClose = () => {
    // Close only the QR modal and clear its dresses, keep the WhatsApp modal open
    setShowQRModal(false);
    setQrDresses([]);
    // Close the WhatsApp modal and navigate back to the main store
    try {
      onClose();
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (e) {
      /* ignore */
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setErrorMessage('');

    // If cart mode, create a reservation per dress
    const targets = Array.isArray(cart) && cart.length > 0 ? cart : (dress ? [dress] : []);

    // check conflicts for any target
    for (const d of targets) {
      if (checkDateConflict(rentDate, d)) {
        setBlockedDate(rentDate);
        setShowRentedPopup(true);
        setSending(false);
        return;
      }
    }

    // Helper: wrap a promise with a timeout to avoid infinite hangs
    const withTimeout = (promise, ms) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(t('whatsapp.errorTimeout') || 'Request timed out. Please try again.')), ms)
        ),
      ]);
    };

    try {
      // Save all reservations to DB (with 15s timeout each)
      for (const d of targets) {
        const newReservation = {
          id: `res-${Date.now()}-${d.id}`,
          dressId: d.id,
          dressName: d.name,
          clientName: name,
          weight: weight ? Number(weight) : null,
          height: height ? Number(height) : null,
          clientPhone: phone,
          trialDate,
          rentDate,
          time,
          notes,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        await withTimeout(onReserve(newReservation), 15000);

        // Fire WhatsApp notification in the background — don't block UI
        notifyNewOrder({ reservation: newReservation, dress: d }).catch((notifyErr) => {
          console.warn('WhatsApp notification failed (non-blocking):', notifyErr);
        });
      }
      finishSuccess(t('whatsapp.success'), targets);
    } catch (err) {
      console.error('WhatsAppModal error:', err);
      setErrorMessage(err.message || t('whatsapp.errorGeneric'));
      setSending(false);
    }
  };

  const cartMode = Array.isArray(cart) && cart.length > 0;
  if (!isOpen || (!dress && !cartMode)) return null;

  const primaryName = dress ? dress.name : (cartMode ? `${cart.length} ${t('cart.items') || 'items'}` : '');

  return (
    <>
      <RentedDateModal
        isOpen={showRentedPopup}
        onClose={() => setShowRentedPopup(false)}
        dressName={dress ? dress.name : (Array.isArray(cart) && cart.length > 0 ? cart[0].name : '')}
        rentDate={blockedDate}
      />

      <div className="whatsapp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="whatsapp-modal-content" onClick={(e) => e.stopPropagation()} dir={t('langDir') || 'rtl'}>
          {/* Header */}
          <div className="wa-modal-header">
            <div className="wa-modal-header-text">
              <h2>{t('whatsapp.title')}</h2>
              <p>{primaryName}</p>
            </div>
            <button type="button" onClick={onClose} className="wa-modal-close">
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="wa-modal-form">
            <div className="wa-modal-cost-note">{t('whatsapp.trialCostText')}</div>

            <div className="wa-modal-grid">
              {/* Full Name */}
              <div className="wa-field-group">
                <label>{t('whatsapp.fullName')}</label>
                <div className="wa-field-wrap">
                  <User size={16} className="wa-field-icon" />
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('whatsapp.namePlaceholder')} className="wa-input" />
                </div>
              </div>

              {/* Phone */}
              <div className="wa-field-group">
                <label>{t('whatsapp.phone')}</label>
                <div className="wa-field-wrap">
                  <Phone size={16} className="wa-field-icon" />
                  <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('whatsapp.phonePlaceholder')} style={{ direction: 'ltr' }} className="wa-input" />
                </div>
              </div>

              {/* Weight */}
              <div className="wa-field-group">
                <label>{t('whatsapp.weight') || 'Weight (kg)'}</label>
                <div className="wa-field-wrap">
                  <input type="number" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={t('whatsapp.weightPlaceholder') || 'مثال: 60'} className="wa-input" />
                </div>
              </div>

              {/* Height */}
              <div className="wa-field-group">
                <label>{t('whatsapp.height') || 'Height (cm)'}</label>
                <div className="wa-field-wrap">
                  <input type="number" min={0} value={height} onChange={(e) => setHeight(e.target.value)} placeholder={t('whatsapp.heightPlaceholder') || 'مثال: 165'} className="wa-input" />
                </div>
              </div>

              {/* Trial Date */}
              <div className="wa-field-group">
                <label>{t('whatsapp.trialDate')}</label>
                <div className="wa-field-wrap">
                  <Calendar size={16} className="wa-field-icon" />
                  <input type="date" required value={trialDate} onChange={(e) => setTrialDate(e.target.value)} className="wa-input" />
                </div>
              </div>

              {/* Rent Date */}
              <div className="wa-field-group">
                <label>{t('whatsapp.rentDate')}</label>
                <div className="wa-field-wrap">
                  <Calendar size={16} className="wa-field-icon" />
                  <input type="date" required value={rentDate} onChange={(e) => handleRentDateChange(e.target.value)} className="wa-input" />
                </div>
              </div>

              {/* Time */}
              <div className="wa-field-group">
                <label>{t('whatsapp.time')}</label>
                <div className="wa-field-wrap">
                  <Clock size={16} className="wa-field-icon" />
                  <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="wa-input" />
                </div>
              </div>

              {/* Notes */}
              <div className="wa-field-group">
                <label>{t('whatsapp.notes')}</label>
                <div className="wa-field-wrap">
                  <MessageSquare size={16} className="wa-field-icon-top" />
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('whatsapp.notesPlaceholder')} className="wa-textarea" />
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="wa-error-msg">{errorMessage}</div>
            )}
            {successMessage && (
              <div className="wa-success-msg">{successMessage}</div>
            )}

            <div className="wa-modal-actions">
              <button type="submit" disabled={sending} className="wa-btn-submit">
                {sending ? t('whatsapp.sending') : t('whatsapp.confirm')}
              </button>
              <button type="button" onClick={onClose} disabled={sending} className="wa-btn-cancel">
                {t('form.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* QR Code Modal — shown after successful reservation */}
      <QRCodeModal
        isOpen={showQRModal}
        onClose={handleQRClose}
        dresses={qrDresses}
      />
    </>
  );
}
