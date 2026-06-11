import { useState, useEffect } from 'react';
import { Search, ShoppingBag, Heart } from 'lucide-react';
import InstagramIcon from '../components/InstagramIcon';
import ProductCard from '../components/ProductCard';
import { useLang } from '../contexts/LanguageProvider';
import { fetchFAQs, getSetting } from '../services/dbService';

export default function CatalogView({ dresses, onSelectDress }) {
  const { lang, setLang, t } = useLang();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('default');
  const selectedSize = 'all';
  const maxPrice = 6000000;

  const categoryOptions = [
    { id: 'all', badge: 'All' },
    { id: 'big_size' },
  ];

  const isArabicCategoryMatch = (dress, cat) => {
    if (!dress) return false;
    const text = ((dress.name || '') + ' ' + (dress.details || '')).toLowerCase();

    const hasMermaid = text.includes('حورية') || text.includes('حورية البحر') || text.includes('mermaid') || text.includes('ميرميد');
    const hasTail = text.includes('ذيل') || text.includes('tail');
    const hasRemovable = text.includes('قابل للإزالة') || text.includes('قابل للازالة') || text.includes('قابل للإزاله') || text.includes('removable');
    const hasFullSkirt = text.includes('تنورة كاملة') || text.includes('بسكيرت') || text.includes('full skirt');
    const hasOneLook = text.includes('لوك واحد') || text.includes('look one') || text.includes('لوك');

    switch (cat) {
      case 'mermaid_extension':
        return hasMermaid && (hasRemovable || text.includes('باكستنشن') || text.includes('باك ستينشن') || text.includes('باكستنش'));
      case 'mermaid_full_skirt':
        return hasMermaid && (hasFullSkirt || hasTail) && !hasRemovable;
      case 'one_look':
        return hasOneLook;
      default:
        return false;
    }
  };

  const filteredDresses = dresses.filter(dress => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      dress.name.toLowerCase().includes(query) ||
      dress.id.toLowerCase().includes(query) ||
      (dress.details && dress.details.toLowerCase().includes(query));
    const matchesCategory = selectedCategory === 'all'
      ? true
      : selectedCategory === 'big_size'
        ? (!!dress.bigSize || ['XL', 'XXL'].includes(dress.size))
        : (dress.category === selectedCategory || isArabicCategoryMatch(dress, selectedCategory));
    const matchesSize = selectedSize === 'all' || dress.size === selectedSize;
    const matchesPrice = dress.price <= maxPrice;

    return matchesSearch && matchesCategory && matchesSize && matchesPrice;
  });

  const sortedDresses = (() => {
    const arr = [...filteredDresses];
    // If user selected price sort, honor it
    if (sortOrder === 'priceAsc') return arr.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortOrder === 'priceDesc') return arr.sort((a, b) => (b.price || 0) - (a.price || 0));

    // Default sort: if any dress has a position, order by position asc
    const hasPosition = arr.some(d => d.position !== undefined && d.position !== null);
    if (hasPosition) {
      return arr.sort((a, b) => {
        const pa = (a.position === null || a.position === undefined) ? Number.MAX_SAFE_INTEGER : a.position;
        const pb = (b.position === null || b.position === undefined) ? Number.MAX_SAFE_INTEGER : b.position;
        return pa - pb;
      });
    }

    return arr;
  })();

  const getCategoryLabel = (cat) => {
    // prefer translations
    const translated = t(`catalog.categories.${cat}`);
    if (translated && !translated.includes('.')) return translated;
    if (cat === 'big_size') return t('catalog.categories.big_size') || (lang === 'en' ? 'Big sizes' : 'مقاسات كبيرة');
    // fallback by language: prefer English labels when UI language is English
    if (lang === 'en') {
      switch (cat) {
        case 'mermaid_full_skirt': return 'Mermaid (full skirt)';
        case 'one_look': return '1 Look';
        case 'all': return t('catalog.viewAll') || 'All';
        default: return cat || '';
      }
    }
    switch (cat) {
      case 'mermaid_extension': return 'ميرميد باكستنشن';
      case 'mermaid_full_skirt': return 'ميرميد بسكيرت كاملة';
      case 'one_look': return 'لوك واحد';
      case 'all': return t('catalog.viewAll') || 'All';
      default: return cat || '';
    }
  };

  // Arabic custom categories requested by user
  // 1- ميرميد باكستنشن  2- ميرميد بسكيرت كاملة  3- لوك واحد
  const AR_CATEGORIES = [
    { id: 'mermaid_extension' },
    { id: 'mermaid_full_skirt' },
    { id: 'one_look' }
  ];

  const featuredDress = dresses.find(d => d.featured) || null;
  const [faqs, setFaqs] = useState([]);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchFAQs();
        if (data) setFaqs(Array.isArray(data) ? data : []);
        else setFaqs([]);
      } catch {
        setFaqs([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSetting('default_sort');
        if (data && data.value) setSortOrder(String(data.value));
      } catch {
        // ignore
      }
    })();
  }, []);

  // listen for changes to default sort or faqs made in admin (storage events)
  useEffect(() => {
    const onStorage = (e) => {
      try {
        // only react to FAQ updates from admin
        if (!e || e.key === 'mary_faqs') {
          (async () => {
            try {
              const data = await fetchFAQs();
              if (data) setFaqs(Array.isArray(data) ? data : []);
            } catch { /* ignore */ }
          })();
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const scrollToCatalog = () => {
    try {
      const el = document.querySelector('.page-container.section-block');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch { /* fallback: do nothing */ }
  };

  return (
    <div className="catalog-page min-h-screen pb-20">
      <header className="shop-header glass-panel">
        <div className="page-container header-inner">
          <div className="brand-block">
            <img src="/logo.png" alt="Marym Nabil Bridal Couture" className="brand-logo" />
            <div>
              <h1 className="brand-title">{t('catalog.brandTitle')}</h1>
              <p className="brand-subtitle">{t('catalog.brandSubtitle')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="glass-input small-button"
              aria-label="language"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="search-block">
            <label className="search-label" htmlFor="catalog-search">{t('catalog.searchLabel')}</label>
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                id="catalog-search"
                type="text"
                placeholder={t('catalog.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input search-input"
              />
            </div>
          </div>
        </div>
      </header>

      <section className="hero-section">
        <div className="page-container hero-grid">
          <div className="hero-copy text-right">
            <span className="eyebrow-label">{t('catalog.heroEyebrow')}</span>
            <h2>{t('catalog.heroHeadline')}</h2>
            <p className="hero-description">{t('catalog.heroDescription')}</p>
            <div className="hero-actions">
              <button className="glass-button hero-button" onClick={scrollToCatalog}>{t('catalog.shopNow')}</button>
            </div>
            <div className="hero-stats">
            </div>
          </div>

          <div className="hero-card glass-panel">
            {featuredDress ? (
              (() => {
                const img = (featuredDress.images && featuredDress.images[0]) || '/dresses/emerald.png';
                const src = img && (img.startsWith('http') || img.startsWith('data:') || img.startsWith('/'))
                  ? (img.startsWith('/') ? window.location.origin + img : img)
                  : img;
                return <img src={src} alt={featuredDress.name || 'Featured dress'} loading="lazy" className="hero-image" />;
              })()
            ) : (
              <div className="hero-image-placeholder">صورة الفستان</div>
            )}
            <div className="hero-card-badge">
              <ShoppingBag size={18} />
              <span>{t('catalog.featured')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container section-block">
        <div className="section-header">
          <div>
            <p className="eyebrow-label">{t('catalog.sectionByOccasion')}</p>
            <h3>{t('catalog.sectionByOccasion')}</h3>
          </div>
          <button className="glass-button-secondary small-button">{t('catalog.viewAll')}</button>
        </div>

        <div className="occasion-grid">
          {[...categoryOptions, ...AR_CATEGORIES].map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={`category-card ${selectedCategory === category.id ? 'category-card-active' : ''}`}
            >
              <div className="category-card-icon">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="category-card-title">{getCategoryLabel(category.id)}</p>
                <p className="category-card-subtitle">{category.badge || ''}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="page-container section-block">
        <div className="section-header">
          <div>
            <p className="eyebrow-label">Prom Dresses 2026</p>
            <h3>تشكيلة الفساتين المميزة</h3>
          </div>
          <div className="filter-summary" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <p>{t('catalog.showCount', filteredDresses.length)}</p>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="glass-input small-button"
              aria-label={t('catalog.sort.label')}
            >
              <option value="default">{t('catalog.sort.default')}</option>
              <option value="priceAsc">{t('catalog.sort.priceAsc')}</option>
              <option value="priceDesc">{t('catalog.sort.priceDesc')}</option>
            </select>
          </div>
        </div>

        <div className="product-grid">
          {sortedDresses.slice(0, visibleCount).map((dress) => (
            <ProductCard
              key={dress.id}
              dress={dress}
              onSelect={onSelectDress}
              getCategoryLabel={getCategoryLabel}
            />
          ))}
        </div>
        {sortedDresses.length > visibleCount && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
            <button
              className="glass-button"
              onClick={() => setVisibleCount((v) => v + 12)}
              aria-label="Show more dresses"
            >
              {t('catalog.showMore')}
            </button>
          </div>
        )}
      </section>

      <section className="page-container section-block" aria-labelledby="faqs-title">
        <div className="section-header">
          <div>
            <p className="eyebrow-label">{t('catalog.faqsTitle')}</p>
            <h3 id="faqs-title">{t('catalog.faqsTitle')}</h3>
            <p className="section-subtext">{t('catalog.faqsIntro')}</p>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 16 }}>
          {faqs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No FAQs available.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {faqs.map((f) => (
                <details key={f.id} className="faq-card glass-panel" style={{ padding: 12 }}>
                  <summary style={{ fontWeight: 800 }}>{f.question}</summary>
                  <div style={{ marginTop: 8 }}>{f.answer}</div>
                </details>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="page-container footer-block">
        <div className="footer-grid">
          <div>
            <p className="eyebrow-label">{t('catalog.footerVisit')}</p>
            <h4>{t('catalog.developedBy')}</h4>
            <p className="footer-copy">{t('catalog.footerCopy')}</p>
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">{t('catalog.contact')}</a>
            <a href="#" className="footer-link">{t('catalog.about')}</a>
            <a href="#" className="footer-link">{t('catalog.faq')}</a>
            <a href="https://www.instagram.com/marymatelier" target="_blank" rel="noopener noreferrer" className="footer-link footer-social" aria-label="Instagram">
              <InstagramIcon size={16} />
            </a>
          </div>
        </div>
        <div className="footer-note">
          <span>{t('catalog.footerNote')}</span>
          <div className="footer-heart">
            <Heart size={14} />
          </div>
        </div>
      </footer>
    </div>
  );
}
