import { useEffect, useState } from 'react';
import { Edit, Trash2, LayoutDashboard, CalendarDays, Database, Settings } from 'lucide-react';
import {
  fetchReservations,
  createDress,
  updateDress as updateDressAPI,
  updateDressPositions,
  deleteDress as deleteDressAPI,
  updateReservation as updateReservationAPI,
  deleteReservation,
  fetchFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
} from '../services/dbService';
import { testWhatsAppConnection, notifyOrderConfirmed } from '../services/whatsappNotify';
import DressFormModal from '../components/DressFormModal';
import { useLang } from '../contexts/LanguageProvider';

const NAV_ITEMS = [
  { id: 'overview', labelKey: 'overview', icon: LayoutDashboard },
  { id: 'reservations', labelKey: 'reservations', icon: CalendarDays },
  { id: 'dresses', labelKey: 'dresses', icon: Database },
  { id: 'faqs', labelKey: 'faqs', icon: Edit },
  { id: 'settings', labelKey: 'settings', icon: Settings },
];

const ADMIN_PASSCODE = '9573';

export default function AdminDashboard({ dresses, onRefreshDresses, onCloseAdmin }) {
  const { t, lang, setLang } = useLang();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [message, setMessage] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [reservations, setReservations] = useState([]);
  const [filters, setFilters] = useState({ client: '', dress: '', rentDate: '', trialDate: '', status: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [editingDress, setEditingDress] = useState(null);
  const [whatsappTesting, setWhatsappTesting] = useState(false);
  const [whatsappTestMsg, setWhatsappTestMsg] = useState('');
  const [faqs, setFaqs] = useState([]);
  const [faqForm, setFaqForm] = useState({ id: null, question: '', answer: '' });
  const [isFaqEditing, setIsFaqEditing] = useState(false);
  

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchReservations();
        setReservations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load reservations', err);
      }
    };
    load();
    (async () => {
      try {
        const faqsData = await fetchFAQs();
        if (faqsData) setFaqs(Array.isArray(faqsData) ? faqsData : []);
        else setFaqs([]);
      } catch (err) {
        console.error('Failed to load faqs', err);
        setFaqs([]);
      }
    })();

    // no default sort loading here anymore
  }, []);

  // Column resizer logic: make THs with .resizable adjustable by dragging the small handle (.col-resizer)
  useEffect(() => {
    const tables = Array.from(document.querySelectorAll('.admin-table'));
    let current = null;

    function onMouseMove(e) {
      if (!current) return;
      const { startX, startWidth, th, index } = current;
      const dx = e.clientX - startX;
      const newWidth = Math.max(60, startWidth + dx);
      th.style.width = `${newWidth}px`;
      // apply width to each td in this column
      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        rows.forEach((row) => {
          const cell = row.children[index];
          if (cell) cell.style.width = `${newWidth}px`;
        });
      }
    }

    function onMouseUp() { current = null; document.body.style.cursor = ''; }

    tables.forEach((table) => {
      const ths = Array.from(table.querySelectorAll('th'));
      ths.forEach((th, i) => {
        const handle = th.querySelector('.col-resizer');
        if (!handle) return;
        handle.onmousedown = (ev) => {
          ev.preventDefault();
          current = { startX: ev.clientX, startWidth: th.getBoundingClientRect().width, th, index: i };
          document.body.style.cursor = 'col-resize';
        };
      });
    });

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      setMessage('');
    } else {
      setMessage(t('admin.loginError'));
    }
  };

  const handleFilterChange = (key, value) => setFilters((p) => ({ ...p, [key]: value }));

  const filteredReservations = reservations.filter((r) => {
    if (filters.client && !(`${r.clientName} ${r.clientPhone}`.toLowerCase().includes(filters.client.toLowerCase()))) return false;
    if (filters.dress) {
      const dressName = r.dressName || (dresses.find((d) => d.id === r.dressId)?.name ?? '');
      if (!dressName.toLowerCase().includes(filters.dress.toLowerCase())) return false;
    }
    if (filters.rentDate && !(String(r.rentDate || '').toLowerCase().includes(filters.rentDate.toLowerCase()))) return false;
    if (filters.trialDate && !(String(r.trialDate || '').toLowerCase().includes(filters.trialDate.toLowerCase()))) return false;
    if (filters.status && !(String(r.status || '').toLowerCase().includes(filters.status.toLowerCase()))) return false;
    return true;
  });

  const handleConfirmReservation = async (reservation) => {
    const conflict = reservations.some((item) =>
      item.id !== reservation.id && item.dressId === reservation.dressId && item.rentDate === reservation.rentDate && item.status === 'confirmed'
    );
    if (conflict) return;
    try {
      const updated = await updateReservationAPI({ ...reservation, status: 'confirmed' });
      setReservations((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      const matchedDress = dresses.find((d) => d.id === reservation.dressId);
      await notifyOrderConfirmed({ reservation: updated, dress: matchedDress });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelReservation = async (id) => {
    try {
      await deleteReservation(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDress = async (id) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await deleteDressAPI(id);
      onRefreshDresses();
    } catch (err) {
      console.error(err);
    }
  };

  const reindexAndSavePositions = async (orderedList) => {
    // orderedList is array of dress ids in desired order
    try {
      const updates = orderedList.map((id, idx) => ({ id, position: idx + 1 }));
      // Bulk update using a single API call
      await updateDressPositions(updates);
      // refresh app data and wait for it to propagate
      if (typeof onRefreshDresses === 'function') await onRefreshDresses();
      // notify other tabs/windows to refresh too
      try { localStorage.setItem('mary_dresses_updated_at', String(Date.now())); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('mary_dresses_updated')); } catch (e) {}
    } catch (err) { console.error('Failed to save positions', err); }
  };

  const handleMoveDress = async (dressId, targetIndex) => {
    // compute current ordering by position (existing positions first)
    const local = [...dresses];
    local.sort((a, b) => {
      const pa = (a.position === null || a.position === undefined) ? Number.MAX_SAFE_INTEGER : a.position;
      const pb = (b.position === null || b.position === undefined) ? Number.MAX_SAFE_INTEGER : b.position;
      if (pa !== pb) return pa - pb;
      // fallback stable order by created_at
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    const idx = local.findIndex(d => d.id === dressId);
    if (idx === -1) return;
    const item = local.splice(idx, 1)[0];
    const newIndex = Math.max(0, Math.min(targetIndex, local.length));
    local.splice(newIndex, 0, item);
    const orderedIds = local.map(d => d.id);
    await reindexAndSavePositions(orderedIds);
  };

  const saveFaqsToStorage = (items) => {
    try { localStorage.setItem('mary_faqs', JSON.stringify(items)); } catch (e) { console.error(e); }
    setFaqs(items);
  };

  const handleFaqSubmit = (e) => {
    e.preventDefault();
    const trimmedQ = (faqForm.question || '').trim();
    const trimmedA = (faqForm.answer || '').trim();
    if (!trimmedQ) return;
    // if editing, patch; otherwise create via API
    if (isFaqEditing && faqForm.id) {
      (async () => {
        try {
          const data = await updateFAQ(faqForm.id, { question: trimmedQ, answer: trimmedA });
          const updated = faqs.map((f) => (f.id === faqForm.id ? data : f));
          saveFaqsToStorage(updated);
        } catch (err) { console.error(err); }
      })();
    } else {
      (async () => {
        try {
          const payload = { id: String(Date.now()), question: trimmedQ, answer: trimmedA };
          const data = await createFAQ(payload);
          saveFaqsToStorage([data, ...faqs]);
        } catch (err) { console.error(err); }
      })();
    }
    setFaqForm({ id: null, question: '', answer: '' });
    setIsFaqEditing(false);
  };

  const handleFaqEdit = (id) => {
    const item = faqs.find((f) => f.id === id);
    if (!item) return;
    setFaqForm({ id: item.id, question: item.question, answer: item.answer });
    setIsFaqEditing(true);
  };

  const handleFaqDelete = (id) => {
    if (!window.confirm(t('admin.confirmDeleteFaq'))) return;
    (async () => {
      try {
        await deleteFAQ(id);
        const remaining = faqs.filter((f) => f.id !== id);
        saveFaqsToStorage(remaining);
      } catch (err) { console.error(err); }
    })();
  };

  const handleTestWhatsApp = async () => {
    setWhatsappTesting(true);
    try {
      await testWhatsAppConnection();
      setWhatsappTestMsg(t('admin.whatsappTestSuccess'));
    } catch (err) {
      setWhatsappTestMsg(err.message || t('admin.whatsappTestFail'));
    } finally {
      setWhatsappTesting(false);
      setTimeout(() => setWhatsappTestMsg(''), 5000);
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem' }}>{t('admin.loginTitle')}</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('admin.loginSubtitle')}</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <label htmlFor="admin-passcode" className="sr-only">{t('admin.passcodeLabel')}</label>
            <input
              id="admin-passcode"
              name="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder={t('admin.passcodePlaceholder') || t('admin.passcodeLabel')}
              className="glass-input"
              style={{ width: '100%' }}
              aria-label={t('admin.passcodeLabel')}
            />
            <div className="flex items-center gap-2" style={{ marginTop: '0.5rem' }}>
              <button type="submit" className="glass-button" style={{ flex: 1 }}>{t('admin.loginButton') || t('admin.login')}</button>
              {onCloseAdmin && (
                <button type="button" onClick={onCloseAdmin} style={{ padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(229, 192, 96, 0.2)', background: 'transparent', color: 'var(--primary-gold)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>{t('admin.backToStore')}</button>
              )}
            </div>
            {message && <div className="admin-flash-msg">{message}</div>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>MaryMatelier</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary-gold)' }}>{t('admin.brandPill') || 'Admin'}</span>
          </h2>
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((it) => (
            <button key={it.id} type="button" className={`admin-nav-item ${activeSection === it.id ? 'active' : ''}`} onClick={() => setActiveSection(it.id)}>
              <it.icon size={16} />
              <span>{t(`admin.${it.labelKey}`)}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div style={{ padding: '8px 0' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>{t('admin.langLabel')}</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="admin-lang-select">
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
          <button
            type="button"
            onClick={onCloseAdmin}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: 'none', borderRadius: '12px', background: 'transparent', color: '#fca5a5', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'background 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span>{t('admin.backToStore')}</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-main-header">
          <h2>{t(`admin.${activeSection}`)}</h2>
        </header>

        {activeSection === 'overview' && (
          <div className="admin-section glass-panel">
            <div style={{ padding: '28px' }}>
              <div className="overview-grid">
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div className="admin-metric-label">{t('admin.totalReservations')}</div>
                  <div className="admin-metric-value">{reservations.length}</div>
                </div>
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div className="admin-metric-label">{t('admin.totalDresses')}</div>
                  <div className="admin-metric-value">{dresses.length}</div>
                </div>
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div className="admin-metric-label">{t('admin.pendingReservations')}</div>
                  <div className="admin-metric-value">{reservations.filter((r) => r.status === 'pending').length}</div>
                </div>
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div className="admin-metric-label">{t('admin.confirmedReservations')}</div>
                  <div className="admin-metric-value">{reservations.filter((r) => r.status === 'confirmed').length}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'reservations' && (
          <div className="admin-section glass-panel admin-table-panel">
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                      <th className="resizable">{t('admin.client')}<div className="col-resizer" /></th>
                      <th className="resizable">{t('admin.dress')}<div className="col-resizer" /></th>
                      <th className="resizable">{t('admin.rentDate')}<div className="col-resizer" /></th>
                      <th className="resizable">{t('admin.trialDate')}<div className="col-resizer" /></th>
                      <th className="resizable">{t('admin.status')}<div className="col-resizer" /></th>
                      <th className="admin-table-actions-col">{t('admin.actions')}</th>
                    </tr>
                  <tr>
                      <th><input className="admin-filter-input" value={filters.client} onChange={(e) => handleFilterChange('client', e.target.value)} placeholder={t('admin.search')} /></th>
                      <th><input className="admin-filter-input" value={filters.dress} onChange={(e) => handleFilterChange('dress', e.target.value)} placeholder={t('admin.search')} /></th>
                      <th><input className="admin-filter-input" value={filters.rentDate} onChange={(e) => handleFilterChange('rentDate', e.target.value)} placeholder={t('admin.search')} /></th>
                      <th><input className="admin-filter-input" value={filters.trialDate} onChange={(e) => handleFilterChange('trialDate', e.target.value)} placeholder={t('admin.search')} /></th>
                      <th><input className="admin-filter-input" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} placeholder={t('admin.search')} /></th>
                      <th />
                    </tr>
                </thead>
                <tbody>
                  {filteredReservations.length === 0 ? (
                    <tr><td colSpan={6} className="admin-no-results">{t('admin.noMatches')}</td></tr>
                  ) : (
                    filteredReservations.map((r) => (
                      <tr key={r.id}>
                        <td>{r.clientName} — {r.clientPhone}</td>
                        <td>{r.dressName || (dresses.find((d) => d.id === r.dressId)?.name ?? '')}</td>
                        <td>{r.rentDate}</td>
                        <td>{r.trialDate}</td>
                        <td>{r.status === 'confirmed' ? t('admin.confirmed') : t('admin.pending') || r.status}</td>
                        <td className="admin-table-actions-col">
                          <div className="admin-actions">
                            {r.status === 'pending' && (
                              <button type="button" onClick={() => handleConfirmReservation(r)} className="admin-action-btn admin-action-confirm">{t('admin.confirm')}</button>
                            )}
                            <button type="button" onClick={() => handleCancelReservation(r.id)} className="admin-action-btn admin-action-delete">{t('admin.delete')}</button>
                            {r.status === 'confirmed' && (
                              <span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 800 }}>{t('admin.confirmed')}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'dresses' && (
          <div className="admin-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t('admin.dressManagement')}</h3>
              <button type="button" onClick={() => { setFormMode('add'); setEditingDress(null); setIsFormOpen(true); }} className="glass-button">{t('admin.addNewDress')}</button>
            </div>
            <div className="glass-panel admin-table-panel">
              <div className="admin-table-scroll">
                <table className="admin-table">
                <thead>
                  <tr>
                    <th className="resizable">{t('admin.dressTableDress')}<div className="col-resizer" /></th>
                    <th className="resizable">{t('admin.dressTableCode')}<div className="col-resizer" /></th>
                    <th className="resizable">{t('admin.dressTableCategory')}<div className="col-resizer" /></th>
                    <th className="resizable">{t('admin.dressTableRent')}<div className="col-resizer" /></th>
                    <th className="resizable">{t('admin.dressTableSize')}<div className="col-resizer" /></th>
                    <th className="resizable">{t('admin.dressTableFeatured')}<div className="col-resizer" /></th>
                    <th className="admin-table-actions-col">{t('admin.dressTableActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dresses.map((dress) => (
                    <tr key={dress.id}>
                      <td>{dress.name}</td>
                      <td className="admin-table-mono">{dress.id}</td>
                      <td>{t(`catalog.categories.${dress.category}`) || dress.category}</td>
                      <td className="admin-table-price">{dress.price != null ? `${dress.price} ج.م` : '—'}</td>
                      <td className="admin-table-mono">{dress.size}</td>
                      <td style={{ textAlign: 'center', color: dress.featured ? '#4ade80' : '#a3b2ac', fontWeight: 800, fontSize: '0.85rem' }}>
                        {dress.featured ? `★ ${t('admin.dressTableFeatured')}` : '—'}
                      </td>
                      <td className="admin-table-actions-col">
                        <div className="admin-actions">
                          <button type="button" onClick={() => { setFormMode('edit'); setEditingDress(dress); setIsFormOpen(true); }} className="admin-action-btn admin-action-edit"><Edit size={14} /><span>{t('admin.edit')}</span></button>
                          <button type="button" onClick={() => handleDeleteDress(dress.id)} className="admin-action-btn admin-action-delete"><Trash2 size={14} /><span>{t('admin.delete')}</span></button>
                          <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                            <button type="button" title={t('admin.moveTop')} className="admin-action-btn" onClick={() => handleMoveDress(dress.id, 0)}>{t('admin.moveTopShort')}</button>
                            <button type="button" title={t('admin.moveUp')} className="admin-action-btn" onClick={() => {
                              // find current index and move up by one
                              const ordered = [...dresses].sort((a,b) => ((a.position||Number.MAX_SAFE_INTEGER)-(b.position||Number.MAX_SAFE_INTEGER)) || (new Date(b.created_at||0)-new Date(a.created_at||0)));
                              const idx = ordered.findIndex(d => d.id === dress.id);
                              if (idx > 0) handleMoveDress(dress.id, idx - 1);
                            }}>↑</button>
                            <button type="button" title={t('admin.moveDown')} className="admin-action-btn" onClick={() => {
                              const ordered = [...dresses].sort((a,b) => ((a.position||Number.MAX_SAFE_INTEGER)-(b.position||Number.MAX_SAFE_INTEGER)) || (new Date(b.created_at||0)-new Date(a.created_at||0)));
                              const idx = ordered.findIndex(d => d.id === dress.id);
                              if (idx >= 0 && idx < ordered.length - 1) handleMoveDress(dress.id, idx + 1);
                            }}>↓</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        )}

        {activeSection === 'faqs' && (
          <div className="admin-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t('admin.faqs') || 'FAQs'}</h3>
            </div>
            <div className="glass-panel admin-settings-panel">
              <div style={{ padding: '18px' }}>
                <form onSubmit={handleFaqSubmit} className="space-y-3">
                  <label className="sr-only">{t('catalog.faqQuestionLabel')}</label>
                  <input className="glass-input" placeholder={t('catalog.faqQuestionLabel')} value={faqForm.question} onChange={(e) => setFaqForm((p) => ({ ...p, question: e.target.value }))} />
                  <label className="sr-only">{t('catalog.faqAnswerLabel')}</label>
                  <textarea className="glass-input" placeholder={t('catalog.faqAnswerLabel')} value={faqForm.answer} onChange={(e) => setFaqForm((p) => ({ ...p, answer: e.target.value }))} rows={4} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="glass-button">{isFaqEditing ? t('admin.edit') : t('admin.addFaq')}</button>
                    <button type="button" className="glass-button-secondary" onClick={() => { setFaqForm({ id: null, question: '', answer: '' }); setIsFaqEditing(false); }}>{t('form.cancel')}</button>
                  </div>
                </form>

                <div style={{ marginTop: 18 }}>
                  {faqs.length === 0 ? (
                    <div className="admin-no-results">{t('admin.noFaqs') || 'No FAQs yet.'}</div>
                  ) : (
                    faqs.map((f) => (
                      <div key={f.id} className="faq-item" style={{ padding: '12px', borderRadius: 8, marginBottom: 8, background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div>
                            <div style={{ fontWeight: 800 }}>{f.question}</div>
                            <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>{f.answer}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="admin-action-btn admin-action-edit" onClick={() => handleFaqEdit(f.id)}>{t('admin.edit')}</button>
                            <button type="button" className="admin-action-btn admin-action-delete" onClick={() => handleFaqDelete(f.id)}>{t('admin.delete')}</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="admin-section glass-panel admin-settings-panel">
            <div className="admin-settings-form">
              <h3>{t('admin.settingsTitle')}</h3>
              <div style={{ marginTop: 20 }}>
                <div className="admin-settings-group">
                  <h3><span style={{ fontSize: '1.1rem' }}>🔗</span> WhatsApp API</h3>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                  {t('admin.settingsHint1')}<br />
                  <code style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px', color: 'var(--primary-gold)' }}>{t('admin.settingsHint2')}</code><br />
                  {t('admin.settingsHint3')}
                </p>
              </div>
              <div className="admin-settings-actions">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button type="button" onClick={handleTestWhatsApp} disabled={whatsappTesting} className="glass-button" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
                      {whatsappTesting ? t('admin.settingsInfo.whatsappTestingText') : t('admin.settingsInfo.whatsappTestButton')}
                    </button>
                  </div>
              </div>
              {whatsappTestMsg && (
                <div className={`admin-flash-msg ${whatsappTestMsg.includes('success') || whatsappTestMsg.includes('بنجاح') ? 'admin-flash-success' : 'admin-flash-error'}`} style={{ marginTop: 12 }}>
                  {whatsappTestMsg}
                </div>
              )}
            </div>
          </div>
        )}

        <DressFormModal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingDress(null); }} mode={formMode} dress={editingDress} dresses={dresses} onSave={async (payload, mode) => {
          try {
            if (mode === 'add') await createDress(payload); else await updateDressAPI(payload);
            onRefreshDresses();
          } catch (err) { console.error(err); }
        }} />
      </main>
    </div>
  );
}
