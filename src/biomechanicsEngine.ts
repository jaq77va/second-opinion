export interface JointPoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  __inferred?: boolean;
}

export type ExerciseId =
  // 20 esercizi base già presenti
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
  | 'trazioni_sbarra'
  // 20 esercizi aggiuntivi
  | 'front_squat'
  | 'goblet_squat'
  | 'sumo_deadlift'
  | 'hip_thrust'
  | 'panca_inclinata'
  | 'chest_dips'
  | 'arnold_press'
  | 'front_raises'
  | 'face_pull'
  | 'lat_machine_presa_inversa'
  | 'rematore_manubrio'
  | 'pullover_cavi'
  | 'hammer_curl'
  | 'curl_panca_scott'
  | 'estensioni_tricipiti_sopra_testa'
  | 'affondi_laterali'
  | 'step_up'
  | 'calf_raise_in_piedi'
  | 'ab_coaster_crunch'
  | 'hyperextension';

export type BiomechanicalExerciseId = ExerciseId;

export type AngleMode = 'extension_flexion' | 'abduction_up';

export interface ExerciseConfig {
  id: ExerciseId;
  label: string;
  imagePath: string;
  viewHint: string;
  isDumbbell: boolean;
  isTrialAllowed: boolean;
  mode: AngleMode;
  primaryTriplet: {
    left: [number, number, number];
    right: [number, number, number];
  };
  topMin?: number;
  bottomMax?: number;
  restMax?: number;
  apexMin?: number;
  romMinAngle: number;
  romMaxAngle: number;
}

export interface AnalysisResult {
  minAngle: number;
  maxAngle: number;
  trendSummary: string;
}

