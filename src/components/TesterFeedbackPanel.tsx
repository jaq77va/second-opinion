import { useState } from 'react';
import { supabase } from '../supabaseClient';

export const TESTER_ISSUE_CATEGORIES = [
  {
    value: 'rep_count_wrong',
    label: 'Ripetizioni non contate o contate in eccesso',
  },
  {
    value: 'skeleton_unstable',
    label: 'Scheletro / punti articolari persi o tremolanti',
  },
  {
    value: 'rom_angles_inaccurate',
    label: 'Angoli articolari o ROM % non realistici',
  },
  {
    value: 'power_watt_incoherent',
    label: 'Stima potenza (Watt) incoerente',
  },
  {
    value: 'mobile_performance_lag',
    label: 'Analisi lenta, video a scatti o errore su mobile',
  },
  {
    value: 'camera_guide_unclear',
    label: 'Guida inquadratura poco chiara per questo esercizio',
  },
  {
    value: 'ai_coach_feedback',
    label: 'Risposta AI Coach poco pertinente o errore AI',
  },
  {
    value: 'other',
    label: 'Altro (specifica nelle note)',
  },
] as const;

export interface TesterSessionContext {
  exerciseId: string;
  exerciseLabel: string;
  weightKg: number;
  repCount: number;
  romQuality: number;
  powerScore: number;
  minAngle?: number;
  maxAngle?: number;
  trendSummary?: string;
}

interface TesterFeedbackPanelProps {
  userId: string;
  sessionContext: TesterSessionContext;
  defaultVideoFile?: File | null;
}

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export function TesterFeedbackPanel({
  userId,
  sessionContext,
  defaultVideoFile,
}: TesterFeedbackPanelProps) {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [issueCategory, setIssueCategory] = useState<string>(TESTER_ISSUE_CATEGORIES[0].value);
  const [description, setDescription] = useState<string>('');
  const [customVideoFile, setCustomVideoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const selectedFile = customVideoFile ?? defaultVideoFile ?? null;

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosenFile = e.target.files?.[0] ?? null;
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!chosenFile) {
      setCustomVideoFile(null);
      return;
    }

    if (chosenFile.size > MAX_VIDEO_SIZE_BYTES) {
      setCustomVideoFile(null);
      e.target.value = '';
      setSubmitError('Il file video supera il limite massimo di 50 MB.');
      return;
    }

    setCustomVideoFile(chosenFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      let uploadedVideoPath: string | null = null;

      if (selectedFile) {
        if (selectedFile.size > MAX_VIDEO_SIZE_BYTES) {
          throw new Error('Il file video supera il limite massimo di 50 MB.');
        }

        const safeExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'mp4';
        const filePath = `${userId}/${Date.now()}_${sessionContext.exerciseId}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from('tester-feedback-videos')
          .upload(filePath, selectedFile, {
            contentType: selectedFile.type || 'video/mp4',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Errore caricamento video: ${uploadError.message}`);
        }

        uploadedVideoPath = filePath;
      }

      const sessionMetadata = {
        exercise_label: sessionContext.exerciseLabel,
        weight_kg: sessionContext.weightKg,
        rep_count: sessionContext.repCount,
        rom_quality: sessionContext.romQuality,
        power_score: sessionContext.powerScore,
        min_angle: sessionContext.minAngle ?? null,
        max_angle: sessionContext.maxAngle ?? null,
        trend_summary: sessionContext.trendSummary ?? null,
        viewport_width: typeof window !== 'undefined' ? window.innerWidth : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        video_attached: Boolean(uploadedVideoPath),
      };

      const { error: insertError } = await supabase.from('tester_feedback').insert({
        user_id: userId,
        exercise_analyzed: sessionContext.exerciseId,
        issue_category: issueCategory,
        description: description.trim() || null,
        video_path: uploadedVideoPath,
        session_metadata: sessionMetadata,
      });

      if (insertError) {
        throw insertError;
      }

      setSubmitSuccess('Feedback inviato con successo! Grazie per il supporto al test.');
      setDescription('');
      setCustomVideoFile(null);
    } catch (err: any) {
      setSubmitError(err?.message || 'Impossibile inviare il feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 18,
        background: '#1e293b',
        border: '1px solid #a855f7',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.35)',
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          background: 'rgba(168, 85, 247, 0.12)',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '3px 7px',
              borderRadius: 5,
              background: '#a855f7',
              color: '#fff',
            }}
          >
            Tester
          </span>
          <strong style={{ fontSize: 14, color: '#f8fafc' }}>
            Segnala problematica analisi
          </strong>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#d8b4fe' }}>
          {isOpen ? '▲ Chiudi' : '▼ Apri form'}
        </span>
      </div>

      {isOpen && (
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 16,
            borderTop: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: '#0f172a',
              border: '1px solid #334155',
              fontSize: 12,
              color: '#cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            <span>
              Esercizio sessione: <strong style={{ color: '#38bdf8' }}>{sessionContext.exerciseLabel}</strong>
            </span>
            <span>
              Reps rilevate: <strong style={{ color: '#f8fafc' }}>{sessionContext.repCount}</strong>
            </span>
          </div>

          <div>
            <label
              htmlFor="tester-issue-select"
              style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}
            >
              Che problematica hai riscontrato?
            </label>
            <select
              id="tester-issue-select"
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: 13,
                outline: 'none',
              }}
            >
              {TESTER_ISSUE_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="tester-issue-notes"
              style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}
            >
              Dettagli aggiuntivi (opzionale)
            </label>
            <textarea
              id="tester-issue-notes"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              placeholder="Es. Ho fatto 8 ripetizioni ma ne ha contate 5, camera laterale a 2,5 m..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #334155',
                background: '#0f172a',
                color: '#f8fafc',
                fontSize: 13,
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: '#0f172a',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: 12,
              color: '#94a3b8',
            }}
          >
            <strong style={{ fontSize: 13, color: '#e2e8f0' }}>
              Allega anche il video analizzato (facoltativo, max 50 MB)
            </strong>

            {selectedFile ? (
              <div>
                File selezionato: <strong style={{ color: '#38bdf8' }}>{selectedFile.name}</strong> (
                {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
              </div>
            ) : (
              <div>Nessun video allegato (puoi inviare anche un altro file fino a 50 MB).</div>
            )}

            <input
              type="file"
              accept="video/*"
              disabled={submitting}
              onChange={handleVideoFileChange}
              style={{ fontSize: 12, color: '#cbd5e1' }}
            />
            <span>
              Il video verrà usato esclusivamente per calibrare gli algoritmi di analisi durante il periodo di test.
            </span>
          </div>

          {submitError && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #ef4444',
                color: '#fda4af',
                fontSize: 12,
              }}
            >
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid #22c55e',
                color: '#86efac',
                fontSize: 12,
              }}
            >
              {submitSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: 'none',
              background: '#a855f7',
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Invio feedback in corso...' : 'Invia segnalazione tester'}
          </button>
        </form>
      )}
    </div>
  );
}