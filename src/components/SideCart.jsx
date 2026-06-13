import { X } from 'lucide-react';
import { useLang } from '../contexts/LanguageProvider';

export default function SideCart({ isOpen, onClose, items = [], onRemove, onFinish, onContinue }) {
  const { t } = useLang();

  if (!isOpen) return null;

  return (
    <div className="sidecart-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="sidecart-panel" dir={t('langDir') || 'rtl'}>
        <div className="sidecart-header">
          <div>
            <h3>{t('cart.addToCart') || t('catalog.viewAll')}</h3>
            <p className="sidecart-max text-sm text-white/60 mt-1">{t('cart.maxAllowedText') || 'Max allowed dresses to try in one day: 4'}</p>
          </div>
          <button type="button" onClick={onClose} className="sidecart-close-btn"><X size={18} /></button>
        </div>

        <div className="sidecart-body">
          {items.length === 0 ? (
            <p className="sidecart-empty">{t('cart.empty') || 'Your cart is empty'}</p>
          ) : (
            <ul className="sidecart-list">
              {items.map((d) => (
                <li key={d.id} className="sidecart-item">
                  <img src={d.images?.[0] || '/dresses/emerald.png'} alt={d.name} className="sidecart-item-img" />
                  <div className="sidecart-item-info">
                    <div className="sidecart-item-name">{d.name}</div>
                    <div className="sidecart-item-price">{d.price != null ? `${d.price} ج.م` : '—'}</div>
                  </div>
                  <button type="button" onClick={() => onRemove(d.id)} className="sidecart-item-remove">{t('form.cancel')}</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sidecart-footer">
          <div className="sidecart-summary">{items.length} {t('cart.items') || 'items'}</div>
          <div className="sidecart-actions">
            <button type="button" onClick={onContinue} className="glass-button-secondary sidecart-btn">{t('product.ctaContinue')}</button>
            <button type="button" onClick={onFinish} disabled={items.length === 0} className="glass-button sidecart-btn">{t('product.ctaSchedule')}</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
