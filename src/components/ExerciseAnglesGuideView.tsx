import { useState, useEffect } from 'react';

export type GuideExerciseId =
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

export type AngleFamily =
  | 'knee_flex_ext'
  | 'hip_hinge'
  | 'shoulder_abduction'
  | 'elbow_flex_ext';

export interface ExerciseAngleGuideItem {
  id: GuideExerciseId;
  label: string;
  family: AngleFamily;
  jointVertex: string;
  tripletLabel: string;
  landmarksText: string;
  eccentricTitle: string;
  eccentricAngleRange: string;
  eccentricDesc: string;
  concentricTitle: string;
  concentricAngleRange: string;
  concentricDesc: string;
  keyNote: string;
}

export const EXERCISE_ANGLE_GUIDES: ExerciseAngleGuideItem[] = [
  {
    id: 'squat',
    label: 'Squat',
    family: 'knee_flex_ext',
    jointVertex: 'Ginocchio (SX 25 / DX 26)',
    tripletLabel: 'Anca – Ginocchio – Caviglia',
    landmarksText: 'SX: 23–25–27 · DX: 24–26–28',
    eccentricTitle: 'Eccentrica (Discesa in buca)',
    eccentricAngleRange: '~175° → ~80°–100°',
    eccentricDesc: 'L’angolo al ginocchio si chiude progressivamente mentre il bacino scende verso il parallelo o oltre.',
    concentricTitle: 'Concentrica (Risalita / Spinta)',
    concentricAngleRange: '~80°–100° → ~175°',
    concentricDesc: 'L’angolo al ginocchio si riapre estendendo gli arti inferiori fino alla stazione eretta.',
    keyNote: 'L’app legge l’angolo interno/proiettato tra coscia e tibia sul ginocchio (media SX/DX quando entrambi i lati sono visibili).',
  },
  {
    id: 'stacco',
    label: 'Stacco da terra',
    family: 'hip_hinge',
    jointVertex: 'Anca (SX 23 / DX 24)',
    tripletLabel: 'Spalla – Anca – Ginocchio',
    landmarksText: 'SX: 11–23–25 · DX: 12–24–26',
    eccentricTitle: 'Eccentrica (Riaccompagnamento)',
    eccentricAngleRange: '~175° → ~65°–95°',
    eccentricDesc: 'Il bacino arretra e l’angolo tra busto e coscia si chiude mentre il bilanciere scende verso terra.',
    concentricTitle: 'Concentrica (Tirata e chiusura)',
    concentricAngleRange: '~65°–95° → ~175°',
    concentricDesc: 'L’angolo all’anca si apre portando il busto in linea con cosce e gambe in chiusura.',
    keyNote: 'Monitora l’apertura e chiusura dell’angolo di hip-hinge sul giunto dell’anca.',
  },
  {
    id: 'panca_piana',
    label: 'Panca piana',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Discesa bilanciere)',
    eccentricAngleRange: '~165°–175° → ~75°–95°',
    eccentricDesc: 'Il gomito si flette mentre il bilanciere scende controllato verso il petto.',
    concentricTitle: 'Concentrica (Spinta in alto)',
    concentricAngleRange: '~75°–95° → ~170°',
    concentricDesc: 'Il gomito si estende riportando il bilanciere sopra la linea delle spalle.',
    keyNote: 'L’angolo al gomito misura la chiusura e l’estensione dell’arto superiore durante la spinta.',
  },
  {
    id: 'alzate_laterali',
    label: 'Alzate laterali',
    family: 'shoulder_abduction',
    jointVertex: 'Spalla (SX 11 / DX 12)',
    tripletLabel: 'Anca – Spalla – Gomito',
    landmarksText: 'SX: 23–11–13 · DX: 24–12–14',
    eccentricTitle: 'Eccentrica (Discesa manubri)',
    eccentricAngleRange: '~90° → ~15°–45°',
    eccentricDesc: 'L’angolo tra busto e braccio si chiude mentre i manubri tornano verso i fianchi.',
    concentricTitle: 'Concentrica (Abduzione laterale)',
    concentricAngleRange: '~15°–45° → ~85°–100°',
    concentricDesc: 'L’angolo alla spalla si apre sollevando i gomiti verso l’orizzontale.',
    keyNote: 'A differenza degli esercizi di spinta/trazione sul gomito, qui l’angolo di lavoro è centrato sulla spalla.',
  },
  {
    id: 'affondi',
    label: 'Affondi',
    family: 'knee_flex_ext',
    jointVertex: 'Ginocchio più flesso (SX 25 / DX 26)',
    tripletLabel: 'Anca – Ginocchio – Caviglia',
    landmarksText: 'SX: 23–25–27 · DX: 24–26–28',
    eccentricTitle: 'Eccentrica (Affondo in basso)',
    eccentricAngleRange: '~175° → ~85°–100°',
    eccentricDesc: 'Il ginocchio si flette mentre il baricentro scende nell’affondo.',
    concentricTitle: 'Concentrica (Ritorno in piedi)',
    concentricAngleRange: '~85°–100° → ~175°',
    concentricDesc: 'L’angolo al ginocchio si estende per riportare l’atleta alla posizione iniziale.',
    keyNote: 'Rileva la flessione del ginocchio più impegnato lungo la discesa e la risalita.',
  },
  {
    id: 'bulgarian_squat',
    label: 'Bulgarian squat',
    family: 'knee_flex_ext',
    jointVertex: 'Ginocchio più flesso (SX 25 / DX 26)',
    tripletLabel: 'Anca – Ginocchio – Caviglia',
    landmarksText: 'SX: 23–25–27 · DX: 24–26–28',
    eccentricTitle: 'Eccentrica (Discesa controllata)',
    eccentricAngleRange: '~170° → ~85°–105°',
    eccentricDesc: 'Chiusura progressiva dell’angolo al ginocchio durante la discesa monopodalica.',
    concentricTitle: 'Concentrica (Spinta di risalita)',
    concentricAngleRange: '~85°–105° → ~170°',
    concentricDesc: 'Estensione del ginocchio fino al riallineamento verticale.',
    keyNote: 'Utile per osservare profondità di discesa e continuità angolare nella fase di spinta.',
  },
  {
    id: 'push_up',
    label: 'Push-up',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Discesa verso il suolo)',
    eccentricAngleRange: '~175° → ~75°–95°',
    eccentricDesc: 'I gomiti si flettono mentre il corpo scende compatto verso il pavimento.',
    concentricTitle: 'Concentrica (Spinta di ritorno)',
    concentricAngleRange: '~75°–95° → ~175°',
    concentricDesc: 'Estensione completa dei gomiti per tornare in plank alto.',
    keyNote: 'L’angolo spalla–gomito–polso evidenzia l’ampiezza della flesso-estensione del gomito.',
  },
  {
    id: 'military_press',
    label: 'Military press',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Riporto alle clavicole)',
    eccentricAngleRange: '~175° → ~75°–95°',
    eccentricDesc: 'Il gomito si chiude mentre il bilanciere scende verso la posizione di rack.',
    concentricTitle: 'Concentrica (Spinta overhead)',
    concentricAngleRange: '~75°–95° → ~175°',
    concentricDesc: 'Il gomito si estende portando il bilanciere sopra la testa.',
    keyNote: 'Misura l’escursione angolare del gomito tra rack frontale e distensione sopra il capo.',
  },
  {
    id: 'curl_bicipiti',
    label: 'Curl bicipiti',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Estensione controllata)',
    eccentricAngleRange: '~45°–65° → ~165°–175°',
    eccentricDesc: 'L’avambraccio scende e l’angolo al gomito si apre gradualmente senza strappi.',
    concentricTitle: 'Concentrica (Flessione del gomito)',
    concentricAngleRange: '~165°–175° → ~45°–65°',
    concentricDesc: 'L’angolo al gomito si chiude portando il carico verso la spalla.',
    keyNote: 'Evidenzia l’arco di flesso-estensione del gomito lungo tutta la ripetizione.',
  },
  {
    id: 'french_press',
    label: 'French press',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Flessione verso fronte/dietro testa)',
    eccentricAngleRange: '~170° → ~65°–85°',
    eccentricDesc: 'L’angolo al gomito si chiude mentre l’avambraccio scende.',
    concentricTitle: 'Concentrica (Distensione tricipiti)',
    concentricAngleRange: '~65°–85° → ~170°',
    concentricDesc: 'L’angolo al gomito si apre estendendo l’avambraccio.',
    keyNote: 'Centrato sull’angolo spalla–gomito–polso per valutare l’escursione dei tricipiti.',
  },
  {
    id: 'rematore_bilanciere',
    label: 'Rematore bilanciere',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Distensione braccia)',
    eccentricAngleRange: '~65°–85° → ~165°–175°',
    eccentricDesc: 'Il bilanciere scende e l’angolo al gomito si apre in allungamento.',
    concentricTitle: 'Concentrica (Trazione al busto)',
    concentricAngleRange: '~165°–175° → ~65°–85°',
    concentricDesc: 'Il gomito si flette tirando il bilanciere verso l’addome/busto.',
    keyNote: 'L’angolo al gomito traccia la fase di tirata concentrica e di rilascio eccentrico.',
  },
  {
    id: 'stacco_rumeno',
    label: 'Stacco rumeno',
    family: 'hip_hinge',
    jointVertex: 'Anca (SX 23 / DX 24)',
    tripletLabel: 'Spalla – Anca – Ginocchio',
    landmarksText: 'SX: 11–23–25 · DX: 12–24–26',
    eccentricTitle: 'Eccentrica (Hip-hinge indietro)',
    eccentricAngleRange: '~175° → ~75°–105°',
    eccentricDesc: 'Il bacino arretra e l’angolo all’anca si chiude mettendo in tensione i femorali.',
    concentricTitle: 'Concentrica (Estensione d’anca)',
    concentricAngleRange: '~75°–105° → ~175°',
    concentricDesc: 'L’angolo all’anca si riapre fino alla stazione eretta.',
    keyNote: 'Misura l’angolo spalla–anca–ginocchio per valutare la cerniera d’anca.',
  },
  {
    id: 'lat_machine',
    label: 'Lat machine',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Risalita barra / allungamento)',
    eccentricAngleRange: '~70°–85° → ~170°',
    eccentricDesc: 'Le braccia si distendono verso l’alto aprendo l’angolo al gomito.',
    concentricTitle: 'Concentrica (Trazione verso il petto)',
    concentricAngleRange: '~170° → ~70°–85°',
    concentricDesc: 'I gomiti si flettono e scendono tirando la sbarra verso il torace.',
    keyNote: 'Rileva la chiusura angolare del gomito durante la trazione verso il basso.',
  },
  {
    id: 'pulley_basso',
    label: 'Pulley basso',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Estensione in avanti)',
    eccentricAngleRange: '~70°–85° → ~165°–175°',
    eccentricDesc: 'Le braccia si distendono in avanti aprendo l’angolo al gomito.',
    concentricTitle: 'Concentrica (Trazione all’addome)',
    concentricAngleRange: '~165°–175° → ~70°–85°',
    concentricDesc: 'I gomiti si flettono portando la maniglia verso il busto.',
    keyNote: 'Traccia l’ampiezza angolare del gomito tra allungamento e contrazione.',
  },
  {
    id: 'leg_extension',
    label: 'Leg extension',
    family: 'knee_flex_ext',
    jointVertex: 'Ginocchio (SX 25 / DX 26)',
    tripletLabel: 'Anca – Ginocchio – Caviglia',
    landmarksText: 'SX: 23–25–27 · DX: 24–26–28',
    eccentricTitle: 'Eccentrica (Ritorno in flessione)',
    eccentricAngleRange: '~170° → ~80°–95°',
    eccentricDesc: 'Il rullo scende e l’angolo al ginocchio si chiude in modo controllato.',
    concentricTitle: 'Concentrica (Estensione gamba)',
    concentricAngleRange: '~80°–95° → ~170°',
    concentricDesc: 'L’angolo al ginocchio si apre estendendo le gambe in avanti.',
    keyNote: 'L’angolo anca–ginocchio–caviglia segue l’apertura e chiusura del ginocchio sulla macchina.',
  },
  {
    id: 'leg_curl',
    label: 'Leg curl',
    family: 'knee_flex_ext',
    jointVertex: 'Ginocchio (SX 25 / DX 26)',
    tripletLabel: 'Anca – Ginocchio – Caviglia',
    landmarksText: 'SX: 23–25–27 · DX: 24–26–28',
    eccentricTitle: 'Eccentrica (Distensione gamba)',
    eccentricAngleRange: '~65°–80° → ~165°–175°',
    eccentricDesc: 'L’angolo al ginocchio si apre mentre la gamba si distende.',
    concentricTitle: 'Concentrica (Flessione del ginocchio)',
    concentricAngleRange: '~165°–175° → ~65°–80°',
    concentricDesc: 'L’angolo al ginocchio si chiude flettendo il tallone verso il gluteo.',
    keyNote: 'Misura la variazione angolare al ginocchio tra estensione e flessione.',
  },
  {
    id: 'chest_press',
    label: 'Chest press',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Rientro maniglie)',
    eccentricAngleRange: '~165°–175° → ~75°–90°',
    eccentricDesc: 'I gomiti si flettono accompagnando il rientro controllato delle leve.',
    concentricTitle: 'Concentrica (Spinta in avanti)',
    concentricAngleRange: '~75°–90° → ~165°–175°',
    concentricDesc: 'I gomiti si estendono spingendo le maniglie in avanti.',
    keyNote: 'L’angolo spalla–gomito–polso evidenzia la flesso-estensione dei gomiti sulla macchina.',
  },
  {
    id: 'shoulder_press',
    label: 'Shoulder press',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Discesa maniglie)',
    eccentricAngleRange: '~170° → ~75°–95°',
    eccentricDesc: 'I gomiti si flettono mentre il carico scende verso l’altezza delle spalle.',
    concentricTitle: 'Concentrica (Distensione in alto)',
    concentricAngleRange: '~75°–95° → ~170°',
    concentricDesc: 'I gomiti si estendono spingendo le leve verso l’alto.',
    keyNote: 'Analizza l’angolo del gomito durante la spinta verticale e il ritorno.',
  },
  {
    id: 'pushdown_cavi',
    label: 'Pushdown cavi',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Risalita / flessione gomito)',
    eccentricAngleRange: '~170° → ~70°–85°',
    eccentricDesc: 'L’angolo al gomito si chiude mentre il cavo risale in modo controllato.',
    concentricTitle: 'Concentrica (Spinta in basso)',
    concentricAngleRange: '~70°–85° → ~170°',
    concentricDesc: 'L’angolo al gomito si apre estendendo l’avambraccio verso il basso.',
    keyNote: 'Centrato sull’angolo al gomito per verificare l’escursione in estensione.',
  },
  {
    id: 'trazioni_sbarra',
    label: 'Trazioni sbarra',
    family: 'elbow_flex_ext',
    jointVertex: 'Gomito (SX 13 / DX 14)',
    tripletLabel: 'Spalla – Gomito – Polso',
    landmarksText: 'SX: 11–13–15 · DX: 12–14–16',
    eccentricTitle: 'Eccentrica (Discesa controllata)',
    eccentricAngleRange: '~65°–85° → ~170°',
    eccentricDesc: 'Il corpo scende e l’angolo al gomito si apre fino alla distensione.',
    concentricTitle: 'Concentrica (Trazione verso la sbarra)',
    concentricAngleRange: '~170° → ~65°–85°',
    concentricDesc: 'I gomiti si flettono portando il mento/petto verso la sbarra.',
    keyNote: 'Traccia la chiusura angolare del gomito durante la salita e l’apertura in discesa.',
  },
];

