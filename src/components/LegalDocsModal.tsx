export type LegalDocTab = 'privacy' | 'terms' | 'cookies';

interface LegalDocsModalProps {
  activeTab: LegalDocTab;
  onChangeTab: (tab: LegalDocTab) => void;
  onClose: () => void;
}

export function LegalDocsModal({ activeTab, onChangeTab, onClose }: LegalDocsModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(9, 13, 22, 0.88)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '86vh',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: 14,
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* HEADER + TAB */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            background: '#0f172a',
          }}
        >
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onChangeTab('privacy')}
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                border: activeTab === 'privacy' ? '1px solid #38bdf8' : '1px solid #334155',
                background: activeTab === 'privacy' ? 'rgba(56, 189, 248, 0.16)' : '#1e293b',
                color: activeTab === 'privacy' ? '#38bdf8' : '#cbd5e1',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onChangeTab('terms')}
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                border: activeTab === 'terms' ? '1px solid #38bdf8' : '1px solid #334155',
                background: activeTab === 'terms' ? 'rgba(56, 189, 248, 0.16)' : '#1e293b',
                color: activeTab === 'terms' ? '#38bdf8' : '#cbd5e1',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Termini d'Uso
            </button>
            <button
              type="button"
              onClick={() => onChangeTab('cookies')}
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                border: activeTab === 'cookies' ? '1px solid #38bdf8' : '1px solid #334155',
                background: activeTab === 'cookies' ? 'rgba(56, 189, 248, 0.16)' : '#1e293b',
                color: activeTab === 'cookies' ? '#38bdf8' : '#cbd5e1',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cookie Policy
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi documento"
            style={{
              padding: '6px 10px',
              borderRadius: 7,
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ✕ Chiudi
          </button>
        </div>

        {/* CONTENUTO SCORRIBILE */}
        <div style={{ padding: 20, overflowY: 'auto', fontSize: 13, lineHeight: 1.6, color: '#cbd5e1' }}>
          {activeTab === 'privacy' && (
            <div>
              <h2 style={{ marginTop: 0, color: '#38bdf8', fontSize: 18 }}>Informativa Privacy (GDPR)</h2>
              <p>
                <strong>Ultimo aggiornamento:</strong> Novembre 2026
              </p>
              <p>
                <strong>1. Titolare del trattamento:</strong> [Inserisci Nome/Cognome o Denominazione, Indirizzo/Sede in Lombardia e Email di contatto privacy].
              </p>
              <p>
                <strong>2. Tipologie di dati trattati:</strong>
                <br />• <em>Dati dell'account e abbonamento:</em> indirizzo email, credenziali/identificativi di autenticazione e stato del piano gestiti tramite Supabase.
                <br />• <em>Log di attività e utilizzo:</em> registrazioni di accesso all'account (data/ora, identificativo utente e nome utente) nonché esercizio analizzato e sintesi/responso dell'AI Coach per finalità tecniche, sicurezza e gestione del servizio.
                <br />• <em>Elaborazione video e dati geometrici:</em> l'analisi del movimento tramite MediaPipe viene eseguita in locale nel browser sul file video selezionato; per il feedback dell'AI Coach vengono trasmessi i dati geometrici sintetici, non il file video grezzo.
              </p>
              <p>
                <strong>3. Finalità e base giuridica:</strong> i dati vengono trattati per creare e gestire l'account, erogare le funzionalità richieste e gestire trial o piani (esecuzione del contratto / misure precontrattuali, art. 6 par. 1 lett. b GDPR), nonché per sicurezza e prevenzione abusi (legittimo interesse, art. 6 par. 1 lett. f GDPR). Il servizio non ha finalità sanitarie o cliniche.
              </p>
              <p>
                <strong>4. Conservazione e responsabili:</strong> i dati restano conservati per il tempo necessario all'erogazione del servizio e alla gestione dell'account o secondo i termini di legge, avvalendosi di fornitori infrastrutturali (es. hosting web, Supabase, servizi AI) conformi al GDPR.
              </p>
              <p>
                <strong>5. Diritti dell'interessato:</strong> l'utente può chiedere in qualunque momento accesso, rettifica, cancellazione, limitazione, opposizione o portabilità dei dati, e proporre reclamo all'Autorità Garante, scrivendo a [Inserisci Email Privacy].
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div>
              <h2 style={{ marginTop: 0, color: '#38bdf8', fontSize: 18 }}>Termini e Condizioni d'Uso</h2>
              <p>
                <strong>Ultimo aggiornamento:</strong> Novembre 2026
              </p>
              <p>
                <strong>1. Oggetto del servizio:</strong> l'applicazione offre strumenti di supporto all'allenamento sportivo, stima geometrica del movimento (angoli, ROM, stima di potenza) e suggerimenti generativi tramite AI Coach.
              </p>
              <p>
                <strong>2. Disclaimer sportivo e non medico:</strong> il servizio ha finalità esclusivamente informative e di supporto tecnico all'esercizio fisico. <strong>Non costituisce consulenza medica, diagnosi, prognosi o protocollo riabilitativo</strong> e non sostituisce in alcun modo il parere di un medico, fisioterapista o altro professionista sanitario abilitato. L'utente dichiara di essere fisicamente idoneo all'attività svolta e di assumersi la piena responsabilità per esecuzione, carichi e sicurezza.
              </p>
              <p>
                <strong>3. Limiti dell'Intelligenza Artificiale e della Computer Vision:</strong> conteggio delle ripetizioni, valori angolari, ROM, stime di potenza e risposte dell'AI Coach sono generati automaticamente tramite algoritmi di pose estimation e modelli di intelligenza artificiale. Possono verificarsi imprecisioni o errori dovuti a inquadratura, distanza, illuminazione, riflessi (es. specchi), occlusioni o limiti tecnici del modello: l'utente deve sempre verificare visivamente e con prudenza l'esecuzione reale.
              </p>
              <p>
                <strong>4. Gestione e responsabilità sui video caricati:</strong> l'utente mantiene i diritti sui propri video e garantisce di avere titolo e autorizzazioni necessarie per caricarli (incluso l'eventuale consenso di terzi ripresi nell'inquadratura). È vietato caricare contenuti illeciti, offensivi, lesivi della privacy altrui o non autorizzati.
              </p>
              <p>
                <strong>5. Account, trial e piani a pagamento:</strong> l'utente è responsabile della custodia delle proprie credenziali e di un uso corretto dell'account. Quando verranno attivati piani a pagamento, prezzi, durata, eventuali rinnovi e condizioni di recesso/rimborso saranno indicati in modo trasparente prima del completamento dell'acquisto.
              </p>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div>
              <h2 style={{ marginTop: 0, color: '#38bdf8', fontSize: 18 }}>Cookie Policy</h2>
              <p>
                <strong>Ultimo aggiornamento:</strong> Novembre 2026
              </p>
              <p>
                <strong>1. Cosa sono cookie e tecnologie similari:</strong> includono cookie del browser e strumenti di archiviazione locale (come <code>localStorage</code> o <code>sessionStorage</code>) utilizzati per far funzionare l'applicazione o ricordare preferenze.
              </p>
              <p>
                <strong>2. Categorie utilizzate:</strong>
                <br />• <em>Tecnici / necessari:</em> indispensabili per autenticazione, mantenimento della sessione (es. Supabase) e salvataggio della scelta sul banner cookie. Non richiedono consenso preventivo.
                <br />• <em>Analytics o non tecnici (se attivati):</em> utilizzati solo previo consenso espresso tramite il banner, salvo configurazioni strettamente anonimizzate e conformi alle linee guida vigenti.
              </p>
              <p>
                <strong>3. Modifica delle preferenze:</strong> puoi aggiornare in qualsiasi momento le tue preferenze dal banner cookie o dalle impostazioni del tuo browser.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}