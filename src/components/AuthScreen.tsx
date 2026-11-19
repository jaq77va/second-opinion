import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LegalDocsModal, type LegalDocTab } from './LegalDocsModal';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [legalTab, setLegalTab] = useState<LegalDocTab | null>(null);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthMessage(null);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.session) {
          onAuthSuccess?.();
        } else {
          setAuthMessage(
            'Registrazione inviata! Controlla la tua email per confermare l’account, poi accedi.'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess?.();
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Errore durante l’autenticazione.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: '100%',
          background: '#1e293b',
          padding: 24,
          borderRadius: 16,
          border: '1px solid #334155',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        }}
      >
        <h2 style={{ textAlign: 'center', color: '#38bdf8', marginBottom: 6, fontSize: 24 }}>
          Second Opinion
        </h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
          {authMode === 'signup' ? 'Crea il tuo account per iniziare' : 'Accedi al tuo account'}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setAuthError(null);
              setAuthMessage(null);
            }}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              border: '1px solid #334155',
              background: authMode === 'signup' ? '#38bdf8' : '#0f172a',
              color: authMode === 'signup' ? '#0f172a' : '#cbd5e1',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Registrati
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setAuthError(null);
              setAuthMessage(null);
            }}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              border: '1px solid #334155',
              background: authMode === 'login' ? '#38bdf8' : '#0f172a',
              color: authMode === 'login' ? '#0f172a' : '#cbd5e1',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Accedi
          </button>
        </div>

        <form onSubmit={handleAuthSubmit}>
          <input
            type="email"
            required
            placeholder="La tua email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              marginBottom: 12,
              borderRadius: 8,
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#fff',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min. 6 caratteri)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              marginBottom: 14,
              borderRadius: 8,
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#fff',
              boxSizing: 'border-box',
            }}
          />

          {authError && (
            <p style={{ color: '#f43f5e', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
              {authError}
            </p>
          )}
          {authMessage && (
            <p style={{ color: '#22c55e', fontSize: 13, marginTop: 0, marginBottom: 12 }}>
              {authMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={authLoading}
            style={{
              width: '100%',
              padding: 12,
              background: '#38bdf8',
              color: '#0f172a',
              fontWeight: 800,
              border: 'none',
              borderRadius: 8,
              cursor: authLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {authLoading ? 'Attendere...' : authMode === 'signup' ? 'Crea account' : 'Entra'}
          </button>
        </form>

        <p style={{ marginTop: 14, marginBottom: 0, fontSize: 11, lineHeight: 1.5, color: '#94a3b8', textAlign: 'center' }}>
          Proseguendo prendi visione della{' '}
          <button
            type="button"
            onClick={() => setLegalTab('privacy')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#38bdf8',
              textDecoration: 'underline',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Privacy Policy
          </button>{' '}
          e accetti i{' '}
          <button
            type="button"
            onClick={() => setLegalTab('terms')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#38bdf8',
              textDecoration: 'underline',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Termini d'Uso
          </button>
          .
        </p>
      </div>

      {legalTab && (
        <LegalDocsModal
          activeTab={legalTab}
          onChangeTab={setLegalTab}
          onClose={() => setLegalTab(null)}
        />
      )}
    </div>
  );
}