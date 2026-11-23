import { useState, useRef, useEffect, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { AuthScreen } from './components/AuthScreen';
import { CameraGuidesView } from './components/CameraGuidesView';
import { CookieBanner, type CookieConsentState } from './components/CookieBanner';
import { LegalDocsModal, type LegalDocTab } from './components/LegalDocsModal';
import { TesterFeedbackPanel } from './components/TesterFeedbackPanel';
import { analyzeExerciseGeometry, type AnalysisResult } from './biomechanicsEngine';
import { getGeminiFeedback } from './geminiCoach';
import { logUserActivity } from './utils/activityLogger';

type Exercise =
  | 'squat'
  | 'stacco'
  | 'panca_piana'
  | 'alzate_laterali'
  | 'affondi'
  | 'bulgarian_squat'
  | 'push_up'
  | 'military_press'
  | 'curl_bicipiti'
  | 'french_press'
  | 'rematore_bilanciere'
  | 'stacco_rumeno'
  | 'lat_machine'
  | 'pulley_basso'
  | 'leg_extension'
  | 'leg_curl'
  | 'chest_press'
  | 'shoulder_press'
  | 'pushdown_cavi'
  | 'trazioni_sbarra';

type PlanType = 'none' | 'trial' | 'quarterly' | 'semiannual' | 'annual';

type AngleMode = 'extension_flexion' | 'abduction_up';

interface ExerciseConfig {
  id: Exercise;
  label: string;
  imagePath: string;
  viewHint: string;
  isDumbbell: boolean;
  isTrialAllowed: boolean;
  mode: AngleMode;
  topMin?: number;
  bottomMax?: number;
  restMax?: number;
  apexMin?: number;
  romMinAngle?: number;
  romMaxAngle?: number;
}

interface TimedLandmarkFrame {
  timeSec: number;
  landmarks: any[];
}

const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const EXERCISES: ExerciseConfig[] = [
  {
    id: 'squat',
    label: 'Squat',
    imagePath: '/images/squat.png',
    viewHint: 'Inquadratura laterale o frontale a figura intera',
    isDumbbell: false,
    isTrialAllowed: true,
    mode: 'extension_flexion',
    topMin: 150,
    bottomMax: 100,
    romMinAngle: 65,
    romMaxAngle: 155,
  },
  {
    id: 'stacco',
    label: 'Stacco da terra',
    imagePath: '/images/stacco.png',
    viewHint: 'Inquadratura laterale a altezza bacino',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 150,
    bottomMax: 105,
    romMinAngle: 65,
    romMaxAngle: 155,
  },
  {
    id: 'panca_piana',
    label: 'Panca piana',
    imagePath: '/images/panca.png',
    viewHint: 'Inquadratura laterale o obliqua a 45°',
    isDumbbell: false,
    isTrialAllowed: true,
    mode: 'extension_flexion',
    topMin: 150,
    bottomMax: 95,
    romMinAngle: 65,
    romMaxAngle: 155,
  },
  {
    id: 'alzate_laterali',
    label: 'Alzate laterali',
    imagePath: '/images/alzate_laterali.png',
    viewHint: 'Inquadratura frontale dal bacino in su',
    isDumbbell: true,
    isTrialAllowed: false,
    mode: 'abduction_up',
    restMax: 55,
    apexMin: 88,
    romMinAngle: 35,
    romMaxAngle: 100,
  },
  {
    id: 'affondi',
    label: 'Affondi',
    imagePath: '/images/affondi.png',
    viewHint: 'Inquadratura laterale a figura intera',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 150,
    bottomMax: 100,
    romMinAngle: 70,
    romMaxAngle: 155,
  },
  {
    id: 'bulgarian_squat',
    label: 'Bulgarian squat',
    imagePath: '/images/bulgarian_squat.png',
    viewHint: 'Inquadratura laterale a figura intera',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 142,
    bottomMax: 105,
    romMinAngle: 70,
    romMaxAngle: 155,
  },
  {
    id: 'push_up',
    label: 'Push-up',
    imagePath: '/images/push_up.png',
    viewHint: 'Inquadratura laterale bassa a figura intera',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 150,
    bottomMax: 95,
    romMinAngle: 70,
    romMaxAngle: 155,
  },
  {
    id: 'military_press',
    label: 'Military press',
    imagePath: '/images/military_press.png',
    viewHint: 'Inquadratura frontale o obliqua a 45°',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 150,
    bottomMax: 95,
    romMinAngle: 70,
    romMaxAngle: 160,
  },
  {
    id: 'curl_bicipiti',
    label: 'Curl bicipiti',
    imagePath: '/images/curl_bicipiti.png',
    viewHint: 'Profilo laterale o 3/4 con gomito visibile',
    isDumbbell: true,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 145,
    bottomMax: 65,
    romMinAngle: 45,
    romMaxAngle: 150,
  },
  {
    id: 'french_press',
    label: 'French press',
    imagePath: '/images/french_press.png',
    viewHint: 'Inquadratura laterale su panca',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 148,
    bottomMax: 85,
    romMinAngle: 60,
    romMaxAngle: 155,
  },
  {
    id: 'rematore_bilanciere',
    label: 'Rematore bilanciere',
    imagePath: '/images/rematore_bilanciere.png',
    viewHint: 'Inquadratura laterale a figura intera',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 145,
    bottomMax: 85,
    romMinAngle: 65,
    romMaxAngle: 150,
  },
  {
    id: 'stacco_rumeno',
    label: 'Stacco rumeno',
    imagePath: '/images/stacco_rumeno.png',
    viewHint: 'Inquadratura laterale a figura intera',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 150,
    bottomMax: 105,
    romMinAngle: 75,
    romMaxAngle: 160,
  },
  {
    id: 'lat_machine',
    label: 'Lat machine',
    imagePath: '/images/lat_machine.png',
    viewHint: 'Inquadratura posteriore o laterale',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 140,
    bottomMax: 85,
    romMinAngle: 65,
    romMaxAngle: 155,
  },
  {
    id: 'pulley_basso',
    label: 'Pulley basso',
    imagePath: '/images/pulley_basso.png',
    viewHint: 'Inquadratura laterale seduto',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 145,
    bottomMax: 85,
    romMinAngle: 65,
    romMaxAngle: 150,
  },
  {
    id: 'leg_extension',
    label: 'Leg extension',
    imagePath: '/images/leg_extension.png',
    viewHint: 'Inquadratura laterale sulla macchina',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 150,
    bottomMax: 95,
    romMinAngle: 80,
    romMaxAngle: 160,
  },
  {
    id: 'leg_curl',
    label: 'Leg curl',
    imagePath: '/images/leg_curl.png',
    viewHint: 'Inquadratura laterale sulla macchina',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 145,
    bottomMax: 80,
    romMinAngle: 65,
    romMaxAngle: 150,
  },
  {
    id: 'chest_press',
    label: 'Chest press',
    imagePath: '/images/chest_press.png',
    viewHint: 'Inquadratura frontale o obliqua a 45°',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 145,
    bottomMax: 90,
    romMinAngle: 70,
    romMaxAngle: 150,
  },
  {
    id: 'shoulder_press',
    label: 'Shoulder press',
    imagePath: '/images/shoulder_press.png',
    viewHint: 'Inquadratura frontale o obliqua a 45°',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 148,
    bottomMax: 95,
    romMinAngle: 70,
    romMaxAngle: 155,
  },
  {
    id: 'pushdown_cavi',
    label: 'Pushdown cavi',
    imagePath: '/images/pushdown_cavi.png',
    viewHint: 'Inquadratura laterale o 3/4',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 148,
    bottomMax: 85,
    romMinAngle: 65,
    romMaxAngle: 155,
  },
  {
    id: 'trazioni_sbarra',
    label: 'Trazioni sbarra',
    imagePath: '/images/trazioni_sbarra.png',
    viewHint: 'Inquadratura frontale o 3/4 a figura intera',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    topMin: 145,
    bottomMax: 85,
    romMinAngle: 65,
    romMaxAngle: 155,
  },
];

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27],
  [24, 26], [26, 28],
];

function drawStickmanOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  width: number,
  height: number,
  stickOnlyMode: boolean
) {
  if (stickOnlyMode) {
    // Sfondo nero puro per modalità Solo Human Stick
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Connessioni principali del corpo
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    POSE_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.3 && (p2.visibility ?? 1) > 0.3) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    });

    // Testa stilizzata (landmark 0 = naso, 7/8 = orecchie)
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    if (nose && (nose.visibility ?? 1) > 0.3) {
      let headRadius = Math.max(10, Math.round(width * 0.032));
      if (
        leftShoulder &&
        rightShoulder &&
        (leftShoulder.visibility ?? 1) > 0.3 &&
        (rightShoulder.visibility ?? 1) > 0.3
      ) {
        const shoulderSpanPx = Math.hypot(
          (leftShoulder.x - rightShoulder.x) * width,
          (leftShoulder.y - rightShoulder.y) * height
        );
        if (shoulderSpanPx > 12) {
          headRadius = Math.max(9, Math.min(26, Math.round(shoulderSpanPx * 0.28)));
        }
        const midShoulderX = ((leftShoulder.x + rightShoulder.x) / 2) * width;
        const midShoulderY = ((leftShoulder.y + rightShoulder.y) / 2) * height;
        ctx.beginPath();
        ctx.moveTo(midShoulderX, midShoulderY);
        ctx.lineTo(nose.x * width, nose.y * height);
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(nose.x * width, nose.y * height, headRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }

    // Articolazioni evidenziate
    const jointIndices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    ctx.fillStyle = '#f43f5e';
    jointIndices.forEach((idx) => {
      const lm = landmarks[idx];
      if (lm && (lm.visibility ?? 1) > 0.3) {
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 4.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  } else {
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    POSE_CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2 && (p1.visibility ?? 1) > 0.3 && (p2.visibility ?? 1) > 0.3) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    });

    ctx.fillStyle = '#ff0055';
    landmarks.forEach((lm: any) => {
      if (lm && (lm.visibility ?? 1) > 0.3) {
        ctx.beginPath();
        ctx.arc(lm.x * width, lm.y * height, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }
}

function findNearestTimedFrame(frames: TimedLandmarkFrame[], targetTimeSec: number): any[] | null {
  if (!frames.length) return null;
  let low = 0;
  let high = frames.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (frames[mid].timeSec < targetTimeSec) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  if (low > 0) {
    const prevDiff = Math.abs(frames[low - 1].timeSec - targetTimeSec);
    const currDiff = Math.abs(frames[low].timeSec - targetTimeSec);
    return prevDiff <= currDiff ? frames[low - 1].landmarks : frames[low].landmarks;
  }
  return frames[low].landmarks;
}

function calculateLiveAngle(a: any, b: any, c: any): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return Math.round(angle);
}

function areLandmarksVisible(landmarks: any[], indices: number[], minVis = 0.45): boolean {
  return indices.every(
    (idx) => landmarks[idx] && (landmarks[idx].visibility ?? 1) >= minVis
  );
}

function getBilateralOrSingleAngle(
  landmarks: any[],
  leftTriplet: [number, number, number],
  rightTriplet: [number, number, number],
  minVis = 0.45
): number | null {
  const leftOk = areLandmarksVisible(landmarks, leftTriplet, minVis);
  const rightOk = areLandmarksVisible(landmarks, rightTriplet, minVis);
  if (leftOk && rightOk) {
    const lAng = calculateLiveAngle(landmarks[leftTriplet[0]], landmarks[leftTriplet[1]], landmarks[leftTriplet[2]]);
    const rAng = calculateLiveAngle(landmarks[rightTriplet[0]], landmarks[rightTriplet[1]], landmarks[rightTriplet[2]]);
    return Math.round((lAng + rAng) / 2);
  }
  if (leftOk) {
    return calculateLiveAngle(landmarks[leftTriplet[0]], landmarks[leftTriplet[1]], landmarks[leftTriplet[2]]);
  }
  if (rightOk) {
    return calculateLiveAngle(landmarks[rightTriplet[0]], landmarks[rightTriplet[1]], landmarks[rightTriplet[2]]);
  }
  return null;
}

function extractExerciseAngle(exercise: Exercise, landmarks: any[]): number | null {
  switch (exercise) {
    case 'squat': {
      const leftOk = areLandmarksVisible(landmarks, [23, 25, 27], 0.45);
      const rightOk = areLandmarksVisible(landmarks, [24, 26, 28], 0.45);
      if (leftOk && rightOk) {
        const lAng = calculateLiveAngle(landmarks[23], landmarks[25], landmarks[27]);
        const rAng = calculateLiveAngle(landmarks[24], landmarks[26], landmarks[28]);
        return Math.round((lAng + rAng) / 2);
      }
      if (leftOk) return calculateLiveAngle(landmarks[23], landmarks[25], landmarks[27]);
      if (rightOk) return calculateLiveAngle(landmarks[24], landmarks[26], landmarks[28]);
      return null;
    }
    case 'alzate_laterali': {
      const leftOk = areLandmarksVisible(landmarks, [23, 11, 13], 0.45);
      const rightOk = areLandmarksVisible(landmarks, [24, 12, 14], 0.45);
      if (leftOk && rightOk) {
        const lAng = calculateLiveAngle(landmarks[23], landmarks[11], landmarks[13]);
        const rAng = calculateLiveAngle(landmarks[24], landmarks[12], landmarks[14]);
        return Math.round((lAng + rAng) / 2);
      }
      if (leftOk) return calculateLiveAngle(landmarks[23], landmarks[11], landmarks[13]);
      if (rightOk) return calculateLiveAngle(landmarks[24], landmarks[12], landmarks[14]);
      return null;
    }

    case 'stacco':
    case 'stacco_rumeno':
      return getBilateralOrSingleAngle(landmarks, [11, 23, 25], [12, 24, 26], 0.45);

    case 'affondi':
    case 'bulgarian_squat': {
      const leftOk = areLandmarksVisible(landmarks, [23, 25, 27], 0.4);
      const rightOk = areLandmarksVisible(landmarks, [24, 26, 28], 0.4);
      if (leftOk && rightOk) {
        const lAng = calculateLiveAngle(landmarks[23], landmarks[25], landmarks[27]);
        const rAng = calculateLiveAngle(landmarks[24], landmarks[26], landmarks[28]);
        return Math.min(lAng, rAng);
      }
      if (leftOk) return calculateLiveAngle(landmarks[23], landmarks[25], landmarks[27]);
      if (rightOk) return calculateLiveAngle(landmarks[24], landmarks[26], landmarks[28]);
      return null;
    }
    case 'leg_extension':
    case 'leg_curl':
      return getBilateralOrSingleAngle(landmarks, [23, 25, 27], [24, 26, 28], 0.45);

    case 'panca_piana':
    case 'push_up':
    case 'military_press':
    case 'curl_bicipiti':
    case 'french_press':
    case 'rematore_bilanciere':
    case 'lat_machine':
    case 'pulley_basso':
    case 'chest_press':
    case 'shoulder_press':
    case 'pushdown_cavi':
    case 'trazioni_sbarra':
      return getBilateralOrSingleAngle(landmarks, [11, 13, 15], [12, 14, 16], 0.45);

    default:
      return null;
  }
}

async function createLandmarkerWithFallback(vision: any): Promise<PoseLandmarker> {
  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: './models/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  } catch (gpuErr) {
    console.warn('GPU delegate non disponibile su questo dispositivo, passo a CPU:', gpuErr);
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: './models/pose_landmarker_lite.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  }
}

async function loadPoseLandmarkerWithRetry(maxAttempts = 3): Promise<PoseLandmarker> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      return await createLandmarkerWithFallback(vision);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }
    }
  }
  throw lastError;
}

function formatUploadErrorMessage(err: unknown): string {
  const rawMessage = err instanceof Error ? err.message : String(err ?? '');
  if (/failed to fetch|networkerror|load failed|fetch/i.test(rawMessage)) {
    return 'Errore di rete (Failed to fetch) durante il caricamento del modello o del video. Verifica la connessione o che il video sia scaricato sul telefono, poi riprova.';
  }
  return `Errore caricamento modello: ${rawMessage || 'errore sconosciuto'}`;
}

function getPlanLabel(plan: PlanType): string {
  switch (plan) {
    case 'trial': return 'Trial 7 Giorni';
    case 'quarterly': return 'Trimestrale';
    case 'semiannual': return 'Semestrale';
    case 'annual': return 'Annuale';
    default: return 'Nessun piano';
  }
}

interface AppBrandHeaderProps {
  showPlanInfo?: boolean;
  currentPlan?: PlanType;
  daysRemaining?: number;
  userDisplayName?: string;
  areGuidesDisabled?: boolean;
  onOpenGuides?: () => void;
  onLogout?: () => void;
}

