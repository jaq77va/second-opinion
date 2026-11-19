import { useState, useRef, useEffect } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { AuthScreen } from './components/AuthScreen';
import { analyzeExerciseGeometry, type AnalysisResult } from './biomechanicsEngine';
import { getGeminiFeedback } from './geminiCoach';

type Exercise = 'squat' | 'stacco' | 'panca_piana' | 'lat_machine' | 'alzate_laterali';
type PlanType = 'none' | 'trial' | 'quarterly' | 'semiannual' | 'annual';

const EXERCISES: {
  id: Exercise;
  label: string;
  imagePath: string;
  viewHint: string;
  isDumbbell: boolean;
  isTrialAllowed: boolean;
}[] = [
  { id: 'squat', label: 'Squat', imagePath: '/images/squat.png', viewHint: 'Inquadratura laterale o frontale a figura intera', isDumbbell: false, isTrialAllowed: true },
  { id: 'panca_piana', label: 'Panca piana', imagePath: '/images/panca.png', viewHint: 'Inquadratura laterale o obliqua a 45°', isDumbbell: false, isTrialAllowed: true },
  { id: 'stacco', label: 'Stacco da terra', imagePath: '/images/stacco.png', viewHint: 'Inquadratura laterale a altezza bacino', isDumbbell: false, isTrialAllowed: false },
  { id: 'lat_machine', label: 'Lat machine', imagePath: '/images/lat.png', viewHint: 'Inquadratura posteriore o laterale', isDumbbell: false, isTrialAllowed: false },
  { id: 'alzate_laterali', label: 'Alzate laterali', imagePath: '/images/alzate.png', viewHint: 'Inquadratura frontale dal bacino in su', isDumbbell: true, isTrialAllowed: false },
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

// Helper con fallback automatico GPU -> CPU per evitare blocchi WebGL su mobile
async function createLandmarkerWithFallback(vision: any): Promise<PoseLandmarker> {
  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: './models/pose_landmarker_lite.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  } catch (gpuErr) {
    console.warn('GPU delegate non disponibile su questo dispositivo, passo a CPU:', gpuErr);
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: './models/pose_landmarker_lite.task',
        delegate: 'CPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  }
}

function getPlanLabel(plan: PlanType): string {
  switch (plan) {
    case 'trial': return 'Trial 7 Giorni';
    case 'quarterly': return 'Trimestrale';
    case 'semiannual': return 'Semestrale';
    case 'annual': return 'Annuale';
    default: return 'Nessun piano';
  }
}

export function App() {
  // --- STATI AUTENTICAZIONE E ABBONAMENTO ---
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [subLoading, setSubLoading] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<PlanType>('none');
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState<boolean>(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // --- STATI APPLICAZIONE ANALISI BIOMECCANICA ---
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
  const [aiStatusCode, setAiStatusCode] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [aiStatusMessage, setAiStatusMessage] = useState<string>('In attesa di dati geometrici...');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const landmarksBufferRef = useRef<any[][]>([]);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const lastGeomResultRef = useRef<AnalysisResult | null>(null);

  // Carica stato sessione Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Carica abbonamento dell'utente da public.subscriptions
  const fetchUserSubscription = async (userId: string) => {
    setSubLoading(true);
    setPlanError(null);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_type, status, end_date')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setCurrentPlan('none');
        setDaysRemaining(0);
        setIsSubscriptionExpired(false);
        return;
      }

      const endDate = new Date(data.end_date);
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      setCurrentPlan(data.plan_type as PlanType);
      setDaysRemaining(diffDays);
      setIsSubscriptionExpired(diffMs <= 0 || data.status === 'expired');
    } catch (err: any) {
      console.error('Errore lettura abbonamento:', err);
      setPlanError(err?.message || 'Impossibile verificare lo stato dell’abbonamento.');
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUserSubscription(user.id);
    } else {
      setCurrentPlan('none');
      setDaysRemaining(0);
      setIsSubscriptionExpired(false);
    }
  }, [user?.id]);

  // Attiva Trial gratuito di 7 giorni su Supabase
  const handleActivateTrial = async () => {
    if (!user) return;
    setSubLoading(true);
    setPlanError(null);
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);

      const { error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan_type: 'trial',
        status: 'active',
        end_date: endDate.toISOString(),
      });

      if (error) throw error;
      await fetchUserSubscription(user.id);
    } catch (err: any) {
      setPlanError(err?.message || 'Errore durante attivazione del Trial.');
      setSubLoading(false);
    }
  };

  // Predisposizione selezione piano a pagamento (da collegare a Stripe Checkout)
  const handleSelectPaidPlan = async (plan: 'quarterly' | 'semiannual' | 'annual') => {
    // Qui andrà il redirect a Stripe Checkout (es. chiamata a Edge Function / backend)
    alert(`Checkout Stripe per piano "${getPlanLabel(plan)}" in fase di collegamento.`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const selectedExerciseObj = EXERCISES.find((ex) => ex.id === selectedExercise) || EXERCISES[0];
  const currentHint = selectedExerciseObj.viewHint;
  const isExerciseLocked = currentPlan === 'trial' && !selectedExerciseObj.isTrialAllowed;

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

  const triggerAiCoach = (geomResult: AnalysisResult) => {
    setAiStatusCode('processing');
    setAiStatusMessage('Il server sta interrogando Gemini con i dati geometrici...');
    setAiFeedback('');

    getGeminiFeedback(selectedExercise, geomResult.minAngle, geomResult.maxAngle, geomResult.trendSummary)
      .then((feedback) => {
        setAiFeedback(feedback);
        setAiStatusCode('success');
        setAiStatusMessage('Risposta generata con successo');
      })
      .catch((err) => {
        setAiFeedback(`Errore AI: ${err.message}`);
        setAiStatusCode('error');
        setAiStatusMessage(`Errore IA: ${err.message}`);
      });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isExerciseLocked) {
      alert('Questo esercizio è riservato agli abbonati. Passa a un piano completo per sbloccarlo!');
      return;
    }

    const file = e.target.files?.[0];
    if (!file || !videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setProgressPercent(0);
    setAnalysisResult(null);
    setRepPeakPowers([]);
    setIsAnalysisOpen(false);
    setAiFeedback('');
    setAiStatusCode('idle');
    setAiStatusMessage('In attesa di completamento analisi video...');
    setRepCount(0);
    setRomQuality(0);
    setPowerScore(0);
    setStatus('Caricamento modello AI locale in corso...');
    setStatusCode('processing');
    landmarksBufferRef.current = [];

    FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )
      .then((vision) => createLandmarkerWithFallback(vision))
      .then((landmarker) => {
        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');

        // Garantiamo muting esplicito prima del caricamento per soddisfare le policy autoplay mobile
        video.muted = true;
        video.playsInline = true;
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
                  lastGeomResultRef.current = geomResult;

                  triggerAiCoach(geomResult);

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
                            if (transitionStreak >= 1) {
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
                            if (transitionStreak >= 1) {
                              hasReachedInitialPosition = true;
                              transitionStreak = 0;
                            }
                          } else {
                            transitionStreak = 0;
                          }
                        } else if (repPhase === 'START') {
                          if (smoothAngle <= BOTTOM_MAX) {
                            transitionStreak++;
                            if (transitionStreak >= 1) {
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
      })
      .catch((err) => {
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

  const getTrafficLightColor = (code: 'idle' | 'processing' | 'success' | 'error') => {
    switch (code) {
      case 'processing': return '#eab308'; // Giallo
      case 'success': return '#22c55e';    // Verde
      case 'error': return '#ef4444';      // Rosso
      default: return '#94a3b8';           // Grigio
    }
  };

  // ==========================================
  // 1. ATTESA CHECK SESSIONE INIZIALE
  // ==========================================
  if (!authReady) {
    return (
      <div style={{ minHeight: '100vh', background: '#090d16', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Caricamento...
      </div>
    );
  }

  // ==========================================
  // 2. PAGINA ESTERNA DI REGISTRAZIONE / LOGIN
  // ==========================================
  if (!user) {
    return <AuthScreen />;
  }

  // ==========================================
  // 3. SCELTA PIANO (NUOVO UTENTE O PIANO SCADUTO)
  // ==========================================
  if (subLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#090d16', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Verifica abbonamento in corso...
      </div>
    );
  }

  if (currentPlan === 'none' || isSubscriptionExpired) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)', color: '#f8fafc', padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: 460, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{user.email}</span>
            <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
              Esci
            </button>
          </div>

          <h2 style={{ textAlign: 'center', color: '#38bdf8', marginBottom: 6 }}>
            {isSubscriptionExpired ? 'Il tuo piano è scaduto' : 'Scegli il tuo piano'}
          </h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
            Video illimitati su tutti i piani
          </p>

          {planError && (
            <div style={{ padding: 12, marginBottom: 14, borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f43f5e', fontSize: 13 }}>
              {planError}
            </div>
          )}

          {/* Trial 7 Giorni (solo se l'utente non ha già usufruito di un piano) */}
          {currentPlan === 'none' && (
            <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #38bdf8', marginBottom: 14 }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#38bdf8' }}>Trial 7 Giorni</h3>
              <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
                Accesso a 2 esercizi (Squat e Panca piana). Analisi video illimitate per 7 giorni.
              </p>
              <button
                onClick={handleActivateTrial}
                style={{ width: '100%', padding: 10, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
              >
                Attiva Trial Gratuito
              </button>
            </div>
          )}

          {/* Trimestrale */}
          <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #334155', marginBottom: 14 }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#fff' }}>Abbonamento Trimestrale</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
              Tutti gli esercizi sbloccati. Video illimitati per 3 mesi.
            </p>
            <button
              onClick={() => handleSelectPaidPlan('quarterly')}
              style={{ width: '100%', padding: 10, background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
            >
              Scegli Trimestrale
            </button>
          </div>

          {/* Semestrale */}
          <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #334155', marginBottom: 14 }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#fff' }}>Abbonamento Semestrale</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
              Tutti gli esercizi sbloccati. Video illimitati per 6 mesi.
            </p>
            <button
              onClick={() => handleSelectPaidPlan('semiannual')}
              style={{ width: '100%', padding: 10, background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
            >
              Scegli Semestrale
            </button>
          </div>

          {/* Annuale */}
          <div style={{ background: '#1e293b', padding: 18, borderRadius: 12, border: '1px solid #22c55e' }}>
            <h3 style={{ margin: '0 0 6px 0', color: '#22c55e' }}>Abbonamento Annuale (Miglior Valore)</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0' }}>
              Tutti gli esercizi sbloccati. Video illimitati per 12 mesi.
            </p>
            <button
              onClick={() => handleSelectPaidPlan('annual')}
              style={{ width: '100%', padding: 10, background: '#22c55e', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}
            >
              Scegli Annuale
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. AREA PERSONALE + APPLICAZIONE ANALISI
  // ==========================================
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)', 
      color: '#f8fafc',
      paddingBottom: 40
    }}>
      <div style={{ maxWidth: 500, margin: '0 auto', padding: 20, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        
        {/* BARRA AREA PERSONALE / CONTEGGIO GIORNI RIMASTI */}
        <div style={{ background: '#1e293b', padding: '10px 14px', borderRadius: 10, border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 10, color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Piano attivo</span>
            <strong style={{ fontSize: 13, color: '#38bdf8' }}>{getPlanLabel(currentPlan)}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 10, color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Scadenza</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: daysRemaining <= 2 ? '#ef4444' : '#22c55e' }}>
                ⏱ {daysRemaining} {daysRemaining === 1 ? 'giorno' : 'giorni'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: '#cbd5e1', fontSize: 12, cursor: 'pointer' }}
            >
              Esci
            </button>
          </div>
        </div>

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
              const locked = currentPlan === 'trial' && !ex.isTrialAllowed;
              return (
                <div
                  key={ex.id}
                  style={{
                    flex: '0 0 100%',
                    scrollSnapAlign: 'center',
                    boxSizing: 'border-box',
                    padding: '8px 10px',
                    borderRadius: 14,
                    border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                    background: isSelected ? '#1e293b' : '#0f172a',
                    cursor: 'default',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    opacity: locked ? 0.55 : 1,
                    boxShadow: isSelected ? '0 10px 15px -3px rgba(56, 189, 248, 0.15)' : 'none',
                  }}
                >
                  {locked && (
                    <span style={{ position: 'absolute', top: 10, right: 10, background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                      🔒 Abbonati
                    </span>
                  )}
                  <img 
                    src={ex.imagePath} 
                    alt={ex.label} 
                    style={{ width: 110, height: 110, objectFit: 'contain', borderRadius: 8 }} 
                  />
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
          onClick={() => !isProcessing && !isExerciseLocked && fileInputRef.current?.click()}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '22px 16px',
            borderRadius: 12,
            border: isExerciseLocked ? '2px dashed #64748b' : '2px dashed #38bdf8',
            background: isExerciseLocked ? '#0f172a' : isProcessing ? '#1e293b' : 'rgba(56, 189, 248, 0.05)',
            color: '#f8fafc',
            textAlign: 'center',
            cursor: isProcessing || isExerciseLocked ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 32, lineHeight: 1 }}>{isExerciseLocked ? '🔒' : '📤'}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: isExerciseLocked ? '#94a3b8' : '#38bdf8' }}>
            {isExerciseLocked
              ? 'Esercizio bloccato nel piano Trial'
              : isProcessing
              ? 'Elaborazione in corso...'
              : 'Seleziona file video'}
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

        {/* --- STATO VIDEO CON SEMAFORO DINAMICO --- */}
        <div style={{ marginTop: 16, padding: 14, border: '1px solid #334155', borderRadius: 10, background: '#1e293b', fontSize: 14, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span 
            style={{ 
              width: 14, 
              height: 14, 
              borderRadius: '50%', 
              backgroundColor: getTrafficLightColor(statusCode),
              boxShadow: `0 0 8px ${getTrafficLightColor(statusCode)}`,
              flexShrink: 0,
              display: 'inline-block'
            }} 
          />
          <div>
            <strong style={{ color: '#38bdf8' }}>Stato Video:</strong> <span style={{ color: statusCode === 'error' ? '#f43f5e' : '#f8fafc' }}>{status}</span>
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
            preload="auto"
          />
          <canvas 
            ref={canvasRef} 
            style={{ display: statusCode === 'success' ? 'none' : 'block', width: '100%', height: 'auto' }} 
          />
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

            {/* SEZIONE AI COACH */}
            <div style={{ marginTop: 16, padding: 18, background: '#1e293b', color: '#fff', borderRadius: 12, border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span 
                    style={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      backgroundColor: getTrafficLightColor(aiStatusCode),
                      boxShadow: `0 0 8px ${getTrafficLightColor(aiStatusCode)}`,
                      display: 'inline-block',
                      flexShrink: 0
                    }} 
                  />
                  <h4 style={{ margin: 0, color: '#f43f5e', fontSize: 16, fontWeight: 800 }}>AI Coach</h4>
                </div>

                <span style={{ fontSize: 13, color: '#94a3b8' }}>{aiStatusMessage}</span>
              </div>

              {aiStatusCode === 'processing' && (
                <p style={{ fontSize: 14, fontStyle: 'italic', color: '#94a3b8' }}>Elaborazione feedback IA in corso...</p>
              )}

              {aiStatusCode === 'success' && (
                <div style={{ padding: 14, background: '#0f172a', borderRadius: 10, borderLeft: '4px solid #f43f5e', border: '1px solid #334155' }}>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: '#f8fafc' }}>{aiFeedback}</p>
                </div>
              )}

              {aiStatusCode === 'error' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ padding: 14, background: '#0f172a', borderRadius: 10, borderLeft: '4px solid #ef4444', border: '1px solid #334155' }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#f43f5e' }}>{aiFeedback}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => lastGeomResultRef.current && triggerAiCoach(lastGeomResultRef.current)}
                    style={{
                      padding: '10px 16px',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                      boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    🔄 Riprova IA
                  </button>
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