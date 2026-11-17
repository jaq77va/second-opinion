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
  const minVis = 0.45;

  allFramesLandmarks.forEach((landmarks) => {
    if (!landmarks) return;

    switch (exercise) {
      case 'squat': {
        // Ginocchio (Anca - Ginocchio - Caviglia): Valuta ibrido DX / SX
        const lHip = landmarks[LANDMARKS.LEFT_HIP];
        const lKnee = landmarks[LANDMARKS.LEFT_KNEE];
        const lAnkle = landmarks[LANDMARKS.LEFT_ANKLE];
        const rHip = landmarks[LANDMARKS.RIGHT_HIP];
        const rKnee = landmarks[LANDMARKS.RIGHT_KNEE];
        const rAnkle = landmarks[LANDMARKS.RIGHT_ANKLE];

        const leftOk = lHip && lKnee && lAnkle && lHip.visibility > minVis && lKnee.visibility > minVis && lAnkle.visibility > minVis;
        const rightOk = rHip && rKnee && rAnkle && rHip.visibility > minVis && rKnee.visibility > minVis && rAnkle.visibility > minVis;

        if (leftOk && rightOk) {
          const lAng = calculateAngle(lHip, lKnee, lAnkle);
          const rAng = calculateAngle(rHip, rKnee, rAnkle);
          angles.push((lAng + rAng) / 2);
        } else if (leftOk) {
          angles.push(calculateAngle(lHip, lKnee, lAnkle));
        } else if (rightOk) {
          angles.push(calculateAngle(rHip, rKnee, rAnkle));
        }
        break;
      }
      case 'stacco': {
        // Tronco / Anca (Spalla - Anca - Ginocchio): ibrido DX / SX
        const lSh = landmarks[LANDMARKS.LEFT_SHOULDER];
        const lHip = landmarks[LANDMARKS.LEFT_HIP];
        const lKnee = landmarks[LANDMARKS.LEFT_KNEE];
        const rSh = landmarks[LANDMARKS.RIGHT_SHOULDER];
        const rHip = landmarks[LANDMARKS.RIGHT_HIP];
        const rKnee = landmarks[LANDMARKS.RIGHT_KNEE];

        const leftOk = lSh && lHip && lKnee && lSh.visibility > minVis && lHip.visibility > minVis && lKnee.visibility > minVis;
        const rightOk = rSh && rHip && rKnee && rSh.visibility > minVis && rHip.visibility > minVis && rKnee.visibility > minVis;

        if (leftOk && rightOk) {
          const lAng = calculateAngle(lSh, lHip, lKnee);
          const rAng = calculateAngle(rSh, rHip, rKnee);
          angles.push((lAng + rAng) / 2);
        } else if (leftOk) {
          angles.push(calculateAngle(lSh, lHip, lKnee));
        } else if (rightOk) {
          angles.push(calculateAngle(rSh, rHip, rKnee));
        }
        break;
      }
      case 'panca_piana':
      case 'lat_machine': {
        // Gomito (Spalla - Gomito - Polso): ibrido DX / SX
        const lSh = landmarks[LANDMARKS.LEFT_SHOULDER];
        const lEl = landmarks[LANDMARKS.LEFT_ELBOW];
        const lWr = landmarks[LANDMARKS.LEFT_WRIST];
        const rSh = landmarks[LANDMARKS.RIGHT_SHOULDER];
        const rEl = landmarks[LANDMARKS.RIGHT_ELBOW];
        const rWr = landmarks[LANDMARKS.RIGHT_WRIST];

        const leftOk = lSh && lEl && lWr && lSh.visibility > minVis && lEl.visibility > minVis && lWr.visibility > minVis;
        const rightOk = rSh && rEl && rWr && rSh.visibility > minVis && rEl.visibility > minVis && rWr.visibility > minVis;

        if (leftOk && rightOk) {
          const lAng = calculateAngle(lSh, lEl, lWr);
          const rAng = calculateAngle(rSh, rEl, rWr);
          angles.push((lAng + rAng) / 2);
        } else if (leftOk) {
          angles.push(calculateAngle(lSh, lEl, lWr));
        } else if (rightOk) {
          angles.push(calculateAngle(rSh, rEl, rWr));
        }
        break;
      }
      case 'alzate_laterali': {
        // Apertura braccio (Anca - Spalla - Gomito): ibrido DX / SX simmetrico
        const lHp = landmarks[LANDMARKS.LEFT_HIP];
        const lSh = landmarks[LANDMARKS.LEFT_SHOULDER];
        const lEl = landmarks[LANDMARKS.LEFT_ELBOW];
        const rHp = landmarks[LANDMARKS.RIGHT_HIP];
        const rSh = landmarks[LANDMARKS.RIGHT_SHOULDER];
        const rEl = landmarks[LANDMARKS.RIGHT_ELBOW];

        const leftOk = lHp && lSh && lEl && lHp.visibility > minVis && lSh.visibility > minVis && lEl.visibility > minVis;
        const rightOk = rHp && rSh && rEl && rHp.visibility > minVis && rSh.visibility > minVis && rEl.visibility > minVis;

        if (leftOk && rightOk) {
          const lAng = calculateAngle(lHp, lSh, lEl);
          const rAng = calculateAngle(rHp, rSh, rEl);
          angles.push((lAng + rAng) / 2);
        } else if (leftOk) {
          angles.push(calculateAngle(lHp, lSh, lEl));
        } else if (rightOk) {
          angles.push(calculateAngle(rHp, rSh, rEl));
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
  const trendSummary = `Rilevati ${angles.length} frame validi per ${exercise} (motore ibrido adattivo). Angolo iniziale: ${Math.round(angles[0])}°, Minimo: ${Math.round(minAngle)}°, Massimo: ${Math.round(maxAngle)}°.`;

  return { minAngle: Math.round(minAngle), maxAngle: Math.round(maxAngle), trendSummary };
}