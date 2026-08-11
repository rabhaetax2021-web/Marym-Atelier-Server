import { useEffect, useState, useRef } from 'react';
import { loadFacebookSdk } from '../services/facebookSdk';
import { fetchWhatsAppConnection, completeEmbeddedSignup } from '../services/whatsappConnectionService';

const FACEBOOK_EMBEDDED_SIGNUP_CONFIG_ID = '1418864696721739';

function parseEmbeddedSignupEvent(event) {
  if (!event || !event.origin || !event.data) return null;
  const allowedOrigins = [
    'https://www.facebook.com',
    'https://facebook.com',
    'https://l.facebook.com',
    'https://web.facebook.com',
    'https://www.web.facebook.com',
  ];
  if (!allowedOrigins.includes(event.origin)) return null;

  const raw = typeof event.data === 'string'
    ? (() => { try { return JSON.parse(event.data); } catch { return null; } })()
    : event.data;

  if (!raw || typeof raw !== 'object') return null;
  if (raw.type !== 'WA_EMBEDDED_SIGNUP') return null;

  const eventType = String(raw.event || '').trim();
  const data = raw.data || raw;
  const wabaId = data?.waba_id || data?.whatsapp_business_account_id || data?.whatsappBusinessAccountId || data?.whatsapp_business_account?.id;
  const phoneNumberId = data?.phone_number_id || data?.phoneNumberId || data?.phone_number?.id;

  const parsed = {
    event: eventType,
    data,
    wabaId: wabaId ? String(wabaId) : null,
    phoneNumberId: phoneNumberId ? String(phoneNumberId) : null,
  };

  console.log('[WhatsApp Embedded Signup] Event:', parsed);

  if (eventType === 'CANCEL' || eventType === 'ERROR') {
    return parsed;
  }

  const allowedSuccessEvents = [
    'SESSION_INFO',
    'FINISH',
    'FINISH_ONLY_WABA',
    'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
  ];
  if (!allowedSuccessEvents.includes(eventType)) return null;
  if (!parsed.wabaId) return null;

  return parsed;
}

export default function WhatsAppConnectionPanel() {
  const [connection, setConnection] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const sessionRef = useRef(null);
  const listenerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    async function loadConnection() {
      setLoading(true);
      setErrorMessage('');
      try {
        const data = await fetchWhatsAppConnection();
        if (!mounted) return;
        setConnection(data.connection || null);
      } catch (err) {
        if (!mounted) return;
        setErrorMessage(err.message || 'Failed to load WhatsApp connection status.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadConnection();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!isConnecting) return undefined;

    const onMessage = (event) => {
      const parsed = parseEmbeddedSignupEvent(event);
      if (parsed) {
        sessionRef.current = parsed;
        setStatusMessage('Embedded Signup session received. Waiting for login callback...');
      }
    };

    window.addEventListener('message', onMessage);
    listenerRef.current = onMessage;
    return () => {
      window.removeEventListener('message', listenerRef.current);
      listenerRef.current = null;
    };
  }, [isConnecting]);

  const handleConnect = async () => {
    setErrorMessage('');
    setStatusMessage('Loading Facebook SDK...');
    setIsConnecting(true);

    try {
      const FB = await loadFacebookSdk();
      setStatusMessage('Facebook SDK loaded. Opening Embedded Signup.');

      const response = await new Promise((resolve, reject) => {
        FB.login((result) => {
          if (!result) return reject(new Error('WhatsApp signup response was empty.'));
          if (!result.authResponse) return reject(new Error('WhatsApp signup was cancelled or failed.'));
          if (!result.authResponse.code) return reject(new Error('Authorization code was not returned by Facebook.'));
          resolve(result);
        }, {
          config_id: FACEBOOK_EMBEDDED_SIGNUP_CONFIG_ID,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            version: 'v4',
            featureType: 'whatsapp_business_app_onboarding',
            sessionInfoVersion: '3',
          },
        });
      });

      setStatusMessage('Login callback received. Waiting for Embedded Signup session info...');

      const sessionData = await new Promise((resolve, reject) => {
        const deadline = Date.now() + 10000;
        const intervalMs = 250;

        const checkSession = () => {
          const current = sessionRef.current;
          if (current) {
            clearInterval(timer);
            resolve(current);
          } else if (Date.now() > deadline) {
            clearInterval(timer);
            reject(new Error('Embedded Signup session was not received from Facebook.'));
          }
        };

        const timer = setInterval(checkSession, intervalMs);
        checkSession();
      });

      if (!sessionData || !sessionData.wabaId) {
        throw new Error('Embedded Signup session did not return a WABA ID.');
      }

      const payload = {
        code: response.authResponse.code,
        waba_id: sessionData.wabaId,
      };
      if (sessionData.phoneNumberId) {
        payload.phone_number_id = sessionData.phoneNumberId;
      }

      await completeEmbeddedSignup(payload);

      setStatusMessage('WhatsApp connection completed successfully. Refreshing status...');
      const refreshed = await fetchWhatsAppConnection();
      setConnection(refreshed.connection || null);
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to connect WhatsApp.');
      setStatusMessage('');
    } finally {
      setIsConnecting(false);
      sessionRef.current = null;
    }
  };

  return (
    <div className="glass-panel admin-settings-panel" style={{ marginTop: 24 }}>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>WhatsApp Connection</h3>
            <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
              Connect your WhatsApp Business account using Meta Embedded Signup.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button type="button" className="glass-button" onClick={handleConnect} disabled={isConnecting} style={{ padding: '0.9rem 1.4rem' }}>
              {isConnecting ? 'Connecting...' : connection ? 'Reconnect WhatsApp' : 'Connect WhatsApp'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ marginTop: 18, color: 'var(--text-muted)' }}>Loading current connection status...</div>
        ) : (
          <div style={{ marginTop: 18, display: 'grid', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status</span>
              <strong>{connection ? 'Connected' : 'Not connected'}</strong>
            </div>
            {connection && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>WABA ID</span>
                  <strong>{connection.waba_id}</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Phone Number ID</span>
                  <strong>{connection.phone_number_id}</strong>
                </div>
                {connection.display_phone_number && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Phone number</span>
                    <strong>{connection.display_phone_number}</strong>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {statusMessage && <div className="admin-flash-msg" style={{ marginTop: 18, borderColor: 'rgba(56, 189, 248, 0.35)' }}>{statusMessage}</div>}
        {errorMessage && <div className="admin-flash-msg admin-flash-error" style={{ marginTop: 18 }}>{errorMessage}</div>}
      </div>
    </div>
  );
}
