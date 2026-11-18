import { useState, useRef } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { analyzeExerciseGeometry, type AnalysisResult } from './biomechanicsEngine';
import { getGeminiFeedback } from './geminiCoach';

type Exercise = 'squat' | 'stacco' | 'panca_piana' | 'lat_machine' | 'alzate_laterali';

const EXERCISES: { id: Exercise; label: string; icon: string; viewHint: string; isDumbbell: boolean }[] = [
  { id: 'squat', label: 'Squat', icon: '🏋️‍♂️', viewHint: 'Inquadratura laterale o frontale a figura intera', isDumbbell: false },
  { id: 'stacco', label: 'Stacco da terra', icon: '🏋️', viewHint: 'Inquadratura laterale a altezza bacino', isDumbbell: false },
  { id: 'panca_piana', label: 'Panca piana', icon: '🤸‍♂️', viewHint: 'Inquadratura laterale o obliqua a 45°', isDumbbell: false },
  { id: 'lat_machine', label: 'Lat machine', icon: '🧗‍♂️', viewHint: 'Inquadratura posteriore o laterale', isDumbbell: false },
  { id: 'alzate_laterali', label: 'Alzate laterali', icon: '🤾‍♂️', viewHint: 'Inquadratura frontale dal bacino in su', isDumbbell: true },
];

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27],
  [24, 26], [26, 28],
];

function calculateLiveAngle(a: any, b: any, c: any): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return Math.round(angle);
}

function areLandmarksVisible(landmarks: any[], indices: number[], minVis = 0.45): boolean {
  return indices.every(
    (idx) => landmarks[idx] && (landmarks[idx].visibility ?? 1) >= minVis
  );
}

