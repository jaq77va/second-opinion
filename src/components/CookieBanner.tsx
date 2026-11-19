import { useEffect, useState } from 'react';

export interface CookieConsentState {
  necessary: true;
  analytics: boolean;
  updatedAt: string;
}

const STORAGE_KEY = 'cookie_consent_v1';

interface CookieBannerProps {
  onOpenCookiePolicy: () => void;
  onConsentChange?: (consent: CookieConsentState) => void;
}

export function CookieBanner({ onOpenCookiePolicy, onConsentChange }: CookieBannerProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setVisible(true);
      } else {
        const parsed = JSON.parse(saved) as CookieConsentState;
        setAnalyticsEnabled(Boolean(parsed.analytics));
        onConsentChange?.(parsed);
      }
    } catch {
      setVisible(true);
    }
  }, [onConsentChange]);

  const saveConsent = (analytics: boolean) => {
    const state: CookieConsentState = {
      necessary: true,
      analytics,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignora eventuali blocchi storage del browser
    }
    setAnalyticsEnabled(analytics);
    setVisible(false);
    onConsentChange?.(state);
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 9990,
        maxWidth: 620,
        margin: '0 auto',
        background: '#0f172a',
        border: '1px solid #38bdf8',
        borderRadius: 12,
        padding: 16,
        color: '#f8fafc',
        boxShadow: '0 14px 30px rgba(0, 0, 0, 0.55)',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: '#38bdf8', marginBottom: 6 }}>
        Informativa Cookie e Preferenze
      </div>
      <p style={{ margin: '0 0 12px 0', fontSize: 12, lineHeight: 1.5, color: '#cbd5e1' }}>
        Utilizziamo strumenti tecnici necessari al funzionamento e all'accesso all'account. Puoi accettare o rifiutare eventuali analytics facoltativi. Consulta la{' '}
        <button
          type="button"
          onClick={onOpenCookiePolicy}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#38bdf8',
            textDecoration: 'underline',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Cookie Policy
        </button>
        .
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={analyticsEnabled}
            onChange={(e) => setAnalyticsEnabled(e.target.checked)}
          />
          Analytics opzionali
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => saveConsent(false)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #475569',
              background: '#1e293b',
              color: '#e2e8f0',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Solo necessari
          </button>
          <button
            type="button"
            onClick={() => saveConsent(true)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#38bdf8',
              color: '#0f172a',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Accetta tutto
          </button>
        </div>
      </div>
    </div>
  );
}