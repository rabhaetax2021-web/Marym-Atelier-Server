import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Home, Truck, ShieldCheck, Tag, Instagram } from 'lucide-react';
import { useLang } from '../contexts/LanguageProvider';

// category labels are provided via translations

function useProductMeta(dress) {
  useEffect(() => {
    if (!dress) return undefined;
    const origin = window.location.origin;
    const resolveUrl = (img) => {
      if (!img) return '';
      if (img.startsWith('http') || img.startsWith('data:')) return img;
      if (img.startsWith('/')) return origin + img;
      return img;
    };
    const image = resolveUrl(dress.images?.[0]);
    const title = `${dress.name} | MaryMatelier`;
    const description = dress.details || `${dress.name} — إيجار يومي ${dress.price} ج.م`;

    document.title = title;

    const setMeta = (attr, key, value) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'product');
    if (image) setMeta('property', 'og:image', image);
    setMeta('property', 'product:price:amount', String(dress.price));
    setMeta('property', 'product:price:currency', 'EGP');

    let schema = document.getElementById('product-schema');
    if (!schema) {
      schema = document.createElement('script');
      schema.id = 'product-schema';
      schema.type = 'application/ld+json';
      document.head.appendChild(schema);
    }

    schema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: dress.name,
      description: dress.details,
      sku: dress.id,
      image: (dress.images || []).map((img) => resolveUrl(img)),
      offers: {
        '@type': 'Offer',
        price: dress.price,
        priceCurrency: 'EGP',
        availability: dress.available
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url: window.location.href,
      },
      brand: { '@type': 'Brand', name: 'MaryMatelier' },
      color: dress.color,
      size: dress.size,
    });

    return () => {
      document.title = 'MaryMatelier';
      const schemaEl = document.getElementById('product-schema');
      if (schemaEl) schemaEl.remove();
    };
  }, [dress]);
}

