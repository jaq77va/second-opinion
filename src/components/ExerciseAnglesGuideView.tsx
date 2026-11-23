import { useEffect, useState } from 'react';

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

type PoseVariant =
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

interface ExerciseAngleSpec {
  id: GuideExerciseId;
  label: string;
  pose: PoseVariant;
  jointName: string;
  landmarksLabel: string;
  eccentricRange: string;
  concentricRange: string;
  eccentricNote: string;
  concentricNote: string;
  cameraTip: string;
}

const EXERCISE_ANGLE_SPECS: ExerciseAngleSpec[] = [
  {
    id: 'squat',
    label: 'Squat',
    pose: 'squat',
    jointName: 'Ginocchio',
    landmarksLabel: 'Anca – Ginocchio – Caviglia (23–25–27 / 24–26–28)',
    eccentricRange: '~175° → ~80°–100°',
    concentricRange: '~80°–100° → ~175°',
    eccentricNote: 'Discesa controllata: il settore al ginocchio si chiude fino alla profondità target.',
    concentricNote: 'Spinta di risalita: il settore si riapre fino all’estensione articolare.',
    cameraTip: 'Profilo laterale o 3/4 a figura intera con anca, ginocchio e caviglia visibili.',
  },
  {
    id: 'stacco',
    label: 'Stacco da terra',
    pose: 'stacco',
    jointName: 'Anca (apertura tronco/coscia)',
    landmarksLabel: 'Spalla – Anca – Ginocchio (11–23–25 / 12–24–26)',
    eccentricRange: '~170° → ~55°–75°',
    concentricRange: '~55°–75° → ~170°',
    eccentricNote: 'Fase eccentrica / impostazione in buca: flessione dell’anca con schiena neutra.',
    concentricNote: 'Chiusura dell’alzata: estensione completa dell’anca fino alla verticale.',
    cameraTip: 'Ripresa laterale all’altezza del bacino senza ostacoli davanti al bilanciere.',
  },
  {
    id: 'panca_piana',
    label: 'Panca piana',
    pose: 'panca_piana',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~165° → ~75°–95°',
    concentricRange: '~75°–95° → ~165°',
    eccentricNote: 'Discesa del bilanciere al petto: il gomito flette progressivamente.',
    concentricNote: 'Spinta verso l’alto: distensione del gomito verso il lockout.',
    cameraTip: 'Laterale o obliqua a 45° su panca con spalla, gomito e polso in campo.',
  },
  {
    id: 'alzate_laterali',
    label: 'Alzate laterali',
    pose: 'alzate_laterali',
    jointName: 'Spalla (abduzione sul piano frontale)',
    landmarksLabel: 'Anca – Spalla – Gomito (23–11–13 / 24–12–14)',
    eccentricRange: '~85°–95° → ~15°–35°',
    concentricRange: '~15°–35° → ~85°–95°',
    eccentricNote: 'Ritorno controllato verso il busto: l’angolo di abduzione si riduce senza crolli.',
    concentricNote: 'Sollevamento laterale dei manubri: l’angolo spalla-gomito sale fino all’apice.',
    cameraTip: 'Frontale dal bacino in su, con entrambe le braccia e manubri ben visibili.',
  },
  {
    id: 'affondi',
    label: 'Affondi',
    pose: 'affondi',
    jointName: 'Ginocchio (gamba anteriore)',
    landmarksLabel: 'Anca – Ginocchio – Caviglia (23–25–27 / 24–26–28)',
    eccentricRange: '~170° → ~85°–105°',
    concentricRange: '~85°–105° → ~170°',
    eccentricNote: 'Affondo verso il basso: il ginocchio anteriore si chiude mantenendo stabilità.',
    concentricNote: 'Spinta di ritorno: estensione del ginocchio fino alla stazione eretta.',
    cameraTip: 'Inquadratura laterale a figura intera per leggere bene la traiettoria del ginocchio.',
  },
  {
    id: 'bulgarian_squat',
    label: 'Bulgarian squat',
    pose: 'bulgarian_squat',
    jointName: 'Ginocchio (gamba anteriore)',
    landmarksLabel: 'Anca – Ginocchio – Caviglia (23–25–27 / 24–26–28)',
    eccentricRange: '~165° → ~80°–100°',
    concentricRange: '~80°–100° → ~165°',
    eccentricNote: 'Discesa monopodalica: chiusura controllata del ginocchio anteriore.',
    concentricNote: 'Risalita dal punto basso: distensione della gamba anteriore.',
    cameraTip: 'Laterale a figura intera includendo sia il supporto posteriore sia la gamba anteriore.',
  },
  {
    id: 'push_up',
    label: 'Push-up',
    pose: 'push_up',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~170° → ~75°–95°',
    concentricRange: '~75°–95° → ~170°',
    eccentricNote: 'Discesa del corpo in plank: flessione dei gomiti con tronco allineato.',
    concentricNote: 'Spinta dal pavimento: estensione completa dei gomiti.',
    cameraTip: 'Ripresa laterale bassa a figura intera per controllare allineamento e profondità.',
  },
  {
    id: 'military_press',
    label: 'Military press',
    pose: 'military_press',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~170° → ~75°–95°',
    concentricRange: '~75°–95° → ~170°',
    eccentricNote: 'Abbassamento controllato del bilanciere verso le clavicole: chiusura del gomito.',
    concentricNote: 'Spinta verticale sopra la testa: estensione dei gomiti senza iperestendere il busto.',
    cameraTip: 'Frontale o 3/4 a 45° con busto, spalle, gomiti e polsi sempre inquadrati.',
  },
  {
    id: 'curl_bicipiti',
    label: 'Curl bicipiti',
    pose: 'curl_bicipiti',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~40°–60° → ~155°–170°',
    concentricRange: '~155°–170° → ~40°–60°',
    eccentricNote: 'Discesa del carico: il gomito si apre gradualmente (fase eccentrica).',
    concentricNote: 'Flessione del gomito: chiusura dell’angolo verso il picco di contrazione.',
    cameraTip: 'Profilo laterale o 3/4 con spalla e gomito fermi lungo il fianco.',
  },
  {
    id: 'french_press',
    label: 'French press',
    pose: 'french_press',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~165° → ~65°–85°',
    concentricRange: '~65°–85° → ~165°',
    eccentricNote: 'Abbassamento verso fronte/capo: flessione mirata del gomito.',
    concentricNote: 'Distensione verso l’alto: riapertura completa dell’angolo al gomito.',
    cameraTip: 'Inquadratura laterale su panca tenendo il braccio superiore ben visibile.',
  },
  {
    id: 'rematore_bilanciere',
    label: 'Rematore bilanciere',
    pose: 'rematore_bilanciere',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~65°–85° → ~155°–170°',
    concentricRange: '~155°–170° → ~65°–85°',
    eccentricNote: 'Ritorno del bilanciere: il gomito si distende mantenendo l’inclinazione del busto.',
    concentricNote: 'Trazione verso l’addome: chiusura dell’angolo al gomito.',
    cameraTip: 'Ripresa laterale a figura intera con busto inclinato e gomito libero da ostacoli.',
  },
  {
    id: 'stacco_rumeno',
    label: 'Stacco rumeno',
    pose: 'stacco_rumeno',
    jointName: 'Anca (hip hinge)',
    landmarksLabel: 'Spalla – Anca – Ginocchio (11–23–25 / 12–24–26)',
    eccentricRange: '~175° → ~75°–95°',
    concentricRange: '~75°–95° → ~175°',
    eccentricNote: 'Portata del bacino indietro: chiusura dell’angolo all’anca con ginocchio lievemente sbloccato.',
    concentricNote: 'Estensione dell’anca: ritorno alla verticale senza inarcare eccessivamente.',
    cameraTip: 'Profilo laterale a figura intera con spalla, anca e ginocchio ben leggibili.',
  },
  {
    id: 'lat_machine',
    label: 'Lat machine',
    pose: 'lat_machine',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~65°–85° → ~165°–175°',
    concentricRange: '~165°–175° → ~65°–85°',
    eccentricNote: 'Risalita della sbarra: il gomito si riapre fino all’allungamento del dorsale.',
    concentricNote: 'Trazione verso il petto: l’angolo al gomito si chiude.',
    cameraTip: 'Inquadratura posteriore o laterale con braccia e sbarra completamente visibili.',
  },
  {
    id: 'pulley_basso',
    label: 'Pulley basso',
    pose: 'pulley_basso',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~65°–85° → ~160°–175°',
    concentricRange: '~160°–175° → ~65°–85°',
    eccentricNote: 'Ritorno in allungamento: estensione del gomito con busto stabile.',
    concentricNote: 'Trazione verso il tronco: chiusura dell’angolo al gomito.',
    cameraTip: 'Laterale da seduto con busto, spalla, gomito e impugnatura in campo.',
  },
  {
    id: 'leg_extension',
    label: 'Leg extension',
    pose: 'leg_extension',
    jointName: 'Ginocchio',
    landmarksLabel: 'Anca – Ginocchio – Caviglia (23–25–27 / 24–26–28)',
    eccentricRange: '~165°–175° → ~80°–100°',
    concentricRange: '~80°–100° → ~165°–175°',
    eccentricNote: 'Ritorno del rullo in basso: chiusura controllata dell’angolo al ginocchio.',
    concentricNote: 'Spinta in alto: apertura/estensione del ginocchio.',
    cameraTip: 'Laterale sulla macchina con asse del ginocchio allineato al perno.',
  },
  {
    id: 'leg_curl',
    label: 'Leg curl',
    pose: 'leg_curl',
    jointName: 'Ginocchio',
    landmarksLabel: 'Anca – Ginocchio – Caviglia (23–25–27 / 24–26–28)',
    eccentricRange: '~65°–85° → ~160°–175°',
    concentricRange: '~160°–175° → ~65°–85°',
    eccentricNote: 'Distensione della gamba: l’angolo al ginocchio si riapre con controllo.',
    concentricNote: 'Flessione del tallone verso il gluteo: chiusura dell’angolo al ginocchio.',
    cameraTip: 'Laterale sulla macchina con anca, ginocchio e caviglia ben visibili.',
  },
  {
    id: 'chest_press',
    label: 'Chest press',
    pose: 'chest_press',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~165° → ~75°–95°',
    concentricRange: '~75°–95° → ~165°',
    eccentricNote: 'Ritorno delle maniglie verso il petto: flessione controllata del gomito.',
    concentricNote: 'Spinta in avanti: distensione del gomito.',
    cameraTip: 'Frontale o obliqua a 45° con busto appoggiato allo schienale e gomiti visibili.',
  },
  {
    id: 'shoulder_press',
    label: 'Shoulder press',
    pose: 'shoulder_press',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~165° → ~75°–95°',
    concentricRange: '~75°–95° → ~165°',
    eccentricNote: 'Discesa delle impugnature verso le spalle: chiusura del gomito.',
    concentricNote: 'Spinta verticale: apertura/estensione del gomito.',
    cameraTip: 'Frontale o 3/4 a 45° con spalle e gomiti liberi da ostruzioni.',
  },
  {
    id: 'pushdown_cavi',
    label: 'Pushdown cavi',
    pose: 'pushdown_cavi',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~165°–175° → ~75°–95°',
    concentricRange: '~75°–95° → ~165°–175°',
    eccentricNote: 'Risalita del cavo: flessione del gomito senza avanzare troppo con le spalle.',
    concentricNote: 'Spinta verso il basso: distensione del gomito.',
    cameraTip: 'Laterale o 3/4 con gomito fermo e traiettoria del cavo visibile.',
  },
  {
    id: 'trazioni_sbarra',
    label: 'Trazioni sbarra',
    pose: 'trazioni_sbarra',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~65°–85° → ~165°–175°',
    concentricRange: '~165°–175° → ~65°–85°',
    eccentricNote: 'Discesa verso la sospensione: il gomito si riapre con controllo.',
    concentricNote: 'Risalita verso la sbarra: chiusura dell’angolo al gomito.',
    cameraTip: 'Frontale o 3/4 a figura intera includendo la sbarra e l’intera escursione.',
  },
];

