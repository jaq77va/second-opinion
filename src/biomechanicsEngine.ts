export const LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

export function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return angle;
}

export interface AnalysisResult {
  minAngle: number;
  maxAngle: number;
  trendSummary: string;
}

export function analyzeExerciseGeometry(exercise: string, allFramesLandmarks: any[][]): AnalysisResult {
  if (!allFramesLandmarks || allFramesLandmarks.length === 0) {
    return { minAngle: 0, maxAngle: 0, trendSummary: "Dati insufficienti." };
  }

  let angles: number[] = [];

  allFramesLandmarks.forEach((landmarks) => {
    if (!landmarks) return;

    switch (exercise) {
      case 'squat': {
        // Ginocchio (Anca - Ginocchio - Caviglia)
        const hip = landmarks[LANDMARKS.LEFT_HIP];
        const knee = landmarks[LANDMARKS.LEFT_KNEE];
        const ankle = landmarks[LANDMARKS.LEFT_ANKLE];
        if (hip && knee && ankle && hip.visibility > 0.5 && knee.visibility > 0.5 && ankle.visibility > 0.5) {
          angles.push(calculateAngle(hip, knee, ankle));
        }
        break;
      }
      case 'stacco': {
        // Inclinazione del tronco / Anca (Spalla - Anca - Ginocchio)
        const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
        const hip = landmarks[LANDMARKS.LEFT_HIP];
        const knee = landmarks[LANDMARKS.LEFT_KNEE];
        if (shoulder && hip && knee && shoulder.visibility > 0.5 && hip.visibility > 0.5 && knee.visibility > 0.5) {
          angles.push(calculateAngle(shoulder, hip, knee));
        }
        break;
      }
      case 'panca_piana': {
        // Gomito (Spalla - Gomito - Polso)
        const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
        const elbow = landmarks[LANDMARKS.LEFT_ELBOW];
        const wrist = landmarks[LANDMARKS.LEFT_WRIST];
        if (shoulder && elbow && wrist && shoulder.visibility > 0.5 && elbow.visibility > 0.5 && wrist.visibility > 0.5) {
          angles.push(calculateAngle(shoulder, elbow, wrist));
        }
        break;
      }
      case 'lat_machine': {
        // Apertura ascella / gomito (Anca - Spalla - Gomito)
        const hip = landmarks[LANDMARKS.LEFT_HIP];
        const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
        const elbow = landmarks[LANDMARKS.LEFT_ELBOW];
        if (hip && shoulder && elbow && hip.visibility > 0.5 && shoulder.visibility > 0.5 && elbow.visibility > 0.5) {
          angles.push(calculateAngle(hip, shoulder, elbow));
        }
        break;
      }
      case 'alzate_laterali': {
        // Apertura braccio (Anca - Spalla - Gomito)
        const hip = landmarks[LANDMARKS.LEFT_HIP];
        const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
        const elbow = landmarks[LANDMARKS.LEFT_ELBOW];
        if (hip && shoulder && elbow && hip.visibility > 0.5 && shoulder.visibility > 0.5 && elbow.visibility > 0.5) {
          angles.push(calculateAngle(hip, shoulder, elbow));
        }
        break;
      }
      default: {
        const hip = landmarks[LANDMARKS.LEFT_HIP];
        const knee = landmarks[LANDMARKS.LEFT_KNEE];
        const ankle = landmarks[LANDMARKS.LEFT_ANKLE];
        if (hip && knee && ankle) {
          angles.push(calculateAngle(hip, knee, ankle));
        }
        break;
      }
    }
  });

  if (angles.length === 0) {
    return { minAngle: 0, maxAngle: 0, trendSummary: "Impossibile tracciare l'articolazione chiave per questo esercizio." };
  }

  const minAngle = Math.min(...angles);
  const maxAngle = Math.max(...angles);
  const trendSummary = `Rilevati ${angles.length} frame validi per ${exercise}. Angolo iniziale: ${Math.round(angles[0])}°, Minimo: ${Math.round(minAngle)}°, Massimo: ${Math.round(maxAngle)}°.`;

  return { minAngle: Math.round(minAngle), maxAngle: Math.round(maxAngle), trendSummary };
}