// Indici dei landmark di MediaPipe Pose
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

// Funzione matematica per calcolare l'angolo tra tre punti (Vertice in B)
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
  singleCue: string;
}

// Analizzatore specifico per i 5 esercizi
export function analyzeExercise(exercise: string, allFramesLandmarks: any[][]): AnalysisResult {
  if (!allFramesLandmarks || allFramesLandmarks.length === 0) {
    return { minAngle: 0, maxAngle: 0, singleCue: "Nessun dato sufficiente rilevato nel video." };
  }

  let angles: number[] = [];

  allFramesLandmarks.forEach((landmarks) => {
    if (!landmarks) return;

    switch (exercise) {
      case 'squat': {
        // Angolo del ginocchio sinistro (Anca: 23, Ginocchio: 25, Caviglia: 27)
        const hip = landmarks[LANDMARKS.LEFT_HIP];
        const knee = landmarks[LANDMARKS.LEFT_KNEE];
        const ankle = landmarks[LANDMARKS.LEFT_ANKLE];
        if (hip && knee && ankle && hip.visibility > 0.5 && knee.visibility > 0.5 && ankle.visibility > 0.5) {
          angles.push(calculateAngle(hip, knee, ankle));
        }
        break;
      }
      case 'panca_piana': {
        // Angolo del gomito sinistro (Spalla: 11, Gomito: 13, Polso: 15)
        const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
        const elbow = landmarks[LANDMARKS.LEFT_ELBOW];
        const wrist = landmarks[LANDMARKS.LEFT_WRIST];
        if (shoulder && elbow && wrist && shoulder.visibility > 0.5 && elbow.visibility > 0.5 && wrist.visibility > 0.5) {
          angles.push(calculateAngle(shoulder, elbow, wrist));
        }
        break;
      }
      case 'alzate_laterali': {
        // Angolo tra tronco e braccio (Anca: 23, Spalla: 11, Gomito: 13)
        const hip = landmarks[LANDMARKS.LEFT_HIP];
        const shoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
        const elbow = landmarks[LANDMARKS.LEFT_ELBOW];
        if (hip && shoulder && elbow && hip.visibility > 0.5 && shoulder.visibility > 0.5 && elbow.visibility > 0.5) {
          angles.push(calculateAngle(hip, shoulder, elbow));
        }
        break;
      }
      default: {
        // Fallback generico basato su anca-ginocchio-caviglia
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
    return { minAngle: 0, maxAngle: 0, singleCue: "Inquadratura non ottimale: assicurati di riprendere l'intero corpo." };
  }

  const minAngle = Math.min(...angles);
  const maxAngle = Math.max(...angles);

  // Generazione della regola del Singolo Cue in base all'esercizio
  let singleCue = "Movimento stabile e fluido. Ottimo lavoro!";

  if (exercise === 'squat') {
    if (minAngle > 100) {
      singleCue = "Affondo incompleto: prova a scendere con il bacino sotto la linea delle ginocchia.";
    } else if (minAngle < 60) {
      singleCue = "Ottima profondità! Ricorda di mantenere il petto ben aperto in risalita.";
    } else {
      singleCue = "Gestione del ROM corretta. Spingi forte con l'intero piede sul pavimento.";
    }
  } else if (exercise === 'panca_piana') {
    if (minAngle > 90) {
      singleCue = "Il bilanciere non tocca il petto: controlla il fermo al petto nella fase di discesa.";
    } else {
      singleCue = "Ottimo controllo al petto: spingi simmetricamente verso l'alto.";
    }
  } else if (exercise === 'alzate_laterali') {
    if (maxAngle < 75) {
      singleCue = "Arialo di più: porta i gomiti all'altezza delle spalle senza slanci di bacino.";
    } else {
      singleCue = "Buona apertura dei gomiti: controlla la fase negativa (discesa lenta).";
    }
  }

  return { minAngle: Math.round(minAngle), maxAngle: Math.round(maxAngle), singleCue };
}