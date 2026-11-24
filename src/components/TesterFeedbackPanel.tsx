import { useEffect, useRef, useState } from 'react';
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
  repCount?: number;
  liveAngleDeg?: number | null;
  angularSpeedDegSec?: number;
  symmetryDiffDeg?: number | null;
  torsoTiltDeg?: number | null;
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
  attachVideoByDefault?: boolean;
  initialExpanded?: boolean;
  disabled?: boolean;
}

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

async function materializeFileInMemory(file: File): Promise<File> {
  const buffer = await file.arrayBuffer();
  return new File([buffer], file.name || `video_${Date.now()}.mp4`, {
    type: file.type || 'video/mp4',
    lastModified: file.lastModified || Date.now(),
  });
}

function formatFeedbackUploadError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (/failed to fetch|networkerror|load failed|fetch/i.test(msg)) {
    return 'Errore di rete (Failed to fetch) durante il caricamento del video feedback. Verifica la connessione internet e riprova.';
  }
  return msg || 'Impossibile inviare il feedback.';
}

export function TesterFeedbackPanel({
  userId,
  sessionContext,
  defaultVideoFile,
  attachVideoByDefault,
  initialExpanded = false,
  disabled = false,
}: TesterFeedbackPanelProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [issueCategory, setIssueCategory] = useState<string>(TESTER_ISSUE_CATEGORIES[0].value);
  const [description, setDescription] = useState<string>('');
  const [customVideoFile, setCustomVideoFile] = useState<File | null>(null);
  const [attachVideo, setAttachVideo] = useState<boolean>(
    attachVideoByDefault ?? Boolean(defaultVideoFile)
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [hasSubmittedSuccess, setHasSubmittedSuccess] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedFile = customVideoFile ?? defaultVideoFile ?? null;

  useEffect(() => {
    setIsOpen(false);
  }, [initialExpanded]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  useEffect(() => {
    setCustomVideoFile(null);
    setAttachVideo(attachVideoByDefault ?? Boolean(defaultVideoFile));
    setHasSubmittedSuccess(false);
    setSubmitError(null);
    setSubmitSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [defaultVideoFile, attachVideoByDefault]);

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      // Materializza subito in memoria per evitare che su mobile il riferimento scada prima del submit
      const memoryFile = await materializeFileInMemory(chosenFile);
      setCustomVideoFile(memoryFile);
      setAttachVideo(true);
    } catch (readErr) {
      setCustomVideoFile(null);
      const readMsg = readErr instanceof Error ? readErr.message : String(readErr ?? '');
      setSubmitError(
        `Impossibile leggere il file video selezionato (${readMsg || 'permesso scaduto'}). Riprova selezionando un file locale.`
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleAttachToggle = (checked: boolean) => {
    setSubmitError(null);
    setSubmitSuccess(null);
    setAttachVideo(checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || submitting || hasSubmittedSuccess) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      let uploadedVideoPath: string | null = null;
      const fileToSend = attachVideo ? selectedFile : null;

      if (fileToSend) {
        if (fileToSend.size > MAX_VIDEO_SIZE_BYTES) {
          throw new Error('Il file video supera il limite massimo di 50 MB.');
        }

        const contentType = fileToSend.type || 'video/mp4';
        const rawExt = fileToSend.name.split('.').pop()?.toLowerCase() || 'mp4';
        const safeExt = /^[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : 'mp4';
        const filePath = `${userId}/${Date.now()}_${sessionContext.exerciseId}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from('tester-feedback-videos')
          .upload(filePath, fileToSend, {
            contentType,
            cacheControl: '3600',
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
        rep_count: sessionContext.repCount ?? null,
        live_angle_deg: sessionContext.liveAngleDeg ?? null,
        angular_speed_deg_sec: sessionContext.angularSpeedDegSec ?? null,
        symmetry_diff_deg: sessionContext.symmetryDiffDeg ?? null,
        torso_tilt_deg: sessionContext.torsoTiltDeg ?? null,
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

      setHasSubmittedSuccess(true);
      setSubmitSuccess('Feedback inviato con successo! Grazie per il supporto al test.');
      setDescription('');
      setCustomVideoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setSubmitError(formatFeedbackUploadError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isFormLocked = submitting || hasSubmittedSuccess;

  return (
    <div
      style={{
        marginTop: 18,
        background: '#1e293b',
        border: disabled ? '1px solid #475569' : '1px solid #a855f7',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.35)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        style={{
          width: '100%',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? 'rgba(71, 85, 105, 0.16)' : 'rgba(168, 85, 247, 0.12)',
          userSelect: 'none',
          textAlign: 'left',
        }}
      >
        <strong style={{ fontSize: 14, color: disabled ? '#94a3b8' : '#f8fafc' }}>
          Segnala problematica analisi
        </strong>
        <span style={{ fontSize: 12, fontWeight: 700, color: disabled ? '#64748b' : '#d8b4fe' }}>
          {disabled ? 'In attesa IA' : isOpen ? '▲ Chiudi' : '▼ Apri form'}
        </span>
      </button>

      {!disabled && isOpen && (
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
              Esercizio sessione:{' '}
              <strong style={{ color: '#38bdf8' }}>{sessionContext.exerciseLabel}</strong>
            </span>
            <span>
              Reps rilevate:{' '}
              <strong style={{ color: '#f8fafc' }}>{sessionContext.repCount ?? 'N/D'}</strong>
            </span>
          </div>

          <div>
            <label
              htmlFor="tester-issue-select"
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                color: '#e2e8f0',
                marginBottom: 6,
              }}
            >
              Che problematica hai riscontrato?
            </label>
            <select
              id="tester-issue-select"
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
              disabled={isFormLocked}
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
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                color: '#e2e8f0',
                marginBottom: 6,
              }}
            >
              Dettagli aggiuntivi (opzionale)
            </label>
            <textarea
              id="tester-issue-notes"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isFormLocked}
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
              gap: 8,
              fontSize: 12,
              color: '#94a3b8',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: isFormLocked ? 'not-allowed' : 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={attachVideo}
                disabled={isFormLocked}
                onChange={(e) => handleAttachToggle(e.target.checked)}
                style={{
                  width: 15,
                  height: 15,
                  accentColor: '#a855f7',
                  cursor: isFormLocked ? 'not-allowed' : 'pointer',
                }}
              />
              <strong style={{ fontSize: 13, color: '#e2e8f0' }}>
                Allega anche video analizzato (facoltativo, max 50 MB)
              </strong>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              disabled={isFormLocked}
              onChange={handleVideoFileChange}
              style={{ display: 'none' }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                padding: '8px 10px',
                borderRadius: 6,
                background: '#1e293b',
                border: '1px solid #334155',
              }}
            >
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                {selectedFile ? (
                  <span>
                    File pronto: <strong style={{ color: '#38bdf8' }}>{selectedFile.name}</strong> (
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                    {!attachVideo && (
                      <span style={{ color: '#f59e0b', marginLeft: 6 }}>(non verrà allegato)</span>
                    )}
                  </span>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Nessun file video selezionato</span>
                )}
              </div>

              <button
                type="button"
                disabled={isFormLocked}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isFormLocked ? 'not-allowed' : 'pointer',
                  opacity: isFormLocked ? 0.55 : 1,
                  flexShrink: 0,
                }}
              >
                {selectedFile ? 'Cambia file' : 'Seleziona file'}
              </button>
            </div>

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
            disabled={isFormLocked}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: hasSubmittedSuccess ? '1px solid #22c55e' : 'none',
              background: hasSubmittedSuccess
                ? 'rgba(34, 197, 94, 0.18)'
                : submitting
                ? '#6b21a8'
                : '#a855f7',
              color: hasSubmittedSuccess ? '#86efac' : '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: isFormLocked ? 'not-allowed' : 'pointer',
              opacity: isFormLocked ? 0.75 : 1,
            }}
          >
            {submitting
              ? 'Invio feedback in corso...'
              : hasSubmittedSuccess
              ? '✓ Segnalazione inviata'
              : 'Invia segnalazione tester'}
          </button>
        </form>
      )}
    </div>
  );
}