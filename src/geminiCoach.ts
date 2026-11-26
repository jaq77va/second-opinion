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

    if (data && data.isExerciseMatch === false) {
      return {
        feedback: '',
        isExerciseMatch: false,
        detectedSubject:
          typeof data.detectedSubject === 'string' && data.detectedSubject.trim()
            ? data.detectedSubject.trim()
            : 'Contenuto non corrispondente',
        mismatchReason:
          typeof data.mismatchReason === 'string' && data.mismatchReason.trim()
            ? data.mismatchReason.trim()
            : `Il video caricato non sembra mostrare l'esercizio "${exercise}".`,
      };
    }

    return {
      feedback: typeof data?.feedback === 'string' ? data.feedback : '',
      isExerciseMatch: true,
      detectedSubject: typeof data?.detectedSubject === 'string' ? data.detectedSubject : undefined,
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
    throw new Error(
      res.mismatchReason || `Il video non corrisponde all'esercizio selezionato (${exercise}).`
    );
  }
  return res.feedback;
}