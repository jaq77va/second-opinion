import { useState, useEffect } from 'react';

export interface ExerciseGuideItem {
  id: string;
  label: string;
  imagePath: string;
  guideImagePath: string;
  cameraAngleBadge: string;
  cameraAngleDeg: number;
  cameraSide: 'left' | 'right' | 'front' | 'back' | 'oblique';
  cameraHeight: string;
  cameraDistance: string;
  doTips: string;
  avoidTips: string;
}

export const EXERCISE_GUIDES: ExerciseGuideItem[] = [
  {
    id: 'squat',
    label: 'Squat',
    imagePath: '/images/squat.png',
    guideImagePath: '/images/guides/squat.png',
    cameraAngleBadge: 'Laterale 90° (o 45°)',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza bacino / ginocchio',
    cameraDistance: '2,5 – 3 m (figura intera)',
    doTips: 'Inquadra da testa a piedi sul lato libero dai dischi del bilanciere.',
    avoidTips: 'Evita riprese frontali pure e dischi che coprono anca o ginocchio.',
  },
  {
    id: 'stacco',
    label: 'Stacco da terra',
    imagePath: '/images/stacco.png',
    guideImagePath: '/images/guides/stacco.png',
    cameraAngleBadge: 'Laterale 90°',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza bacino',
    cameraDistance: '2,5 – 3 m (figura intera)',
    doTips: 'Riprendi il profilo completo per leggere estensione d’anca e schiena.',
    avoidTips: 'Non tagliare piedi o spalle nelle fasi di partenza e chiusura.',
  },
  {
    id: 'panca_piana',
    label: 'Panca piana',
    imagePath: '/images/panca.png',
    guideImagePath: '/images/guides/panca_piana.png',
    cameraAngleBadge: 'Obliqua 45° (lato testa/fianco)',
    cameraAngleDeg: 45,
    cameraSide: 'oblique',
    cameraHeight: 'Altezza panca / bilanciere',
    cameraDistance: '2 m',
    doTips: 'Posiziona la camera leggermente di lato rispetto ai montanti del rack.',
    avoidTips: 'Evita che i dischi o i montanti coprano spalla e gomito.',
  },
  {
    id: 'alzate_laterali',
    label: 'Alzate laterali',
    imagePath: '/images/alzate_laterali.png',
    guideImagePath: '/images/guides/alzate_laterali.png',
    cameraAngleBadge: 'Frontale 0°',
    cameraAngleDeg: 0,
    cameraSide: 'front',
    cameraHeight: 'Altezza petto',
    cameraDistance: '2 – 2,5 m (dal bacino in su)',
    doTips: 'Tieni visibili bacino, spalle e manubri fino alla massima apertura.',
    avoidTips: 'Non tagliare le braccia in alto o i fianchi in basso.',
  },
  {
    id: 'affondi',
    label: 'Affondi',
    imagePath: '/images/affondi.png',
    guideImagePath: '/images/guides/affondi.png',
    cameraAngleBadge: 'Laterale 90°',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza bacino',
    cameraDistance: '3 m (figura intera)',
    doTips: 'Riprendi sul lato della gamba che avanza per leggere l’angolo del ginocchio.',
    avoidTips: 'Evita specchi sullo sfondo che riflettono l’intera figura.',
  },
  {
    id: 'bulgarian_squat',
    label: 'Bulgarian squat',
    imagePath: '/images/bulgarian_squat.png',
    guideImagePath: '/images/guides/bulgarian_squat.png',
    cameraAngleBadge: 'Laterale 90° (lato gamba avanti)',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza bacino',
    cameraDistance: '2,5 – 3 m (figura intera)',
    doTips: 'Posiziona la camera sul lato della gamba anteriore in appoggio a terra.',
    avoidTips: 'Evita specchi dietro di te e non inquadrare dal lato della panca se copre.',
  },
  {
    id: 'push_up',
    label: 'Push-up',
    imagePath: '/images/push_up.png',
    guideImagePath: '/images/guides/push_up.png',
    cameraAngleBadge: 'Laterale 90° (bassa)',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: '30 – 50 cm da terra',
    cameraDistance: '2,5 m (figura intera)',
    doTips: 'Appoggia il telefono a terra di lato per vedere polso, gomito, spalla e caviglia.',
    avoidTips: 'Evita riprese dall’alto che schiacciano l’angolo del gomito.',
  },
  {
    id: 'military_press',
    label: 'Military press',
    imagePath: '/images/military_press.png',
    guideImagePath: '/images/guides/military_press.png',
    cameraAngleBadge: 'Obliqua 45° (o Frontale)',
    cameraAngleDeg: 45,
    cameraSide: 'oblique',
    cameraHeight: 'Altezza spalle',
    cameraDistance: '2,5 – 3 m',
    doTips: 'Lascia margine sopra la testa per non tagliare bilanciere e polsi in chiusura.',
    avoidTips: 'Non posizionarti troppo vicino con inquadratura stretta.',
  },
  {
    id: 'curl_bicipiti',
    label: 'Curl bicipiti',
    imagePath: '/images/curl_bicipiti.png',
    guideImagePath: '/images/guides/curl_bicipiti.png',
    cameraAngleBadge: 'Profilo laterale 90°',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza gomito',
    cameraDistance: '1,8 – 2 m',
    doTips: 'Inquadra spalla, gomito, polso e fianco per rilevare eventuali oscillazioni.',
    avoidTips: 'Evita riprese frontali pure dove l’avambraccio copre il gomito.',
  },
  {
    id: 'french_press',
    label: 'French press',
    imagePath: '/images/french_press.png',
    guideImagePath: '/images/guides/french_press.png',
    cameraAngleBadge: 'Laterale 90°',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza panca',
    cameraDistance: '2 m',
    doTips: 'Riprendi il profilo del braccio su panca per leggere flessione ed estensione.',
    avoidTips: 'Evita che i dischi del bilanciere coprano il gomito in discesa.',
  },
  {
    id: 'rematore_bilanciere',
    label: 'Rematore bilanciere',
    imagePath: '/images/rematore_bilanciere.png',
    guideImagePath: '/images/guides/rematore_bilanciere.png',
    cameraAngleBadge: 'Laterale 90°',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza bacino',
    cameraDistance: '2,5 m (figura intera)',
    doTips: 'Riprendi il profilo per leggere sia il gomito sia l’inclinazione del busto.',
    avoidTips: 'Evita dischi troppo larghi che nascondono il fianco.',
  },
  {
    id: 'stacco_rumeno',
    label: 'Stacco rumeno',
    imagePath: '/images/stacco_rumeno.png',
    guideImagePath: '/images/guides/stacco_rumeno.png',
    cameraAngleBadge: 'Laterale 90°',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza bacino',
    cameraDistance: '2,5 – 3 m (figura intera)',
    doTips: 'Inquadra da testa a piedi di profilo per tracciare la cerniera d’anca.',
    avoidTips: 'Evita riprese frontali o oblique strette.',
  },
  {
    id: 'lat_machine',
    label: 'Lat machine',
    imagePath: '/images/lat_machine.png',
    guideImagePath: '/images/guides/lat_machine.png',
    cameraAngleBadge: 'Posteriore 180° (o 3/4 dietro)',
    cameraAngleDeg: 180,
    cameraSide: 'back',
    cameraHeight: 'Altezza spalle',
    cameraDistance: '2 – 2,5 m',
    doTips: 'Inquadra schiena, spalle e gomiti dalla partenza a braccia tese fino al petto.',
    avoidTips: 'Evita che la struttura della macchina copra le braccia.',
  },
  {
    id: 'pulley_basso',
    label: 'Pulley basso',
    imagePath: '/images/pulley_basso.png',
    guideImagePath: '/images/guides/pulley_basso.png',
    cameraAngleBadge: 'Laterale 90°',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza seduta',
    cameraDistance: '2,5 m',
    doTips: 'Riprendi di lato tutto il busto e le braccia in trazione.',
    avoidTips: 'Non posizionare la camera dietro la colonna pesi.',
  },
  {
    id: 'leg_extension',
    label: 'Leg extension',
    imagePath: '/images/leg_extension.png',
    guideImagePath: '/images/guides/leg_extension.png',
    cameraAngleBadge: 'Laterale 90° (lato libero)',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza ginocchio',
    cameraDistance: '2 m',
    doTips: 'Riprendi sul lato opposto alla colonna pesi per vedere anca, ginocchio e caviglia.',
    avoidTips: 'Evita il lato chiuso dal carter dei pesi.',
  },
  {
    id: 'leg_curl',
    label: 'Leg curl',
    imagePath: '/images/leg_curl.png',
    guideImagePath: '/images/guides/leg_curl.png',
    cameraAngleBadge: 'Laterale 90° (lato libero)',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza ginocchio',
    cameraDistance: '2 m',
    doTips: 'Inquadra di lato femore e tibia durante tutto l’arco di flessione.',
    avoidTips: 'Evita che il braccio imbottito della macchina copra il ginocchio.',
  },
  {
    id: 'chest_press',
    label: 'Chest press',
    imagePath: '/images/chest_press.png',
    guideImagePath: '/images/guides/chest_press.png',
    cameraAngleBadge: 'Obliqua 45°',
    cameraAngleDeg: 45,
    cameraSide: 'oblique',
    cameraHeight: 'Altezza petto',
    cameraDistance: '2 – 2,5 m',
    doTips: 'Posiziona la camera a 45° per vedere spalla, gomito e polso senza ostacoli.',
    avoidTips: 'Evita il profilo puro se i bracci della macchina coprono il gomito.',
  },
  {
    id: 'shoulder_press',
    label: 'Shoulder press',
    imagePath: '/images/shoulder_press.png',
    guideImagePath: '/images/guides/shoulder_press.png',
    cameraAngleBadge: 'Obliqua 45° (o Frontale)',
    cameraAngleDeg: 45,
    cameraSide: 'oblique',
    cameraHeight: 'Altezza spalle',
    cameraDistance: '2 – 2,5 m',
    doTips: 'Tieni visibili gomiti e impugnature fino alla distensione completa.',
    avoidTips: 'Non tagliare la parte superiore del movimento.',
  },
  {
    id: 'pushdown_cavi',
    label: 'Pushdown cavi',
    imagePath: '/images/pushdown_cavi.png',
    guideImagePath: '/images/guides/pushdown_cavi.png',
    cameraAngleBadge: 'Profilo laterale 90°',
    cameraAngleDeg: 90,
    cameraSide: 'left',
    cameraHeight: 'Altezza gomito',
    cameraDistance: '1,8 – 2 m',
    doTips: 'Inquadra di profilo spalla, gomito e polso mantenendo il cavo libero.',
    avoidTips: 'Evita di metterti tra la camera e il braccio che lavora.',
  },
  {
    id: 'trazioni_sbarra',
    label: 'Trazioni sbarra',
    imagePath: '/images/trazioni_sbarra.png',
    guideImagePath: '/images/guides/trazioni_sbarra.png',
    cameraAngleBadge: 'Frontale o 3/4',
    cameraAngleDeg: 0,
    cameraSide: 'front',
    cameraHeight: 'Altezza petto',
    cameraDistance: '2,5 – 3 m (figura intera)',
    doTips: 'Inquadra dalla sbarra fino alle gambe per leggere estensione e chiusura.',
    avoidTips: 'Evita riprese dal basso troppo vicine alla sbarra.',
  },
];

