export interface AnalysisResult {
  minAngle: number;
  maxAngle: number;
  trendSummary: string;
}

export type BiomechanicalExerciseId =
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

const EXERCISE_LABELS: Record<BiomechanicalExerciseId, string> = {
  squat: 'Squat',
  stacco: 'Stacco da terra',
  panca_piana: 'Panca piana',
  alzate_laterali: 'Alzate laterali',
  affondi: 'Affondi',
  bulgarian_squat: 'Bulgarian squat',
  push_up: 'Push-up',
  military_press: 'Military press',
  curl_bicipiti: 'Curl bicipiti',
  french_press: 'French press',
  rematore_bilanciere: 'Rematore bilanciere',
  stacco_rumeno: 'Stacco rumeno',
  lat_machine: 'Lat machine',
  pulley_basso: 'Pulley basso',
  leg_extension: 'Leg extension',
  leg_curl: 'Leg curl',
  chest_press: 'Chest press',
  shoulder_press: 'Shoulder press',
  pushdown_cavi: 'Pushdown cavi',
  trazioni_sbarra: 'Trazioni sbarra',
};

function computeAngle(a: any, b: any, c: any): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return Math.round(angle);
}

function hasVisibleJoints(landmarks: any[], indices: number[], minVis = 0.45): boolean {
  return indices.every((idx) => landmarks?.[idx] && (landmarks[idx].visibility ?? 1) >= minVis);
}

function getTripletsForExercise(exercise: BiomechanicalExerciseId): {
  left: [number, number, number];
  right: [number, number, number];
} {
  switch (exercise) {
    case 'alzate_laterali':
      return { left: [23, 11, 13], right: [24, 12, 14] };
    case 'stacco':
    case 'stacco_rumeno':
      return { left: [11, 23, 25], right: [12, 24, 26] };
    case 'squat':
    case 'affondi':
    case 'bulgarian_squat':
    case 'leg_extension':
    case 'leg_curl':
      return { left: [23, 25, 27], right: [24, 26, 28] };
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
    default:
      return { left: [11, 13, 15], right: [12, 14, 16] };
  }
}

export function analyzeExerciseGeometry(
  exercise: BiomechanicalExerciseId,
  framesLandmarks: any[][]
): AnalysisResult {
  const label = EXERCISE_LABELS[exercise] ?? exercise;
  const { left, right } = getTripletsForExercise(exercise);
  const angles: number[] = [];

  for (const landmarks of framesLandmarks) {
    if (!landmarks || landmarks.length === 0) continue;

    const leftOk = hasVisibleJoints(landmarks, left, 0.45);
    const rightOk = hasVisibleJoints(landmarks, right, 0.45);

    if (leftOk && rightOk) {
      const lAng = computeAngle(landmarks[left[0]], landmarks[left[1]], landmarks[left[2]]);
      const rAng = computeAngle(landmarks[right[0]], landmarks[right[1]], landmarks[right[2]]);
      angles.push(Math.round((lAng + rAng) / 2));
    } else if (leftOk) {
      angles.push(computeAngle(landmarks[left[0]], landmarks[left[1]], landmarks[left[2]]));
    } else if (rightOk) {
      angles.push(computeAngle(landmarks[right[0]], landmarks[right[1]], landmarks[right[2]]));
    }
  }

  if (angles.length === 0) {
    return {
      minAngle: 0,
      maxAngle: 0,
      trendSummary: `${label}: nessun frame con landmark articolari visibili in modo affidabile.`,
    };
  }

  const minAngle = Math.min(...angles);
  const maxAngle = Math.max(...angles);
  const excursion = maxAngle - minAngle;

  const firstHalf = angles.slice(0, Math.max(1, Math.floor(angles.length / 2)));
  const secondHalf = angles.slice(Math.max(1, Math.floor(angles.length / 2)));
  const avgFirst = Math.round(firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length);
  const avgSecond = Math.round(secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length);
  const drift = avgSecond - avgFirst;

  let consistencyNote = 'escursione costante tra prima e seconda metà della serie';
  if (Math.abs(drift) > 12) {
    consistencyNote =
      drift > 0
        ? 'tendenza ad angoli medi più aperti nella seconda metà (possibile riduzione di profondità/ROM per affaticamento)'
        : 'tendenza ad angoli medi più chiusi nella seconda metà (possibile variazione posturale o di assetto)';
  }

  const trendSummary = `${label}: escursione angolare rilevata di ${excursion}° (${minAngle}°–${maxAngle}°) su ${angles.length} campioni; ${consistencyNote}.`;

  return {
    minAngle,
    maxAngle,
    trendSummary,
  };
}