interface StickPoseProps {
  family: AngleFamily;
  phase: 'eccentric' | 'concentric';
  exerciseId: GuideExerciseId;
}

function HumanStickPhaseSvg({ family, phase, exerciseId }: StickPoseProps) {
  const isEcc = phase === 'eccentric';
  const accentColor = isEcc ? '#38bdf8' : '#22c55e';
  const sectorFill = isEcc ? 'rgba(56, 189, 248, 0.34)' : 'rgba(34, 197, 94, 0.34)';
  const sectorStroke = isEcc ? '#38bdf8' : '#22c55e';

  // Sagoma Human Stick + settore circolare pieno (stile Pac-Man) sull'articolazione di lavoro
  if (family === 'knee_flex_ext') {
    const isLegCurl = exerciseId === 'leg_curl';
    const isLegExt = exerciseId === 'leg_extension';

    if (isLegExt) {
      // Seduto su macchina leg extension: coscia quasi orizzontale, tibia che sale/scende
      const shinEndX = isEcc ? 132 : 164;
      const shinEndY = isEcc ? 168 : 114;
      const sectorPath = isEcc
        ? 'M 122 132 L 88 134 A 34 34 0 0 1 130 165 Z'
        : 'M 122 132 L 88 134 A 34 34 0 0 1 154 120 Z';
      const degText = isEcc ? '~90°' : '~165°';

      return (
        <svg viewBox="0 0 210 190" style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Sedile macchina */}
          <line x1="56" y1="134" x2="124" y2="134" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
          <line x1="72" y1="134" x2="72" y2="174" stroke="#475569" strokeWidth="3" />
          {/* Settore angolo ginocchio */}
          <path d={sectorPath} fill={sectorFill} stroke={sectorStroke} strokeWidth="2" />
          <text x="142" y="148" fill={sectorStroke} fontSize="10" fontWeight="800">{degText}</text>
          {/* Busto, testa, braccia */}
          <circle cx="82" cy="54" r="9" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="82" y1="63" x2="84" y2="82" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
          <line x1="84" y1="82" x2="88" y2="130" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="84" y1="82" x2="108" y2="102" stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" />
          {/* Coscia e tibia */}
          <line x1="88" y1="130" x2="122" y2="132" stroke="#38bdf8" strokeWidth="3.8" strokeLinecap="round" />
          <line x1="122" y1="132" x2={shinEndX} y2={shinEndY} stroke={accentColor} strokeWidth="3.8" strokeLinecap="round" />
          {/* Giunti */}
          <circle cx="88" cy="130" r="3.5" fill="#f43f5e" />
          <circle cx="122" cy="132" r="4.2" fill={sectorStroke} />
          <circle cx={shinEndX} cy={shinEndY} r="3.5" fill="#f43f5e" />
        </svg>
      );
    }

    if (isLegCurl) {
      const footX = isEcc ? 168 : 112;
      const footY = isEcc ? 132 : 92;
      const sectorPath = isEcc
        ? 'M 122 126 L 86 122 A 36 36 0 0 1 158 131 Z'
        : 'M 122 126 L 86 122 A 36 36 0 0 1 114 96 Z';
      const degText = isEcc ? '~165°' : '~75°';

      return (
        <svg viewBox="0 0 210 190" style={{ width: '100%', height: 'auto', display: 'block' }}>
          <line x1="52" y1="126" x2="132" y2="126" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
          <path d={sectorPath} fill={sectorFill} stroke={sectorStroke} strokeWidth="2" />
          <text x="145" y="102" fill={sectorStroke} fontSize="10" fontWeight="800">{degText}</text>
          <circle cx="62" cy="108" r="9" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="71" y1="112" x2="88" y2="120" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="88" y1="120" x2="122" y2="126" stroke="#38bdf8" strokeWidth="3.8" strokeLinecap="round" />
          <line x1="122" y1="126" x2={footX} y2={footY} stroke={accentColor} strokeWidth="3.8" strokeLinecap="round" />
          <circle cx="88" cy="120" r="3.5" fill="#f43f5e" />
          <circle cx="122" cy="126" r="4.2" fill={sectorStroke} />
          <circle cx={footX} cy={footY} r="3.5" fill="#f43f5e" />
        </svg>
      );
    }

    // Squat / Affondi / Bulgarian Squat: sagoma laterale con ginocchio come vertice
    const hipX = isEcc ? 86 : 104;
    const hipY = isEcc ? 114 : 96;
    const kneeX = isEcc ? 124 : 114;
    const kneeY = isEcc ? 122 : 132;
    const ankleX = isEcc ? 114 : 112;
    const ankleY = 172;
    const shX = isEcc ? 102 : 106;
    const shY = isEcc ? 76 : 58;
    const headX = isEcc ? 96 : 104;
    const headY = isEcc ? 58 : 40;

    const sectorPath = isEcc
      ? 'M 124 122 L 96 116 A 28 28 0 0 1 118 149 Z'
      : 'M 114 132 L 106 104 A 28 28 0 0 1 113 160 Z';

    return (
      <svg viewBox="0 0 210 190" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1="40" y1="174" x2="170" y2="174" stroke="#334155" strokeWidth="2" />
        <path d={sectorPath} fill={sectorFill} stroke={sectorStroke} strokeWidth="2" />
        <text x="134" y="128" fill={sectorStroke} fontSize="10" fontWeight="800">
          {isEcc ? '~90°' : '~170°'}
        </text>
        <circle cx={headX} cy={headY} r="9" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
        <line x1={headX} y1={headY + 9} x2={shX} y2={shY} stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        <line x1={shX} y1={shY} x2={hipX} y2={hipY} stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
        <line x1={shX} y1={shY} x2={shX + 18} y2={shY + 14} stroke="#38bdf8" strokeWidth="2.8" strokeLinecap="round" />
        <line x1={hipX} y1={hipY} x2={kneeX} y2={kneeY} stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
        <line x1={kneeX} y1={kneeY} x2={ankleX} y2={ankleY} stroke={accentColor} strokeWidth="4" strokeLinecap="round" />
        <line x1={ankleX} y1={ankleY} x2={ankleX + 18} y2={ankleY} stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={shX} cy={shY} r="3.2" fill="#f43f5e" />
        <circle cx={hipX} cy={hipY} r="3.8" fill="#f43f5e" />
        <circle cx={kneeX} cy={kneeY} r="4.5" fill={sectorStroke} />
        <circle cx={ankleX} cy={ankleY} r="3.5" fill="#f43f5e" />
      </svg>
    );
  }

  if (family === 'hip_hinge') {
    // Stacco / Stacco rumeno: vertice sull'anca (spalla - anca - ginocchio)
    const hipX = isEcc ? 92 : 108;
    const hipY = isEcc ? 104 : 102;
    const kneeX = isEcc ? 116 : 112;
    const kneeY = isEcc ? 138 : 138;
    const ankleX = 114;
    const ankleY = 172;
    const shX = isEcc ? 146 : 108;
    const shY = isEcc ? 112 : 58;
    const headX = isEcc ? 162 : 108;
    const headY = isEcc ? 104 : 40;

    const sectorPath = isEcc
      ? 'M 92 104 L 124 109 A 32 32 0 0 1 106 133 Z'
      : 'M 108 102 L 108 70 A 32 32 0 0 1 111 134 Z';

    return (
      <svg viewBox="0 0 210 190" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1="40" y1="174" x2="170" y2="174" stroke="#334155" strokeWidth="2" />
        <path d={sectorPath} fill={sectorFill} stroke={sectorStroke} strokeWidth="2" />
        <text x="126" y="88" fill={sectorStroke} fontSize="10" fontWeight="800">
          {isEcc ? '~85°' : '~175°'}
        </text>
        <circle cx={headX} cy={headY} r="9" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
        <line x1={shX} y1={shY} x2={hipX} y2={hipY} stroke="#38bdf8" strokeWidth="3.8" strokeLinecap="round" />
        <line x1={shX} y1={shY} x2={shX + 4} y2={shY + 34} stroke={accentColor} strokeWidth="3" strokeLinecap="round" />
        <line x1={hipX} y1={hipY} x2={kneeX} y2={kneeY} stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
        <line x1={kneeX} y1={kneeY} x2={ankleX} y2={ankleY} stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
        <line x1={ankleX} y1={ankleY} x2={ankleX + 16} y2={ankleY} stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={shX} cy={shY} r="3.5" fill="#f43f5e" />
        <circle cx={hipX} cy={hipY} r="4.5" fill={sectorStroke} />
        <circle cx={kneeX} cy={kneeY} r="3.5" fill="#f43f5e" />
      </svg>
    );
  }

  if (family === 'shoulder_abduction') {
    // Alzate laterali: vertice sulla spalla (anca - spalla - gomito)
    const shX = 105;
    const shY = 76;
    const hipX = 105;
    const hipY = 128;
    const elbowX = isEcc ? 124 : 152;
    const elbowY = isEcc ? 114 : 76;
    const wristX = isEcc ? 132 : 172;
    const wristY = isEcc ? 132 : 84;

    const sectorPath = isEcc
      ? 'M 105 76 L 105 106 A 30 30 0 0 0 128 96 Z'
      : 'M 105 76 L 105 106 A 30 30 0 0 0 135 76 Z';

    return (
      <svg viewBox="0 0 210 190" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1="40" y1="174" x2="170" y2="174" stroke="#334155" strokeWidth="2" />
        <path d={sectorPath} fill={sectorFill} stroke={sectorStroke} strokeWidth="2" />
        <text x="132" y="100" fill={sectorStroke} fontSize="10" fontWeight="800">
          {isEcc ? '~35°' : '~90°'}
        </text>
        <circle cx="105" cy="48" r="9" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
        <line x1="105" y1="57" x2={shX} y2={shY} stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        <line x1={shX} y1={shY} x2={hipX} y2={hipY} stroke="#38bdf8" strokeWidth="3.8" strokeLinecap="round" />
        {/* Lato sinistro a riposo */}
        <line x1={shX} y1={shY} x2="82" y2="126" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        {/* Lato destro in abduzione */}
        <line x1={shX} y1={shY} x2={elbowX} y2={elbowY} stroke={accentColor} strokeWidth="3.8" strokeLinecap="round" />
        <line x1={elbowX} y1={elbowY} x2={wristX} y2={wristY} stroke={accentColor} strokeWidth="3.4" strokeLinecap="round" />
        {/* Gambe */}
        <line x1={hipX} y1={hipY} x2="90" y2="174" stroke="#38bdf8" strokeWidth="3.8" strokeLinecap="round" />
        <line x1={hipX} y1={hipY} x2="120" y2="174" stroke="#38bdf8" strokeWidth="3.8" strokeLinecap="round" />
        <circle cx={hipX} cy={hipY} r="3.5" fill="#f43f5e" />
        <circle cx={shX} cy={shY} r="4.5" fill={sectorStroke} />
        <circle cx={elbowX} cy={elbowY} r="3.5" fill="#f43f5e" />
      </svg>
    );
  }

  // elbow_flex_ext: spalla - gomito - polso (vertice sul gomito)
  const shX = 88;
  const shY = 78;
  const elbowX = 114;
  const elbowY = 104;
  const wristX = isEcc ? 148 : 110;
  const wristY = isEcc ? 112 : 66;

  const sectorPath = isEcc
    ? 'M 114 104 L 94 84 A 28 28 0 0 1 142 111 Z'
    : 'M 114 104 L 94 84 A 28 28 0 0 1 111 76 Z';

  return (
    <svg viewBox="0 0 210 190" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <line x1="40" y1="174" x2="170" y2="174" stroke="#334155" strokeWidth="2" />
      <path d={sectorPath} fill={sectorFill} stroke={sectorStroke} strokeWidth="2" />
      <text x="132" y="84" fill={sectorStroke} fontSize="10" fontWeight="800">
        {isEcc ? '~165°' : '~70°'}
      </text>
      <circle cx="84" cy="48" r="9" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
      <line x1="84" y1="57" x2={shX} y2={shY} stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
      <line x1={shX} y1={shY} x2="86" y2="128" stroke="#38bdf8" strokeWidth="3.8" strokeLinecap="round" />
      <line x1={shX} y1={shY} x2={elbowX} y2={elbowY} stroke="#38bdf8" strokeWidth="3.8" strokeLinecap="round" />
      <line x1={elbowX} y1={elbowY} x2={wristX} y2={wristY} stroke={accentColor} strokeWidth="3.8" strokeLinecap="round" />
      <line x1="86" y1="128" x2="76" y2="174" stroke="#38bdf8" strokeWidth="3.8" strokeLinecap="round" />
      <line x1="86" y1="128" x2="104" y2="174" stroke="#38bdf8" strokeWidth="3.8" strokeLinecap="round" />
      <circle cx={shX} cy={shY} r="3.5" fill="#f43f5e" />
      <circle cx={elbowX} cy={elbowY} r="4.5" fill={sectorStroke} />
      <circle cx={wristX} cy={wristY} r="3.5" fill="#f43f5e" />
    </svg>
  );
}

