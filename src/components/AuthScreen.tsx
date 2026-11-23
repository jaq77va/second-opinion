import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const togglePasswordVisibility = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setInfoMessage('Registrazione completata! Controlla la tua email per confermare l’account.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Si è verificato un errore durante l’autenticazione.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 68px)',
        background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 14,
          padding: 24,
          boxShadow: '0 12px 24px -6px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
              setInfoMessage(null);
            }}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 8,
              border: mode === 'login' ? '1px solid #38bdf8' : '1px solid #334155',
              background: mode === 'login' ? 'rgba(56, 189, 248, 0.16)' : '#0f172a',
              color: mode === 'login' ? '#38bdf8' : '#94a3b8',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            Accedi
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
              setInfoMessage(null);
            }}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: 8,
              border: mode === 'signup' ? '1px solid #38bdf8' : '1px solid #334155',
              background: mode === 'signup' ? 'rgba(56, 189, 248, 0.16)' : '#0f172a',
              color: mode === 'signup' ? '#38bdf8' : '#94a3b8',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            Registrati
          </button>
        </div>

        <h2 style={{ margin: '0 0 6px 0', fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>
          {mode === 'login' ? 'Accedi al tuo account' : 'Crea un account'}
        </h2>
        <p style={{ margin: '0 0 18px 0', fontSize: 13, color: '#94a3b8' }}>
          {mode === 'login'
            ? 'Inserisci email e password per accedere.'
            : 'Registrati con email e password per iniziare.'}
        </p>

        {errorMessage && (
          <div
            style={{
              marginBottom: 14,
              padding: 12,
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              fontSize: 13,
            }}
          >
            {errorMessage}
          </div>
        )}

        {infoMessage && (
          <div
            style={{
              marginBottom: 14,
              padding: 12,
              borderRadius: 8,
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid #22c55e',
              color: '#86efac',
              fontSize: 13,
            }}
          >
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label
              htmlFor="auth-email"
              style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.it"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}
            >
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 44px 10px 12px',
                  borderRadius: 8,
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: 14,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                onPointerDown={(e) => {
                  // Evita che il tap sul bottone faccia perdere il focus o attivi comportamenti ambigui su touch
                  if (e.pointerType === 'touch') {
                    e.preventDefault();
                  }
                }}
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                aria-pressed={showPassword}
                title={showPassword ? 'Nascondi password' : 'Mostra password'}
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  minWidth: 34,
                  minHeight: 34,
                  zIndex: 2,
                  background: 'transparent',
                  border: 'none',
                  color: showPassword ? '#38bdf8' : '#94a3b8',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 17,
                  lineHeight: 1,
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  userSelect: 'none',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '11px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#38bdf8',
              color: '#0f172a',
              fontSize: 14,
              fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              touchAction: 'manipulation',
            }}
          >
            {loading ? 'Attendere...' : mode === 'login' ? 'Accedi' : 'Registrati'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;