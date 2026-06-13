import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '../contexts/LanguageProvider';

export default function ProductCard({ dress, onSelect, getCategoryLabel }) {
  const { t } = useLang();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const images = Array.isArray(dress.images) && dress.images.length > 0 ? dress.images : ['/dresses/emerald.png'];
  const resolveUrl = (img) => {
    if (!img) return '';
    if (img.startsWith('http') || img.startsWith('data:')) return img;
    if (img.startsWith('/')) return window.location.origin + img;
    return img;
  };
  const hasMultipleImages = images.length > 1;

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(dress);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(dress)}
      onKeyDown={handleKeyDown}
      className="product-card w-full text-right"
    >
      <div className="product-image-wrap relative overflow-hidden group">
        <img
          src={resolveUrl(images[currentImgIndex])}
          alt={dress.name}
          loading="lazy"
          className="product-image w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        
        <span className="product-tag z-10 absolute top-4 right-4 bg-black/78 text-[var(--primary-gold)] px-3 py-1.5 rounded-full text-xs font-bold">
          {getCategoryLabel(dress.category)}
        </span>

        {/* Sliding Chevrons */}
        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/10 z-10 flex items-center justify-center"
              aria-label={t('product.prevImage')}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/70 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/10 z-10 flex items-center justify-center"
              aria-label={t('product.nextImage')}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {hasMultipleImages && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
            {images.map((_, idx) => (
                      <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentImgIndex
                    ? 'bg-[var(--primary-gold)] scale-125'
                    : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="product-content">
        <p className="product-name font-bold text-white leading-tight">{dress.name}</p>
        {dress.designer && (
          <p className="product-designer text-[var(--text-muted)] text-xs mt-1">{dress.designer}</p>
        )}
        <p className="product-copy text-[var(--text-muted)] text-sm line-clamp-2 mt-2">{dress.details}</p>
        <div className="product-meta mt-4 flex items-center justify-between">
          <span className="product-price text-[var(--primary-gold)] font-extrabold">{dress.price != null ? `${dress.price} ج.م` : '—'}</span>
          <span className={`product-status text-xs font-bold ${dress.available ? 'available text-emerald-400' : 'sold text-rose-400'}`}>
            {dress.available ? t('product.available') : t('product.unavailable')}
          </span>
        </div>
      </div>
    </div>
  );
}