interface ExerciseAnglesGuideViewProps {
  initialExerciseId?: string;
  readOnlySelection?: boolean;
  onSelectExercise?: (exerciseId: GuideExerciseId) => void;
  onClose: (selectedId?: GuideExerciseId) => void;
}

export function ExerciseAnglesGuideView({
  initialExerciseId,
  readOnlySelection = false,
  onSelectExercise,
  onClose,
}: ExerciseAnglesGuideViewProps) {
  const validInitial =
    EXERCISE_ANGLE_GUIDES.find((item) => item.id === initialExerciseId)?.id ?? 'squat';
  const [selectedId, setSelectedId] = useState<GuideExerciseId>(validInitial);

  useEffect(() => {
    const matched = EXERCISE_ANGLE_GUIDES.find((item) => item.id === initialExerciseId);
    if (matched) {
      setSelectedId(matched.id);
    }
  }, [initialExerciseId]);

  const activeItem =
    EXERCISE_ANGLE_GUIDES.find((item) => item.id === selectedId) ?? EXERCISE_ANGLE_GUIDES[0];

  const handleChooseAndReturn = (id: GuideExerciseId) => {
    setSelectedId(id);
    if (!readOnlySelection) {
      onSelectExercise?.(id);
    }
    onClose(readOnlySelection ? undefined : id);
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 107px)',
        background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
        color: '#f8fafc',
        padding: 20,
        paddingBottom: 44,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#38bdf8' }}>
              📐 Angoli di Lavoro per Esercizio
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#94a3b8' }}>
              Confronto Human Stick tra fase eccentrica e concentrica per tutti i {EXERCISE_ANGLE_GUIDES.length} esercizi
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose(undefined)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ← Torna all’analisi
          </button>
        </div>

        {/* Selettore rapido esercizio */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 8,
            marginBottom: 16,
            scrollbarWidth: 'thin',
          }}
        >
          {EXERCISE_ANGLE_GUIDES.map((item) => {
            const isActive = item.id === activeItem.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 20,
                  border: isActive ? '1.5px solid #38bdf8' : '1px solid #334155',
                  background: isActive ? 'rgba(56, 189, 248, 0.18)' : '#0f172a',
                  color: isActive ? '#38bdf8' : '#cbd5e1',
                  fontSize: 12,
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Scheda dettagliata esercizio selezionato */}
        <div
          style={{
            background: '#1e293b',
            borderRadius: 14,
            border: '1px solid #334155',
            padding: 16,
            marginBottom: 22,
            boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.35)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Scheda Angolo di Lavoro
              </span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>
                {activeItem.label}
              </h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(250, 204, 21, 0.14)',
                  border: '1px solid rgba(250, 204, 21, 0.45)',
                  color: '#fde047',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {activeItem.tripletLabel}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Vertice: <strong style={{ color: '#e2e8f0' }}>{activeItem.jointVertex}</strong> · {activeItem.landmarksText}
              </span>
            </div>
          </div>

          {/* Box Eccentrica vs Concentrica con Human Stick */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                background: '#090d16',
                borderRadius: 10,
                border: '1px solid #1e293b',
                padding: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8' }}>
                  {activeItem.eccentricTitle}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#7dd3fc' }}>
                  {activeItem.eccentricAngleRange}
                </span>
              </div>
              <HumanStickPhaseSvg
                family={activeItem.family}
                phase="eccentric"
                exerciseId={activeItem.id}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
                {activeItem.eccentricDesc}
              </p>
            </div>

            <div
              style={{
                background: '#090d16',
                borderRadius: 10,
                border: '1px solid #1e293b',
                padding: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#22c55e' }}>
                  {activeItem.concentricTitle}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#86efac' }}>
                  {activeItem.concentricAngleRange}
                </span>
              </div>
              <HumanStickPhaseSvg
                family={activeItem.family}
                phase="concentric"
                exerciseId={activeItem.id}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>
                {activeItem.concentricDesc}
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: '#0f172a',
              border: '1px solid #334155',
              fontSize: 12,
              color: '#cbd5e1',
              lineHeight: 1.45,
              marginBottom: 12,
            }}
          >
            💡 {activeItem.keyNote}
          </div>

          {!readOnlySelection && (
            <button
              type="button"
              onClick={() => handleChooseAndReturn(activeItem.id)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                border: 'none',
                background: '#38bdf8',
                color: '#0f172a',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Seleziona "{activeItem.label}" e torna all’analisi
            </button>
          )}
        </div>

        {/* Elenco completo compatto di tutti gli esercizi */}
        <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 800, color: '#cbd5e1' }}>
          Tutti gli esercizi ({EXERCISE_ANGLE_GUIDES.length})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {EXERCISE_ANGLE_GUIDES.map((item) => {
            const isSelected = item.id === activeItem.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: isSelected ? '#1e293b' : '#0f172a',
                  border: isSelected ? '1.5px solid #38bdf8' : '1px solid #334155',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Angolo: <strong style={{ color: '#e2e8f0' }}>{item.tripletLabel}</strong> · Ecc. {item.eccentricAngleRange} ↔ Conc. {item.concentricAngleRange}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', flexShrink: 0 }}>
                  Vedi →
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}