import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Upload, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { fetchDesigners, createDesigner } from '../services/dbService';
import { useLang } from '../contexts/LanguageProvider';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const EMPTY_DRESS = {
  id: '',
  name: '',
  designer: '',
  // default to first Arabic category
  category: 'mermaid_extension',
  price: null,
  size: 'M',
  color: 'أبيض',
  bigSize: false,
  featured: false,
  images: ['/dresses/emerald.png'],
  details: '',
  available: true,
};

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
          const maxSize = 600;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DressFormModal({ isOpen, onClose, mode = 'add', dress, dresses = [], onSave }) {
  const { t, lang } = useLang();
  const [formDress, setFormDress] = useState(EMPTY_DRESS);
  const [formError, setFormError] = useState('');
  const [designers, setDesigners] = useState([]);

  const loadDesigners = async () => {
    try {
      const list = await fetchDesigners();
      setDesigners(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to load designers:', error);
      setDesigners([]);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && dress) {
      setFormDress({
        ...dress,
        images: Array.isArray(dress.images) ? dress.images.filter(Boolean) : [],
      });
    } else {
      setFormDress({
        ...EMPTY_DRESS,
        id: `DRS-${Math.floor(100 + Math.random() * 900)}`,
      });
    }
    setFormError('');
    loadDesigners();
  }, [isOpen, mode, dress]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setFormError('');
    try {
      // compress client-side then upload each image to server endpoint which stores in Supabase Storage
      const base64Images = await Promise.all(files.map(compressImage));
      const uploadedUrls = [];
      for (let i = 0; i < base64Images.length; i += 1) {
        const dataUrl = base64Images[i];
        const filename = files[i]?.name || `upload-${Date.now()}`;
        const resp = await fetch(`${API_BASE_URL}/api/upload-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, dataUrl }),
        });
        const json = await resp.json().catch(() => null);
        if (!resp.ok || !json || !json.url) {
          console.error('upload failed', json);
          throw new Error('Upload failed');
        }
        uploadedUrls.push(json.url);
      }

      setFormDress((prev) => ({
        ...prev,
        images: [
          ...(prev.images || []).filter((img) => img && img !== '/dresses/emerald.png' && img !== ''),
          ...uploadedUrls,
        ],
      }));
    } catch (err) {
      console.error(err);
      setFormError('حدث خطأ أثناء رفع الصور، يرجى المحاولة مرة أخرى.');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormDress((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalizedImages = Array.isArray(formDress.images)
      ? formDress.images.map((img) => (img.trim ? img.trim() : img)).filter(Boolean)
      : [];

    if (!formDress.name || !formDress.id || !formDress.designer || !formDress.color || normalizedImages.length === 0) {
      setFormError(t('form.errorFill'));
      return;
    }

    const payload = { ...formDress, images: normalizedImages };

    if (mode === 'add') {
      const duplicate = dresses.some((d) => d.id.toLowerCase() === formDress.id.toLowerCase());
      if (duplicate) {
        setFormError(t('form.duplicateId'));
        return;
      }
    }

    onSave(payload, mode);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="dress-form-modal-overlay" onClick={handleBackdropClick}>
      <div className="dress-form-modal-panel" onClick={(e) => e.stopPropagation()} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="dress-form-modal-header">
          <div>
            <h2>{mode === 'add' ? t('form.addDressTitle') : t('form.editDressTitle')}</h2>
            <p>{mode === 'add' ? t('form.addDressTitle') : formDress.name}</p>
          </div>
          <button type="button" onClick={onClose} className="dress-form-modal-close" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dress-form-modal-body">
          {formError && (
            <div className="dress-form-error">
              <AlertCircle size={14} />
              <span>{formError}</span>
            </div>
          )}

          <div className="dress-form-grid">
            <div className="dress-form-field">
              <label>{t('form.codeLabel')}</label>
              <input
                type="text"
                required
                placeholder={t('form.placeholders.code')}
                disabled={mode === 'edit'}
                value={formDress.id}
                onChange={(e) => setFormDress({ ...formDress, id: e.target.value.toUpperCase() })}
                className="glass-input text-sm font-mono"
              />
            </div>

            <div className="dress-form-field">
              <label>{t('form.nameLabel')}</label>
              <input
                type="text"
                required
                placeholder={t('form.placeholders.name')}
                value={formDress.name}
                onChange={(e) => setFormDress({ ...formDress, name: e.target.value })}
                className="glass-input text-sm"
              />
            </div>

            <div className="dress-form-field">
              <label>{t('form.designerLabel')}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={formDress.designer || ''}
                  required
                  onChange={(e) => setFormDress({ ...formDress, designer: e.target.value })}
                  className="glass-input text-sm bg-[var(--emerald-dark)] text-white"
                >
                  <option value="">{t('form.designerPlaceholder')}</option>
                  {designers.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    const name = window.prompt(t('form.addDesigner') + '\n' + t('form.placeholders.addDesignerPrompt'));
                    if (!name) return;
                    const trimmed = name.trim();
                    if (!trimmed) return;
                    try {
                      const saved = await createDesigner(trimmed);
                      const next = Array.from(new Set([...designers, saved?.name || trimmed]));
                      next.sort((a, b) => a.localeCompare(b, lang === 'ar' ? 'ar' : 'en'));
                      setDesigners(next);
                      setFormDress({ ...formDress, designer: trimmed });
                    } catch (error) {
                      console.error('Failed to add designer:', error);
                      setFormError(t('form.errorDesignerSave') || 'Failed to save designer.');
                    }
                  }}
                  className="glass-button-secondary text-sm py-2 px-3"
                >
                  {t('form.addDesigner')}
                </button>
              </div>
            </div>

            <div className="dress-form-field">
              <label>{t('form.categoryLabel')}</label>
              <select
                value={formDress.category}
                onChange={(e) => setFormDress({ ...formDress, category: e.target.value })}
                className="glass-input text-sm bg-[var(--emerald-dark)] text-white"
              >
                <option value="mermaid_extension">ميرميد باكستنشن</option>
                <option value="mermaid_full_skirt">ميرميد بسكيرت كاملة</option>
                <option value="one_look">لوك واحد</option>
              </select>
            </div>

            <div className="dress-form-field">
              <label>{t('form.priceLabel')}</label>
              <input
                type="number"
                placeholder={t('form.placeholders.price')}
                value={formDress.price ?? ''}
                onChange={(e) => setFormDress({ ...formDress, price: e.target.value === '' ? null : Number(e.target.value) })}
                className="glass-input text-sm"
              />
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 6 }}>{t('form.priceOptional') || 'Price is optional'}</small>
            </div>

            <div className="dress-form-field">
              <label>{t('form.sizeLabel')}</label>
              <select
                value={formDress.size}
                onChange={(e) => setFormDress({ ...formDress, size: e.target.value })}
                className="glass-input text-sm bg-[var(--emerald-dark)] text-white"
              >
                <option value="S">{t('form.sizeOptions.S')}</option>
                <option value="M">{t('form.sizeOptions.M')}</option>
                <option value="L">{t('form.sizeOptions.L')}</option>
                <option value="XL">{t('form.sizeOptions.XL')}</option>
                <option value="XXL">{t('form.sizeOptions.XXL')}</option>
              </select>
            </div>

            <div className="dress-form-field">
              <label>{t('form.bigSizeLabel') || 'Big size'}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id="big-size-check"
                  type="checkbox"
                  checked={!!formDress.bigSize}
                  onChange={(e) => setFormDress({ ...formDress, bigSize: e.target.checked })}
                />
                <label htmlFor="big-size-check" className="text-sm text-white/70">{t('form.bigSizeHint') || 'Mark as big size (shows in Big Size filter)'}</label>
              </div>
            </div>

            <div className="dress-form-field">
              <label>{t('form.colorLabel')}</label>
              <input
                type="text"
                required
                placeholder={t('form.placeholders.color')}
                value={formDress.color}
                onChange={(e) => setFormDress({ ...formDress, color: e.target.value })}
                className="glass-input text-sm"
              />
            </div>
          </div>

          <div className="dress-form-field">
            <label>{t('form.imagesLabel')}</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              id="dress-images-upload"
              className="hidden"
            />
            <label htmlFor="dress-images-upload" className="dress-form-upload">
              <Upload size={24} />
              <span>{t('form.imagesUploadLabel')}</span>
              <small>{t('form.placeholders.imagesUploadHint')}</small>
            </label>

            {formDress.images?.filter((img) => img && img !== '').length > 0 && (
              <div className="dress-form-previews">
                {formDress.images
                  .filter((img) => img && img !== '')
                  .map((img, index) => (
                    <div key={index} className="dress-form-preview">
                      <img src={img} alt={`preview-${index}`} />
                        <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="dress-form-preview-remove"
                        title={t('form.removeImageTitle')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="dress-form-field">
            <label>{t('form.detailsLabel')}</label>
            <textarea
              required
              placeholder={t('form.detailsLabel')}
              value={formDress.details}
              onChange={(e) => setFormDress({ ...formDress, details: e.target.value })}
              className="glass-input text-sm h-24 resize-none"
            />
          </div>

          <div className="dress-form-toggle">
            <span>{t('form.availabilityLabel')}</span>
            <button
              type="button"
              onClick={() => setFormDress({ ...formDress, available: !formDress.available })}
              className="dress-form-toggle-btn"
            >
              {formDress.available ? (
                <>
                  <ToggleRight size={36} />
                  <span className="text-emerald-400">{t('form.availableText')}</span>
                </>
              ) : (
                <>
                  <ToggleLeft size={36} />
                  <span className="text-[var(--text-muted)]">{t('form.unavailableText')}</span>
                </>
              )}
            </button>
          </div>

          <div className="dress-form-toggle">
            <span>{t('form.featuredLabel')}</span>
            <button
              type="button"
              onClick={() => setFormDress({ ...formDress, featured: !formDress.featured })}
              className="dress-form-toggle-btn"
            >
              {formDress.featured ? (
                <>
                  <ToggleRight size={36} />
                  <span className="text-emerald-400">{t('form.featuredText')}</span>
                </>
              ) : (
                <>
                  <ToggleLeft size={36} />
                  <span className="text-[var(--text-muted)]">{t('form.notFeaturedText')}</span>
                </>
              )}
            </button>
          </div>

          <div className="dress-form-actions">
            <button type="submit" className="glass-button text-sm py-3 flex-1">
              {mode === 'add' ? t('form.addButton') : t('form.saveButton')}
            </button>
            <button type="button" onClick={onClose} className="glass-button-secondary text-sm py-3 px-6">
              {t('form.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