export const EXERCISES: ExerciseConfig[] = [
  // --- 20 ESERCIZI BASE ---
  {
    id: 'squat',
    label: 'Squat',
    imagePath: '/images/squat.png',
    viewHint: 'Inquadratura laterale o frontale a figura intera',
    isDumbbell: false,
    isTrialAllowed: true,
    mode: 'extension_flexion',
    primaryTriplet: { left: [23, 25, 27], right: [24, 26, 28] },
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
    primaryTriplet: { left: [11, 23, 25], right: [12, 24, 26] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
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
    primaryTriplet: { left: [23, 11, 13], right: [24, 12, 14] },
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
    primaryTriplet: { left: [23, 25, 27], right: [24, 26, 28] },
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
    primaryTriplet: { left: [23, 25, 27], right: [24, 26, 28] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
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
    primaryTriplet: { left: [11, 23, 25], right: [12, 24, 26] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
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
    primaryTriplet: { left: [23, 25, 27], right: [24, 26, 28] },
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
    primaryTriplet: { left: [23, 25, 27], right: [24, 26, 28] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
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
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
    topMin: 145,
    bottomMax: 85,
    romMinAngle: 65,
    romMaxAngle: 155,
  },

  // --- 20 ESERCIZI AGGIUNTIVI ---
  {
    id: 'front_squat',
    label: 'Front squat',
    imagePath: '/images/front_squat.png',
    viewHint: 'Inquadratura laterale a figura intera con gomiti visibili',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [23, 25, 27], right: [24, 26, 28] },
    topMin: 148,
    bottomMax: 98,
    romMinAngle: 65,
    romMaxAngle: 155,
  },
  {
    id: 'goblet_squat',
    label: 'Goblet squat',
    imagePath: '/images/goblet_squat.png',
    viewHint: 'Inquadratura laterale o frontale a figura intera',
    isDumbbell: true,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [23, 25, 27], right: [24, 26, 28] },
    topMin: 148,
    bottomMax: 98,
    romMinAngle: 65,
    romMaxAngle: 155,
  },
  {
    id: 'sumo_deadlift',
    label: 'Stacco sumo',
    imagePath: '/images/sumo_deadlift.png',
    viewHint: 'Inquadratura frontale o 3/4 a figura intera (stance ampia)',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 23, 25], right: [12, 24, 26] },
    topMin: 152,
    bottomMax: 105,
    romMinAngle: 70,
    romMaxAngle: 160,
  },
  {
    id: 'hip_thrust',
    label: 'Hip thrust',
    imagePath: '/images/hip_thrust.png',
    viewHint: 'Inquadratura laterale su panca con bacino e ginocchia visibili',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 23, 25], right: [12, 24, 26] },
    topMin: 160,
    bottomMax: 95,
    romMinAngle: 75,
    romMaxAngle: 170,
  },
  {
    id: 'panca_inclinata',
    label: 'Panca inclinata',
    imagePath: '/images/panca_inclinata.png',
    viewHint: 'Inquadratura laterale o obliqua a 45° su panca inclinata',
    isDumbbell: true,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
    topMin: 148,
    bottomMax: 90,
    romMinAngle: 65,
    romMaxAngle: 155,
  },
  {
    id: 'chest_dips',
    label: 'Dip alle parallele',
    imagePath: '/images/chest_dips.png',
    viewHint: 'Inquadratura laterale o 3/4 alle parallele',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
    topMin: 148,
    bottomMax: 90,
    romMinAngle: 65,
    romMaxAngle: 155,
  },
  {
    id: 'arnold_press',
    label: 'Arnold press',
    imagePath: '/images/arnold_press.png',
    viewHint: 'Inquadratura frontale o 3/4 con spalle e gomiti ben visibili',
    isDumbbell: true,
    isTrialAllowed: false,
    mode: 'abduction_up',
    primaryTriplet: { left: [23, 11, 13], right: [24, 12, 14] },
    restMax: 60,
    apexMin: 135,
    romMinAngle: 45,
    romMaxAngle: 155,
  },
  {
    id: 'front_raises',
    label: 'Alzate frontali',
    imagePath: '/images/front_raises.png',
    viewHint: 'Inquadratura laterale (3/4) per elevazione anteriore del braccio',
    isDumbbell: true,
    isTrialAllowed: false,
    mode: 'abduction_up',
    primaryTriplet: { left: [23, 11, 13], right: [24, 12, 14] },
    restMax: 35,
    apexMin: 80,
    romMinAngle: 25,
    romMaxAngle: 95,
  },
  {
    id: 'face_pull',
    label: 'Face pull',
    imagePath: '/images/face_pull.png',
    viewHint: 'Inquadratura 3/4 o laterale ai cavi alti',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
    topMin: 140,
    bottomMax: 80,
    romMinAngle: 60,
    romMaxAngle: 150,
  },
  {
    id: 'lat_machine_presa_inversa',
    label: 'Lat machine presa inversa',
    imagePath: '/images/lat_machine_presa_inversa.png',
    viewHint: 'Inquadratura posteriore o 3/4',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
    topMin: 142,
    bottomMax: 80,
    romMinAngle: 60,
    romMaxAngle: 155,
  },
  {
    id: 'rematore_manubrio',
    label: 'Rematore con manubrio',
    imagePath: '/images/rematore_manubrio.png',
    viewHint: 'Inquadratura laterale sul lato di lavoro',
    isDumbbell: true,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
    topMin: 142,
    bottomMax: 80,
    romMinAngle: 60,
    romMaxAngle: 150,
  },
  {
    id: 'pullover_cavi',
    label: 'Pullover ai cavi / manubrio',
    imagePath: '/images/pullover_cavi.png',
    viewHint: 'Inquadratura laterale sul piano sagittale',
    isDumbbell: true,
    isTrialAllowed: false,
    mode: 'abduction_up',
    primaryTriplet: { left: [23, 11, 13], right: [24, 12, 14] },
    restMax: 50,
    apexMin: 130,
    romMinAngle: 35,
    romMaxAngle: 150,
  },
  {
    id: 'hammer_curl',
    label: 'Curl a martello',
    imagePath: '/images/hammer_curl.png',
    viewHint: 'Profilo laterale o 3/4 con gomito e polso visibili',
    isDumbbell: true,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
    topMin: 145,
    bottomMax: 65,
    romMinAngle: 45,
    romMaxAngle: 150,
  },
  {
    id: 'curl_panca_scott',
    label: 'Curl su panca Scott',
    imagePath: '/images/curl_panca_scott.png',
    viewHint: 'Inquadratura laterale sulla panca Scott',
    isDumbbell: true,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
    topMin: 145,
    bottomMax: 60,
    romMinAngle: 45,
    romMaxAngle: 150,
  },
  {
    id: 'estensioni_tricipiti_sopra_testa',
    label: 'Estensioni tricipiti sopra la testa',
    imagePath: '/images/estensioni_tricipiti_sopra_testa.png',
    viewHint: 'Inquadratura laterale o 3/4 con braccia in alto',
    isDumbbell: true,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 13, 15], right: [12, 14, 16] },
    topMin: 150,
    bottomMax: 75,
    romMinAngle: 55,
    romMaxAngle: 160,
  },
  {
    id: 'affondi_laterali',
    label: 'Affondi laterali',
    imagePath: '/images/affondi_laterali.png',
    viewHint: 'Inquadratura frontale a figura intera',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [23, 25, 27], right: [24, 26, 28] },
    topMin: 152,
    bottomMax: 100,
    romMinAngle: 70,
    romMaxAngle: 160,
  },
  {
    id: 'step_up',
    label: 'Step-up su box',
    imagePath: '/images/step_up.png',
    viewHint: 'Inquadratura laterale o 3/4 sul box',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [23, 25, 27], right: [24, 26, 28] },
    topMin: 152,
    bottomMax: 95,
    romMinAngle: 70,
    romMaxAngle: 160,
  },
  {
    id: 'calf_raise_in_piedi',
    label: 'Calf raise in piedi',
    imagePath: '/images/calf_raise_in_piedi.png',
    viewHint: 'Inquadratura laterale bassa su caviglie e piedi',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [25, 27, 31], right: [26, 28, 32] },
    topMin: 125,
    bottomMax: 95,
    romMinAngle: 85,
    romMaxAngle: 135,
  },
  {
    id: 'ab_coaster_crunch',
    label: 'Crunch / Sit-up',
    imagePath: '/images/ab_coaster_crunch.png',
    viewHint: 'Inquadratura laterale del busto e del bacino',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 23, 25], right: [12, 24, 26] },
    topMin: 135,
    bottomMax: 80,
    romMinAngle: 65,
    romMaxAngle: 150,
  },
  {
    id: 'hyperextension',
    label: 'Iperestensioni lombari (Roman chair)',
    imagePath: '/images/hyperextension.png',
    viewHint: 'Inquadratura laterale sulla Roman chair',
    isDumbbell: false,
    isTrialAllowed: false,
    mode: 'extension_flexion',
    primaryTriplet: { left: [11, 23, 25], right: [12, 24, 26] },
    topMin: 155,
    bottomMax: 90,
    romMinAngle: 75,
    romMaxAngle: 165,
  },
];