export function App() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise>('squat');
  const [weightKg, setWeightKg] = useState<number>(20);
  const [status, setStatus] = useState<string>('Pronto per iniziare');
  const [statusCode, setStatusCode] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [repCount, setRepCount] = useState<number>(0);
  
  // Metriche in tempo reale
  const [romQuality, setRomQuality] = useState<number>(0);
  const [powerScore, setPowerScore] = useState<number>(0);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [repPeakPowers, setRepPeakPowers] = useState<number[]>([]);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState<boolean>(false);

  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const landmarksBufferRef = useRef<any[][]>([]);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const selectedExerciseObj = EXERCISES.find((ex) => ex.id === selectedExercise) || EXERCISES[0];
  const currentHint = selectedExerciseObj.viewHint;

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollAmount = container.clientWidth;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });

    const newScrollLeft = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    const itemWidth = container.clientWidth;
    const index = Math.round(newScrollLeft / itemWidth);
    const targetIndex = Math.max(0, Math.min(EXERCISES.length - 1, index));
    if (!isProcessing) {
      setSelectedExercise(EXERCISES[targetIndex].id);
    }
  };

  const handleWeightChange = (delta: number) => {
    setWeightKg((prev) => Math.max(0, prev + delta));
  };

  const handleWeightInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setWeightKg(isNaN(val) ? 0 : Math.max(0, val));
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setProgressPercent(0);
    setAnalysisResult(null);
    setRepPeakPowers([]);
    setIsAnalysisOpen(false);
    setAiFeedback('');
    setRepCount(0);
    setRomQuality(0);
    setPowerScore(0);
    setStatus('Caricamento modello AI locale in corso...');
    setStatusCode('processing');
    landmarksBufferRef.current = [];

    FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    ).then((vision) => {
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: './models/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      }).then((landmarker) => {
        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');

        video.src = URL.createObjectURL(file);
        video.load();

        const MAX_WIDTH = 480;
        const FRAME_SKIP = 3;
        let frameCounter = 0;
        let targetWidth = 640;
        let targetHeight = 480;

        let repPhase: 'START' | 'ACTIVE' = 'START';
        let hasReachedInitialPosition = false;
        let localReps = 0;
        let angleHistory: number[] = [];
        let powerHistory: number[] = [];
        let transitionStreak = 0;
        let hasStarted = false;

        let currentRepMaxPower = 0;
        let collectedRepPowers: number[] = [];

        const effectiveMass = selectedExerciseObj.isDumbbell ? weightKg * 2 : weightKg;

        const startProcessingWhenReady = () => {
          if (hasStarted) return;

          const originalWidth = video.videoWidth || 0;
          const originalHeight = video.videoHeight || 0;
          
          if (originalWidth === 0 || originalHeight === 0) {
            setTimeout(startProcessingWhenReady, 100);
            return;
          }

          hasStarted = true;

          const scale = MAX_WIDTH / originalWidth;
          targetWidth = MAX_WIDTH;
          targetHeight = Math.round(originalHeight * scale);

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          setStatus('Analisi biomeccanica, ROM e potenza in corso...');
          setStatusCode('processing');
          
          video.play().then(() => {
            let lastFrameTime = performance.now();

            const processFrame = () => {
              const now = performance.now();
              const deltaTime = (now - lastFrameTime) / 1000;
              lastFrameTime = now;

              if (video.duration && !isNaN(video.duration)) {
                const currentProgress = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
                setProgressPercent(currentProgress);
              }

              if (video.ended || video.paused) {
                if (video.ended) {
                  setIsProcessing(false);
                  setProgressPercent(100);
                  setRomQuality(0);
                  setPowerScore(0);
                  setStatus('Analisi completata con successo');
                  setStatusCode('success');
                  
                  const geomResult = analyzeExerciseGeometry(selectedExercise, landmarksBufferRef.current);
                  setAnalysisResult(geomResult);
                  setRepPeakPowers(collectedRepPowers);

                  setIsAiLoading(true);
                  
                  getGeminiFeedback(selectedExercise, geomResult.minAngle, geomResult.maxAngle, geomResult.trendSummary)
                    .then((feedback) => {
                      setAiFeedback(feedback);
                      setIsAiLoading(false);
                    })
                    .catch((err) => {
                      setAiFeedback(`Errore AI: ${err.message}`);
                      setIsAiLoading(false);
                    });

                  landmarker.close();
                }
                return;
              }

              frameCounter++;
              let currentLandmarks: any = null;

              if (frameCounter % FRAME_SKIP === 0) {
                try {
                  const result = landmarker.detectForVideo(video, now);
                  if (result.landmarks && result.landmarks.length > 0) {
                    currentLandmarks = result.landmarks[0];
                    landmarksBufferRef.current.push(currentLandmarks);

                    let rawAngle: number | null = null;

                    if (selectedExercise === 'squat') {
                      const leftOk = areLandmarksVisible(currentLandmarks, [23, 25, 27], 0.45);
                      const rightOk = areLandmarksVisible(currentLandmarks, [24, 26, 28], 0.45);
                      if (leftOk && rightOk) {
                        const lAng = calculateLiveAngle(currentLandmarks[23], currentLandmarks[25], currentLandmarks[27]);
                        const rAng = calculateLiveAngle(currentLandmarks[24], currentLandmarks[26], currentLandmarks[28]);
                        rawAngle = Math.round((lAng + rAng) / 2);
                      } else if (leftOk) {
                        rawAngle = calculateLiveAngle(currentLandmarks[23], currentLandmarks[25], currentLandmarks[27]);
                      } else if (rightOk) {
                        rawAngle = calculateLiveAngle(currentLandmarks[24], currentLandmarks[26], currentLandmarks[28]);
                      }
                    } else if (selectedExercise === 'stacco') {
                      if (areLandmarksVisible(currentLandmarks, [11, 23, 25], 0.45)) {
                        rawAngle = calculateLiveAngle(currentLandmarks[11], currentLandmarks[23], currentLandmarks[25]);
                      }
                    } else if (selectedExercise === 'panca_piana') {
                      if (areLandmarksVisible(currentLandmarks, [11, 13, 15], 0.45)) {
                        rawAngle = calculateLiveAngle(currentLandmarks[11], currentLandmarks[13], currentLandmarks[15]);
                      }
                    } else if (selectedExercise === 'lat_machine') {
                      if (areLandmarksVisible(currentLandmarks, [11, 13, 15], 0.45)) {
                        rawAngle = calculateLiveAngle(currentLandmarks[11], currentLandmarks[13], currentLandmarks[15]);
                      }
                    } else if (selectedExercise === 'alzate_laterali') {
                      const leftOk = areLandmarksVisible(currentLandmarks, [23, 11, 13], 0.45);
                      const rightOk = areLandmarksVisible(currentLandmarks, [24, 12, 14], 0.45);
                      if (leftOk && rightOk) {
                        const lAng = calculateLiveAngle(currentLandmarks[23], currentLandmarks[11], currentLandmarks[13]);
                        const rAng = calculateLiveAngle(currentLandmarks[24], currentLandmarks[12], currentLandmarks[14]);
                        rawAngle = Math.round((lAng + rAng) / 2);
                      } else if (leftOk) {
                        rawAngle = calculateLiveAngle(currentLandmarks[23], currentLandmarks[11], currentLandmarks[13]);
                      } else if (rightOk) {
                        rawAngle = calculateLiveAngle(currentLandmarks[24], currentLandmarks[12], currentLandmarks[14]);
                      }
                    }

                    if (rawAngle !== null) {
                      angleHistory.push(rawAngle);
                      if (angleHistory.length > 3) angleHistory.shift();
                      const smoothAngle = Math.round(
                        angleHistory.reduce((acc, v) => acc + v, 0) / angleHistory.length
                      );

                      if (selectedExercise === 'alzate_laterali') {
                        const REST_MAX = 55;
                        const APEX_MIN = 88;

                        if (!hasReachedInitialPosition) {
                          if (smoothAngle <= REST_MAX) {
                            hasReachedInitialPosition = true;
                          }
                        } else if (repPhase === 'START') {
                          if (smoothAngle >= APEX_MIN) {
                            transitionStreak++;
                            if (transitionStreak >= 1) { // Tolleranza mobile ottimizzata
                              repPhase = 'ACTIVE';
                              transitionStreak = 0;
                              currentRepMaxPower = 0;
                            }
                          } else {
                            transitionStreak = 0;
                          }
                        } else if (repPhase === 'ACTIVE') {
                          if (smoothAngle <= REST_MAX) {
                            transitionStreak++;
                            if (transitionStreak >= 1) {
                              repPhase = 'START';
                              transitionStreak = 0;
                              localReps++;
                              setRepCount(localReps);
                              collectedRepPowers.push(Math.round(currentRepMaxPower));
                            }
                          } else {
                            transitionStreak = 0;
                          }
                        }
                      } else {
                        const TOP_MIN = selectedExercise === 'lat_machine' ? 140 : 150;
                        // Soglia squat leggermente alzata a 100° per catturare meglio l'affondo su mobile
                        const BOTTOM_MAX =
                          selectedExercise === 'squat'
                            ? 100
                            : selectedExercise === 'stacco'
                            ? 105
                            : selectedExercise === 'lat_machine'
                            ? 85
                            : 95;

                        if (!hasReachedInitialPosition) {
                          if (smoothAngle >= TOP_MIN) {
                            transitionStreak++;
                            if (transitionStreak >= 1) { // Tolleranza mobile ottimizzata
                              hasReachedInitialPosition = true;
                              transitionStreak = 0;
                            }
                          } else {
                            transitionStreak = 0;
                          }
                        } else if (repPhase === 'START') {
                          if (smoothAngle <= BOTTOM_MAX) {
                            transitionStreak++;
                            if (transitionStreak >= 1) { // Tolleranza mobile ottimizzata
                              repPhase = 'ACTIVE';
                              transitionStreak = 0;
                              currentRepMaxPower = 0;
                            }
                          } else {
                            transitionStreak = 0;
                          }
                        } else if (repPhase === 'ACTIVE') {
                          if (smoothAngle >= TOP_MIN) {
                            transitionStreak++;
                            if (transitionStreak >= 1) { // Tolleranza mobile ottimizzata
                              repPhase = 'START';
                              transitionStreak = 0;
                              localReps++;
                              setRepCount(localReps);
                              collectedRepPowers.push(Math.round(currentRepMaxPower));
                            }
                          } else {
                            transitionStreak = 0;
                          }
                        }
                      }

                      let rom = 0;
                      if (selectedExercise === 'alzate_laterali') {
                        rom = ((smoothAngle - 35) / (100 - 35)) * 100;
                      } else {
                        rom = ((155 - smoothAngle) / (155 - 65)) * 100;
                      }
                      rom = Math.max(0, Math.min(100, Math.round(rom)));
                      setRomQuality(rom);

                      let instantPower = 0;
                      if (repPhase === 'ACTIVE') {
                        const angleDelta = angleHistory.length > 1 ? Math.abs(smoothAngle - angleHistory[angleHistory.length - 2]) : 0;
                        const MOVEMENT_DEADZONE = 2.0;

                        if (angleDelta >= MOVEMENT_DEADZONE) {
                          const safeDt = Math.max(deltaTime, 0.012);
                          const safeDeltaAngle = Math.min(angleDelta, 4.0);

                          const velocityFactor = safeDeltaAngle / (safeDt * 10);
                          instantPower = effectiveMass * velocityFactor * 1.2;
                          instantPower = Math.min(instantPower, 850);
                        }
                      }

                      powerHistory.push(instantPower);
                      if (powerHistory.length > 8) powerHistory.shift();

                      const smoothedPower = Math.round(
                        powerHistory.reduce((acc, v) => acc + v, 0) / powerHistory.length
                      );
                      
                      setPowerScore(smoothedPower);

                      if (repPhase === 'ACTIVE' && smoothedPower > currentRepMaxPower) {
                        currentRepMaxPower = smoothedPower;
                      }
                    }
                  }
                } catch (err) {}
              }

              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

                if (currentLandmarks) {
                  ctx.strokeStyle = '#00ffcc';
                  ctx.lineWidth = 3;
                  POSE_CONNECTIONS.forEach(([i, j]) => {
                    const p1 = currentLandmarks[i];
                    const p2 = currentLandmarks[j];
                    if (p1 && p2 && p1.visibility && p1.visibility > 0.3 && p2.visibility && p2.visibility > 0.3) {
                      ctx.beginPath();
                      ctx.moveTo(p1.x * targetWidth, p1.y * targetHeight);
                      ctx.lineTo(p2.x * targetWidth, p2.y * targetHeight);
                      ctx.stroke();
                    }
                  });

                  ctx.fillStyle = '#ff0055';
                  currentLandmarks.forEach((lm: any) => {
                    if (lm.visibility && lm.visibility > 0.3) {
                      ctx.beginPath();
                      ctx.arc(lm.x * targetWidth, lm.y * targetHeight, 4, 0, 2 * Math.PI);
                      ctx.fill();
                    }
                  });
                }
              }

              requestAnimationFrame(processFrame);
            };

            requestAnimationFrame(processFrame);
          }).catch((playErr) => {
            setIsProcessing(false);
            setStatus(`Errore riproduzione video: ${playErr.message}`);
            setStatusCode('error');
          });
        };

        video.onloadedmetadata = startProcessingWhenReady;
        video.oncanplay = startProcessingWhenReady;
        setTimeout(startProcessingWhenReady, 500);
      });
    }).catch((err) => {
      setIsProcessing(false);
      setStatus(`Errore caricamento modello: ${(err as Error).message}`);
      setStatusCode('error');
    });
  };

  const getRomColor = (val: number) => {
    if (val >= 90) return '#22c55e';
    if (val >= 70) return '#eab308';
    return '#ef4444';
  };

  const getTrafficLightColor = () => {
    switch (statusCode) {
      case 'processing': return '#eab308'; // Giallo
      case 'success': return '#22c55e';    // Verde
      case 'error': return '#ef4444';      // Rosso
      default: return '#94a3b8';           // Grigio
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)', 
      color: '#f8fafc',
      paddingBottom: 40
    }}>
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 20, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 24, paddingTop: 10 }}>
          <h1 style={{ margin: '0 0 6px 0', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: '#38bdf8' }}>
            Second Opinion
          </h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            Analisi Biomeccanica Intelligente
          </p>
        </div>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>
          1. Seleziona l'esercizio
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => scrollCarousel('left')}
            disabled={isProcessing}
            aria-label="Esercizio precedente"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: 16,
              fontWeight: 'bold',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
            }}
          >
            ◀
          </button>

          <div
            ref={carouselRef}
            style={{
              flex: 1,
              display: 'flex',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              scrollbarWidth: 'none',
              borderRadius: 14,
            }}
          >
            {EXERCISES.map((ex) => {
              const isSelected = selectedExercise === ex.id;
              return (
                <div
                  key={ex.id}
                  style={{
                    flex: '0 0 100%',
                    scrollSnapAlign: 'center',
                    boxSizing: 'border-box',
                    padding: 18,
                    borderRadius: 14,
                    border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                    background: isSelected ? '#1e293b' : '#0f172a',
                    cursor: 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    boxShadow: isSelected ? '0 10px 15px -3px rgba(56, 189, 248, 0.15)' : 'none',
                  }}
                >
                  {isSelected && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        background: '#38bdf8',
                        color: '#0f172a',
                        fontSize: 11,
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: 20,
                      }}
                    >
                      ✓ Attivo
                    </span>
                  )}
                  <span style={{ fontSize: 42, lineHeight: 1 }}>{ex.icon}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: isSelected ? '#38bdf8' : '#cbd5e1' }}>
                    {ex.label}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollCarousel('right')}
            disabled={isProcessing}
            aria-label="Esercizio successivo"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#f8fafc',
              fontSize: 16,
              fontWeight: 'bold',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
            }}
          >
            ▶
          </button>
        </div>

        {/* --- INQUADRATURA CONSIGLIATA --- */}
        <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 10, background: '#1e293b', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', display: 'block' }}>Inquadratura consigliata</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {currentHint}
            </span>
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '4px 10px', borderRadius: 8, flexShrink: 0 }}>
            {selectedExerciseObj.label}
          </span>
        </div>

        {/* --- SELETTORE DEL PESO --- */}
        <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 10, background: '#1e293b', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', display: 'block' }}>Carico utilizzato</span>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {selectedExerciseObj.isDumbbell ? 'Peso del singolo manubrio (kg)' : 'Peso totale (kg)'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => handleWeightChange(-5)}
              disabled={isProcessing}
              style={{ width: 32, height: 36, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#38bdf8', fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}
            >
              -
            </button>
            <input
              type="number"
              value={weightKg}
              onChange={handleWeightInputChange}
              disabled={isProcessing}
              style={{
                width: 55,
                height: 36,
                textAlign: 'center',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 8,
                color: '#f8fafc',
                fontSize: 16,
                fontWeight: 800,
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => handleWeightChange(5)}
              disabled={isProcessing}
              style={{ width: 32, height: 36, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#38bdf8', fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}
            >
              +
            </button>
          </div>
        </div>

        <label style={{ display: 'block', marginTop: 22, marginBottom: 8, fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>2. Carica video</label>
        
        {/* --- UPLOAD FILE --- */}
        <input
          type="file"
          accept="video/*"
          ref={fileInputRef}
          onChange={handleVideoUpload}
          style={{ display: 'none' }}
        />
        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '22px 16px',
            borderRadius: 12,
            border: '2px dashed #38bdf8',
            background: isProcessing ? '#1e293b' : 'rgba(56, 189, 248, 0.05)',
            color: '#f8fafc',
            textAlign: 'center',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 32, lineHeight: 1 }}>📤</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8' }}>
            {isProcessing ? 'Elaborazione in corso...' : "Seleziona file video"}
          </span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>
            Formati supportati: MP4, MOV, WebM
          </span>
        </div>

        {isProcessing && (
          <div style={{ marginTop: 16, padding: 14, background: '#1e293b', borderRadius: 10, border: '1px solid #334155', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: '#94a3b8' }}>Avanzamento analisi:</span>
              <span style={{ fontWeight: 800, color: '#38bdf8' }}>{progressPercent}%</span>
            </div>
            <div style={{ width: '100%', background: '#0f172a', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, background: '#38bdf8', height: '100%', transition: 'width 0.1s linear' }} />
            </div>
          </div>
        )}

        {/* --- INDICATORI ROM E POTENZA --- */}
        <div style={{ marginTop: 16, padding: 16, background: '#1e293b', color: '#fff', borderRadius: 12, border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Ripetizioni</span>
              <span style={{ fontSize: 34, fontWeight: 900, color: '#38bdf8', lineHeight: 1.1 }}>{repCount}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Potenza (Watt)</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#f43f5e', lineHeight: 1.1 }}>
                {powerScore} W
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #334155', paddingTop: 12 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                <span style={{ color: '#94a3b8' }}>ROM</span>
                <span style={{ color: getRomColor(romQuality) }}>{romQuality}%</span>
              </div>
              <div style={{ width: '100%', height: 10, background: '#0f172a', borderRadius: 5, overflow: 'hidden', border: '1px solid #334155' }}>
                <div 
                  style={{ 
                    width: `${romQuality}%`, 
                    height: '100%', 
                    background: getRomColor(romQuality),
                    transition: 'width 0.1s ease, background 0.2s ease' 
                  }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- PLAYER VIDEO / CANVAS --- */}
        <div style={{ position: 'relative', marginTop: 16, width: '100%', background: '#000', borderRadius: 12, overflow: 'hidden', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
          <video 
            ref={videoRef} 
            controls={statusCode === 'success'}
            style={{ display: statusCode === 'success' ? 'block' : 'none', width: '100%', height: 'auto' }} 
            muted={statusCode !== 'success'}
            playsInline 
          />
          <canvas 
            ref={canvasRef} 
            style={{ display: statusCode === 'success' ? 'none' : 'block', width: '100%', height: 'auto' }} 
          />
        </div>

        {/* --- STATO CON SEMAFORO DINAMICO --- */}
        <div style={{ marginTop: 16, padding: 14, border: '1px solid #334155', borderRadius: 10, background: '#1e293b', fontSize: 14, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span 
            style={{ 
              width: 14, 
              height: 14, 
              borderRadius: '50%', 
              backgroundColor: getTrafficLightColor(),
              boxShadow: `0 0 8px ${getTrafficLightColor()}`,
              flexShrink: 0,
              display: 'inline-block'
            }} 
          />
          <div>
            <strong style={{ color: '#38bdf8' }}>Stato:</strong> <span style={{ color: statusCode === 'error' ? '#f43f5e' : '#f8fafc' }}>{status}</span>
          </div>
        </div>

        {analysisResult && (
          <>
            {/* SEZIONE ANALISI GEOMETRICA LOCALE (COLLASSABILE) */}
            <div style={{ marginTop: 20, background: '#1e293b', color: '#fff', borderRadius: 12, border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
              <div 
                onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: '#1e293b',
                  userSelect: 'none'
                }}
              >
                <h3 style={{ margin: 0, color: '#38bdf8', fontSize: 16, fontWeight: 800 }}>
                  📊 Analisi Geometrica Locale {repCount > 0 ? `(${repCount} Reps)` : ''}
                </h3>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>
                  {isAnalysisOpen ? '▲ Chiudi' : '▼ Espandi'}
                </span>
              </div>

              {isAnalysisOpen && (
                <div style={{ padding: '0 18px 18px 18px', borderTop: '1px solid #334155' }}>
                  <p style={{ margin: '12px 0 6px 0', fontSize: 14 }}><strong>Ripetizioni valide:</strong> {repCount}</p>
                  <p style={{ margin: '6px 0', fontSize: 14 }}><strong>Range Angolare (Min / Max):</strong> {analysisResult.minAngle}° / {analysisResult.maxAngle}°</p>
                  <p style={{ margin: '6px 0 12px 0', fontSize: 13, color: '#94a3b8' }}>{analysisResult.trendSummary}</p>

                  {repPeakPowers.length > 0 && (
                    <div style={{ marginTop: 12, padding: 12, background: '#0f172a', borderRadius: 10, border: '1px solid #334155' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
                        Potenza Massima per Ripetizione
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {repPeakPowers.map((pwr, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                            <span style={{ color: '#cbd5e1' }}>Ripetizione #{idx + 1}</span>
                            <span style={{ fontWeight: 800, color: '#f43f5e' }}>{pwr} W</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SEZIONE GEMINI AI COACH (SEMPRE VISIBILE) */}
            <div style={{ marginTop: 16, padding: 18, background: '#1e293b', color: '#fff', borderRadius: 12, border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#f43f5e', fontSize: 16, fontWeight: 800 }}>🤖 Gemini AI Coach (Singolo Cue)</h4>
              {isAiLoading ? (
                <p style={{ fontSize: 14, fontStyle: 'italic', color: '#94a3b8' }}>Il server sta interrogando Gemini con i dati geometrici...</p>
              ) : (
                <div style={{ padding: 14, background: '#0f172a', borderRadius: 10, borderLeft: '4px solid #f43f5e', border: '1px solid #334155' }}>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: '#f8fafc' }}>{aiFeedback}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;