interface Pt {
  x: number;
  y: number;
}

function polarPt(cx: number, cy: number, r: number, deg: number): Pt {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function sectorPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const p1 = polarPt(cx, cy, r, startDeg);
  const p2 = polarPt(cx, cy, r, endDeg);
  let delta = endDeg - startDeg;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  const sweepFlag = delta >= 0 ? 1 : 0;
  const largeArcFlag = Math.abs(delta) > 180 ? 1 : 0;
  return `M ${cx.toFixed(1)} ${cy.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} Z`;
}

function SegmentLine({ a, b, width = 3.2, color = '#38bdf8' }: { a: Pt; b: Pt; width?: number; color?: string }) {
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

function JointDot({ p, r = 3.6, color = '#f43f5e' }: { p: Pt; r?: number; color?: string }) {
  return <circle cx={p.x} cy={p.y} r={r} fill={color} />;
}

function HumanStickAngleSvg({
  pose,
  phase,
}: {
  pose: PoseVariant;
  phase: 'eccentric' | 'concentric';
}) {
  const isEcc = phase === 'eccentric';
  const sectorFill = isEcc ? 'rgba(250, 204, 21, 0.34)' : 'rgba(56, 189, 248, 0.34)';
  const sectorStroke = isEcc ? '#facc15' : '#38bdf8';
  const angleText = isEcc ? 'ECC' : 'CONC';

  let head: Pt = { x: 80, y: 20 };
  let neck: Pt = { x: 80, y: 31 };
  let sh: Pt = { x: 80, y: 36 };
  let hip: Pt = { x: 80, y: 66 };
  let knee: Pt = { x: 80, y: 90 };
  let ankle: Pt = { x: 80, y: 114 };
  let backKnee: Pt | null = null;
  let backAnkle: Pt | null = null;
  let elbow: Pt = { x: 94, y: 52 };
  let wrist: Pt = { x: 96, y: 68 };
  let propEl: React.ReactNode = null;

  let apex: Pt = elbow;
  let startDeg = 18;
  let endDeg = 88;
  let rSector = 15;
  let labelDeg = 53;

  switch (pose) {
    case 'squat': {
      if (isEcc) {
        head = { x: 74, y: 34 };
        neck = { x: 76, y: 44 };
        sh = { x: 77, y: 48 };
        hip = { x: 64, y: 74 };
        knee = { x: 92, y: 82 };
        ankle = { x: 84, y: 114 };
        elbow = { x: 85, y: 60 };
        wrist = { x: 98, y: 62 };
        apex = knee;
        startDeg = -152;
        endDeg = -76;
        rSector = 16;
        labelDeg = -114;
        propEl = <line x1={74} y1={52} x2={98} y2={52} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />;
      } else {
        head = { x: 80, y: 18 };
        neck = { x: 80, y: 29 };
        sh = { x: 80, y: 34 };
        hip = { x: 80, y: 65 };
        knee = { x: 82, y: 90 };
        ankle = { x: 82, y: 114 };
        elbow = { x: 84, y: 50 };
        wrist = { x: 88, y: 64 };
        apex = knee;
        startDeg = -92;
        endDeg = -22;
        rSector = 15;
        labelDeg = -57;
        propEl = <line x1={68} y1={38} x2={94} y2={38} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />;
      }
      break;
    }

    case 'stacco': {
      if (isEcc) {
        head = { x: 96, y: 44 };
        neck = { x: 90, y: 52 };
        sh = { x: 88, y: 56 };
        hip = { x: 64, y: 74 };
        knee = { x: 84, y: 92 };
        ankle = { x: 78, y: 114 };
        elbow = { x: 86, y: 76 };
        wrist = { x: 86, y: 96 };
        apex = hip;
        startDeg = -32;
        endDeg = 32;
        rSector = 15;
        labelDeg = 0;
        propEl = <line x1={72} y1={98} x2={102} y2={98} stroke="#94a3b8" strokeWidth={2.6} strokeLinecap="round" />;
      } else {
        head = { x: 80, y: 18 };
        neck = { x: 80, y: 29 };
        sh = { x: 80, y: 34 };
        hip = { x: 80, y: 65 };
        knee = { x: 81, y: 90 };
        ankle = { x: 81, y: 114 };
        elbow = { x: 82, y: 52 };
        wrist = { x: 82, y: 72 };
        apex = hip;
        startDeg = -90;
        endDeg = -15;
        rSector = 14;
        labelDeg = -52;
        propEl = <line x1={68} y1={73} x2={96} y2={73} stroke="#94a3b8" strokeWidth={2.6} strokeLinecap="round" />;
      }
      break;
    }

    case 'stacco_rumeno': {
      if (isEcc) {
        head = { x: 102, y: 48 };
        neck = { x: 94, y: 54 };
        sh = { x: 91, y: 58 };
        hip = { x: 64, y: 66 };
        knee = { x: 74, y: 90 };
        ankle = { x: 74, y: 114 };
        elbow = { x: 88, y: 76 };
        wrist = { x: 86, y: 94 };
        apex = hip;
        startDeg = -18;
        endDeg = 66;
        rSector = 15;
        labelDeg = 24;
        propEl = <line x1={74} y1={95} x2={100} y2={95} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />;
      } else {
        head = { x: 80, y: 18 };
        neck = { x: 80, y: 29 };
        sh = { x: 80, y: 34 };
        hip = { x: 80, y: 65 };
        knee = { x: 81, y: 90 };
        ankle = { x: 81, y: 114 };
        elbow = { x: 82, y: 52 };
        wrist = { x: 82, y: 72 };
        apex = hip;
        startDeg = -90;
        endDeg = -15;
        rSector = 14;
        labelDeg = -52;
        propEl = <line x1={68} y1={73} x2={96} y2={73} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />;
      }
      break;
    }

    case 'panca_piana': {
      propEl = (
        <g>
          <rect x={26} y={76} width={108} height={7} rx={3} fill="#334155" />
          <line x1={116} y1={42} x2={116} y2={76} stroke="#475569" strokeWidth={2.5} />
        </g>
      );
      head = { x: 38, y: 67 };
      neck = { x: 48, y: 71 };
      sh = { x: 54, y: 72 };
      hip = { x: 96, y: 72 };
      knee = { x: 118, y: 88 };
      ankle = { x: 122, y: 112 };
      if (isEcc) {
        elbow = { x: 50, y: 54 };
        wrist = { x: 68, y: 58 };
        apex = elbow;
        startDeg = -12;
        endDeg = 76;
        rSector = 13;
        labelDeg = 32;
      } else {
        elbow = { x: 56, y: 47 };
        wrist = { x: 60, y: 26 };
        apex = elbow;
        startDeg = -84;
        endDeg = 14;
        rSector = 13;
        labelDeg = -35;
      }
      break;
    }

    case 'french_press': {
      propEl = <rect x={26} y={76} width={108} height={7} rx={3} fill="#334155" />;
      head = { x: 38, y: 67 };
      neck = { x: 48, y: 71 };
      sh = { x: 54, y: 72 };
      hip = { x: 96, y: 72 };
      knee = { x: 118, y: 88 };
      ankle = { x: 122, y: 112 };
      if (isEcc) {
        elbow = { x: 64, y: 46 };
        wrist = { x: 44, y: 52 };
        apex = elbow;
        startDeg = 18;
        endDeg = 166;
        rSector = 13;
        labelDeg = 92;
      } else {
        elbow = { x: 64, y: 48 };
        wrist = { x: 68, y: 24 };
        apex = elbow;
        startDeg = -82;
        endDeg = 18;
        rSector = 13;
        labelDeg = -32;
      }
      break;
    }

    case 'alzate_laterali': {
      head = { x: 80, y: 20 };
      neck = { x: 80, y: 31 };
      sh = { x: 80, y: 36 };
      hip = { x: 80, y: 68 };
      knee = { x: 74, y: 92 };
      ankle = { x: 72, y: 114 };
      backKnee = { x: 86, y: 92 };
      backAnkle = { x: 88, y: 114 };
      if (isEcc) {
        elbow = { x: 93, y: 52 };
        wrist = { x: 95, y: 66 };
        apex = sh;
        startDeg = 22;
        endDeg = 90;
        rSector = 14;
        labelDeg = 56;
      } else {
        elbow = { x: 108, y: 36 };
        wrist = { x: 124, y: 36 };
        apex = sh;
        startDeg = 0;
        endDeg = 90;
        rSector = 15;
        labelDeg = 45;
      }
      propEl = <circle cx={wrist.x} cy={wrist.y + 2} r={3.2} fill="#cbd5e1" />;
      break;
    }

    case 'affondi': {
      head = { x: 78, y: 24 };
      neck = { x: 78, y: 34 };
      sh = { x: 78, y: 39 };
      hip = { x: 76, y: 68 };
      backKnee = { x: 52, y: 94 };
      backAnkle = { x: 42, y: 114 };
      elbow = { x: 82, y: 54 };
      wrist = { x: 84, y: 68 };
      if (isEcc) {
        knee = { x: 100, y: 84 };
        ankle = { x: 104, y: 114 };
        apex = knee;
        startDeg = -148;
        endDeg = -84;
        rSector = 14;
        labelDeg = -116;
      } else {
        knee = { x: 92, y: 88 };
        ankle = { x: 96, y: 114 };
        apex = knee;
        startDeg = -115;
        endDeg = -72;
        rSector = 14;
        labelDeg = -93;
      }
      break;
    }

    case 'bulgarian_squat': {
      propEl = <rect x={24} y={84} width={22} height={30} rx={3} fill="#334155" />;
      head = { x: 74, y: 26 };
      neck = { x: 75, y: 36 };
      sh = { x: 76, y: 41 };
      hip = { x: 74, y: 68 };
      backKnee = { x: 54, y: 78 };
      backAnkle = { x: 36, y: 84 };
      elbow = { x: 80, y: 55 };
      wrist = { x: 82, y: 68 };
      if (isEcc) {
        knee = { x: 102, y: 84 };
        ankle = { x: 104, y: 114 };
        apex = knee;
        startDeg = -146;
        endDeg = -86;
        rSector = 14;
        labelDeg = -116;
      } else {
        knee = { x: 92, y: 88 };
        ankle = { x: 96, y: 114 };
        apex = knee;
        startDeg = -114;
        endDeg = -74;
        rSector = 14;
        labelDeg = -94;
      }
      break;
    }

    case 'push_up': {
      propEl = <line x1={22} y1={104} x2={138} y2={104} stroke="#475569" strokeWidth={2.5} />;
      ankle = { x: 32, y: 102 };
      knee = { x: 58, y: 92 };
      hip = { x: 84, y: 82 };
      sh = { x: 112, y: 74 };
      neck = { x: 118, y: 72 };
      head = { x: 128, y: 72 };
      if (isEcc) {
        elbow = { x: 104, y: 90 };
        wrist = { x: 118, y: 102 };
        apex = elbow;
        startDeg = -132;
        endDeg = -46;
        rSector = 13;
        labelDeg = -89;
      } else {
        elbow = { x: 114, y: 89 };
        wrist = { x: 116, y: 102 };
        apex = elbow;
        startDeg = -112;
        endDeg = -76;
        rSector = 13;
        labelDeg = -94;
      }
      break;
    }

    case 'military_press': {
      head = { x: 80, y: 24 };
      neck = { x: 80, y: 34 };
      sh = { x: 80, y: 39 };
      hip = { x: 80, y: 68 };
      knee = { x: 76, y: 92 };
      ankle = { x: 76, y: 114 };
      if (isEcc) {
        elbow = { x: 96, y: 46 };
        wrist = { x: 92, y: 28 };
        apex = elbow;
        startDeg = 18;
        endDeg = 112;
        rSector = 13;
        labelDeg = 65;
        propEl = <line x1={68} y1={34} x2={106} y2={34} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />;
      } else {
        elbow = { x: 92, y: 28 };
        wrist = { x: 92, y: 12 };
        apex = elbow;
        startDeg = 88;
        endDeg = 156;
        rSector = 12;
        labelDeg = 122;
        propEl = <line x1={68} y1={14} x2={106} y2={14} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />;
      }
      break;
    }

    case 'curl_bicipiti': {
      head = { x: 76, y: 20 };
      neck = { x: 77, y: 31 };
      sh = { x: 78, y: 36 };
      hip = { x: 78, y: 68 };
      knee = { x: 78, y: 92 };
      ankle = { x: 78, y: 114 };
      elbow = { x: 80, y: 60 };
      if (isEcc) {
        wrist = { x: 84, y: 82 };
        apex = elbow;
        startDeg = -94;
        endDeg = -64;
        rSector = 14;
        labelDeg = -79;
      } else {
        wrist = { x: 94, y: 42 };
        apex = elbow;
        startDeg = -94;
        endDeg = 28;
        rSector = 14;
        labelDeg = -33;
      }
      propEl = <circle cx={wrist.x + 2} cy={wrist.y} r={3.2} fill="#cbd5e1" />;
      break;
    }

    case 'rematore_bilanciere': {
      head = { x: 102, y: 48 };
      neck = { x: 94, y: 54 };
      sh = { x: 90, y: 58 };
      hip = { x: 64, y: 68 };
      knee = { x: 76, y: 91 };
      ankle = { x: 76, y: 114 };
      if (isEcc) {
        elbow = { x: 88, y: 78 };
        wrist = { x: 88, y: 96 };
        apex = elbow;
        startDeg = -92;
        endDeg = -18;
        rSector = 13;
        labelDeg = -55;
        propEl = <line x1={74} y1={97} x2={102} y2={97} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />;
      } else {
        elbow = { x: 82, y: 64 };
        wrist = { x: 92, y: 54 };
        apex = elbow;
        startDeg = -28;
        endDeg = 46;
        rSector = 13;
        labelDeg = 9;
        propEl = <line x1={80} y1={56} x2={106} y2={56} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />;
      }
      break;
    }

    case 'lat_machine': {
      propEl = (
        <g>
          <line x1={46} y1={12} x2={116} y2={12} stroke="#475569" strokeWidth={3} />
          <rect x={68} y={76} width={22} height={38} rx={3} fill="#334155" />
          <line x1={62} y1={22} x2={98} y2={22} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />
        </g>
      );
      head = { x: 80, y: 34 };
      neck = { x: 80, y: 43 };
      sh = { x: 80, y: 47 };
      hip = { x: 78, y: 75 };
      knee = { x: 96, y: 84 };
      ankle = { x: 96, y: 112 };
      if (isEcc) {
        elbow = { x: 86, y: 34 };
        wrist = { x: 82, y: 22 };
        apex = elbow;
        startDeg = 22;
        endDeg = 128;
        rSector = 13;
        labelDeg = 75;
      } else {
        elbow = { x: 96, y: 56 };
        wrist = { x: 84, y: 42 };
        apex = elbow;
        startDeg = -132;
        endDeg = -46;
        rSector = 13;
        labelDeg = -89;
      }
      break;
    }

    case 'pulley_basso': {
      propEl = (
        <g>
          <rect x={64} y={76} width={22} height={38} rx={3} fill="#334155" />
          <line x1={126} y1={72} x2={126} y2={112} stroke="#475569" strokeWidth={3} />
        </g>
      );
      head = { x: 78, y: 28 };
      neck = { x: 78, y: 38 };
      sh = { x: 78, y: 42 };
      hip = { x: 76, y: 74 };
      knee = { x: 98, y: 82 };
      ankle = { x: 102, y: 112 };
      if (isEcc) {
        elbow = { x: 96, y: 56 };
        wrist = { x: 114, y: 66 };
        apex = elbow;
        startDeg = -146;
        endDeg = -32;
        rSector = 13;
        labelDeg = -89;
      } else {
        elbow = { x: 74, y: 58 };
        wrist = { x: 90, y: 52 };
        apex = elbow;
        startDeg = -18;
        endDeg = 76;
        rSector = 13;
        labelDeg = 29;
      }
      break;
    }

    case 'leg_extension': {
      propEl = (
        <g>
          <rect x={54} y={66} width={24} height={48} rx={3} fill="#334155" />
          <rect x={68} y={66} width={26} height={8} rx={2} fill="#475569" />
        </g>
      );
      head = { x: 64, y: 26 };
      neck = { x: 66, y: 36 };
      sh = { x: 67, y: 41 };
      hip = { x: 72, y: 66 };
      knee = { x: 92, y: 68 };
      elbow = { x: 74, y: 54 };
      wrist = { x: 80, y: 66 };
      if (isEcc) {
        ankle = { x: 92, y: 98 };
        apex = knee;
        startDeg = -176;
        endDeg = -92;
        rSector = 14;
        labelDeg = -134;
      } else {
        ankle = { x: 124, y: 68 };
        apex = knee;
        startDeg = -176;
        endDeg = 0;
        rSector = 14;
        labelDeg = -88;
      }
      break;
    }

    case 'leg_curl': {
      propEl = <rect x={36} y={66} width={76} height={8} rx={3} fill="#334155" />;
      head = { x: 108, y: 58 };
      neck = { x: 98, y: 62 };
      sh = { x: 94, y: 64 };
      hip = { x: 64, y: 64 };
      knee = { x: 44, y: 64 };
      elbow = { x: 90, y: 74 };
      wrist = { x: 104, y: 74 };
      if (isEcc) {
        ankle = { x: 20, y: 68 };
        apex = knee;
        startDeg = -6;
        endDeg = 166;
        rSector = 13;
        labelDeg = 80;
      } else {
        ankle = { x: 46, y: 88 };
        apex = knee;
        startDeg = -6;
        endDeg = 82;
        rSector = 13;
        labelDeg = 38;
      }
      break;
    }

    case 'chest_press': {
      propEl = (
        <g>
          <rect x={62} y={40} width={8} height={38} rx={2} fill="#334155" />
          <rect x={62} y={74} width={26} height={38} rx={3} fill="#334155" />
        </g>
      );
      head = { x: 78, y: 28 };
      neck = { x: 78, y: 38 };
      sh = { x: 78, y: 42 };
      hip = { x: 76, y: 72 };
      knee = { x: 96, y: 82 };
      ankle = { x: 98, y: 112 };
      if (isEcc) {
        elbow = { x: 74, y: 56 };
        wrist = { x: 92, y: 52 };
        apex = elbow;
        startDeg = -16;
        endDeg = 76;
        rSector = 13;
        labelDeg = 30;
      } else {
        elbow = { x: 96, y: 50 };
        wrist = { x: 114, y: 50 };
        apex = elbow;
        startDeg = -176;
        endDeg = -2;
        rSector = 13;
        labelDeg = -89;
      }
      break;
    }

    case 'shoulder_press': {
      propEl = (
        <g>
          <rect x={62} y={40} width={8} height={38} rx={2} fill="#334155" />
          <rect x={62} y={74} width={26} height={38} rx={3} fill="#334155" />
        </g>
      );
      head = { x: 80, y: 28 };
      neck = { x: 80, y: 38 };
      sh = { x: 80, y: 42 };
      hip = { x: 78, y: 72 };
      knee = { x: 96, y: 82 };
      ankle = { x: 98, y: 112 };
      if (isEcc) {
        elbow = { x: 96, y: 50 };
        wrist = { x: 92, y: 32 };
        apex = elbow;
        startDeg = 18;
        endDeg = 112;
        rSector = 13;
        labelDeg = 65;
      } else {
        elbow = { x: 92, y: 32 };
        wrist = { x: 92, y: 14 };
        apex = elbow;
        startDeg = 88;
        endDeg = 156;
        rSector = 12;
        labelDeg = 122;
      }
      break;
    }

    case 'pushdown_cavi': {
      propEl = <line x1={116} y1={12} x2={116} y2={114} stroke="#475569" strokeWidth={2.5} />;
      head = { x: 78, y: 22 };
      neck = { x: 78, y: 32 };
      sh = { x: 78, y: 37 };
      hip = { x: 78, y: 68 };
      knee = { x: 78, y: 92 };
      ankle = { x: 78, y: 114 };
      elbow = { x: 80, y: 56 };
      if (isEcc) {
        wrist = { x: 96, y: 46 };
        apex = elbow;
        startDeg = -92;
        endDeg = -22;
        rSector = 13;
        labelDeg = -57;
      } else {
        wrist = { x: 84, y: 78 };
        apex = elbow;
        startDeg = -92;
        endDeg = -72;
        rSector = 13;
        labelDeg = -82;
      }
      break;
    }

    case 'trazioni_sbarra': {
      propEl = <line x1={38} y1={14} x2={122} y2={14} stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" />;
      if (isEcc) {
        head = { x: 80, y: 40 };
        neck = { x: 80, y: 49 };
        sh = { x: 80, y: 53 };
        hip = { x: 80, y: 80 };
        knee = { x: 78, y: 98 };
        ankle = { x: 78, y: 114 };
        elbow = { x: 90, y: 34 };
        wrist = { x: 86, y: 14 };
        apex = elbow;
        startDeg = 18;
        endDeg = 126;
        rSector = 13;
        labelDeg = 72;
      } else {
        head = { x: 80, y: 24 };
        neck = { x: 80, y: 34 };
        sh = { x: 80, y: 38 };
        hip = { x: 80, y: 66 };
        knee = { x: 78, y: 86 };
        ankle = { x: 78, y: 104 };
        elbow = { x: 94, y: 28 };
        wrist = { x: 86, y: 14 };
        apex = elbow;
        startDeg = 32;
        endDeg = 142;
        rSector = 13;
        labelDeg = 87;
      }
      break;
    }
  }

  const labelPt = polarPt(apex.x, apex.y, rSector + 9, labelDeg);
  const clampedLabelX = Math.max(16, Math.min(144, labelPt.x));
  const clampedLabelY = Math.max(12, Math.min(118, labelPt.y));

  return (
    <div
      style={{
        background: '#050811',
        border: '1px solid #334155',
        borderRadius: 10,
        padding: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 10,
          fontWeight: 800,
          marginBottom: 4,
          padding: '0 2px',
        }}
      >
        <span style={{ color: sectorStroke }}>
          {isEcc ? '🟡 ECCENTRICA' : '🔵 CONCENTRICA'}
        </span>
        <span style={{ color: '#94a3b8' }}>STICK</span>
      </div>

      <svg
        viewBox="0 0 160 124"
        width="100%"
        height="112"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {propEl}

        <path
          d={sectorPath(apex.x, apex.y, rSector, startDeg, endDeg)}
          fill={sectorFill}
          stroke={sectorStroke}
          strokeWidth={1.6}
        />

        {backKnee && backAnkle && (
          <g opacity={0.45}>
            <SegmentLine a={hip} b={backKnee} width={2.4} color="#64748b" />
            <SegmentLine a={backKnee} b={backAnkle} width={2.4} color="#64748b" />
          </g>
        )}

        <SegmentLine a={hip} b={knee} width={3.2} color="#38bdf8" />
        <SegmentLine a={knee} b={ankle} width={3.2} color="#38bdf8" />
        <SegmentLine a={hip} b={sh} width={3.4} color="#38bdf8" />
        <SegmentLine a={sh} b={neck} width={2.8} color="#38bdf8" />
        <SegmentLine a={sh} b={elbow} width={3.2} color="#38bdf8" />
        <SegmentLine a={elbow} b={wrist} width={3.2} color="#38bdf8" />

        <circle
          cx={head.x}
          cy={head.y}
          r={6.5}
          fill="#0f172a"
          stroke="#38bdf8"
          strokeWidth={2.5}
        />

        <JointDot p={sh} />
        <JointDot p={hip} />
        <JointDot p={knee} />
        <JointDot p={ankle} />
        <JointDot p={elbow} />
        <JointDot p={wrist} />

        <text
          x={clampedLabelX}
          y={clampedLabelY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8.5"
          fontWeight="800"
          fill="#090d16"
          stroke="#090d16"
          strokeWidth="2.4"
          paintOrder="stroke"
        >
          {angleText}
        </text>
        <text
          x={clampedLabelX}
          y={clampedLabelY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="8.5"
          fontWeight="800"
          fill={sectorStroke}
        >
          {angleText}
        </text>
      </svg>
    </div>
  );
}

interface ExerciseAnglesGuideViewProps {
  initialExerciseId?: string;
  readOnlySelection?: boolean;
  onSelectExercise?: (exerciseId: GuideExerciseId) => void;
  onClose: (chosenExerciseId?: GuideExerciseId) => void;
}

export function ExerciseAnglesGuideView({
  initialExerciseId,
  readOnlySelection = false,
  onSelectExercise,
  onClose,
}: ExerciseAnglesGuideViewProps) {
  const initialIndex = Math.max(
    0,
    EXERCISE_ANGLE_SPECS.findIndex((item) => item.id === initialExerciseId)
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex);

  useEffect(() => {
    const idx = EXERCISE_ANGLE_SPECS.findIndex((item) => item.id === initialExerciseId);
    if (idx >= 0) {
      setSelectedIndex(idx);
    }
  }, [initialExerciseId]);

  const currentSpec = EXERCISE_ANGLE_SPECS[selectedIndex] || EXERCISE_ANGLE_SPECS[0];

  const handleChoose = (idx: number) => {
    const clamped = Math.max(0, Math.min(EXERCISE_ANGLE_SPECS.length - 1, idx));
    setSelectedIndex(clamped);
    if (!readOnlySelection && onSelectExercise) {
      onSelectExercise(EXERCISE_ANGLE_SPECS[clamped].id);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 107px)',
        background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
        color: '#f8fafc',
        padding: 20,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fde047' }}>
              📐 Angoli Esercizi (Eccentrica / Concentrica)
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#94a3b8' }}>
              Scheda angoli con sagoma Human Stick dedicata per ciascuno dei 20 esercizi
            </p>
          </div>

          <button
            type="button"
            onClick={() => onClose(currentSpec.id)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #38bdf8',
              background: 'rgba(56, 189, 248, 0.14)',
              color: '#38bdf8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ← Torna all’app
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 12,
            background: '#1e293b',
            border: '1px solid #334155',
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            onClick={() =>
              handleChoose((selectedIndex - 1 + EXERCISE_ANGLE_SPECS.length) % EXERCISE_ANGLE_SPECS.length)
            }
            aria-label="Esercizio precedente"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ◀
          </button>

          <select
            aria-label="Seleziona esercizio per vedere gli angoli"
            value={currentSpec.id}
            onChange={(e) => {
              const idx = EXERCISE_ANGLE_SPECS.findIndex((it) => it.id === e.target.value);
              if (idx >= 0) handleChoose(idx);
            }}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 8,
              border: '1px solid #475569',
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: 14,
              fontWeight: 700,
              padding: '0 10px',
              outline: 'none',
            }}
          >
            {EXERCISE_ANGLE_SPECS.map((item, idx) => (
              <option key={item.id} value={item.id}>
                {idx + 1}. {item.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => handleChoose((selectedIndex + 1) % EXERCISE_ANGLE_SPECS.length)}
            aria-label="Esercizio successivo"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ▶
          </button>
        </div>

        <div
          style={{
            padding: 16,
            borderRadius: 14,
            background: '#1e293b',
            border: '1px solid #334155',
            boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>
              {currentSpec.label}
            </h3>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
              {selectedIndex + 1} / {EXERCISE_ANGLE_SPECS.length}
            </span>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: '#0f172a',
              border: '1px solid #334155',
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            <div style={{ color: '#fde047', fontWeight: 800 }}>
              Articolazione / Angolo: {currentSpec.jointName}
            </div>
            <div style={{ color: '#cbd5e1', marginTop: 2 }}>
              Landmark: {currentSpec.landmarksLabel}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <HumanStickAngleSvg pose={currentSpec.pose} phase="eccentric" />
            <HumanStickAngleSvg pose={currentSpec.pose} phase="concentric" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                padding: '11px 12px',
                borderRadius: 10,
                background: 'rgba(250, 204, 21, 0.08)',
                border: '1px solid rgba(250, 204, 21, 0.35)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#fde047' }}>
                  Fase Eccentrica
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#fef08a' }}>
                  {currentSpec.eccentricRange}
                </span>
              </div>
              <p style={{ margin: '5px 0 0 0', fontSize: 12, color: '#e2e8f0', lineHeight: 1.4 }}>
                {currentSpec.eccentricNote}
              </p>
            </div>

            <div
              style={{
                padding: '11px 12px',
                borderRadius: 10,
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8' }}>
                  Fase Concentrica
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#bae6fd' }}>
                  {currentSpec.concentricRange}
                </span>
              </div>
              <p style={{ margin: '5px 0 0 0', fontSize: 12, color: '#e2e8f0', lineHeight: 1.4 }}>
                {currentSpec.concentricNote}
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background: '#0f172a',
              border: '1px solid #334155',
              fontSize: 12,
              color: '#94a3b8',
              lineHeight: 1.4,
            }}
          >
            <strong style={{ color: '#cbd5e1' }}>Consiglio ripresa:</strong> {currentSpec.cameraTip}
          </div>

          <button
            type="button"
            onClick={() => onClose(currentSpec.id)}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: 10,
              border: 'none',
              background: '#38bdf8',
              color: '#0f172a',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {readOnlySelection ? 'Chiudi guida angoli' : `Usa "${currentSpec.label}" nell'analisi`}
          </button>
        </div>
      </div>
    </div>
  );
}