function AppBrandHeader({
  showPlanInfo = false,
  currentPlan = 'none',
  daysRemaining = 0,
  userDisplayName,
  areGuidesDisabled = false,
  onOpenGuides,
  onLogout,
}: AppBrandHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: showPlanInfo ? 12 : 0,
        padding: '12px 16px',
        background: '#0f172a',
        borderBottom: '1px solid #334155',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Fascia superiore: Logo + Tagline centrati */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '8px 18px',
          textAlign: 'center',
          width: '100%',
        }}
      >
        <img
          src="/images/logo_icon.png"
          alt="Second Opinion"
          style={{
            width: 82,
            height: 82,
            objectFit: 'contain',
            display: 'block',
            flexShrink: 0,
          }}
        />

        <span
          style={{
            fontSize: 13,
            color: '#94a3b8',
            fontWeight: 600,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            paddingBottom: 12,
            lineHeight: 1.2,
          }}
        >
          ANALISI BIOMECCANICA INTELLIGENTE
        </span>
      </div>

      {/* Fascia inferiore: info a sinistra, Guide + Esci a destra */}
      {showPlanInfo && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '10px 16px',
            width: '100%',
            paddingTop: 8,
            borderTop: '1px solid rgba(51, 65, 85, 0.55)',
          }}
        >
          {/* Sinistra: Nome utente + Piano attivo + Scadenza */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
              minWidth: 0,
              flex: '1 1 240px',
            }}
          >
            {userDisplayName && (
              <span
                style={{
                  fontSize: 12,
                  color: '#e2e8f0',
                  fontWeight: 600,
                  wordBreak: 'break-word',
                }}
              >
                👤 {userDisplayName}
              </span>
            )}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '8px 20px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: '#94a3b8',
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  PIANO ATTIVO
                </span>
                <strong style={{ fontSize: 13, color: '#38bdf8' }}>
                  {getPlanLabel(currentPlan)}
                </strong>
              </div>

              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: '#94a3b8',
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  SCADENZA
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: daysRemaining <= 2 ? '#ef4444' : '#22c55e',
                  }}
                >
                  ⏱ {daysRemaining} {daysRemaining === 1 ? 'giorno' : 'giorni'}
                </span>
              </div>
            </div>
          </div>

          {/* Destra: Pulsanti Guide e Esci allineati a destra */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              flexShrink: 0,
              marginLeft: 'auto',
            }}
          >
            {onOpenGuides && (
              <button
                type="button"
                disabled={areGuidesDisabled}
                onClick={onOpenGuides}
                style={{
                  padding: '7px 11px',
                  borderRadius: 7,
                  border: '1px solid #38bdf8',
                  background: 'rgba(56,189,248,0.12)',
                  color: '#38bdf8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: areGuidesDisabled ? 'not-allowed' : 'pointer',
                  opacity: areGuidesDisabled ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                📷 Guide
              </button>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                style={{
                  padding: '7px 11px',
                  borderRadius: 7,
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#cbd5e1',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Esci
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export function App() {
  // --- STATI AUTENTICAZIONE E ABBONAMENTO ---
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [subLoading, setSubLoading] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<PlanType>('none');
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState<boolean>(false);
  const [isTester, setIsTester] = useState<boolean>(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [unlockedByPlan, setUnlockedByPlan] = useState<Record<string, boolean>>({});

  // --- STATI LINEE GUIDA RIPRESE ---
  const [isGuidesOpen, setIsGuidesOpen] = useState<boolean>(false);
  const [guideInitialExercise, setGuideInitialExercise] = useState<string | undefined>(undefined);

  // --- STATI DOCUMENTI LEGALI E COOKIE ---
  const [legalTab, setLegalTab] = useState<LegalDocTab | null>(null);
  const [cookieForceOpenKey, setCookieForceOpenKey] = useState<number>(0);
  const [analyticsConsent, setAnalyticsConsent] = useState<boolean>(false);

  // --- STATI APPLICAZIONE ANALISI BIOMECCANICA ---
  const [selectedExercise, setSelectedExercise] = useState<Exercise>('squat');
  const [weightKg, setWeightKg] = useState<number>(20);
  const [status, setStatus] = useState<string>('Pronto per iniziare');
  const [statusCode, setStatusCode] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [repCount, setRepCount] = useState<number>(0);

  const [romQuality, setRomQuality] = useState<number>(0);
  const [powerScore, setPowerScore] = useState<number>(0);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [repPeakPowers, setRepPeakPowers] = useState<number[]>([]);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState<boolean>(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);

  // --- MODALITÀ VISUALIZZAZIONE HUMAN STICK (LIVE E REPLAY) ---
  const [stickOnlyMode, setStickOnlyMode] = useState<boolean>(false);

  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [aiStatusCode, setAiStatusCode] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [aiStatusMessage, setAiStatusMessage] = useState<string>('In attesa di dati geometrici...');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const landmarksBufferRef = useRef<any[][]>([]);
  const timedLandmarksRef = useRef<TimedLandmarkFrame[]>([]);
  const stickOnlyModeRef = useRef<boolean>(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const scrollSyncTimeoutRef = useRef<number | null>(null);
  const lastGeomResultRef = useRef<AnalysisResult | null>(null);
  const loggedSessionKeyRef = useRef<string | null>(null);
  const analysisSessionIdRef = useRef<number>(0);
  const isProgrammaticScrollRef = useRef<boolean>(false);

  useEffect(() => {
    stickOnlyModeRef.current = stickOnlyMode;
  }, [stickOnlyMode]);

  const fetchPlanExercises = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('plan_exercises')
        .select('plan_type, exercise_id, is_unlocked');

      if (error) {
        console.warn('Lettura plan_exercises non disponibile o in attesa di configurazione DB:', error.message);
        return;
      }

      if (data && Array.isArray(data)) {
        const map: Record<string, boolean> = {};
        for (const row of data) {
          if (row.plan_type && row.exercise_id) {
            map[`${row.plan_type}:${row.exercise_id}`] = Boolean(row.is_unlocked);
          }
        }
        setUnlockedByPlan(map);
      }
    } catch (err) {
      console.warn('Errore caricamento matrice plan_exercises:', err);
    }
  }, []);

  const isExerciseUnlockedForPlan = useCallback(
    (plan: PlanType, exerciseId: Exercise, fallbackTrialAllowed: boolean): boolean => {
      if (plan === 'none' || isSubscriptionExpired) {
        return false;
      }
      const key = `${plan}:${exerciseId}`;
      if (Object.prototype.hasOwnProperty.call(unlockedByPlan, key)) {
        return Boolean(unlockedByPlan[key]);
      }
      if (plan === 'trial') {
        return fallbackTrialAllowed;
      }
      return true;
    },
    [unlockedByPlan, isSubscriptionExpired]
  );

  const resetAnalysisSession = (options?: { preserveExerciseAndWeight?: boolean }) => {
    if (!options?.preserveExerciseAndWeight) {
      setSelectedExercise('squat');
      setWeightKg(20);
    }
    setStatus('Pronto per iniziare');
    setStatusCode('idle');
    setIsProcessing(false);
    setProgressPercent(0);
    setRepCount(0);
    setRomQuality(0);
    setPowerScore(0);
    setAnalysisResult(null);
    setRepPeakPowers([]);
    setIsAnalysisOpen(false);
    setLastUploadedFile(null);
    setAiFeedback('');
    setAiStatusCode('idle');
    setAiStatusMessage('In attesa di dati geometrici...');

    landmarksBufferRef.current = [];
    timedLandmarksRef.current = [];
    lastGeomResultRef.current = null;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (videoRef.current) {
      if (videoRef.current.src && videoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoRef.current.src);
      }
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Carica stato sessione Supabase e registra il login
  useEffect(() => {
    const recordLoginIfNew = async (sessionUserId?: string, accessToken?: string) => {
      if (!sessionUserId || !accessToken) return;
      const sessionKey = `${sessionUserId}:${accessToken.slice(-16)}`;
      if (loggedSessionKeyRef.current === sessionKey) return;

      loggedSessionKeyRef.current = sessionKey;
      await logUserActivity({
        eventType: 'login',
        exerciseAnalyzed: null,
        aiResponse: null,
      });
    };

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
      void recordLoginIfNew(data.session?.user?.id, data.session?.access_token);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);

      if (event === 'SIGNED_IN') {
        void recordLoginIfNew(session?.user?.id, session?.access_token);
      } else if (event === 'SIGNED_OUT') {
        loggedSessionKeyRef.current = null;
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    analysisSessionIdRef.current += 1;
    resetAnalysisSession();
    if (carouselRef.current) {
      isProgrammaticScrollRef.current = true;
      carouselRef.current.scrollLeft = 0;
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 150);
    }
  }, [user?.id]);

  // Allinea il carosello quando l'esercizio cambia (es. rientro dalla Guida, click indice o reset)
  useEffect(() => {
    if (isGuidesOpen || !carouselRef.current) return;
    const idx = EXERCISES.findIndex((ex) => ex.id === selectedExercise);
    if (idx < 0) return;

    const container = carouselRef.current;
    const targetLeft = idx * container.clientWidth;
    if (Math.abs(container.scrollLeft - targetLeft) > 4) {
      isProgrammaticScrollRef.current = true;
      container.scrollTo({
        left: targetLeft,
        behavior: idx === 0 ? 'auto' : 'smooth',
      });
      if (idx === 0) {
        container.scrollLeft = 0;
      }
      window.setTimeout(() => {
        if (idx === 0 && carouselRef.current) {
          carouselRef.current.scrollLeft = 0;
        }
        isProgrammaticScrollRef.current = false;
      }, 350);
    }
  }, [selectedExercise, isGuidesOpen]);

  // Sincronizzazione replay in modalità Solo Human Stick dopo il completamento dell'analisi
  useEffect(() => {
    if (statusCode !== 'success' || !stickOnlyMode) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number | null = null;

    const renderStickReplayFrame = () => {
      const w = canvas.width || 480;
      const h = canvas.height || 360;
      const nearestLandmarks = findNearestTimedFrame(timedLandmarksRef.current, video.currentTime);
      if (nearestLandmarks) {
        drawStickmanOverlay(ctx, nearestLandmarks, w, h, true);
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
      }
      if (!video.paused && !video.ended) {
        rafId = requestAnimationFrame(renderStickReplayFrame);
      }
    };

    const handlePlay = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(renderStickReplayFrame);
    };

    const handleSeekOrPause = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      renderStickReplayFrame();
    };

    // Disegna subito il frame corrente anche se il video è in pausa
    renderStickReplayFrame();

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handleSeekOrPause);
    video.addEventListener('seeked', handleSeekOrPause);
    video.addEventListener('timeupdate', renderStickReplayFrame);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handleSeekOrPause);
      video.removeEventListener('seeked', handleSeekOrPause);
      video.removeEventListener('timeupdate', renderStickReplayFrame);
    };
  }, [statusCode, stickOnlyMode]);

  // Carica abbonamento dell'utente da public.subscriptions e configurazione sblocchi da public.plan_exercises
  const fetchUserSubscription = async (userId: string) => {
    setSubLoading(true);
    setPlanError(null);
    try {
      await fetchPlanExercises();

      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_type, status, end_date, is_tester')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setCurrentPlan('none');
        setDaysRemaining(0);
        setIsSubscriptionExpired(false);
        setIsTester(false);
        return;
      }

      const endDate = new Date(data.end_date);
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const expired = diffMs <= 0 || data.status === 'expired';

      setCurrentPlan(data.plan_type as PlanType);
      setDaysRemaining(diffDays);
      setIsSubscriptionExpired(expired);
      setIsTester(Boolean(data.is_tester) && !expired && data.status === 'active');
    } catch (err: any) {
      console.error('Errore lettura abbonamento:', err);
      setPlanError(err?.message || 'Impossibile verificare lo stato dell’abbonamento.');
      setIsTester(false);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUserSubscription(user.id);
    } else {
      setCurrentPlan('none');
      setDaysRemaining(0);
      setIsSubscriptionExpired(false);
      setIsTester(false);
      setUnlockedByPlan({});
    }
  }, [user?.id]);

  const handleActivateTrial = async () => {
    if (!user) return;
    setSubLoading(true);
    setPlanError(null);
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_type: 'trial',
        status: 'active',
        end_date: endDate.toISOString(),
      });

      if (error) throw error;
      await fetchUserSubscription(user.id);
    } catch (err: any) {
      setPlanError(err?.message || 'Errore durante attivazione del Trial.');
      setSubLoading(false);
    }
  };

  const handleSelectPaidPlan = async (plan: 'quarterly' | 'semiannual' | 'annual') => {
    alert(`Checkout Stripe per piano "${getPlanLabel(plan)}" in fase di collegamento.`);
  };

  const handleLogout = async () => {
    analysisSessionIdRef.current += 1;
    setIsGuidesOpen(false);
    setGuideInitialExercise(undefined);
    setLegalTab(null);
    setIsTester(false);
    loggedSessionKeyRef.current = null;
    resetAnalysisSession();
    await supabase.auth.signOut();
  };

  const handleInterruptAnalysis = () => {
    analysisSessionIdRef.current += 1;
    resetAnalysisSession();
    if (carouselRef.current) {
      isProgrammaticScrollRef.current = true;
      carouselRef.current.scrollLeft = 0;
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 250);
    }
  };

  const scrollCarouselToStart = () => {
    if (!carouselRef.current) return;
    isProgrammaticScrollRef.current = true;
    carouselRef.current.scrollTo({ left: 0, behavior: 'auto' });
    carouselRef.current.scrollLeft = 0;
    window.setTimeout(() => {
      if (carouselRef.current) {
        carouselRef.current.scrollLeft = 0;
      }
      isProgrammaticScrollRef.current = false;
    }, 300);
  };

  const handleStartNewAnalysis = () => {
    analysisSessionIdRef.current += 1;
    resetAnalysisSession();
    scrollCarouselToStart();
  };

  const handleOpenCookiePreferences = () => {
    try {
      localStorage.removeItem('cookie_consent_v1');
    } catch {
      // Ignora eventuali blocchi storage
    }
    setCookieForceOpenKey((prev) => prev + 1);
  };

  const renderLegalOverlays = () => (
    <>
      <CookieBanner
        key={cookieForceOpenKey}
        onOpenCookiePolicy={() => setLegalTab('cookies')}
        onConsentChange={(consent: CookieConsentState) => {
          setAnalyticsConsent(consent.analytics);
        }}
      />
      {legalTab && (
        <LegalDocsModal
          activeTab={legalTab}
          onChangeTab={setLegalTab}
          onClose={() => setLegalTab(null)}
        />
      )}
    </>
  );

  const selectedExerciseIndex = Math.max(
    0,
    EXERCISES.findIndex((ex) => ex.id === selectedExercise)
  );
  const selectedExerciseObj = EXERCISES[selectedExerciseIndex] || EXERCISES[0];
  const currentHint = selectedExerciseObj.viewHint;
  const isExerciseLocked = !isExerciseUnlockedForPlan(
    currentPlan,
    selectedExerciseObj.id,
    selectedExerciseObj.isTrialAllowed
  );

  // Blocca scelta esercizio e carico appena viene caricato/avviato un video o c'è un'analisi attiva
  const hasActiveOrCompletedSession =
    isProcessing || statusCode === 'success' || statusCode === 'error' || Boolean(analysisResult);
  const areExerciseAndWeightLocked = isProcessing || hasActiveOrCompletedSession;

  // "Nuova analisi" abilitato solo quando l'analisi video è terminata e l'IA ha dato risposta
  const isNewAnalysisEnabled =
    !isProcessing && statusCode === 'success' && aiStatusCode === 'success';

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current || areExerciseAndWeightLocked) return;
    const container = carouselRef.current;
    const scrollAmount = container.clientWidth;
    isProgrammaticScrollRef.current = true;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    window.setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 350);

    const newScrollLeft = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    const itemWidth = container.clientWidth;
    const index = Math.round(newScrollLeft / itemWidth);
    const targetIndex = Math.max(0, Math.min(EXERCISES.length - 1, index));
    setSelectedExercise(EXERCISES[targetIndex].id);
  };

  const handleSelectExerciseByIndex = (targetIndex: number) => {
    if (areExerciseAndWeightLocked) return;
    const clampedIndex = Math.max(0, Math.min(EXERCISES.length - 1, targetIndex));
    setSelectedExercise(EXERCISES[clampedIndex].id);
  };

  const handleCarouselScroll = () => {
    if (isProgrammaticScrollRef.current || areExerciseAndWeightLocked || !carouselRef.current) {
      return;
    }
    if (scrollSyncTimeoutRef.current !== null) {
      window.clearTimeout(scrollSyncTimeoutRef.current);
    }
    scrollSyncTimeoutRef.current = window.setTimeout(() => {
      if (!carouselRef.current || isProgrammaticScrollRef.current) return;
      const container = carouselRef.current;
      const itemWidth = container.clientWidth;
      if (itemWidth <= 0) return;
      const idx = Math.round(container.scrollLeft / itemWidth);
      const clampedIdx = Math.max(0, Math.min(EXERCISES.length - 1, idx));
      const targetExercise = EXERCISES[clampedIdx]?.id;
      if (targetExercise && targetExercise !== selectedExercise) {
        setSelectedExercise(targetExercise);
      }
    }, 90);
  };

  const handleWeightChange = (delta: number) => {
    if (areExerciseAndWeightLocked) return;
    setWeightKg((prev) => Math.max(0, prev + delta));
  };

  const handleWeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (areExerciseAndWeightLocked) return;
    const val = parseInt(e.target.value, 10);
    setWeightKg(isNaN(val) ? 0 : Math.max(0, val));
  };

  const triggerAiCoach = (geomResult: AnalysisResult, sessionIdAtStart?: number) => {
    if (sessionIdAtStart !== undefined && analysisSessionIdRef.current !== sessionIdAtStart) {
      return;
    }
    setAiStatusCode('processing');
    setAiStatusMessage('Il server sta interrogando Gemini con i dati geometrici...');
    setAiFeedback('');

    getGeminiFeedback(selectedExercise, geomResult.minAngle, geomResult.maxAngle, geomResult.trendSummary)
      .then(async (feedback) => {
        if (sessionIdAtStart !== undefined && analysisSessionIdRef.current !== sessionIdAtStart) {
          return;
        }
        setAiFeedback(feedback);
        setAiStatusCode('success');
        setAiStatusMessage('Risposta generata con successo');

        await logUserActivity({
          eventType: 'exercise_analysis',
          exerciseAnalyzed: selectedExercise,
          aiResponse: feedback,
        });
      })
      .catch((err) => {
        if (sessionIdAtStart !== undefined && analysisSessionIdRef.current !== sessionIdAtStart) {
          return;
        }
        setAiFeedback(`Errore AI: ${err.message}`);
        setAiStatusCode('error');
        setAiStatusMessage(`Errore IA: ${err.message}`);
      });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isExerciseLocked) {
      e.target.value = '';
      alert('Questo esercizio è riservato agli abbonati. Passa a un piano completo per sbloccarlo!');
      return;
    }

    const file = e.target.files?.[0];
    if (!file || !videoRef.current || !canvasRef.current) return;

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      analysisSessionIdRef.current += 1;
      resetAnalysisSession({ preserveExerciseAndWeight: true });
      setStatus('Il file video supera il limite massimo di 50 MB.');
      setStatusCode('error');
      e.target.value = '';
      return;
    }

    analysisSessionIdRef.current += 1;
    const currentSessionId = analysisSessionIdRef.current;

    // Legge SUBITO i byte in RAM prima di qualsiasi reset/re-render che su mobile può revocare il permesso al picker
    let fileBuffer: ArrayBuffer;
    try {
      fileBuffer = await file.arrayBuffer();
    } catch (readErr) {
      if (analysisSessionIdRef.current !== currentSessionId) return;
      const readMsg = readErr instanceof Error ? readErr.message : String(readErr ?? '');
      resetAnalysisSession({ preserveExerciseAndWeight: true });
      setStatus(
        `Impossibile leggere il file video in locale (${readMsg || 'accesso negato o riferimento scaduto'}). Se il video è su cloud o galleria remota, salvalo o scaricalo sul dispositivo e riprova.`
      );
      setStatusCode('error');
      return;
    }

    if (analysisSessionIdRef.current !== currentSessionId) return;

    const persistentMemoryFile = new File([fileBuffer], file.name || `video_${Date.now()}.mp4`, {
      type: file.type || 'video/mp4',
      lastModified: file.lastModified || Date.now(),
    });

    resetAnalysisSession({ preserveExerciseAndWeight: true });
    setLastUploadedFile(persistentMemoryFile);

    setIsProcessing(true);
    setStatus('Verifica file e caricamento modello AI in corso...');
    setStatusCode('processing');

    let localVideoUrl: string | null = null;

    try {
      const localVideoBlob = new Blob([fileBuffer], { type: file.type || 'video/mp4' });
      localVideoUrl = URL.createObjectURL(localVideoBlob);

      const landmarker = await loadPoseLandmarkerWithRetry(3);
      if (analysisSessionIdRef.current !== currentSessionId) {
        try { landmarker.close(); } catch {}
        if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
        return;
      }

      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');

      video.muted = true;
      video.playsInline = true;
      video.src = localVideoUrl;
      video.load();

      const MAX_WIDTH = 480;
      const FRAME_SKIP = 3;
      let frameCounter = 0;
      let targetWidth = 640;
      let targetHeight = 480;

      let repPhase: 'START' | 'ACTIVE' = 'START';
      let hasReachedInitialPosition = false;
      let localReps = 0;
      let angleHistory: number[] = [];
      let powerHistory: number[] = [];
      let transitionStreak = 0;
      let hasStarted = false;
      let latestKnownLandmarks: any[] | null = null;

      let currentRepMaxPower = 0;
      let collectedRepPowers: number[] = [];

      const effectiveMass = selectedExerciseObj.isDumbbell ? weightKg * 2 : weightKg;

      const startProcessingWhenReady = () => {
        if (analysisSessionIdRef.current !== currentSessionId) {
          try { landmarker.close(); } catch {}
          return;
        }
        if (hasStarted) return;

        const originalWidth = video.videoWidth || 0;
        const originalHeight = video.videoHeight || 0;

        if (originalWidth === 0 || originalHeight === 0) {
          setTimeout(startProcessingWhenReady, 100);
          return;
        }

        hasStarted = true;

        const scale = MAX_WIDTH / originalWidth;
        targetWidth = MAX_WIDTH;
        targetHeight = Math.round(originalHeight * scale);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        setStatus('Analisi biomeccanica, ROM e potenza in corso...');
        setStatusCode('processing');

        video.play().then(() => {
          let lastFrameTime = performance.now();

          const processFrame = () => {
            if (analysisSessionIdRef.current !== currentSessionId) {
              try { landmarker.close(); } catch {}
              return;
            }

            const now = performance.now();
            const deltaTime = (now - lastFrameTime) / 1000;
            lastFrameTime = now;

            if (video.duration && !isNaN(video.duration)) {
              const currentProgress = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
              setProgressPercent(currentProgress);
            }

            if (video.ended || video.paused) {
              if (video.ended) {
                setIsProcessing(false);
                setProgressPercent(100);
                setRomQuality(0);
                setPowerScore(0);
                setStatus('Analisi completata con successo');
                setStatusCode('success');

                const geomResult = analyzeExerciseGeometry(selectedExercise, landmarksBufferRef.current);
                setAnalysisResult(geomResult);
                setRepPeakPowers(collectedRepPowers);
                lastGeomResultRef.current = geomResult;

                triggerAiCoach(geomResult, currentSessionId);

                try { landmarker.close(); } catch {}
              }
              return;
            }

            frameCounter++;
            let currentLandmarks: any = null;

            if (frameCounter % FRAME_SKIP === 0) {
              try {
                const result = landmarker.detectForVideo(video, now);
                if (result.landmarks && result.landmarks.length > 0) {
                  currentLandmarks = result.landmarks[0];
                  latestKnownLandmarks = currentLandmarks;
                  landmarksBufferRef.current.push(currentLandmarks);
                  timedLandmarksRef.current.push({
                    timeSec: video.currentTime,
                    landmarks: currentLandmarks,
                  });

                  const rawAngle = extractExerciseAngle(selectedExercise, currentLandmarks);

                  if (rawAngle !== null) {
                    angleHistory.push(rawAngle);
                    if (angleHistory.length > 3) angleHistory.shift();
                    const smoothAngle = Math.round(
                      angleHistory.reduce((acc, v) => acc + v, 0) / angleHistory.length
                    );

                    if (selectedExerciseObj.mode === 'abduction_up') {
                      const REST_MAX = selectedExerciseObj.restMax ?? 55;
                      const APEX_MIN = selectedExerciseObj.apexMin ?? 88;

                      if (!hasReachedInitialPosition) {
                        if (smoothAngle <= REST_MAX) {
                          hasReachedInitialPosition = true;
                        }
                      } else if (repPhase === 'START') {
                        if (smoothAngle >= APEX_MIN) {
                          transitionStreak++;
                          if (transitionStreak >= 1) {
                            repPhase = 'ACTIVE';
                            transitionStreak = 0;
                            currentRepMaxPower = 0;
                          }
                        } else {
                          transitionStreak = 0;
                        }
                      } else if (repPhase === 'ACTIVE') {
                        if (smoothAngle <= REST_MAX) {
                          transitionStreak++;
                          if (transitionStreak >= 1) {
                            repPhase = 'START';
                            transitionStreak = 0;
                            localReps++;
                            setRepCount(localReps);
                            collectedRepPowers.push(Math.round(currentRepMaxPower));
                          }
                        } else {
                          transitionStreak = 0;
                        }
                      }
                    } else {
                      const TOP_MIN = selectedExerciseObj.topMin ?? 150;
                      const BOTTOM_MAX = selectedExerciseObj.bottomMax ?? 100;

                      if (!hasReachedInitialPosition) {
                        if (smoothAngle >= TOP_MIN) {
                          transitionStreak++;
                          if (transitionStreak >= 1) {
                            hasReachedInitialPosition = true;
                            transitionStreak = 0;
                          }
                        } else {
                          transitionStreak = 0;
                        }
                      } else if (repPhase === 'START') {
                        if (smoothAngle <= BOTTOM_MAX) {
                          transitionStreak++;
                          if (transitionStreak >= 1) {
                            repPhase = 'ACTIVE';
                            transitionStreak = 0;
                            currentRepMaxPower = 0;
                          }
                        } else {
                          transitionStreak = 0;
                        }
                      } else if (repPhase === 'ACTIVE') {
                        if (smoothAngle >= TOP_MIN) {
                          transitionStreak++;
                          if (transitionStreak >= 1) {
                            repPhase = 'START';
                            transitionStreak = 0;
                            localReps++;
                            setRepCount(localReps);
                            collectedRepPowers.push(Math.round(currentRepMaxPower));
                          }
                        } else {
                          transitionStreak = 0;
                        }
                      }
                    }

                    let rom = 0;
                    if (selectedExercise === 'alzate_laterali') {
                      rom = ((smoothAngle - 35) / (100 - 35)) * 100;
                    } else if (selectedExercise === 'squat') {
                      rom = ((155 - smoothAngle) / (155 - 65)) * 100;
                    } else {
                      const rMin = selectedExerciseObj.romMinAngle ?? 65;
                      const rMax = selectedExerciseObj.romMaxAngle ?? 155;
                      rom = ((rMax - smoothAngle) / (rMax - rMin)) * 100;
                    }
                    rom = Math.max(0, Math.min(100, Math.round(rom)));
                    setRomQuality(rom);

                    let instantPower = 0;
                    if (repPhase === 'ACTIVE') {
                      const angleDelta = angleHistory.length > 1 ? Math.abs(smoothAngle - angleHistory[angleHistory.length - 2]) : 0;
                      const MOVEMENT_DEADZONE = 2.0;

                      if (angleDelta >= MOVEMENT_DEADZONE) {
                        const safeDt = Math.max(deltaTime, 0.012);
                        const safeDeltaAngle = Math.min(angleDelta, 4.0);

                        const velocityFactor = safeDeltaAngle / (safeDt * 10);
                        instantPower = effectiveMass * velocityFactor * 1.2;
                        instantPower = Math.min(instantPower, 850);
                      }
                    }

                    powerHistory.push(instantPower);
                    if (powerHistory.length > 8) powerHistory.shift();

                    const smoothedPower = Math.round(
                      powerHistory.reduce((acc, v) => acc + v, 0) / powerHistory.length
                    );

                    setPowerScore(smoothedPower);

                    if (repPhase === 'ACTIVE' && smoothedPower > currentRepMaxPower) {
                      currentRepMaxPower = smoothedPower;
                    }
                  }
                }
              } catch (err) {}
            }

            if (ctx) {
              const isStickOnly = stickOnlyModeRef.current;
              const landmarksToDraw = currentLandmarks || latestKnownLandmarks;

              if (isStickOnly) {
                if (landmarksToDraw) {
                  drawStickmanOverlay(ctx, landmarksToDraw, targetWidth, targetHeight, true);
                } else {
                  ctx.fillStyle = '#000000';
                  ctx.fillRect(0, 0, targetWidth, targetHeight);
                }
              } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
                if (currentLandmarks) {
                  drawStickmanOverlay(ctx, currentLandmarks, targetWidth, targetHeight, false);
                }
              }
            }

            requestAnimationFrame(processFrame);
          };

          requestAnimationFrame(processFrame);
        }).catch((playErr) => {
          if (analysisSessionIdRef.current !== currentSessionId) return;
          setIsProcessing(false);
          setStatus(`Errore riproduzione video: ${playErr.message}`);
          setStatusCode('error');
        });
      };

      video.onloadedmetadata = startProcessingWhenReady;
      video.oncanplay = startProcessingWhenReady;
      setTimeout(startProcessingWhenReady, 500);
    } catch (err) {
      if (localVideoUrl && videoRef.current?.src !== localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl);
      }
      if (analysisSessionIdRef.current !== currentSessionId) return;
      setIsProcessing(false);
      setStatus(formatUploadErrorMessage(err));
      setStatusCode('error');
    }
  };

  const getRomColor = (val: number) => {
    if (val >= 90) return '#22c55e';
    if (val >= 70) return '#eab308';
    return '#ef4444';
  };

  const getTrafficLightColor = (code: 'idle' | 'processing' | 'success' | 'error') => {
    switch (code) {
      case 'processing': return '#eab308';
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  if (!authReady) {
    return (
      <>
        <AppBrandHeader />
        <div style={{ minHeight: 'calc(100vh - 107px)', background: '#090d16', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Caricamento...
        </div>
        {renderLegalOverlays()}
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AppBrandHeader />
        <AuthScreen />
        {renderLegalOverlays()}
      </>
    );
  }

  if (subLoading) {
    return (
      <>
        <AppBrandHeader />
        <div style={{ minHeight: 'calc(100vh - 107px)', background: '#090d16', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Verifica abbonamento in corso...
        </div>
        {renderLegalOverlays()}
      </>
    );
  }

  if (currentPlan === 'none' || isSubscriptionExpired) {
    return (
      <>
        <AppBrandHeader />
        <div style={{ minHeight: 'calc(100vh - 107px)', background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)', color: '#f8fafc', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ maxWidth: 460, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{user.email}</span>
              <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                Esci
              </button>
            </div>

            <h2 style={{ textAlign: 'center', color: '#38bdf8', marginBottom: 6 }}>
              {isSubscriptionExpired ? 'Il tuo piano è scaduto' : 'Scegli il tuo piano'}
            </h2>
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              Video illimitati su tutti i piani
            </p>

            {planError && (
              <div style={{ padding: 12, marginBottom: 14, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f43f5e', fontSize: 13 }}>
                {planError}
              </div>
            )}

            {currentPlan === 'none' && (
              <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #38bdf8', marginBottom: 14 }}>
                <h3 style={{ margin: '0 0 6px 0', color: '#38bdf8' }}>Trial 7 Giorni</h3>
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
                  Accesso agli esercizi inclusi nel piano Trial. Analisi video illimitate per 7 giorni.
                </p>
                <button
                  onClick={handleActivateTrial}
                  style={{ width: '100%', padding: 10, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Attiva Trial Gratuito
                </button>
              </div>
            )}

            <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #334155', marginBottom: 14 }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#fff' }}>Abbonamento Trimestrale</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
                Tutti gli esercizi sbloccati. Video illimitati per 3 mesi.
              </p>
              <button
                onClick={() => handleSelectPaidPlan('quarterly')}
                style={{ width: '100%', padding: 10, background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
              >
                Scegli Trimestrale
              </button>
            </div>

            <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #334155', marginBottom: 14 }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#fff' }}>Abbonamento Semestrale</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
                Tutti gli esercizi sbloccati. Video illimitati per 6 mesi.
              </p>
              <button
                onClick={() => handleSelectPaidPlan('semiannual')}
                style={{ width: '100%', padding: 10, background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
              >
                Scegli Semestrale
              </button>
            </div>

            <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #22c55e' }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#22c55e' }}>Abbonamento Annuale (Miglior Valore)</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
                Tutti gli esercizi sbloccati. Video illimitati per 12 mesi.
              </p>
              <button
                onClick={() => handleSelectPaidPlan('annual')}
                style={{ width: '100%', padding: 10, background: '#22c55e', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
              >
                Scegli Annuale
              </button>
            </div>
          </div>
        </div>
        {renderLegalOverlays()}
      </>
    );
  }

  if (isGuidesOpen) {
    return (
      <>
        <AppBrandHeader />
        <CameraGuidesView
          initialExerciseId={guideInitialExercise}
          readOnlySelection={areExerciseAndWeightLocked}
          onSelectExercise={(exId) => {
            const matched = EXERCISES.find((ex) => ex.id === exId);
            if (matched && !areExerciseAndWeightLocked) {
              setSelectedExercise(matched.id);
            }
          }}
          onClose={(chosenExerciseId) => {
            setIsGuidesOpen(false);
            if (!areExerciseAndWeightLocked) {
              const targetId = chosenExerciseId || guideInitialExercise;
              const matched = EXERCISES.find((ex) => ex.id === targetId);
              if (matched) {
                setSelectedExercise(matched.id);
              }
            }
          }}
        />
        {renderLegalOverlays()}
      </>
    );
  }

  const loggedUserLabel =
    (user.user_metadata?.username as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    '';

  return (
    <>
      <AppBrandHeader
        showPlanInfo
        currentPlan={currentPlan}
        daysRemaining={daysRemaining}
        userDisplayName={loggedUserLabel}
        areGuidesDisabled={isProcessing}
        onOpenGuides={() => {
          setGuideInitialExercise(undefined);
          setIsGuidesOpen(true);
        }}
        onLogout={handleLogout}
      />
      <div style={{
        minHeight: 'calc(100vh - 107px)',
        background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
        color: '#f8fafc',
        paddingBottom: 40,
      }}>
        <div style={{ maxWidth: 500, margin: '0 auto', padding: 20, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>
              1. Seleziona l'esercizio
            </label>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
              {selectedExerciseIndex + 1} / {EXERCISES.length}
            </span>
          </div>

          {/* Indice pallini / trattini sopra il carosello */}
          <div
            role="tablist"
            aria-label="Indice esercizi"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 5,
              marginBottom: 10,
              padding: '6px 8px',
              borderRadius: 10,
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid #334155',
              opacity: areExerciseAndWeightLocked ? 0.65 : 1,
            }}
          >
            {EXERCISES.map((ex, idx) => {
              const isCurrent = idx === selectedExerciseIndex;
              return (
                <button
                  key={ex.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`${idx + 1}. ${ex.label}`}
                  title={ex.label}
                  disabled={areExerciseAndWeightLocked}
                  onClick={() => handleSelectExerciseByIndex(idx)}
                  style={{
                    width: isCurrent ? 18 : 7,
                    height: 7,
                    padding: 0,
                    borderRadius: 999,
                    border: 'none',
                    background: isCurrent ? '#38bdf8' : '#475569',
                    cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: areExerciseAndWeightLocked ? 0.65 : 1 }}>
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              disabled={areExerciseAndWeightLocked}
              aria-label="Esercizio precedente"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: 16,
                fontWeight: 'bold',
                cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
              }}
            >
              ◀
            </button>

            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              style={{
                flex: 1,
                display: 'flex',
                overflowX: areExerciseAndWeightLocked ? 'hidden' : 'auto',
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth',
                scrollbarWidth: 'none',
                borderRadius: 14,
              }}
            >
              {EXERCISES.map((ex) => {
                const isSelected = selectedExercise === ex.id;
                const locked = !isExerciseUnlockedForPlan(currentPlan, ex.id, ex.isTrialAllowed);
                return (
                  <div
                    key={ex.id}
                    style={{
                      flex: '0 0 100%',
                      scrollSnapAlign: 'center',
                      boxSizing: 'border-box',
                      padding: '8px 10px',
                      borderRadius: 14,
                      border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                      background: isSelected ? '#1e293b' : '#0f172a',
                      cursor: 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      opacity: locked ? 0.55 : 1,
                      boxShadow: isSelected ? '0 10px 15px -3px rgba(56, 189, 248, 0.15)' : 'none',
                    }}
                  >
                    {locked && (
                      <span style={{ position: 'absolute', top: 10, right: 10, background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        🔒 Abbonati
                      </span>
                    )}
                    <img
                      src={ex.imagePath}
                      alt={ex.label}
                      style={{ width: 110, height: 110, objectFit: 'contain', borderRadius: 8 }}
                    />
                    <span style={{ fontSize: 16, fontWeight: 700, color: isSelected ? '#38bdf8' : '#cbd5e1' }}>
                      {ex.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              disabled={areExerciseAndWeightLocked}
              aria-label="Esercizio successivo"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#f8fafc',
                fontSize: 16,
                fontWeight: 'bold',
                cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
              }}
            >
              ▶
            </button>
          </div>

          <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 10, background: '#1e293b', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', display: 'block' }}>Inquadratura consigliata</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {currentHint}
              </span>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                setGuideInitialExercise(selectedExercise);
                setIsGuidesOpen(true);
              }}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#38bdf8',
                background: 'rgba(56,189,248,0.12)',
                border: '1px solid rgba(56,189,248,0.4)',
                padding: '7px 11px',
                borderRadius: 8,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 1,
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              📷 Guida ripresa
            </button>
          </div>

          <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 10, background: '#1e293b', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: areExerciseAndWeightLocked ? 0.65 : 1 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', display: 'block' }}>Carico utilizzato</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {selectedExerciseObj.isDumbbell ? 'Peso del singolo manubrio (kg)' : 'Peso totale (kg)'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleWeightChange(-5)}
                disabled={areExerciseAndWeightLocked}
                style={{ width: 32, height: 36, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#38bdf8', fontSize: 16, fontWeight: 'bold', cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'pointer' }}
              >
                -
              </button>
              <input
                type="number"
                value={weightKg}
                onChange={handleWeightInputChange}
                disabled={areExerciseAndWeightLocked}
                style={{
                  width: 55,
                  height: 36,
                  textAlign: 'center',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#f8fafc',
                  fontSize: 16,
                  fontWeight: 800,
                  outline: 'none',
                  cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'text',
                }}
              />
              <button
                type="button"
                onClick={() => handleWeightChange(5)}
                disabled={areExerciseAndWeightLocked}
                style={{ width: 32, height: 36, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#38bdf8', fontSize: 16, fontWeight: 'bold', cursor: areExerciseAndWeightLocked ? 'not-allowed' : 'pointer' }}
              >
                +
              </button>
            </div>
          </div>

          <label style={{ display: 'block', marginTop: 22, marginBottom: 8, fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>2. Carica video</label>

          <input
            type="file"
            accept="video/*"
            ref={fileInputRef}
            onChange={handleVideoUpload}
            style={{ display: 'none' }}
          />
          <div
            onClick={() => !hasActiveOrCompletedSession && !isExerciseLocked && fileInputRef.current?.click()}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '22px 16px',
              borderRadius: 12,
              border: isExerciseLocked || hasActiveOrCompletedSession ? '2px dashed #64748b' : '2px dashed #38bdf8',
              background: isExerciseLocked ? '#0f172a' : isProcessing ? '#1e293b' : 'rgba(56, 189, 248, 0.05)',
              color: '#f8fafc',
              textAlign: 'center',
              cursor: hasActiveOrCompletedSession || isExerciseLocked ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              opacity: hasActiveOrCompletedSession && !isProcessing ? 0.65 : 1,
            }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>{isExerciseLocked ? '🔒' : '📤'}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: isExerciseLocked ? '#94a3b8' : '#38bdf8' }}>
              {isExerciseLocked
                ? 'Esercizio bloccato per questo piano'
                : isProcessing
                ? 'Elaborazione in corso...'
                : hasActiveOrCompletedSession
                ? 'Usa "Nuova analisi" per caricare un altro video'
                : 'Seleziona file video'}
            </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Formati supportati: MP4, MOV, WebM (max 50 MB)
            </span>
          </div>

          {isProcessing && (
            <div style={{ marginTop: 16, padding: 14, background: '#1e293b', borderRadius: 10, border: '1px solid #334155', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#94a3b8' }}>Avanzamento analisi:</span>
                <span style={{ fontWeight: 800, color: '#38bdf8' }}>{progressPercent}%</span>
              </div>
              <div style={{ width: '100%', background: '#0f172a', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, background: '#38bdf8', height: '100%', transition: 'width 0.1s linear' }} />
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, padding: 16, background: '#1e293b', color: '#fff', borderRadius: 12, border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Ripetizioni</span>
                <span style={{ fontSize: 34, fontWeight: 900, color: '#38bdf8', lineHeight: 1.1 }}>{repCount}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Potenza (Watt)</span>
                <span style={{ fontSize: 24, fontWeight: 900, color: '#f43f5e', lineHeight: 1.1 }}>
                  {powerScore} W
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #334155', paddingTop: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: '#94a3b8' }}>ROM</span>
                  <span style={{ color: getRomColor(romQuality) }}>{romQuality}%</span>
                </div>
                <div style={{ width: '100%', height: 10, background: '#0f172a', borderRadius: 5, overflow: 'hidden', border: '1px solid #334155' }}>
                  <div
                    style={{
                      width: `${romQuality}%`,
                      height: '100%',
                      background: getRomColor(romQuality),
                      transition: 'width 0.1s ease, background 0.2s ease'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 14, border: '1px solid #334155', borderRadius: 10, background: '#1e293b', fontSize: 14, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: getTrafficLightColor(statusCode),
                boxShadow: `0 0 8px ${getTrafficLightColor(statusCode)}`,
                flexShrink: 0,
                display: 'inline-block'
              }}
            />
            <div>
              <strong style={{ color: '#38bdf8' }}>Stato Video:</strong> <span style={{ color: statusCode === 'error' ? '#f43f5e' : '#f8fafc' }}>{status}</span>
            </div>
          </div>

          {isProcessing && (
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleInterruptAnalysis}
                style={{
                  padding: '9px 14px',
                  borderRadius: 8,
                  border: '1px solid #f43f5e',
                  background: 'rgba(244, 63, 94, 0.12)',
                  color: '#fda4af',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⏹ Interrompi analisi
              </button>
            </div>
          )}

          {analysisResult && (
            <>
              <div style={{ marginTop: 20, background: '#1e293b', color: '#fff', borderRadius: 12, border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                <div
                  onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
                  style={{
                    padding: '16px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: '#1e293b',
                    userSelect: 'none'
                  }}
                >
                  <h3 style={{ margin: 0, color: '#38bdf8', fontSize: 16, fontWeight: 800 }}>
                    📊 Analisi Geometrica Locale {repCount > 0 ? `(${repCount} Reps)` : ''}
                  </h3>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>
                    {isAnalysisOpen ? '▲ Chiudi' : '▼ Espandi'}
                  </span>
                </div>

                {isAnalysisOpen && (
                  <div style={{ padding: '0 18px 18px 18px', borderTop: '1px solid #334155' }}>
                    <p style={{ margin: '12px 0 6px 0', fontSize: 14 }}><strong>Ripetizioni valide:</strong> {repCount}</p>
                    <p style={{ margin: '6px 0', fontSize: 14 }}><strong>Range Angolare (Min / Max):</strong> {analysisResult.minAngle}° / {analysisResult.maxAngle}°</p>
                    <p style={{ margin: '6px 0 12px 0', fontSize: 13, color: '#94a3b8' }}>{analysisResult.trendSummary}</p>

                    {repPeakPowers.length > 0 && (
                      <div style={{ marginTop: 12, padding: 12, background: '#0f172a', borderRadius: 10, border: '1px solid #334155' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                          Potenza Massima per Ripetizione
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {repPeakPowers.map((pwr, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                              <span style={{ color: '#cbd5e1' }}>Ripetizione #{idx + 1}</span>
                              <span style={{ fontWeight: 800, color: '#f43f5e' }}>{pwr} W</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div style={{ marginTop: 16, padding: 18, background: '#1e293b', color: '#fff', borderRadius: 12, border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: getTrafficLightColor(aiStatusCode),
                    boxShadow: `0 0 8px ${getTrafficLightColor(aiStatusCode)}`,
                    display: 'inline-block',
                    flexShrink: 0
                  }}
                />
                <h4 style={{ margin: 0, color: '#f43f5e', fontSize: 16, fontWeight: 800 }}>AI Coach</h4>
              </div>

              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                {aiStatusCode === 'idle' && isProcessing
                  ? 'In attesa del completamento analisi video...'
                  : aiStatusMessage}
              </span>
            </div>

            {aiStatusCode === 'idle' && (
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                {isProcessing
                  ? 'Analisi video in corso: il feedback AI Coach partirà al termine dell’analisi.'
                  : 'Avvia l’analisi di un video per ricevere il feedback dell’AI Coach.'}
              </p>
            )}

            {aiStatusCode === 'processing' && (
              <p style={{ margin: 0, fontSize: 14, fontStyle: 'italic', color: '#94a3b8' }}>Elaborazione feedback IA in corso...</p>
            )}

            {aiStatusCode === 'success' && (
              <div style={{ padding: 14, background: '#0f172a', borderRadius: 10, borderLeft: '4px solid #f43f5e', border: '1px solid #334155' }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: '#f8fafc' }}>{aiFeedback}</p>
              </div>
            )}

            {aiStatusCode === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: 14, background: '#0f172a', borderRadius: 10, borderLeft: '4px solid #ef4444', border: '1px solid #334155' }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#f43f5e' }}>{aiFeedback}</p>
                </div>
                <button
                  type="button"
                  onClick={() => lastGeomResultRef.current && triggerAiCoach(lastGeomResultRef.current, analysisSessionIdRef.current)}
                  style={{
                    padding: '10px 16px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)',
                  }}
                >
                  🔄 Riprova IA
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            <button
              type="button"
              disabled={!isNewAnalysisEnabled}
              onClick={handleStartNewAnalysis}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: isNewAnalysisEnabled ? '1px solid #22c55e' : '1px solid #334155',
                background: isNewAnalysisEnabled ? 'rgba(34, 197, 94, 0.16)' : '#0f172a',
                color: isNewAnalysisEnabled ? '#86efac' : '#64748b',
                fontSize: 14,
                fontWeight: 800,
                cursor: isNewAnalysisEnabled ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
              }}
            >
              🔁 Nuova analisi
            </button>
          </div>

          {isTester && (
            <TesterFeedbackPanel
              key={`${analysisSessionIdRef.current}-${aiStatusCode}`}
              userId={user.id}
              defaultVideoFile={lastUploadedFile}
              attachVideoByDefault={Boolean(lastUploadedFile)}
              initialExpanded={false}
              disabled={
                isProcessing ||
                statusCode !== 'success' ||
                !analysisResult ||
                aiStatusCode !== 'success' ||
                !aiFeedback.trim()
              }
              sessionContext={{
                exerciseId: selectedExercise,
                exerciseLabel: selectedExerciseObj.label,
                weightKg,
                repCount,
                romQuality,
                powerScore,
                minAngle: analysisResult?.minAngle,
                maxAngle: analysisResult?.maxAngle,
                trendSummary: analysisResult?.trendSummary,
              }}
            />
          )}

          {/* Switch Visualizzazione: Video + Scheletro vs Solo Human Stick */}
          <div
            style={{
              marginTop: 18,
              padding: '10px 12px',
              background: '#1e293b',
              borderRadius: 10,
              border: '1px solid #334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
              Vista player:
            </span>
            <div
              style={{
                display: 'inline-flex',
                background: '#0f172a',
                borderRadius: 8,
                padding: 3,
                border: '1px solid #334155',
                gap: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setStickOnlyMode(false)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: !stickOnlyMode ? '#38bdf8' : 'transparent',
                  color: !stickOnlyMode ? '#0f172a' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🎥 Video + Scheletro
              </button>
              <button
                type="button"
                onClick={() => setStickOnlyMode(true)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: stickOnlyMode ? '#38bdf8' : 'transparent',
                  color: stickOnlyMode ? '#0f172a' : '#94a3b8',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🦴 Solo Human Stick
              </button>
            </div>
          </div>

          <div style={{ position: 'relative', marginTop: 10, width: '100%', background: '#000', borderRadius: 12, overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
            <canvas
              ref={canvasRef}
              style={{
                display: statusCode === 'success' && !stickOnlyMode ? 'none' : 'block',
                width: '100%',
                height: 'auto',
                background: '#000',
              }}
            />
            <video
              ref={videoRef}
              controls={statusCode === 'success'}
              style={{
                display: statusCode === 'success' ? 'block' : 'none',
                width: '100%',
                height: statusCode === 'success' && stickOnlyMode ? 48 : 'auto',
                background: '#000',
              }}
              muted={statusCode !== 'success'}
              playsInline
              preload="auto"
            />
          </div>

          <footer
            style={{
              marginTop: 24,
              paddingTop: 14,
              borderTop: '1px solid #334155',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
              fontSize: 12,
              color: '#94a3b8',
            }}
          >
            <button
              type="button"
              onClick={() => setLegalTab('privacy')}
              style={{ background: 'none', border: 'none', padding: 0, color: '#94a3b8', textDecoration: 'underline', fontSize: 12, cursor: 'pointer' }}
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setLegalTab('terms')}
              style={{ background: 'none', border: 'none', padding: 0, color: '#94a3b8', textDecoration: 'underline', fontSize: 12, cursor: 'pointer' }}
            >
              Termini d'Uso
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={handleOpenCookiePreferences}
              style={{ background: 'none', border: 'none', padding: 0, color: '#94a3b8', textDecoration: 'underline', fontSize: 12, cursor: 'pointer' }}
            >
              Preferenze Cookie
            </button>
            {analyticsConsent && <span style={{ display: 'none' }} aria-hidden="true" />}
          </footer>
        </div>
      </div>
      {renderLegalOverlays()}
    </>
  );
}

export default App;