export default function DressDetailsView({ dress, onBack, onAddToCart }) {
  const { t, lang } = useLang();
  const getCategoryLabel = (cat) => {
    const translated = t(`catalog.categories.${cat}`);
    if (translated && !translated.includes('.')) return translated;
    if (lang === 'en') {
      switch (cat) {
        case 'mermaid_extension': return 'Mermaid (with extension)';
        case 'mermaid_full_skirt': return 'Mermaid (full skirt)';
        case 'one_look': return '1 Look';
        default: return cat;
      }
    }
    switch (cat) {
      case 'mermaid_extension': return 'ميرميد باكستنشن';
      case 'mermaid_full_skirt': return 'ميرميد بسكيرت كاملة';
      case 'one_look': return 'لوك واحد';
      default: return cat;
    }
  };
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  useProductMeta(dress);

  useEffect(() => {
    if (!isFullscreen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setIsFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev || '';
      document.removeEventListener('keydown', onKey);
    };
  }, [isFullscreen]);

  if (!dress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--emerald-deep)] text-white text-center p-6">
        <div>
          <h2 className="text-2xl font-black mb-4">{t('product.notFoundTitle')}</h2>
          <button onClick={onBack} className="glass-button py-2.5 px-6">{t('product.backToStore')}</button>
        </div>
      </div>
    );
  }

  const images = Array.isArray(dress.images) && dress.images.length > 0 ? dress.images : ['/dresses/emerald.png'];
  const hasMultipleImages = images.length > 1;

  const goPrev = () => setActiveImageIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const goNext = () => setActiveImageIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  const specs = [
    { label: 'كود المنتج', value: dress.id },
    ...(dress.designer ? [{ label: 'المصمم', value: dress.designer }] : []),
    { label: 'الفئة', value: getCategoryLabel(dress.category) },
    { label: 'المقاس', value: dress.size },
    { label: 'اللون', value: dress.color },
    { label: 'نوع الخدمة', value: 'إيجار يومي' },
  ];

  return (
    <div className="product-page min-h-screen pb-20">
      <header className="shop-header glass-panel">
        <div className="page-container header-inner flex justify-between items-center py-4">
              <button onClick={onBack} className="breadcrumb-link">
            <ChevronLeft size={20} />
            <span>{t('product.backToStore')}</span>
          </button>
          <div className="brand-block cursor-pointer" onClick={onBack}>
            <img src="/logo.png" alt="Marym Nabil Bridal Couture" className="brand-logo" />
            <div><h1 className="brand-title text-xl">MaryMatelier</h1></div>
          </div>
        </div>
      </header>

      <main className="page-container product-page-main animate-fade-in">
        <nav className="product-breadcrumb" aria-label="مسار التنقل">
          <button type="button" onClick={onBack} className="breadcrumb-link">
            <Home size={14} />
            <span>الرئيسية</span>
          </button>
          <span className="breadcrumb-sep">/</span>
          <button type="button" onClick={onBack} className="breadcrumb-link">الفساتين</button>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{getCategoryLabel(dress.category)}</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current truncate">{dress.name}</span>
        </nav>

        <div className="product-layout">
          {/* Gallery — first column (right in RTL, like Jumia/Amazon image panel) */}
          <section className="product-gallery" aria-label="صور المنتج">
            <div className="gallery-inner">
              {hasMultipleImages && (
                <div className="gallery-thumbs" role="tablist" aria-label="صور مصغرة">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={idx === activeImageIdx}
                      aria-label={`صورة ${idx + 1}`}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`gallery-thumb ${idx === activeImageIdx ? 'gallery-thumb-active' : ''}`}
                    >
                      <img src={img} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}

              <div className="gallery-main-wrap">
                <button
                  type="button"
                  className="gallery-main"
                  onClick={() => { setIsFullscreen(true); setZoomLevel(1); }}
                  aria-label="عرض الصورة بالحجم الكامل"
                >
                  <img src={images[activeImageIdx]} alt={dress.name} loading="lazy" />
                </button>

                {hasMultipleImages && (
                  <>
                    <button type="button" onClick={goPrev} className="gallery-nav gallery-nav-prev" aria-label="الصورة السابقة">
                      <ChevronRight size={22} />
                    </button>
                    <button type="button" onClick={goNext} className="gallery-nav gallery-nav-next" aria-label="الصورة التالية">
                      <ChevronLeft size={22} />
                    </button>
                    <span className="gallery-counter">{activeImageIdx + 1} / {images.length}</span>
                  </>
                )}
              </div>
            </div>

            {hasMultipleImages && (
              <div className="gallery-thumbs-mobile">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`gallery-thumb ${idx === activeImageIdx ? 'gallery-thumb-active' : ''}`}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Buy box — second column (left in RTL) */}
          <section className="product-buybox">
            <p className="product-brand">MaryMatelier</p>
            <h1 className="product-title">{dress.name}</h1>

            {dress.designer && (
              <p className="product-designer text-sm text-[var(--text-muted)] mt-1">المصمم: {dress.designer}</p>
            )}

            <div className="product-rating-row">
              <span className={`product-badge ${dress.available ? 'in-stock' : 'out-of-stock'}`}>
                {dress.available ? t('product.availableBadge') : t('product.unavailableBadge')}
              </span>
              <span className="product-sku-inline">كود: {dress.id}</span>
            </div>

            <div className="product-price-block">
              <span className="product-price-label">سعر الإيجار اليومي</span>
              <div className="product-price-row">
                <span className="product-price">{dress.price.toLocaleString('ar-EG')}</span>
                <span className="product-currency">ج.م</span>
                <span className="product-price-unit">/ يوم</span>
              </div>
            </div>

            <div className="product-divider" />

            <dl className="product-specs">
              {specs.map(({ label, value }) => (
                <div key={label} className="product-spec-row">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="product-actions">
              <button
                type="button"
                onClick={() => onAddToCart(dress)}
                disabled={!dress.available}
                className="product-cta-primary"
              >
                {t('cart.addToCart') || 'Add to cart'}
              </button>
              <button type="button" onClick={onBack} className="product-cta-secondary">
                {t('product.ctaContinue')}
              </button>
            </div>

            <div className="product-trust-badges">
              <div className="trust-badge">
                <Truck size={18} />
                <span>{t('product.trustPickup')}</span>
              </div>
              <div className="trust-badge">
                <ShieldCheck size={18} />
                <span>{t('product.trustConfirm')}</span>
              </div>
              <div className="trust-badge">
                <Tag size={18} />
                <span>{t('product.trustFlexible')}</span>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <a href="https://www.instagram.com/marymatelier" target="_blank" rel="noopener noreferrer" className="product-instagram" aria-label="Instagram">
                <Instagram size={18} />
              </a>
            </div>
            <p className="product-note">
              {t('product.notePrebook')}
            </p>
          </section>
        </div>

        {/* Floating WhatsApp support button for product page */}
        <a
          href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_SUPPORT_NUMBER || '201012345678'}?text=${encodeURIComponent(`${t('whatsapp.title') || 'مرحباً، أحتاج إلى مساعدة بخصوص الحجز.'} - ${dress.name}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contact support on WhatsApp"
          style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 10000, background: '#25D366', borderRadius: 9999, width: 56, height: 56, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="26" height="26" fill="white" aria-hidden>
            <path d="M20.52 3.48A11.94 11.94 0 0012 0C5.373 0 .02 5.354.02 12a11.9 11.9 0 001.67 6.01L0 24l6.15-1.61A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12 0-3.2-1.25-6.21-3.48-8.52zM12 22.1c-1.7 0-3.35-.44-4.78-1.27l-.34-.2-3.66.96.98-3.57-.22-.36A9.02 9.02 0 012.9 12c0-4.99 4.06-9.05 9.1-9.05 2.43 0 4.71.95 6.42 2.67A8.99 8.99 0 0121 12c0 4.97-4.03 9.1-9 9.1z"/>
            <path d="M17.56 14.01c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.34.22-.63.07a5.6 5.6 0 01-1.66-.99 6.86 6.86 0 01-1.27-1.58c-.13-.22-.01-.34.1-.45.1-.1.22-.27.33-.4.11-.13.15-.22.22-.37.07-.15 0-.28-.02-.4-.03-.12-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.28.3-1.06 1.04-1.06 2.53 0 1.48 1.09 2.92 1.24 3.12.15.2 2.14 3.3 5.18 4.62 3.04 1.33 3.04.89 3.59.83.55-.07 1.77-.72 2.02-1.41.25-.69.25-1.28.18-1.41-.07-.13-.27-.2-.57-.35z"/>
          </svg>
        </a>

        <section className="product-description-section">
          <h2 className="product-section-title">وصف المنتج</h2>
          <div className="product-description-body">
            <p>{dress.details}</p>
          </div>

          <h2 className="product-section-title">مواصفات المنتج</h2>
          <table className="product-specs-table">
            <tbody>
              {specs.map(({ label, value }) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      {isFullscreen && (
        <div
          className="fixed inset-0 z-[100000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => { setIsFullscreen(false); setZoomLevel(1); }}
        >
          <div
            className="relative w-full max-w-[900px] max-h-[92vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => { setIsFullscreen(false); setZoomLevel(1); }}
              className="absolute top-2 left-2 z-30 p-3 bg-black/70 hover:bg-black/90 text-white rounded-full border border-white/10 transition-all"
            ><X size={20} /></button>

            <div className="absolute top-2 right-2 z-30 flex items-center gap-2">
              <button type="button" onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                className="p-3 bg-black/70 hover:bg-black/90 text-white rounded-full border border-white/10"
              ><ZoomOut size={18} /></button>
              <button type="button" onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-3 bg-black/70 hover:bg-black/90 text-white rounded-full border border-white/10"
              ><ZoomIn size={18} /></button>
            </div>

            {hasMultipleImages && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 text-white/80 text-xs bg-black/50 px-3 py-1.5 rounded-full border border-white/10">
                {activeImageIdx + 1} / {images.length}
              </div>
            )}

            {hasMultipleImages && (
              <>
                <button type="button" onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-black/85 text-white rounded-full border border-white/10"
                ><ChevronLeft size={24} /></button>
                <button type="button" onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/60 hover:bg-black/85 text-white rounded-full border border-white/10"
                ><ChevronRight size={24} /></button>
              </>
            )}

            <div className="overflow-hidden rounded-2xl border border-white/5 max-h-[88vh]">
              <img
                src={images[activeImageIdx]}
                alt={dress.name}
                className="max-h-[88vh] max-w-full object-contain transition-transform duration-300"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
