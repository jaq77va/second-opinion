import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface AuthScreenProps {
  forcePasswordRecovery?: boolean;
  onPasswordRecoveryComplete?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  forcePasswordRecovery = false,
  onPasswordRecoveryComplete,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'recovery'>(
    forcePasswordRecovery ? 'recovery' : 'login'
  );
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (forcePasswordRecovery) {
      setMode('recovery');
      setErrorMessage(null);
      setInfoMessage(
        'Link di recupero verificato. Inserisci la tua nuova password per completare la reimpostazione.'
      );
      setPassword('');
      setConfirmPassword('');
    } else if (mode === 'recovery') {
      setMode('login');
    }
  }, [forcePasswordRecovery]);

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
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setInfoMessage('Registrazione completata! Controlla la tua email per confermare l’account.');
      } else if (mode === 'forgot') {
        const redirectUrl =
          typeof window !== 'undefined' ? window.location.origin : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: redirectUrl,
        });
        if (error) throw error;
        setInfoMessage(
          'Se l’indirizzo email è associato a un account, abbiamo inviato un link per reimpostare la password. Controlla anche la cartella spam.'
        );
      } else if (mode === 'recovery') {
        if (password.length < 6) {
          throw new Error('La nuova password deve contenere almeno 6 caratteri.');
        }
        if (password !== confirmPassword) {
          throw new Error('Le due password non coincidono.');
        }

        const { error } = await supabase.auth.updateUser({
          password,
        });
        if (error) throw error;

        setPassword('');
        setConfirmPassword('');
        setInfoMessage('Password aggiornata con successo!');
        onPasswordRecoveryComplete?.();
        setMode('login');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Si è verificato un errore durante l’autenticazione.');
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordField = (
    id: string,
    label: string,
    value: string,
    onChange: (val: string) => void,
    autoCompleteValue: string,
    withToggle = true
  ) => (
    <div>
      <label
        htmlFor={id}
        style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: '#cbd5e1' }}
      >
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          type={withToggle && showPassword ? 'text' : 'password'}
          required
          autoComplete={autoCompleteValue}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: withToggle ? '10px 44px 10px 12px' : '10px 12px',
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#0f172a',
            color: '#f8fafc',
            fontSize: 14,
            outline: 'none',
          }}
        />
        {withToggle && (
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
        )}
      </div>
    </div>
  );

  const headingTitle =
    mode === 'login'
      ? 'Accedi al tuo account'
      : mode === 'signup'
      ? 'Crea un account'
      : mode === 'forgot'
      ? 'Password dimenticata'
      : 'Imposta nuova password';

  const headingSubtitle =
    mode === 'login'
      ? 'Inserisci email e password per accedere.'
      : mode === 'signup'
      ? 'Registrati con email e password per iniziare.'
      : mode === 'forgot'
      ? 'Inserisci la tua email per ricevere il link di reimpostazione.'
      : 'Scegli una nuova password per il tuo account.';

  const submitButtonLabel = loading
    ? 'Attendere...'
    : mode === 'login'
    ? 'Accedi'
    : mode === 'signup'
    ? 'Registrati'
    : mode === 'forgot'
    ? 'Invia link di reset'
    : 'Salva nuova password';

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 107px)',
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
        {mode !== 'recovery' && (
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
        )}

        <h2 style={{ margin: '0 0 6px 0', fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>
          {headingTitle}
        </h2>
        <p style={{ margin: '0 0 18px 0', fontSize: 13, color: '#94a3b8' }}>
          {headingSubtitle}
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
          {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
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
          )}

          {(mode === 'login' || mode === 'signup') &&
            renderPasswordField(
              'auth-password',
              'Password',
              password,
              setPassword,
              mode === 'login' ? 'current-password' : 'new-password',
              true
            )}

          {mode === 'recovery' && (
            <>
              {renderPasswordField(
                'auth-new-password',
                'Nuova password',
                password,
                setPassword,
                'new-password',
                true
              )}
              {renderPasswordField(
                'auth-confirm-password',
                'Conferma nuova password',
                confirmPassword,
                setConfirmPassword,
                'new-password',
                false
              )}
            </>
          )}

          {mode === 'login' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px 0',
                  color: '#38bdf8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  touchAction: 'manipulation',
                }}
              >
                Password dimenticata?
              </button>
            </div>
          )}

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
            {submitButtonLabel}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#cbd5e1',
                fontSize: 12,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                touchAction: 'manipulation',
              }}
            >
              Torna ad Accedi
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;