function StickmanAngleIllustration({ guide }: { guide: ExerciseGuideItem }) {
  const isHorizontal = guide.id === 'push_up';
  const isSeated =
    guide.id === 'pulley_basso' ||
    guide.id === 'leg_extension' ||
    guide.id === 'chest_press' ||
    guide.id === 'shoulder_press' ||
    guide.id === 'lat_machine';
  const isSupineOrBench = guide.id === 'panca_piana' || guide.id === 'french_press';
  const isProne = guide.id === 'leg_curl';

  const camPos = (() => {
    switch (guide.cameraSide) {
      case 'front':
        return { x: 60, y: 98, label: '0°' };
      case 'back':
        return { x: 60, y: 12, label: '180°' };
      case 'oblique':
        return { x: 102, y: 88, label: '45°' };
      default:
        return { x: 14, y: 54, label: '90°' };
    }
  })();

  return (
    <svg
      width="112"
      height="112"
      viewBox="0 0 120 120"
      style={{
        width: 112,
        height: 112,
        flexShrink: 0,
        background: '#020617',
        borderRadius: 10,
        border: '1px solid #334155',
      }}
      aria-label={`Schema omino e angolo ${guide.cameraAngleBadge}`}
    >
      <line x1="10" y1="102" x2="110" y2="102" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" />

      <polygon
        points={`${camPos.x},${camPos.y} 44,42 76,42`}
        fill="rgba(56, 189, 248, 0.14)"
        stroke="rgba(56, 189, 248, 0.45)"
        strokeWidth="1"
      />

      {isHorizontal ? (
        <g stroke="#f8fafc" strokeWidth="2.6" strokeLinecap="round" fill="none">
          <circle cx="34" cy="78" r="5" />
          <line x1="39" y1="80" x2="76" y2="80" />
          <line x1="46" y1="80" x2="46" y2="99" />
          <line x1="76" y1="80" x2="96" y2="99" />
        </g>
      ) : isSupineOrBench ? (
        <g stroke="#f8fafc" strokeWidth="2.6" strokeLinecap="round" fill="none">
          <rect x="34" y="76" width="52" height="4" rx="2" stroke="#64748b" />
          <circle cx="38" cy="70" r="5" />
          <line x1="43" y1="72" x2="78" y2="72" />
          <line x1="50" y1="72" x2="50" y2="56" />
          <line x1="78" y1="72" x2="92" y2="98" />
        </g>
      ) : isProne ? (
        <g stroke="#f8fafc" strokeWidth="2.6" strokeLinecap="round" fill="none">
          <rect x="34" y="74" width="50" height="4" rx="2" stroke="#64748b" />
          <circle cx="40" cy="68" r="5" />
          <line x1="45" y1="70" x2="78" y2="70" />
          <line x1="78" y1="70" x2="88" y2="56" />
        </g>
      ) : isSeated ? (
        <g stroke="#f8fafc" strokeWidth="2.6" strokeLinecap="round" fill="none">
          <circle cx="60" cy="36" r="5.5" />
          <line x1="60" y1="42" x2="60" y2="72" />
          <line x1="60" y1="72" x2="78" y2="74" />
          <line x1="78" y1="74" x2="80" y2="99" />
          <line x1="60" y1="48" x2="45" y2="62" />
          <line x1="60" y1="48" x2="75" y2="62" />
        </g>
      ) : (
        <g stroke="#f8fafc" strokeWidth="2.6" strokeLinecap="round" fill="none">
          <circle cx="60" cy="28" r="5.5" />
          <line x1="60" y1="34" x2="60" y2="66" />
          <line x1="60" y1="40" x2="43" y2="56" />
          <line x1="60" y1="40" x2="77" y2="56" />
          <line x1="60" y1="66" x2="48" y2="99" />
          <line x1="60" y1="66" x2="72" y2="99" />
        </g>
      )}

      <g transform={`translate(${camPos.x - 7}, ${camPos.y - 6})`}>
        <rect x="0" y="2" width="14" height="9" rx="2" fill="#38bdf8" />
        <circle cx="7" cy="6.5" r="2.2" fill="#020617" />
      </g>
      <text
        x="60"
        y="115"
        textAnchor="middle"
        fill="#38bdf8"
        fontSize="9"
        fontWeight="800"
      >
        {guide.cameraAngleBadge}
      </text>
    </svg>
  );
}