export const EXERCISE_MAP: Record<ExerciseId, ExerciseConfig> = EXERCISES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ExerciseId, ExerciseConfig>
);

export function getExerciseConfig(exercise: ExerciseId): ExerciseConfig {
  return EXERCISE_MAP[exercise] ?? EXERCISES[0];
}

export function computeAngle(a: JointPoint, b: JointPoint, c: JointPoint): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return Math.round(angle);
}

export function hasVisibleJoints(
  landmarks: JointPoint[],
  indices: number[],
  minVis = 0.45,
  rejectInferred = false
): boolean {
  return indices.every((idx) => {
    const lm = landmarks?.[idx];
    if (!lm) return false;
    if (rejectInferred && lm.__inferred) return false;
    return (lm.visibility ?? 1) >= minVis;
  });
}

export function getTripletAngleSafe(
  landmarks: JointPoint[],
  triplet: [number, number, number],
  minVis = 0.45,
  rejectInferred = false
): number | null {
  if (hasVisibleJoints(landmarks, triplet, minVis, rejectInferred)) {
    return computeAngle(landmarks[triplet[0]], landmarks[triplet[1]], landmarks[triplet[2]]);
  }
  // Fallback su tallone/piede per caviglia (31/32 -> 29/30)
  if (triplet[2] === 31 || triplet[2] === 32) {
    const altIdx = triplet[2] === 31 ? 29 : 30;
    const altTriplet: [number, number, number] = [triplet[0], triplet[1], altIdx];
    if (hasVisibleJoints(landmarks, altTriplet, minVis, rejectInferred)) {
      return computeAngle(landmarks[altTriplet[0]], landmarks[altTriplet[1]], landmarks[altTriplet[2]]);
    }
  }
  return null;
}

const SINGLE_LEG_DOMINANT_EXERCISES = new Set<ExerciseId>([
  'affondi',
  'bulgarian_squat',
  'affondi_laterali',
  'step_up',
]);

export function extractExerciseAngleValue(
  exercise: ExerciseId,
  landmarks: JointPoint[],
  minVis = 0.45
): number | null {
  if (!landmarks || landmarks.length === 0) return null;
  const cfg = getExerciseConfig(exercise);
  const { left, right } = cfg.primaryTriplet;

  const isSingleLeg = SINGLE_LEG_DOMINANT_EXERCISES.has(exercise);
  const effectiveVis = isSingleLeg ? Math.min(minVis, 0.4) : minVis;

  const lAng = getTripletAngleSafe(landmarks, left, effectiveVis);
  const rAng = getTripletAngleSafe(landmarks, right, effectiveVis);

  if (lAng !== null && rAng !== null) {
    return isSingleLeg ? Math.min(lAng, rAng) : Math.round((lAng + rAng) / 2);
  }
  if (lAng !== null) return lAng;
  if (rAng !== null) return rAng;
  return null;
}

export function computeRomPercent(exercise: ExerciseId, angleDeg: number | null): number | null {
  if (angleDeg === null) return null;
  const cfg = getExerciseConfig(exercise);
  const span = cfg.romMaxAngle - cfg.romMinAngle;
  if (span === 0) return 0;

  let rom = 0;
  if (cfg.mode === 'abduction_up') {
    rom = ((angleDeg - cfg.romMinAngle) / span) * 100;
  } else if (exercise === 'squat') {
    rom = ((155 - angleDeg) / (155 - 65)) * 100;
  } else {
    rom = ((cfg.romMaxAngle - angleDeg) / span) * 100;
  }

  return Math.max(0, Math.min(100, Math.round(rom)));
}

export function analyzeExerciseGeometry(
  exercise: ExerciseId,
  framesLandmarks: JointPoint[][]
): AnalysisResult {
  const cfg = getExerciseConfig(exercise);
  const label = cfg.label;
  const angles: number[] = [];

  for (const landmarks of framesLandmarks) {
    const angle = extractExerciseAngleValue(exercise, landmarks, 0.45);
    if (angle !== null) {
      angles.push(angle);
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
  const avgSecond = Math.round(
    secondHalf.length > 0 ? secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length : avgFirst
  );
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