import React, { useEffect, useState } from 'react';
import type { GuideExerciseId } from './CameraGuidesView';

export type { GuideExerciseId };

interface ExerciseAngleSpec {
  id: GuideExerciseId;
  label: string;
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
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~65°–85° → ~165°–175°',
    concentricRange: '~165°–175° → ~65°–85°',
    eccentricNote: 'Discesa verso la sospensione: il gomito si riapre con controllo.',
    concentricNote: 'Risalita verso la sbarra: chiusura dell’angolo al gomito.',
    cameraTip: 'Frontale o 3/4 a figura intera includendo la sbarra e l’intera escursione.',
  },
  {
    id: 'front_squat',
    label: 'Front squat',
    jointName: 'Ginocchio',
    landmarksLabel: 'Anca – Ginocchio – Caviglia (23–25–27 / 24–26–28)',
    eccentricRange: '~175° → ~80°–95°',
    concentricRange: '~80°–95° → ~175°',
    eccentricNote: 'Discesa controllata: chiusura del ginocchio con gomiti alti e tronco verticale.',
    concentricNote: 'Spinta di risalita: riapertura dell’angolo al ginocchio.',
    cameraTip: 'Profilo laterale a figura intera con anca, ginocchio e caviglia visibili.',
  },
  {
    id: 'goblet_squat',
    label: 'Goblet squat',
    jointName: 'Ginocchio',
    landmarksLabel: 'Anca – Ginocchio – Caviglia (23–25–27 / 24–26–28)',
    eccentricRange: '~175° → ~80°–100°',
    concentricRange: '~80°–100° → ~175°',
    eccentricNote: 'Discesa con carico al petto: chiusura del ginocchio e busto sostenuto.',
    concentricNote: 'Risalita: estensione del ginocchio fino alla stazione eretta.',
    cameraTip: 'Laterale o 45° a figura intera evitando che il carico copra le ginocchia.',
  },
  {
    id: 'sumo_deadlift',
    label: 'Sumo deadlift',
    jointName: 'Anca / Ginocchio (apertura bacino e gambe)',
    landmarksLabel: 'Spalla – Anca – Ginocchio (11–23–25 / 12–24–26)',
    eccentricRange: '~170° → ~60°–80°',
    concentricRange: '~60°–80° → ~170°',
    eccentricNote: 'Discesa controllata con stance ampio: flessione di anca e ginocchia con schiena neutra.',
    concentricNote: 'Spinta di chiusura: estensione completa di anca e ginocchia.',
    cameraTip: 'Obliqua a 45° o frontale a figura intera per osservare anche e ginocchia.',
  },
  {
    id: 'hip_thrust',
    label: 'Hip thrust',
    jointName: 'Anca (estensione del bacino)',
    landmarksLabel: 'Spalla – Anca – Ginocchio (11–23–25 / 12–24–26)',
    eccentricRange: '~170° → ~80°–100°',
    concentricRange: '~80°–100° → ~170°',
    eccentricNote: 'Abbassamento controllato del bacino: flessione dell’anca senza perdere tensione.',
    concentricNote: 'Spinta d’anca verso l’alto: apertura fino all’allineamento spalle-anca-ginocchio.',
    cameraTip: 'Laterale a 90° includendo spalla appoggiata alla panca, bacino e ginocchia.',
  },
  {
    id: 'panca_inclinata',
    label: 'Panca inclinata',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~165° → ~75°–95°',
    concentricRange: '~75°–95° → ~165°',
    eccentricNote: 'Discesa verso la parte alta del petto: chiusura controllata del gomito.',
    concentricNote: 'Spinta verso l’alto: riapertura del gomito verso la distensione.',
    cameraTip: 'Obliqua a 45° su panca inclinata con spalla, gomito e polso ben leggibili.',
  },
  {
    id: 'chest_dips',
    label: 'Chest dips',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~165°–175° → ~75°–95°',
    concentricRange: '~75°–95° → ~165°–175°',
    eccentricNote: 'Discesa con lieve inclinazione del busto in avanti: flessione controllata del gomito.',
    concentricNote: 'Spinta verso l’alto: distensione delle braccia fino al supporto.',
    cameraTip: 'Obliqua a 45° o laterale a figura intera con spalla e gomito liberi da ostacoli.',
  },
  {
    id: 'arnold_press',
    label: 'Arnold press',
    jointName: 'Gomito / Spalla (rotazione e spinta)',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~165°–175° → ~75°–95°',
    concentricRange: '~75°–95° → ~165°–175°',
    eccentricNote: 'Discesa e rotazione verso il petto: chiusura del gomito.',
    concentricNote: 'Rotazione e spinta sopra la testa: distensione del gomito.',
    cameraTip: 'Frontale o obliqua a 45° con spazio sopra la testa e gomiti visibili.',
  },
  {
    id: 'front_raises',
    label: 'Front raises',
    jointName: 'Spalla (flessione frontale)',
    landmarksLabel: 'Anca – Spalla – Gomito (23–11–13 / 24–12–14)',
    eccentricRange: '~80°–95° → ~10°–25°',
    concentricRange: '~10°–25° → ~80°–95°',
    eccentricNote: 'Ritorno controllato verso le cosce: chiusura dell’angolo spalla-gomito.',
    concentricNote: 'Elevazione frontale del braccio: apertura dell’angolo fino all’altezza delle spalle.',
    cameraTip: 'Laterale a 90° o obliqua a 45° per leggere l’elevazione sul piano sagittale.',
  },
  {
    id: 'face_pull',
    label: 'Face pull',
    jointName: 'Gomito / Spalla (retrazione e rotazione esterna)',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~65°–85° → ~155°–170°',
    concentricRange: '~155°–170° → ~65°–85°',
    eccentricNote: 'Ritorno della corda in avanti: estensione del gomito.',
    concentricNote: 'Trazione verso il viso: flessione del gomito e apertura esterna.',
    cameraTip: 'Obliqua a 45° all’altezza delle spalle per vedere corda, gomiti e mani.',
  },
  {
    id: 'lat_machine_presa_inversa',
    label: 'Lat machine presa inversa',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~65°–85° → ~165°–175°',
    concentricRange: '~165°–175° → ~65°–85°',
    eccentricNote: 'Risalita della sbarra con presa supina: il gomito si riapre con controllo.',
    concentricNote: 'Trazione verso la parte alta del petto: chiusura dell’angolo al gomito.',
    cameraTip: 'Obliqua a 45° o posteriore con braccia e sbarra completamente visibili.',
  },
  {
    id: 'rematore_manubrio',
    label: 'Rematore manubrio',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~65°–85° → ~160°–175°',
    concentricRange: '~160°–175° → ~65°–85°',
    eccentricNote: 'Discesa del manubrio: distensione del gomito mantenendo il tronco stabile.',
    concentricNote: 'Trazione del gomito verso il fianco: chiusura dell’angolo articolare.',
    cameraTip: 'Laterale sul lato del braccio che lavora con tronco e gomito liberi.',
  },
  {
    id: 'pullover_cavi',
    label: 'Pullover cavi',
    jointName: 'Spalla (estensione/flessione sul piano sagittale)',
    landmarksLabel: 'Anca – Spalla – Gomito (23–11–13 / 24–12–14)',
    eccentricRange: '~20°–35° → ~130°–160°',
    concentricRange: '~130°–160° → ~20°–35°',
    eccentricNote: 'Ritorno in alto verso la linea delle spalle: apertura dell’angolo anca-spalla-gomito.',
    concentricNote: 'Trazione del cavo verso il bacino: chiusura dell’angolo con braccia quasi tese.',
    cameraTip: 'Laterale a 90° con busto, spalla e traiettoria del cavo ben leggibili.',
  },
  {
    id: 'hammer_curl',
    label: 'Hammer curl',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~40°–60° → ~155°–170°',
    concentricRange: '~155°–170° → ~40°–60°',
    eccentricNote: 'Discesa con presa neutra: riapertura graduale del gomito.',
    concentricNote: 'Flessione del gomito con presa neutra verso l’alto.',
    cameraTip: 'Laterale a 90° con gomito fermo lungo il fianco.',
  },
  {
    id: 'curl_panca_scott',
    label: 'Curl panca Scott',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~35°–50° → ~150°–165°',
    concentricRange: '~150°–165° → ~35°–50°',
    eccentricNote: 'Discesa controllata sul leggio: estensione graduale senza bloccare di colpo.',
    concentricNote: 'Flessione del gomito: chiusura dell’angolo mantenendo l’omero appoggiato.',
    cameraTip: 'Laterale sul lato libero del leggio con gomito e polso ben visibili.',
  },
  {
    id: 'estensioni_tricipiti_sopra_testa',
    label: 'Estensioni tricipiti sopra la testa',
    jointName: 'Gomito',
    landmarksLabel: 'Spalla – Gomito – Polso (11–13–15 / 12–14–16)',
    eccentricRange: '~165°–175° → ~60°–80°',
    concentricRange: '~60°–80° → ~165°–175°',
    eccentricNote: 'Abbassamento del carico dietro la nuca: flessione mirata del gomito.',
    concentricNote: 'Distensione verso l’alto: riapertura dell’angolo al gomito.',
    cameraTip: 'Laterale a 90° lasciando spazio sopra la testa per la fase di chiusura.',
  },
  {
    id: 'affondi_laterali',
    label: 'Affondi laterali',
    jointName: 'Ginocchio (gamba in affondo)',
    landmarksLabel: 'Anca – Ginocchio – Caviglia (23–25–27 / 24–26–28)',
    eccentricRange: '~175° → ~75°–95°',
    concentricRange: '~75°–95° → ~175°',
    eccentricNote: 'Spostamento laterale e discesa sull’anca: chiusura del ginocchio con l’altra gamba distesa.',
    concentricNote: 'Spinta di ritorno al centro: distensione del ginocchio e riallineamento.',
    cameraTip: 'Frontale a figura intera per leggere escursione laterale e allineamento del ginocchio.',
  },
  {
    id: 'step_up',
    label: 'Step up',
    jointName: 'Ginocchio (gamba sul box)',
    landmarksLabel: 'Anca – Ginocchio – Caviglia (23–25–27 / 24–26–28)',
    eccentricRange: '~170° → ~80°–100°',
    concentricRange: '~80°–100° → ~170°',
    eccentricNote: 'Discesa controllata dal box: chiusura progressiva del ginocchio della gamba d’appoggio.',
    concentricNote: 'Salita sul box: estensione del ginocchio fino alla stazione eretta in alto.',
    cameraTip: 'Laterale o 45° a figura intera includendo box, gamba d’appoggio e chiusura in alto.',
  },
  {
    id: 'calf_raise_in_piedi',
    label: 'Calf raise in piedi',
    jointName: 'Caviglia (flessione plantare)',
    landmarksLabel: 'Ginocchio – Caviglia – Piede (25–27–31 / 26–28–32)',
    eccentricRange: '~95°–115° → ~125°–145°',
    concentricRange: '~125°–145° → ~95°–115°',
    eccentricNote: 'Discesa del tallone: allungamento controllato del polpaccio.',
    concentricNote: 'Spinta sull’avampiede: sollevamento del tallone e contrazione.',
    cameraTip: 'Laterale a 90° all’altezza del ginocchio/caviglia con piede ben visibile.',
  },
  {
    id: 'ab_coaster_crunch',
    label: 'Ab coaster crunch',
    jointName: 'Tronco / Anca (flessione sul binario)',
    landmarksLabel: 'Spalla – Anca – Ginocchio (11–23–25 / 12–24–26)',
    eccentricRange: '~85°–105° → ~155°–170°',
    concentricRange: '~155°–170° → ~85°–105°',
    eccentricNote: 'Ritorno lungo il binario: riapertura controllata senza inarcare la zona lombare.',
    concentricNote: 'Risalita sul binario: chiusura dell’angolo spalla-anca-ginocchio con contrazione addominale.',
    cameraTip: 'Laterale a 90° per osservare il percorso sul binario e la flessione del bacino.',
  },
  {
    id: 'hyperextension',
    label: 'Hyperextension',
    jointName: 'Anca (estensione del tronco sul supporto)',
    landmarksLabel: 'Spalla – Anca – Ginocchio (11–23–25 / 12–24–26)',
    eccentricRange: '~175° → ~85°–105°',
    concentricRange: '~85°–105° → ~175°',
    eccentricNote: 'Discesa controllata del busto in avanti: chiusura dell’angolo all’anca con schiena neutra.',
    concentricNote: 'Estensione fino all’allineamento del corpo: apertura dell’angolo senza iperestendere.',
    cameraTip: 'Laterale a 90° includendo il supporto d’appoggio, il busto e la testa.',
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

function SegmentLine({
  a,
  b,
  width = 3.2,
  color = '#38bdf8',
}: {
  a: Pt;
  b: Pt;
  width?: number;
  color?: string;
}) {
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
  exerciseId,
  phase,
}: {
  exerciseId: GuideExerciseId;
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

  switch (exerciseId) {
    case 'squat':
    case 'goblet_squat':
    case 'front_squat': {
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
      }
      break;
    }

    case 'stacco':
    case 'sumo_deadlift':
    case 'hyperextension': {
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
      }
      break;
    }

    case 'panca_piana':
    case 'panca_inclinata': {
      propEl = <rect x={26} y={76} width={108} height={7} rx={3} fill="#334155" />;
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

    case 'french_press':
    case 'estensioni_tricipiti_sopra_testa': {
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

    case 'alzate_laterali':
    case 'front_raises': {
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
      break;
    }

    case 'affondi':
    case 'affondi_laterali':
    case 'step_up': {
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

    case 'push_up':
    case 'ab_coaster_crunch': {
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

    case 'military_press':
    case 'arnold_press': {
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
      } else {
        elbow = { x: 92, y: 28 };
        wrist = { x: 92, y: 12 };
        apex = elbow;
        startDeg = 88;
        endDeg = 156;
        rSector = 12;
        labelDeg = 122;
      }
      break;
    }

    case 'curl_bicipiti':
    case 'hammer_curl':
    case 'curl_panca_scott': {
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
      break;
    }

    case 'rematore_bilanciere':
    case 'rematore_manubrio': {
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
      } else {
        elbow = { x: 82, y: 64 };
        wrist = { x: 92, y: 54 };
        apex = elbow;
        startDeg = -28;
        endDeg = 46;
        rSector = 13;
        labelDeg = 9;
      }
      break;
    }

    case 'lat_machine':
    case 'lat_machine_presa_inversa':
    case 'face_pull': {
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

    case 'pulley_basso':
    case 'pullover_cavi': {
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

    case 'chest_press':
    case 'shoulder_press':
    case 'hip_thrust': {
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

    case 'pushdown_cavi':
    case 'chest_dips':
    case 'calf_raise_in_piedi': {
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
  initialExerciseId?: GuideExerciseId;
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
              Scheda angoli con sagoma Human Stick dedicata per ciascuno dei {EXERCISE_ANGLE_SPECS.length} esercizi
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
            <HumanStickAngleSvg exerciseId={currentSpec.id} phase="eccentric" />
            <HumanStickAngleSvg exerciseId={currentSpec.id} phase="concentric" />
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