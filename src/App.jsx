import { useState, useEffect } from 'react';
import { useLang } from './contexts/LanguageProvider';
import CatalogView from './views/CatalogView';
import AdminDashboard from './views/AdminDashboard';
import SalesDashboard from './views/SalesDashboard';
import DressDetailsView from './views/DressDetailsView';
import WhatsAppModal from './components/WhatsAppModal';
import QRCodeModal from './components/QRCodeModal';
import SideCart from './components/SideCart';
import Footer from './components/Footer';
import { fetchDresses, fetchReservations, createReservation } from './services/dbService';
function App() {
  const [signupResult, setSignupResult] = useState(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const handleMessage = (event) => {
      // Only accept messages from Meta
      if (event.origin !== "https://www.facebook.com") return;

      try {
        const data = JSON.parse(event.data);

        console.log("WhatsApp Embedded Signup session:", data);

        setSignupResult(data);

        // The exact fields can vary depending on the flow.
        // Keep the complete object while testing.
      } catch {
        // Ignore unrelated messages
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const fbLoginCallback = async (response) => {
    console.log("Meta login response:", response);

    if (!response.authResponse) {
      setStatus("WhatsApp signup was cancelled or failed.");
      return;
    }

    const code = response.authResponse.code;

    setStatus("WhatsApp signup completed. Sending result to server...");

    try {
      const result = await fetch("/api/whatsapp/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          signup: signupResult,
        }),
      });

      const data = await result.json();

      console.log("Backend result:", data);

      if (!result.ok) {
        throw new Error(data.error || "Backend request failed");
      }

      setStatus("WhatsApp connected successfully.");
    } catch (error) {
      console.error(error);
      setStatus(`Connection failed: ${error.message}`);
    }
  };

  const launchWhatsAppSignup = () => {
    if (!window.FB) {
      setStatus("Meta SDK is not loaded yet. Please try again.");
      return;
    }

    setStatus("Opening WhatsApp signup...");

    window.FB.login(fbLoginCallback, {
      config_id: CONFIG_ID,
      response_type: "code",
      override_default_response_type: true,
      extras: {
        version: "v4",
      },
    });
  };

  return (
    <div>
      {/* Your existing website content */}

      <button
        onClick={launchWhatsAppSignup}
        style={{
          backgroundColor: "#1877f2",
          border: 0,
          borderRadius: 4,
          color: "#fff",
          cursor: "pointer",
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: 16,
          fontWeight: "bold",
          height: 40,
          padding: "0 24px",
        }}
      >
        Connect WhatsApp
      </button>

      {status && <p>{status}</p>}
    </div>
  );
}
function App() {
  const [dresses, setDresses] = useState([]);
  const [reservations, setReservations] = useState([]);

  const loadData = async () => {
    try {
      const [dressesData, reservationsData] = await Promise.all([
        fetchDresses(),
        fetchReservations(),
      ]);
      setDresses(Array.isArray(dressesData) ? dressesData : []);
      setReservations(Array.isArray(reservationsData) ? reservationsData : []);
    } catch (error) {
      console.error('Failed to load data from Supabase:', error);
    }
  };

  // Parse current URL to determine initial view
  const parseRoute = () => {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/dashboard') return { view: 'admin', dressId: null };
    if (path === '/sales') return { view: 'sales', dressId: null };
    if (path.startsWith('/dress/')) {
      const id = decodeURIComponent(path.replace('/dress/', ''));
      return { view: 'dress', dressId: id };
    }
    return { view: 'catalog', dressId: null };
  };

  const initial = parseRoute();
  const [currentView, setCurrentView] = useState(initial.view);
  const [selectedDressId, setSelectedDressId] = useState(initial.dressId);
  const [savedCatalogScroll, setSavedCatalogScroll] = useState(0);
  const [catalogPage, setCatalogPage] = useState(1);

  // Booking modal state — completely separate from page routing
  const [schedulingDress, setSchedulingDress] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [schedulingCart, setSchedulingCart] = useState(null);

  const { t } = useLang();

  const addToCart = (dress) => {
    if (!dress) return;
    const exists = cart.find((d) => d.id === dress.id);
    if (exists) {
      setIsCartOpen(true);
      return;
    }
    if (cart.length >= 4) {
      // Max reached — open the cart so the user can finish booking
      setIsCartOpen(true);
      return;
    }
    const next = [...cart, dress];
    setCart(next);
    setIsCartOpen(true);
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((d) => d.id !== id));
  };

  const handleFinishCart = () => {
    setSchedulingCart(cart);
    setIsCartOpen(false);
    setSchedulingDress(null);
  };

  const handleCloseScheduling = () => {
    setSchedulingDress(null);
    setSchedulingCart(null);
  };

  const [qrDresses, setQrDresses] = useState([]);
  const handleOpenQR = (dresses) => setQrDresses(Array.isArray(dresses) ? dresses : []);
  const handleCloseQR = () => {
    setQrDresses([]);
    navigate('catalog');
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRoute();
      setCurrentView(route.view);
      setSelectedDressId(route.dressId);
      if (route.view === 'catalog') {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: savedCatalogScroll, behavior: 'auto' });
        });
      }
    };

    // Listen for external notifications that dresses changed
    const onDressesUpdated = () => {
      loadData();
    };
    const onStorage = (e) => {
      if (e.key === 'mary_dresses_updated_at') loadData();
    };
    window.addEventListener('mary_dresses_updated', onDressesUpdated);
    window.addEventListener('storage', onStorage);

    window.addEventListener('popstate', handlePopState);
    loadData();
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  // cleanup for dresses update listeners
  useEffect(() => {
    return () => {
      window.removeEventListener('mary_dresses_updated', loadData);
      window.removeEventListener('storage', loadData);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const navigate = (view, dressId = null) => {
    let path = '/';
    if (view === 'admin') path = '/dashboard';
    else if (view === 'dress' && dressId) path = `/dress/${encodeURIComponent(dressId)}`;

    window.history.pushState({}, '', path);
    setCurrentView(view);
    setSelectedDressId(dressId);

    if (view === 'catalog') {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: savedCatalogScroll, behavior: 'auto' });
      });
    } else {
      window.scrollTo(0, 0);
    }
  };

  const handleRefreshDresses = async () => {
    await loadData();
  };

  const handleReserve = async (reservation) => {
    try {
      const saved = await createReservation(reservation);
      setReservations((prev) => [saved || reservation, ...prev]);
      return saved || reservation;
    } catch (error) {
      console.error('Failed to save reservation to Supabase:', error);
      const err = new Error(`${t('whatsapp.errorSave')} ${error.message}`);
      err.cause = error;
      throw err;
    }
  };

  // Dress clicked in catalog → open full dress page
  const handleSelectDress = (dress) => {
    setSavedCatalogScroll(window.scrollY || window.pageYOffset || 0);
    navigate('dress', dress.id);
  };

  // Back from dress page → catalog
  const handleBackToCatalog = () => {
    navigate('catalog');
  };

  // legacy scheduling handler (unused when using cart finish flow)

  // Find the selected dress object for the details page
  const selectedDress = selectedDressId
    ? dresses.find(d => d.id === selectedDressId)
    : null;

  return (
    <div className="min-h-screen text-[var(--pearl-white)]">
      {/* PAGE ROUTING — only one page renders at a time */}
      {currentView === 'admin' && (
        <AdminDashboard
          dresses={dresses}
          onRefreshDresses={handleRefreshDresses}
          onCloseAdmin={() => {
            navigate('catalog');
            handleRefreshDresses();
          }}
        />
      )}

      {currentView === 'sales' && (
        <SalesDashboard
          dresses={dresses}
          onRefreshDresses={handleRefreshDresses}
          onCloseSales={() => {
            navigate('catalog');
            handleRefreshDresses();
          }}
        />
      )}

      {currentView === 'catalog' && (
        <CatalogView
          dresses={dresses}
          onSelectDress={handleSelectDress}
          catalogPage={catalogPage}
          onPageChange={setCatalogPage}
        />
      )}

      {currentView === 'dress' && (
        <DressDetailsView
          dress={selectedDress}
          onBack={handleBackToCatalog}
          onAddToCart={addToCart}
        />
      )}

      {/* BOOKING MODAL — true fixed popup, renders above everything */}
      <WhatsAppModal
        isOpen={schedulingDress !== null || schedulingCart !== null}
        onClose={handleCloseScheduling}
        dress={schedulingDress}
        cart={schedulingCart}
        onReserve={handleReserve}
        reservations={reservations}
        onOpenQR={handleOpenQR}
      />

      {/* QR Modal lifted to App so it isn't unmounted when WhatsAppModal closes */}
      <QRCodeModal isOpen={qrDresses.length > 0} onClose={handleCloseQR} dresses={qrDresses} />

      {/* Side cart */}
      <SideCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onRemove={removeFromCart}
        onFinish={handleFinishCart}
        onContinue={() => setIsCartOpen(false)}
      />
      <Footer />
    </div>
  );
}
