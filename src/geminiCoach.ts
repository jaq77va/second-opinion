export async function getGeminiFeedback(
  exercise: string,
  minAngle: number,
  maxAngle: number,
  angleTrendSummary: string
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
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `Errore HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.feedback;
  } catch (err) {
    return `Errore di comunicazione con il coach IA: ${(err as Error).message}`;
  }
}