interface CameraGuidesViewProps {
  initialExerciseId?: string;
  onSelectExercise?: (exerciseId: string) => void;
  onClose: (selectedExerciseId?: string) => void;
}

export function CameraGuidesView({
  initialExerciseId,
  onSelectExercise,
  onClose,
}: CameraGuidesViewProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilterId, setSelectedFilterId] = useState<string>(initialExerciseId || 'all');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | undefined>(initialExerciseId);
  const [showGeneralRules, setShowGeneralRules] = useState<boolean>(true);
  const [fallbackIds, setFallbackIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelectedExerciseId(initialExerciseId);
    setSelectedFilterId(initialExerciseId || 'all');
  }, [initialExerciseId]);

  const filteredGuides = EXERCISE_GUIDES.filter((item) => {
    const matchesSelected = selectedFilterId === 'all' || item.id === selectedFilterId;
    const matchesSearch =
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.cameraAngleBadge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSelected && matchesSearch;
  });

  const handleChooseGuide = (exerciseId: string) => {
    setSelectedExerciseId(exerciseId);
    onSelectExercise?.(exerciseId);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
        color: '#f8fafc',
        paddingBottom: 40,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 540, margin: '0 auto', padding: 20 }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => onClose(selectedExerciseId)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#38bdf8',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ← Torna all'analisi
          </button>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>20 Esercizi</span>
        </div>

        <h1 style={{ margin: '0 0 6px 0', fontSize: 24, fontWeight: 800, color: '#38bdf8' }}>
          Linee Guida Riprese
        </h1>
        <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#94a3b8' }}>
          Posiziona correttamente la fotocamera per ottenere conteggio ripetizioni e ROM precisi.
        </p>

        {/* REGOLE D'ORO COLLASSABILI */}
        <div
          style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <div
            onClick={() => setShowGeneralRules(!showGeneralRules)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          >
            <strong style={{ fontSize: 13, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              3 Regole d'oro per tutti i video
            </strong>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{showGeneralRules ? '▲' : '▼'}</span>
          </div>

          {showGeneralRules && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, fontSize: 13, color: '#cbd5e1' }}>
              <div>• <strong>Camera ferma:</strong> appoggia il telefono su un supporto stabile, evita riprese a mano libera.</div>
              <div>• <strong>Niente specchi dietro:</strong> i riflessi possono disturbare il tracciamento dello scheletro.</div>
              <div>• <strong>Articolazione libera:</strong> evita che dischi, panche o montanti coprano l'articolazione chiave.</div>
            </div>
          )}
        </div>

        {/* BARRA RICERCA E FILTRO ESERCIZIO */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedFilterId !== 'all') setSelectedFilterId('all');
            }}
            placeholder="Cerca esercizio (es. Squat, Bulgarian...)"
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: 13,
              outline: 'none',
            }}
          />
          {selectedFilterId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedFilterId('all')}
              style={{
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid #38bdf8',
                background: 'rgba(56,189,248,0.1)',
                color: '#38bdf8',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Mostra tutti
            </button>
          )}
        </div>

        {/* LISTA CARD GUIDE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredGuides.map((guide) => {
            const hasImageError = Boolean(fallbackIds[guide.id]);
            const isChosen = selectedExerciseId === guide.id;
            return (
              <div
                key={guide.id}
                onClick={() => handleChooseGuide(guide.id)}
                style={{
                  background: '#1e293b',
                  border: isChosen ? '2px solid #38bdf8' : '1px solid #334155',
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 8px 16px -4px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                }}
              >
                {/* TOP CARD HEADER */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #334155',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>{guide.label}</h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#38bdf8',
                      background: 'rgba(56,189,248,0.12)',
                      border: '1px solid rgba(56,189,248,0.3)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    📷 {guide.cameraAngleBadge}
                  </span>
                </div>

                {/* OMINO + ANGOLO RIPRESA + PARAMETRI CAMERA */}
                <div style={{ padding: 16 }}>
                  <div
                    style={{
                      background: '#0f172a',
                      borderRadius: 10,
                      border: '1px solid #334155',
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      marginBottom: 12,
                    }}
                  >
                    {!hasImageError ? (
                      <img
                        src={guide.guideImagePath}
                        onError={() =>
                          setFallbackIds((prev) => ({ ...prev, [guide.id]: true }))
                        }
                        alt={`Inquadratura ${guide.label}`}
                        style={{
                          width: 112,
                          height: 112,
                          objectFit: 'contain',
                          borderRadius: 8,
                          flexShrink: 0,
                          background: '#020617',
                        }}
                      />
                    ) : (
                      <StickmanAngleIllustration guide={guide} />
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                      <div>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>
                          Angolo consigliato
                        </span>
                        <strong style={{ color: '#38bdf8' }}>{guide.cameraAngleBadge}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>
                          Altezza camera
                        </span>
                        <strong style={{ color: '#e2e8f0' }}>{guide.cameraHeight}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>
                          Distanza consigliata
                        </span>
                        <strong style={{ color: '#e2e8f0' }}>{guide.cameraDistance}</strong>
                      </div>
                    </div>
                  </div>

                  {/* CHECKLIST DO / AVOID */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div
                      style={{
                        background: 'rgba(34, 197, 94, 0.08)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#22c55e', display: 'block', marginBottom: 4 }}>
                        ✓ Cosa fare
                      </span>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: '#cbd5e1' }}>{guide.doTips}</p>
                    </div>

                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#f43f5e', display: 'block', marginBottom: 4 }}>
                        ✕ Cosa evitare
                      </span>
                      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: '#cbd5e1' }}>{guide.avoidTips}</p>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChooseGuide(guide.id);
                        onClose(guide.id);
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: 8,
                        border: '1px solid #38bdf8',
                        background: isChosen ? '#38bdf8' : 'rgba(56,189,248,0.12)',
                        color: isChosen ? '#0f172a' : '#38bdf8',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {isChosen ? '✓ Selezionato per l’analisi' : 'Usa questo esercizio'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}