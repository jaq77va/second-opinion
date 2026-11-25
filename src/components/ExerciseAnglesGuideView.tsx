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
    case 'squat': {
      if (isEcc) {
        head = { x: 74, y: 34 }; neck = { x: 76, y: 44 }; sh = { x: 77, y: 48 };
        hip = { x: 64, y: 74 }; knee = { x: 92, y: 82 }; ankle = { x: 84, y: 114 };
        elbow = { x: 85, y: 60 }; wrist = { x: 98, y: 62 };
        propEl = <line x1={68} y1={45} x2={86} y2={45} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />;
        apex = knee; startDeg = -152; endDeg = -76; rSector = 16; labelDeg = -114;
      } else {
        head = { x: 80, y: 18 }; neck = { x: 80, y: 29 }; sh = { x: 80, y: 34 };
        hip = { x: 80, y: 65 }; knee = { x: 82, y: 90 }; ankle = { x: 82, y: 114 };
        elbow = { x: 84, y: 50 }; wrist = { x: 88, y: 64 };
        propEl = <line x1={72} y1={32} x2={88} y2={32} stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />;
        apex = knee; startDeg = -92; endDeg = -22; rSector = 15; labelDeg = -57;
      }
      break;
    }
    case 'front_squat': {
      if (isEcc) {
        head = { x: 76, y: 35 }; neck = { x: 78, y: 45 }; sh = { x: 80, y: 49 };
        hip = { x: 66, y: 75 }; knee = { x: 94, y: 82 }; ankle = { x: 84, y: 114 };
        elbow = { x: 102, y: 47 }; wrist = { x: 86, y: 43 };
        propEl = <circle cx={86} cy={43} r={3.5} fill="#cbd5e1" />;
        apex = knee; startDeg = -152; endDeg = -76; rSector = 16; labelDeg = -114;
      } else {
        head = { x: 80, y: 18 }; neck = { x: 80, y: 29 }; sh = { x: 80, y: 34 };
        hip = { x: 80, y: 65 }; knee = { x: 82, y: 90 }; ankle = { x: 82, y: 114 };
        elbow = { x: 100, y: 34 }; wrist = { x: 86, y: 30 };
        propEl = <circle cx={86} cy={30} r={3.5} fill="#cbd5e1" />;
        apex = knee; startDeg = -92; endDeg = -22; rSector = 15; labelDeg = -57;
      }
      break;
    }
    case 'goblet_squat': {
      if (isEcc) {
        head = { x: 76, y: 35 }; neck = { x: 78, y: 45 }; sh = { x: 80, y: 49 };
        hip = { x: 66, y: 75 }; knee = { x: 92, y: 82 }; ankle = { x: 84, y: 114 };
        elbow = { x: 86, y: 64 }; wrist = { x: 96, y: 58 };
        propEl = <rect x={95} y={52} width={8} height={11} rx={2} fill="#f59e0b" />;
        apex = knee; startDeg = -150; endDeg = -76; rSector = 16; labelDeg = -113;
      } else {
        head = { x: 80, y: 18 }; neck = { x: 80, y: 29 }; sh = { x: 80, y: 34 };
        hip = { x: 80, y: 65 }; knee = { x: 82, y: 90 }; ankle = { x: 82, y: 114 };
        elbow = { x: 84, y: 50 }; wrist = { x: 92, y: 46 };
        propEl = <rect x={91} y={40} width={8} height={11} rx={2} fill="#f59e0b" />;
        apex = knee; startDeg = -92; endDeg = -22; rSector = 15; labelDeg = -57;
      }
      break;
    }
    case 'stacco': {
      if (isEcc) {
        head = { x: 96, y: 44 }; neck = { x: 90, y: 52 }; sh = { x: 88, y: 56 };
        hip = { x: 64, y: 74 }; knee = { x: 84, y: 92 }; ankle = { x: 78, y: 114 };
        elbow = { x: 88, y: 78 }; wrist = { x: 92, y: 102 };
        propEl = <line x1={76} y1={104} x2={106} y2={104} stroke="#94a3b8" strokeWidth={2.5} />;
        apex = hip; startDeg = -32; endDeg = 32; rSector = 15; labelDeg = 0;
      } else {
        head = { x: 80, y: 18 }; neck = { x: 80, y: 29 }; sh = { x: 80, y: 34 };
        hip = { x: 80, y: 65 }; knee = { x: 81, y: 90 }; ankle = { x: 81, y: 114 };
        elbow = { x: 82, y: 52 }; wrist = { x: 82, y: 74 };
        propEl = <line x1={68} y1={74} x2={96} y2={74} stroke="#94a3b8" strokeWidth={2.5} />;
        apex = hip; startDeg = -90; endDeg = -15; rSector = 14; labelDeg = -52;
      }
      break;
    }
    case 'sumo_deadlift': {
      if (isEcc) {
        head = { x: 80, y: 40 }; neck = { x: 80, y: 49 }; sh = { x: 80, y: 53 };
        hip = { x: 80, y: 74 }; knee = { x: 56, y: 92 }; ankle = { x: 48, y: 114 };
        backKnee = { x: 104, y: 92 }; backAnkle = { x: 112, y: 114 };
        elbow = { x: 74, y: 76 }; wrist = { x: 74, y: 98 };
        propEl = <line x1={54} y1={100} x2={106} y2={100} stroke="#94a3b8" strokeWidth={2.5} />;
        apex = hip; startDeg = 22; endDeg = 90; rSector = 15; labelDeg = 56;
      } else {
        head = { x: 80, y: 18 }; neck = { x: 80, y: 29 }; sh = { x: 80, y: 34 };
        hip = { x: 80, y: 65 }; knee = { x: 64, y: 90 }; ankle = { x: 56, y: 114 };
        backKnee = { x: 96, y: 90 }; backAnkle = { x: 104, y: 114 };
        elbow = { x: 74, y: 52 }; wrist = { x: 74, y: 74 };
        propEl = <line x1={58} y1={74} x2={102} y2={74} stroke="#94a3b8" strokeWidth={2.5} />;
        apex = hip; startDeg = 45; endDeg = 90; rSector = 14; labelDeg = 67;
      }
      break;
    }
    case 'stacco_rumeno': {
      if (isEcc) {
        head = { x: 102, y: 48 }; neck = { x: 94, y: 54 }; sh = { x: 91, y: 58 };
        hip = { x: 64, y: 66 }; knee = { x: 74, y: 90 }; ankle = { x: 74, y: 114 };
        elbow = { x: 88, y: 76 }; wrist = { x: 86, y: 94 };
        apex = hip; startDeg = -18; endDeg = 66; rSector = 15; labelDeg = 24;
      } else {
        head = { x: 80, y: 18 }; neck = { x: 80, y: 29 }; sh = { x: 80, y: 34 };
        hip = { x: 80, y: 65 }; knee = { x: 81, y: 90 }; ankle = { x: 81, y: 114 };
        elbow = { x: 82, y: 52 }; wrist = { x: 82, y: 72 };
        apex = hip; startDeg = -90; endDeg = -15; rSector = 14; labelDeg = -52;
      }
      break;
    }
    case 'hyperextension': {
      propEl = <rect x={54} y={66} width={34} height={9} rx={3} fill="#334155" />;
      ankle = { x: 42, y: 106 }; knee = { x: 58, y: 86 }; hip = { x: 76, y: 68 };
      if (isEcc) {
        sh = { x: 102, y: 86 }; neck = { x: 106, y: 90 }; head = { x: 114, y: 96 };
        elbow = { x: 96, y: 98 }; wrist = { x: 90, y: 106 };
        apex = hip; startDeg = -45; endDeg = 42; rSector = 15; labelDeg = 0;
      } else {
        sh = { x: 78, y: 36 }; neck = { x: 78, y: 31 }; head = { x: 78, y: 20 };
        elbow = { x: 84, y: 48 }; wrist = { x: 80, y: 40 };
        apex = hip; startDeg = -92; endDeg = -35; rSector = 14; labelDeg = -63;
      }
      break;
    }
    case 'hip_thrust': {
      propEl = <rect x={24} y={62} width={22} height={52} rx={3} fill="#334155" />;
      sh = { x: 48, y: 66 }; neck = { x: 44, y: 62 }; head = { x: 36, y: 58 }; ankle = { x: 116, y: 112 };
      if (isEcc) {
        hip = { x: 78, y: 92 }; knee = { x: 102, y: 88 }; elbow = { x: 64, y: 80 }; wrist = { x: 78, y: 92 };
        apex = hip; startDeg = -12; endDeg = 18; rSector = 14; labelDeg = 3;
      } else {
        hip = { x: 82, y: 66 }; knee = { x: 104, y: 86 }; elbow = { x: 66, y: 74 }; wrist = { x: 82, y: 66 };
        apex = hip; startDeg = 0; endDeg = 42; rSector = 14; labelDeg = 21;
      }
      break;
    }
    case 'panca_piana': {
      propEl = <rect x={26} y={76} width={108} height={7} rx={3} fill="#334155" />;
      head = { x: 38, y: 67 }; neck = { x: 48, y: 71 }; sh = { x: 54, y: 72 };
      hip = { x: 96, y: 72 }; knee = { x: 118, y: 88 }; ankle = { x: 122, y: 112 };
      if (isEcc) {
        elbow = { x: 50, y: 54 }; wrist = { x: 68, y: 58 };
        apex = elbow; startDeg = -12; endDeg = 76; rSector = 13; labelDeg = 32;
      } else {
        elbow = { x: 56, y: 47 }; wrist = { x: 60, y: 26 };
        apex = elbow; startDeg = -84; endDeg = 14; rSector = 13; labelDeg = -35;
      }
      break;
    }
    case 'panca_inclinata': {
      propEl = <polygon points="28,84 96,74 102,82 32,92" fill="#334155" />;
      head = { x: 38, y: 58 }; neck = { x: 48, y: 64 }; sh = { x: 55, y: 67 };
      hip = { x: 92, y: 74 }; knee = { x: 116, y: 88 }; ankle = { x: 120, y: 112 };
      if (isEcc) {
        elbow = { x: 52, y: 48 }; wrist = { x: 70, y: 50 };
        apex = elbow; startDeg = -8; endDeg = 74; rSector = 13; labelDeg = 33;
      } else {
        elbow = { x: 60, y: 40 }; wrist = { x: 68, y: 20 };
        apex = elbow; startDeg = -74; endDeg = 22; rSector = 13; labelDeg = -26;
      }
      break;
    }
    case 'french_press': {
      propEl = <rect x={26} y={76} width={108} height={7} rx={3} fill="#334155" />;
      head = { x: 38, y: 67 }; neck = { x: 48, y: 71 }; sh = { x: 54, y: 72 };
      hip = { x: 96, y: 72 }; knee = { x: 118, y: 88 }; ankle = { x: 122, y: 112 };
      if (isEcc) {
        elbow = { x: 64, y: 46 }; wrist = { x: 44, y: 52 };
        apex = elbow; startDeg = 18; endDeg = 166; rSector = 13; labelDeg = 92;
      } else {
        elbow = { x: 64, y: 48 }; wrist = { x: 68, y: 24 };
        apex = elbow; startDeg = -82; endDeg = 18; rSector = 13; labelDeg = -32;
      }
      break;
    }
    case 'estensioni_tricipiti_sopra_testa': {
      head = { x: 80, y: 26 }; neck = { x: 80, y: 36 }; sh = { x: 80, y: 41 };
      hip = { x: 80, y: 70 }; knee = { x: 80, y: 92 }; ankle = { x: 80, y: 114 };
      if (isEcc) {
        elbow = { x: 92, y: 24 }; wrist = { x: 76, y: 16 };
        apex = elbow; startDeg = 42; endDeg = 158; rSector = 13; labelDeg = 100;
      } else {
        elbow = { x: 86, y: 22 }; wrist = { x: 88, y: 6 };
        apex = elbow; startDeg = -84; endDeg = 68; rSector = 13; labelDeg = -8;
      }
      break;
    }
    case 'alzate_laterali': {
      head = { x: 80, y: 20 }; neck = { x: 80, y: 31 }; sh = { x: 80, y: 36 };
      hip = { x: 80, y: 68 }; knee = { x: 76, y: 92 }; ankle = { x: 76, y: 114 };
      if (isEcc) {
        elbow = { x: 93, y: 52 }; wrist = { x: 95, y: 66 };
        apex = sh; startDeg = 22; endDeg = 90; rSector = 14; labelDeg = 56;
      } else {
        elbow = { x: 108, y: 36 }; wrist = { x: 124, y: 36 };
        apex = sh; startDeg = 0; endDeg = 90; rSector = 15; labelDeg = 45;
      }
      break;
    }
    case 'front_raises': {
      head = { x: 78, y: 20 }; neck = { x: 78, y: 31 }; sh = { x: 78, y: 36 };
      hip = { x: 78, y: 68 }; knee = { x: 78, y: 92 }; ankle = { x: 78, y: 114 };
      if (isEcc) {
        elbow = { x: 82, y: 52 }; wrist = { x: 84, y: 68 };
        apex = sh; startDeg = 65; endDeg = 90; rSector = 14; labelDeg = 77;
      } else {
        elbow = { x: 102, y: 36 }; wrist = { x: 122, y: 36 };
        apex = sh; startDeg = 0; endDeg = 90; rSector = 15; labelDeg = 45;
      }
      break;
    }
    case 'affondi': {
      head = { x: 78, y: 24 }; neck = { x: 78, y: 34 }; sh = { x: 78, y: 39 };
      hip = { x: 76, y: 68 }; backKnee = { x: 52, y: 94 }; backAnkle = { x: 42, y: 114 };
      elbow = { x: 82, y: 54 }; wrist = { x: 84, y: 68 };
      if (isEcc) {
        knee = { x: 100, y: 84 }; ankle = { x: 104, y: 114 };
        apex = knee; startDeg = -148; endDeg = -84; rSector = 14; labelDeg = -116;
      } else {
        knee = { x: 92, y: 88 }; ankle = { x: 96, y: 114 };
        apex = knee; startDeg = -115; endDeg = -72; rSector = 14; labelDeg = -93;
      }
      break;
    }
    case 'affondi_laterali': {
      head = { x: 78, y: 26 }; neck = { x: 78, y: 36 }; sh = { x: 78, y: 41 };
      hip = { x: 86, y: 68 }; backKnee = { x: 54, y: 88 }; backAnkle = { x: 36, y: 112 };
      elbow = { x: 84, y: 54 }; wrist = { x: 90, y: 66 };
      if (isEcc) {
        knee = { x: 106, y: 88 }; ankle = { x: 116, y: 112 };
        apex = knee; startDeg = -126; endDeg = -68; rSector = 14; labelDeg = -97;
      } else {
        knee = { x: 98, y: 90 }; ankle = { x: 108, y: 112 };
        apex = knee; startDeg = -108; endDeg = -64; rSector = 14; labelDeg = -86;
      }
      break;
    }
    case 'step_up': {
      propEl = <rect x={92} y={92} width={34} height={22} rx={3} fill="#334155" />;
      backKnee = { x: 58, y: 92 }; backAnkle = { x: 52, y: 114 };
      elbow = { x: 80, y: 54 }; wrist = { x: 82, y: 68 };
      if (isEcc) {
        head = { x: 76, y: 24 }; neck = { x: 76, y: 34 }; sh = { x: 76, y: 39 }; hip = { x: 76, y: 68 };
        knee = { x: 96, y: 74 }; ankle = { x: 104, y: 92 };
        apex = knee; startDeg = -132; endDeg = -64; rSector = 14; labelDeg = -98;
      } else {
        head = { x: 88, y: 16 }; neck = { x: 88, y: 26 }; sh = { x: 88, y: 31 }; hip = { x: 90, y: 60 };
        knee = { x: 98, y: 76 }; ankle = { x: 104, y: 92 };
        apex = knee; startDeg = -112; endDeg = -72; rSector = 14; labelDeg = -92;
      }
      break;
    }
    case 'bulgarian_squat': {
      propEl = <rect x={24} y={84} width={22} height={30} rx={3} fill="#334155" />;
      head = { x: 74, y: 26 }; neck = { x: 75, y: 36 }; sh = { x: 76, y: 41 }; hip = { x: 74, y: 68 };
      backKnee = { x: 54, y: 78 }; backAnkle = { x: 36, y: 84 };
      elbow = { x: 80, y: 55 }; wrist = { x: 82, y: 68 };
      if (isEcc) {
        knee = { x: 102, y: 84 }; ankle = { x: 104, y: 114 };
        apex = knee; startDeg = -146; endDeg = -86; rSector = 14; labelDeg = -116;
      } else {
        knee = { x: 92, y: 88 }; ankle = { x: 96, y: 114 };
        apex = knee; startDeg = -114; endDeg = -74; rSector = 14; labelDeg = -94;
      }
      break;
    }
    case 'push_up': {
      propEl = <line x1={22} y1={104} x2={138} y2={104} stroke="#475569" strokeWidth={2.5} />;
      ankle = { x: 32, y: 102 }; knee = { x: 58, y: 92 }; hip = { x: 84, y: 82 };
      sh = { x: 112, y: 74 }; neck = { x: 118, y: 72 }; head = { x: 128, y: 72 };
      if (isEcc) {
        elbow = { x: 104, y: 90 }; wrist = { x: 118, y: 102 };
        apex = elbow; startDeg = -132; endDeg = -46; rSector = 13; labelDeg = -89;
      } else {
        elbow = { x: 114, y: 89 }; wrist = { x: 116, y: 102 };
        apex = elbow; startDeg = -112; endDeg = -76; rSector = 13; labelDeg = -94;
      }
      break;
    }
    case 'ab_coaster_crunch': {
      propEl = <path d="M 38 106 Q 76 92 114 68" fill="none" stroke="#64748b" strokeWidth={2.5} strokeDasharray="3 2" />;
      ankle = { x: 38, y: 106 }; knee = { x: 64, y: 96 };
      if (isEcc) {
        hip = { x: 78, y: 84 }; sh = { x: 104, y: 76 }; neck = { x: 110, y: 73 }; head = { x: 118, y: 70 };
        elbow = { x: 96, y: 88 }; wrist = { x: 84, y: 86 };
        apex = hip; startDeg = -22; endDeg = 42; rSector = 14; labelDeg = 10;
      } else {
        hip = { x: 76, y: 88 }; sh = { x: 84, y: 60 }; neck = { x: 86, y: 54 }; head = { x: 90, y: 46 };
        elbow = { x: 96, y: 72 }; wrist = { x: 86, y: 64 };
        apex = hip; startDeg = -74; endDeg = -22; rSector = 14; labelDeg = -48;
      }
      break;
    }
    case 'military_press': {
      head = { x: 80, y: 24 }; neck = { x: 80, y: 34 }; sh = { x: 80, y: 39 };
      hip = { x: 80, y: 68 }; knee = { x: 80, y: 92 }; ankle = { x: 80, y: 114 };
      if (isEcc) {
        elbow = { x: 94, y: 52 }; wrist = { x: 96, y: 34 };
        propEl = <line x1={74} y1={34} x2={112} y2={34} stroke="#94a3b8" strokeWidth={2.5} />;
        apex = elbow; startDeg = -78; endDeg = 68; rSector = 13; labelDeg = -5;
      } else {
        elbow = { x: 86, y: 24 }; wrist = { x: 88, y: 8 };
        propEl = <line x1={68} y1={8} x2={108} y2={8} stroke="#94a3b8" strokeWidth={2.5} />;
        apex = elbow; startDeg = -84; endDeg = 68; rSector = 13; labelDeg = -8;
      }
      break;
    }
    case 'arnold_press': {
      head = { x: 80, y: 24 }; neck = { x: 80, y: 34 }; sh = { x: 80, y: 39 };
      hip = { x: 80, y: 68 }; knee = { x: 80, y: 92 }; ankle = { x: 80, y: 114 };
      if (isEcc) {
        elbow = { x: 92, y: 54 }; wrist = { x: 88, y: 38 };
        propEl = <rect x={85} y={32} width={7} height={10} rx={2} fill="#f59e0b" />;
        apex = sh; startDeg = 28; endDeg = 90; rSector = 14; labelDeg = 59;
      } else {
        elbow = { x: 92, y: 24 }; wrist = { x: 96, y: 8 };
        propEl = <rect x={93} y={3} width={7} height={10} rx={2} fill="#38bdf8" />;
        apex = sh; startDeg = -64; endDeg = 90; rSector = 14; labelDeg = 13;
      }
      break;
    }
    case 'shoulder_press': {
      propEl = <rect x={54} y={68} width={14} height={46} rx={3} fill="#334155" />;
      head = { x: 80, y: 22 }; neck = { x: 80, y: 32 }; sh = { x: 80, y: 37 };
      hip = { x: 78, y: 68 }; knee = { x: 94, y: 88 }; ankle = { x: 92, y: 112 };
      if (isEcc) {
        elbow = { x: 94, y: 50 }; wrist = { x: 96, y: 32 };
        apex = elbow; startDeg = -78; endDeg = 68; rSector = 13; labelDeg = -5;
      } else {
        elbow = { x: 86, y: 22 }; wrist = { x: 88, y: 6 };
        apex = elbow; startDeg = -84; endDeg = 68; rSector = 13; labelDeg = -8;
      }
      break;
    }
    case 'chest_press': {
      propEl = <rect x={54} y={68} width={14} height={46} rx={3} fill="#334155" />;
      head = { x: 78, y: 24 }; neck = { x: 78, y: 34 }; sh = { x: 78, y: 39 };
      hip = { x: 76, y: 68 }; knee = { x: 94, y: 88 }; ankle = { x: 92, y: 112 };
      if (isEcc) {
        elbow = { x: 84, y: 54 }; wrist = { x: 98, y: 52 };
        apex = elbow; startDeg = -6; endDeg = 76; rSector = 13; labelDeg = 35;
      } else {
        elbow = { x: 96, y: 44 }; wrist = { x: 116, y: 44 };
        apex = elbow; startDeg = 0; endDeg = 152; rSector = 13; labelDeg = 76;
      }
      break;
    }
    case 'curl_bicipiti': {
      head = { x: 78, y: 20 }; neck = { x: 78, y: 31 }; sh = { x: 78, y: 36 };
      hip = { x: 78, y: 68 }; knee = { x: 78, y: 92 }; ankle = { x: 78, y: 114 };
      if (isEcc) {
        elbow = { x: 82, y: 54 }; wrist = { x: 84, y: 74 };
        apex = elbow; startDeg = 76; endDeg = 104; rSector = 13; labelDeg = 90;
      } else {
        elbow = { x: 82, y: 54 }; wrist = { x: 92, y: 36 };
        apex = elbow; startDeg = -56; endDeg = 104; rSector = 13; labelDeg = 24;
      }
      break;
    }
    case 'hammer_curl': {
      head = { x: 78, y: 20 }; neck = { x: 78, y: 31 }; sh = { x: 78, y: 36 };
      hip = { x: 78, y: 68 }; knee = { x: 78, y: 92 }; ankle = { x: 78, y: 114 };
      if (isEcc) {
        elbow = { x: 82, y: 54 }; wrist = { x: 84, y: 74 };
        propEl = <rect x={81} y={72} width={6} height={10} rx={2} fill="#f59e0b" />;
        apex = elbow; startDeg = 76; endDeg = 104; rSector = 13; labelDeg = 90;
      } else {
        elbow = { x: 82, y: 54 }; wrist = { x: 94, y: 38 };
        propEl = <rect x={92} y={32} width={6} height={10} rx={2} fill="#38bdf8" />;
        apex = elbow; startDeg = -48; endDeg = 104; rSector = 13; labelDeg = 28;
      }
      break;
    }
    case 'curl_panca_scott': {
      propEl = <polygon points="78,52 108,74 102,80 74,58" fill="#334155" />;
      head = { x: 64, y: 26 }; neck = { x: 70, y: 34 }; sh = { x: 74, y: 38 };
      hip = { x: 94, y: 68 }; knee = { x: 108, y: 88 }; ankle = { x: 106, y: 112 };
      if (isEcc) {
        elbow = { x: 90, y: 56 }; wrist = { x: 104, y: 68 };
        apex = elbow; startDeg = 42; endDeg = 128; rSector = 13; labelDeg = 85;
      } else {
        elbow = { x: 90, y: 56 }; wrist = { x: 96, y: 36 };
        apex = elbow; startDeg = -72; endDeg = 128; rSector = 13; labelDeg = 28;
      }
      break;
    }
    case 'rematore_bilanciere': {
      head = { x: 104, y: 48 }; neck = { x: 96, y: 54 }; sh = { x: 92, y: 58 };
      hip = { x: 66, y: 68 }; knee = { x: 76, y: 90 }; ankle = { x: 74, y: 114 };
      if (isEcc) {
        elbow = { x: 90, y: 78 }; wrist = { x: 92, y: 98 };
        propEl = <line x1={76} y1={98} x2={106} y2={98} stroke="#94a3b8" strokeWidth={2.5} />;
        apex = elbow; startDeg = -72; endDeg = 82; rSector = 13; labelDeg = 5;
      } else {
        elbow = { x: 84, y: 72 }; wrist = { x: 96, y: 66 };
        propEl = <line x1={82} y1={66} x2={110} y2={66} stroke="#38bdf8" strokeWidth={2.5} />;
        apex = elbow; startDeg = -28; endDeg = 152; rSector = 13; labelDeg = 62;
      }
      break;
    }
    case 'rematore_manubrio': {
      ankle = { x: 42, y: 112 }; knee = { x: 56, y: 90 }; backKnee = { x: 88, y: 71 }; backAnkle = { x: 88, y: 112 };
      hip = { x: 64, y: 64 }; sh = { x: 96, y: 58 }; neck = { x: 102, y: 54 }; head = { x: 110, y: 50 };
      if (isEcc) {
        elbow = { x: 94, y: 78 }; wrist = { x: 96, y: 96 };
        propEl = (<><rect x={54} y={64} width={44} height={7} rx={3} fill="#334155" /><rect x={92} y={94} width={8} height={9} rx={2} fill="#f59e0b" /></>);
        apex = elbow; startDeg = -76; endDeg = 82; rSector = 13; labelDeg = 3;
      } else {
        elbow = { x: 88, y: 72 }; wrist = { x: 98, y: 64 };
        propEl = (<><rect x={54} y={64} width={44} height={7} rx={3} fill="#334155" /><rect x={95} y={59} width={8} height={9} rx={2} fill="#38bdf8" /></>);
        apex = elbow; startDeg = -36; endDeg = 146; rSector = 13; labelDeg = 55;
      }
      break;
    }
    case 'lat_machine': {
      propEl = <line x1={62} y1={12} x2={114} y2={12} stroke="#94a3b8" strokeWidth={2.5} />;
      head = { x: 80, y: 34 }; neck = { x: 80, y: 44 }; sh = { x: 80, y: 48 };
      hip = { x: 80, y: 76 }; knee = { x: 92, y: 92 }; ankle = { x: 90, y: 112 };
      if (isEcc) {
        elbow = { x: 92, y: 30 }; wrist = { x: 96, y: 12 };
        apex = elbow; startDeg = -76; endDeg = 112; rSector = 13; labelDeg = 18;
      } else {
        elbow = { x: 96, y: 58 }; wrist = { x: 88, y: 44 };
        propEl = <line x1={66} y1={44} x2={106} y2={44} stroke="#38bdf8" strokeWidth={2.5} />;
        apex = elbow; startDeg = -58; endDeg = 68; rSector = 13; labelDeg = 5;
      }
      break;
    }
    case 'lat_machine_presa_inversa': {
      propEl = <line x1={68} y1={12} x2={106} y2={12} stroke="#94a3b8" strokeWidth={2.5} />;
      head = { x: 80, y: 34 }; neck = { x: 80, y: 44 }; sh = { x: 80, y: 48 };
      hip = { x: 80, y: 76 }; knee = { x: 92, y: 92 }; ankle = { x: 90, y: 112 };
      if (isEcc) {
        elbow = { x: 88, y: 30 }; wrist = { x: 90, y: 12 };
        apex = elbow; startDeg = -82; endDeg = 108; rSector = 13; labelDeg = 13;
      } else {
        elbow = { x: 84, y: 62 }; wrist = { x: 88, y: 44 };
        propEl = <line x1={70} y1={44} x2={104} y2={44} stroke="#38bdf8" strokeWidth={2.5} />;
        apex = elbow; startDeg = -68; endDeg = 78; rSector = 13; labelDeg = 5;
      }
      break;
    }
    case 'face_pull': {
      head = { x: 78, y: 24 }; neck = { x: 78, y: 34 }; sh = { x: 78, y: 39 };
      hip = { x: 78, y: 68 }; knee = { x: 78, y: 92 }; ankle = { x: 78, y: 114 };
      if (isEcc) {
        elbow = { x: 98, y: 38 }; wrist = { x: 118, y: 34 };
        apex = elbow; startDeg = -14; endDeg = 148; rSector = 13; labelDeg = 67;
      } else {
        elbow = { x: 98, y: 42 }; wrist = { x: 92, y: 26 };
        apex = elbow; startDeg = -68; endDeg = 48; rSector = 13; labelDeg = -10;
      }
      break;
    }
    case 'pulley_basso': {
      propEl = <line x1={54} y1={96} x2={118} y2={96} stroke="#475569" strokeWidth={2.5} />;
      head = { x: 76, y: 26 }; neck = { x: 76, y: 36 }; sh = { x: 76, y: 41 };
      hip = { x: 74, y: 74 }; knee = { x: 98, y: 74 }; ankle = { x: 102, y: 95 };
      if (isEcc) {
        elbow = { x: 84, y: 58 }; wrist = { x: 104, y: 64 };
        apex = elbow; startDeg = 16; endDeg = 104; rSector = 13; labelDeg = 60;
      } else {
        elbow = { x: 78, y: 58 }; wrist = { x: 90, y: 52 };
        apex = elbow; startDeg = -28; endDeg = 96; rSector = 13; labelDeg = 34;
      }
      break;
    }
    case 'pullover_cavi': {
      propEl = <rect x={34} y={76} width={72} height={7} rx={3} fill="#334155" />;
      head = { x: 44, y: 67 }; neck = { x: 54, y: 71 }; sh = { x: 60, y: 72 };
      hip = { x: 94, y: 72 }; knee = { x: 112, y: 88 }; ankle = { x: 114, y: 112 };
      if (isEcc) {
        elbow = { x: 48, y: 56 }; wrist = { x: 34, y: 46 };
        apex = sh; startDeg = -146; endDeg = 0; rSector = 14; labelDeg = -73;
      } else {
        elbow = { x: 66, y: 52 }; wrist = { x: 76, y: 36 };
        apex = sh; startDeg = -58; endDeg = 0; rSector = 14; labelDeg = -29;
      }
      break;
    }
    case 'leg_extension': {
      propEl = <rect x={54} y={66} width={28} height={38} rx={3} fill="#334155" />;
      head = { x: 66, y: 24 }; neck = { x: 68, y: 34 }; sh = { x: 68, y: 39 };
      hip = { x: 68, y: 68 }; knee = { x: 82, y: 74 }; elbow = { x: 74, y: 54 }; wrist = { x: 82, y: 66 };
      if (isEcc) {
        ankle = { x: 86, y: 98 };
        apex = knee; startDeg = 76; endDeg = 162; rSector = 14; labelDeg = 119;
      } else {
        ankle = { x: 116, y: 74 };
        apex = knee; startDeg = 0; endDeg = 162; rSector = 14; labelDeg = 81;
      }
      break;
    }
    case 'leg_curl': {
      propEl = <rect x={52} y={76} width={54} height={7} rx={3} fill="#334155" />;
      head = { x: 40, y: 74 }; neck = { x: 48, y: 72 }; sh = { x: 54, y: 72 };
      hip = { x: 92, y: 72 }; knee = { x: 112, y: 76 }; elbow = { x: 68, y: 84 }; wrist = { x: 82, y: 82 };
      if (isEcc) {
        ankle = { x: 126, y: 88 };
        apex = knee; startDeg = 32; endDeg = 168; rSector = 14; labelDeg = 100;
      } else {
        ankle = { x: 112, y: 54 };
        apex = knee; startDeg = -90; endDeg = 168; rSector = 14; labelDeg = 39;
      }
      break;
    }
    case 'pushdown_cavi': {
      head = { x: 78, y: 22 }; neck = { x: 78, y: 32 }; sh = { x: 78, y: 37 };
      hip = { x: 78, y: 68 }; knee = { x: 78, y: 92 }; ankle = { x: 78, y: 114 };
      if (isEcc) {
        elbow = { x: 82, y: 54 }; wrist = { x: 96, y: 42 };
        apex = elbow; startDeg = -42; endDeg = 104; rSector = 13; labelDeg = 31;
      } else {
        elbow = { x: 82, y: 54 }; wrist = { x: 92, y: 74 };
        apex = elbow; startDeg = 64; endDeg = 104; rSector = 13; labelDeg = 84;
      }
      break;
    }
    case 'chest_dips': {
      propEl = <rect x={68} y={76} width={28} height={5} rx={2} fill="#64748b" />;
      head = { x: 84, y: 26 }; neck = { x: 82, y: 36 }; sh = { x: 80, y: 41 };
      hip = { x: 72, y: 70 }; knee = { x: 64, y: 90 }; ankle = { x: 62, y: 110 };
      if (isEcc) {
        elbow = { x: 92, y: 60 }; wrist = { x: 82, y: 76 };
        apex = elbow; startDeg = -58; endDeg = 114; rSector = 13; labelDeg = 28;
      } else {
        elbow = { x: 84, y: 60 }; wrist = { x: 82, y: 76 };
        apex = elbow; startDeg = 76; endDeg = 104; rSector = 13; labelDeg = 90;
      }
      break;
    }
    case 'calf_raise_in_piedi': {
      head = { x: 80, y: 18 }; neck = { x: 80, y: 29 }; sh = { x: 80, y: 34 };
      hip = { x: 80, y: 65 }; knee = { x: 80, y: 90 }; wrist = { x: 82, y: 68 }; elbow = { x: 82, y: 52 };
      if (isEcc) {
        ankle = { x: 80, y: 112 };
        propEl = <line x1={74} y1={114} x2={94} y2={114} stroke="#facc15" strokeWidth={2.5} />;
        apex = ankle; startDeg = -90; endDeg = 0; rSector = 13; labelDeg = -45;
      } else {
        ankle = { x: 80, y: 104 };
        propEl = <line x1={80} y1={114} x2={96} y2={114} stroke="#38bdf8" strokeWidth={2.5} />;
        apex = ankle; startDeg = -90; endDeg = 28; rSector = 13; labelDeg = -31;
      }
      break;
    }
    case 'trazioni_sbarra': {
      propEl = <line x1={54} y1={12} x2={116} y2={12} stroke="#94a3b8" strokeWidth={2.5} />;
      if (isEcc) {
        head = { x: 80, y: 42 }; neck = { x: 80, y: 51 }; sh = { x: 80, y: 55 };
        hip = { x: 80, y: 82 }; knee = { x: 78, y: 100 }; ankle = { x: 78, y: 115 };
        elbow = { x: 88, y: 34 }; wrist = { x: 86, y: 12 };
        apex = elbow; startDeg = 24; endDeg = 122; rSector = 13; labelDeg = 73;
      } else {
        head = { x: 80, y: 24 }; neck = { x: 80, y: 33 }; sh = { x: 80, y: 37 };
        hip = { x: 80, y: 66 }; knee = { x: 78, y: 88 }; ankle = { x: 78, y: 108 };
        elbow = { x: 96, y: 26 }; wrist = { x: 86, y: 12 };
        apex = elbow; startDeg = -38; endDeg = 148; rSector = 13; labelDeg = 55;
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