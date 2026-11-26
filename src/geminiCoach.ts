import { DEFAULT_MISMATCH_MESSAGE } from './biomechanicsEngine';

export interface CoachTelemetryContext {
  weightKg?: number;
  isDumbbell?: boolean;
  peakRomPercent?: number;
  avgRomPercent?: number;
  peakPowerW?: number;
  avgPowerW?: number;
  maxAsymmetryDeg?: number | null;
  torsoOscillationDeg?: number | null;
  keyframes?: string[];
  validateExerciseMatch?: boolean;
}

export interface CoachFeedbackResponse {
  feedback: string;
  isExerciseMatch: boolean;
  detectedSubject?: string;
  mismatchReason?: string;
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function requestGeminiCoachAnalysis(
  exercise: string,
  minAngle: number,
  maxAngle: number,
  angleTrendSummary: string,
  telemetry?: CoachTelemetryContext
): Promise<CoachFeedbackResponse> {
  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exercise,
        minAngle,
        maxAngle,
        trendSummary: angleTrendSummary,
        telemetry,
        keyframes: telemetry?.keyframes,
        validateExerciseMatch: Boolean(telemetry?.validateExerciseMatch),
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Errore HTTP ${response.status}`);
    }

    const data = await response.json();

    const detectedSubject =
      typeof data?.detectedSubject === 'string' && data.detectedSubject.trim()
        ? data.detectedSubject.trim()
        : typeof data?.detectedActivity === 'string' && data.detectedActivity.trim()
        ? data.detectedActivity.trim()
        : undefined;

    const explicitMismatch =
      data?.isExerciseMatch === false || data?.isMatchingExercise === false;

    const detectedMismatchByActivity =
      detectedSubject &&
      normalizeLabel(detectedSubject) !== 'unknown' &&
      normalizeLabel(detectedSubject) !== 'none' &&
      normalizeLabel(detectedSubject) !== normalizeLabel(exercise) &&
      (typeof data?.confidence !== 'number' || data.confidence >= 0.65);

    if (explicitMismatch || detectedMismatchByActivity) {
      return {
        feedback: '',
        isExerciseMatch: false,
        detectedSubject: detectedSubject || 'Attività non corrispondente',
        mismatchReason: DEFAULT_MISMATCH_MESSAGE,
      };
    }

    const feedbackText = typeof data?.feedback === 'string' ? data.feedback.trim() : '';
    if (!feedbackText) {
      return {
        feedback: '',
        isExerciseMatch: false,
        detectedSubject: detectedSubject || 'Risposta incompleta',
        mismatchReason: DEFAULT_MISMATCH_MESSAGE,
      };
    }

    return {
      feedback: feedbackText,
      isExerciseMatch: true,
      detectedSubject,
    };
  } catch (err) {
    throw new Error(`Errore di comunicazione con il coach IA: ${(err as Error).message}`);
  }
}

export async function getGeminiFeedback(
  exercise: string,
  minAngle: number,
  maxAngle: number,
  angleTrendSummary: string,
  telemetry?: CoachTelemetryContext
): Promise<string> {
  const res = await requestGeminiCoachAnalysis(
    exercise,
    minAngle,
    maxAngle,
    angleTrendSummary,
    telemetry
  );
  if (!res.isExerciseMatch) {
    throw new Error(res.mismatchReason || DEFAULT_MISMATCH_MESSAGE);
  }
  return res.feedback;
}