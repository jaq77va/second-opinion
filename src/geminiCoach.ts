export interface CoachTelemetryContext {
  weightKg?: number;
  isDumbbell?: boolean;
  peakRomPercent?: number;
  avgRomPercent?: number;
  peakPowerW?: number;
  avgPowerW?: number;
  maxAsymmetryDeg?: number | null;
  torsoOscillationDeg?: number | null;
}

export async function getGeminiFeedback(
  exercise: string,
  minAngle: number,
  maxAngle: number,
  angleTrendSummary: string,
  telemetry?: CoachTelemetryContext
): Promise<string> {
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
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Errore HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.feedback;
  } catch (err) {
    return `Errore di comunicazione con il coach IA: ${(err as Error).message}`;
  }
}
