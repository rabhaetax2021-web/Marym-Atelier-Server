import { useEffect, useState } from 'react';
import { Check, Trash2, ArrowLeft } from 'lucide-react';
import { fetchReservations, updateReservation as updateReservationAPI, deleteReservation } from '../services/dbService';
import { useLang } from '../contexts/LanguageProvider';

const SALES_PASSCODE = '1234';

export default function SalesDashboard({ dresses, onCloseSales }) {
  const { t, lang, setLang } = useLang();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [reservations, setReservations] = useState([]);
  const [filters, setFilters] = useState({ client: '', dress: '', rentDate: '', trialDate: '', status: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchReservations();
        setReservations(Array.isArray(data) ? data : []);
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  // Column resizer for sales table (same approach as admin)
  useEffect(() => {
    const tables = Array.from(document.querySelectorAll('.admin-table'));
    let current = null;

    function onMouseMove(e) {
      if (!current) return;
      const { startX, startWidth, th, index } = current;
      const dx = e.clientX - startX;
      const newWidth = Math.max(60, startWidth + dx);
      th.style.width = `${newWidth}px`;
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
    if (passcode === SALES_PASSCODE) {
      setIsAuthenticated(true);
      setMessage('');
    } else {
      setMessage(t('sales.loginError') || t('admin.loginError'));
    }
  };

  const handleFilterChange = (key, value) => setFilters((p) => ({ ...p, [key]: value }));

  const filteredReservations = reservations.filter((r) => {
    if (filters.client && !(`${r.clientName} ${r.clientPhone}`.toLowerCase().includes(filters.client.toLowerCase()))) return false;
    if (filters.dress) {
      const dn = r.dressName || (dresses.find((d) => d.id === r.dressId)?.name ?? '');
      if (!dn.toLowerCase().includes(filters.dress.toLowerCase())) return false;
    }
    if (filters.rentDate && !(String(r.rentDate || '').toLowerCase().includes(filters.rentDate.toLowerCase()))) return false;
    if (filters.trialDate && !(String(r.trialDate || '').toLowerCase().includes(filters.trialDate.toLowerCase()))) return false;
    if (filters.status && !(String(r.status || '').toLowerCase().includes(filters.status.toLowerCase()))) return false;
    return true;
  });

  const handleConfirmReservation = async (reservation) => {
    try {
      const updated = await updateReservationAPI({ ...reservation, status: 'confirmed' });
      setReservations((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) { console.error(err); }
  };

  const handleCancelReservation = async (id) => {
    try {
      await deleteReservation(id);
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (err) { console.error(err); }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
        <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>{t('sales.loginTitle')}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{t('sales.loginSubtitle')}</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>{t('sales.passcodeLabel')}</label>
              <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder={t('sales.passcodePlaceholder')} className="glass-input" style={{ width: '100%' }} />
            </div>
            <div className="flex items-center gap-2" style={{ marginTop: '1rem' }}>
              <button type="submit" className="glass-button" style={{ flex: 1 }}>{t('sales.loginButton')}</button>
              <button type="button" onClick={onCloseSales} style={{ padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(229, 192, 96, 0.2)', background: 'transparent', color: 'var(--primary-gold)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700' }}>{t('sales.backToStore')}</button>
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
          <h2>{t('sales.dashboardTitle')}</h2>
        </div>
        <div className="admin-sidebar-footer">
          <div>
            <label>{t('admin.langLabel')}</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="glass-input admin-lang-select">
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
          <button type="button" onClick={onCloseSales} className="admin-sidebar-link admin-sidebar-exit"><ArrowLeft size={18} /><span>{t('sales.backToStore')}</span></button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-main-header"><h1>{t('sales.dashboardTitle')}</h1></header>

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
                <tr className="admin-table-filters">
                  <th><input type="text" placeholder={t('admin.search')} value={filters.client} onChange={(e) => handleFilterChange('client', e.target.value)} className="admin-filter-input" /></th>
                  <th><input type="text" placeholder={t('admin.search')} value={filters.dress} onChange={(e) => handleFilterChange('dress', e.target.value)} className="admin-filter-input" /></th>
                  <th><input type="text" placeholder={t('admin.search')} value={filters.rentDate} onChange={(e) => handleFilterChange('rentDate', e.target.value)} className="admin-filter-input" /></th>
                  <th><input type="text" placeholder={t('admin.search')} value={filters.trialDate} onChange={(e) => handleFilterChange('trialDate', e.target.value)} className="admin-filter-input" /></th>
                  <th>
                    <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="admin-filter-select">
                      <option value="">{t('admin.all')}</option>
                      <option value="pending">{t('sales.pending')}</option>
                      <option value="confirmed">{t('sales.confirmed')}</option>
                    </select>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredReservations.length === 0 ? (
                  <tr><td colSpan={6} className="text-center p-6 text-[var(--text-muted)]">{t('sales.noReservations')}</td></tr>
                ) : (
                  filteredReservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td>
                        <div>{reservation.clientName}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">{reservation.clientPhone}</div>
                      </td>
                      <td>{reservation.dressName || (dresses.find((d) => d.id === reservation.dressId)?.name ?? '—')}</td>
                      <td className="admin-table-mono">{reservation.rentDate}</td>
                      <td className="admin-table-mono">{reservation.trialDate} {reservation.time}</td>
                      <td><span className={`admin-status ${reservation.status === 'confirmed' ? 'admin-status-available' : 'admin-status-pending'}`}>{reservation.status === 'confirmed' ? t('sales.confirmed') : t('sales.pending')}</span></td>
                      <td className="admin-table-actions-col">
                        <div className="admin-actions">
                          {reservation.status === 'pending' && (<button type="button" onClick={() => handleConfirmReservation(reservation)} className="admin-action-btn admin-action-confirm"><Check size={14} />{t('admin.confirm')}</button>)}
                          {reservation.status === 'pending' && (<button type="button" onClick={() => handleCancelReservation(reservation.id)} className="admin-action-btn admin-action-delete"><Trash2 size={14} />{t('admin.delete')}</button>)}
                          {reservation.status === 'confirmed' && (<span style={{ fontSize: '0.78rem', color: '#4ade80', fontWeight: 800 }}>{t('sales.confirmed')}</span>)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
