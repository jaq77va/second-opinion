import { useState, useRef } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { analyzeExerciseGeometry, type AnalysisResult } from './biomechanicsEngine';
import { getGeminiFeedback } from './geminiCoach';

type Exercise = 'squat' | 'stacco' | 'panca_piana' | 'lat_machine' | 'alzate_laterali';

const EXERCISES: { id: Exercise; label: string; viewHint: string }[] = [
  { id: 'squat', label: 'Squat', viewHint: 'Inquadratura laterale o frontale a figura intera' },
  { id: 'stacco', label: 'Stacco da terra', viewHint: 'Inquadratura laterale a altezza bacino' },
  { id: 'panca_piana', label: 'Panca piana', viewHint: 'Inquadratura laterale o obliqua a 45°' },
  { id: 'lat_machine', label: 'Lat machine', viewHint: 'Inquadratura posteriore o laterale' },
  { id: 'alzate_laterali', label: 'Alzate laterali manubri', viewHint: 'Inquadratura frontale dal bacino in su' },
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

export function App() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise>('squat');
  const [status, setStatus] = useState<string>('Pronto. Seleziona un esercizio e carica il video.');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [repCount, setRepCount] = useState<number>(0);
  const [currentEffortPercent, setCurrentEffortPercent] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarksBufferRef = useRef<any[][]>([]);

  const currentHint = EXERCISES.find((ex) => ex.id === selectedExercise)?.viewHint;

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setProgressPercent(0);
    setAnalysisResult(null);
    setAiFeedback('');
    setRepCount(0);
    setCurrentEffortPercent(0);
    setStatus('Caricamento modello AI locale in corso...');
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

        const MAX_WIDTH = 480;
        const FRAME_SKIP = 3;
        let frameCounter = 0;
        let targetWidth = 640;
        let targetHeight = 480;

        let repState = 'UP';
        let localReps = 0;

        video.onloadedmetadata = () => {
          const originalWidth = video.videoWidth || 640;
          const originalHeight = video.videoHeight || 480;
          const scale = MAX_WIDTH / originalWidth;
          targetWidth = MAX_WIDTH;
          targetHeight = Math.round(originalHeight * scale);

          canvas.width = targetWidth;
          canvas.height = targetHeight;

          setStatus('Analisi biomeccanica e conteggio reps in corso...');
          video.play();

          const processFrame = () => {
            if (video.duration) {
              const currentProgress = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
              setProgressPercent(currentProgress);
            }

            if (video.ended || video.paused) {
              setIsProcessing(false);
              setProgressPercent(100);
              setCurrentEffortPercent(0);
              setStatus('Analisi geometrica completata!');
              
              const geomResult = analyzeExerciseGeometry(selectedExercise, landmarksBufferRef.current);
              setAnalysisResult(geomResult);

              setIsAiLoading(true);
              setStatus('Generazione del feedback intelligente con Gemini (Server)...');
              
              getGeminiFeedback(selectedExercise, geomResult.minAngle, geomResult.maxAngle, geomResult.trendSummary)
                .then((feedback) => {
                  setAiFeedback(feedback);
                  setIsAiLoading(false);
                  setStatus('Analisi e Coaching completati con successo!');
                })
                .catch((err) => {
                  setAiFeedback(`Errore AI: ${err.message}`);
                  setIsAiLoading(false);
                  setStatus('Completato con errore IA.');
                });

              landmarker.close();
              return;
            }

            frameCounter++;
            let currentLandmarks: any = null;

            if (frameCounter % FRAME_SKIP === 0) {
              const result = landmarker.detectForVideo(video, performance.now());
              if (result.landmarks && result.landmarks.length > 0) {
                currentLandmarks = result.landmarks[0];
                landmarksBufferRef.current.push(currentLandmarks);

                try {
                  let primaryAngle = 180;
                  if (selectedExercise === 'squat' || selectedExercise === 'stacco') {
                    primaryAngle = calculateLiveAngle(currentLandmarks[23], currentLandmarks[25], currentLandmarks[27]);
                  } else if (selectedExercise === 'panca_piana' || selectedExercise === 'lat_machine') {
                    primaryAngle = calculateLiveAngle(currentLandmarks[11], currentLandmarks[13], currentLandmarks[15]);
                  } else if (selectedExercise === 'alzate_laterali') {
                    primaryAngle = calculateLiveAngle(currentLandmarks[23], currentLandmarks[11], currentLandmarks[13]);
                  }

                  const minAngleBound = 70;
                  const maxAngleBound = 180;
                  let effort = ((maxAngleBound - primaryAngle) / (maxAngleBound - minAngleBound)) * 100;
                  effort = Math.max(0, Math.min(100, Math.round(effort)));
                  setCurrentEffortPercent(effort);

                  if (repState === 'UP' && primaryAngle < 110) {
                    repState = 'DOWN';
                  } else if (repState === 'DOWN' && primaryAngle > 150) {
                    repState = 'UP';
                    localReps++;
                    setRepCount(localReps);
                  }
                } catch (err) {}
              }
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
                  if (p1 && p2 && p1.visibility && p1.visibility > 0.5 && p2.visibility && p2.visibility > 0.5) {
                    ctx.beginPath();
                    ctx.moveTo(p1.x * targetWidth, p1.y * targetHeight);
                    ctx.lineTo(p2.x * targetWidth, p2.y * targetHeight);
                    ctx.stroke();
                  }
                });

                ctx.fillStyle = '#ff0055';
                currentLandmarks.forEach((lm: any) => {
                  if (lm.visibility && lm.visibility > 0.5) {
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
        };
      });
    }).catch((err) => {
      setIsProcessing(false);
      setStatus(`Errore caricamento modello: ${(err as Error).message}`);
    });
  };

  const getEffortColor = (effort: number) => {
    if (effort < 50) return '#22c55e';
    if (effort < 80) return '#eab308';
    return '#ef4444';
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Second Opinion</h2>
      <p style={{ fontSize: 14, color: '#555' }}>Biomeccanica Locale · Zero Upload Video</p>

      <label style={{ display: 'block', marginTop: 16, fontWeight: 'bold' }}>1. Scegli esercizio</label>
      <select
        value={selectedExercise}
        onChange={(e) => setSelectedExercise(e.target.value as Exercise)}
        style={{ width: '100%', padding: 10, marginTop: 6, fontSize: 16 }}
        disabled={isProcessing}
      >
        {EXERCISES.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.label}
          </option>
        ))}
      </select>

      <div style={{ background: '#f4f6f8', padding: 10, borderRadius: 6, marginTop: 10, fontSize: 13 }}>
        <strong>Inquadratura consigliata:</strong> {currentHint}
      </div>

      <label style={{ display: 'block', marginTop: 20, fontWeight: 'bold' }}>2. Carica video</label>
      <input
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        style={{ marginTop: 8, width: '100%' }}
        disabled={isProcessing}
      />

      {isProcessing && (
        <div style={{ marginTop: 15, padding: 12, background: '#1e293b', borderRadius: 8, color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
            <span>Avanzamento analisi:</span>
            <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{progressPercent}%</span>
          </div>
          <div style={{ width: '100%', background: '#334155', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, background: '#38bdf8', height: '100%', transition: 'width 0.1s linear' }} />
          </div>
        </div>
      )}

      <div style={{ marginTop: 15, padding: 15, background: '#0f172a', color: '#fff', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 'bold', color: '#94a3b8', display: 'block' }}>Ripetizioni completate</span>
          <span style={{ fontSize: 28, fontWeight: '900', color: '#38bdf8' }}>{repCount}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>Sforzo Corrente</span>
            <span style={{ fontSize: 13, fontWeight: 'bold', color: getEffortColor(currentEffortPercent) }}>
              {currentEffortPercent}%
            </span>
          </div>
          <div style={{ width: 14, height: 45, background: '#1e293b', borderRadius: 4, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', border: '1px solid #334155' }}>
            <div 
              style={{ 
                width: '100%', 
                height: `${currentEffortPercent}%`, 
                background: getEffortColor(currentEffortPercent),
                transition: 'height 0.1s ease, background 0.2s ease' 
              }} 
            />
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 15, width: '100%', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
        <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
        <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      <div style={{ marginTop: 15, padding: 12, border: '1px solid #ddd', borderRadius: 6, background: '#fafafa' }}>
        <strong>Stato:</strong> {status}
      </div>

      {analysisResult && (
        <div style={{ marginTop: 20, padding: 16, background: '#1e293b', color: '#fff', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: 18 }}>Analisi Geometrica Locale</h3>
          <p style={{ margin: '6px 0', fontSize: 14 }}><strong>Ripetizioni valide:</strong> {repCount}</p>
          <p style={{ margin: '6px 0', fontSize: 14 }}><strong>Range Angolare (Min / Max):</strong> {analysisResult.minAngle}° / {analysisResult.maxAngle}°</p>
          <p style={{ margin: '6px 0', fontSize: 13, color: '#94a3b8' }}>{analysisResult.trendSummary}</p>

          <div style={{ marginTop: 16, borderTop: '1px solid #334155', paddingTop: 12 }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f43f5e', fontSize: 16 }}>🤖 Gemini AI Coach (Singolo Cue)</h4>
            {isAiLoading ? (
              <p style={{ fontSize: 14, fontStyle: 'italic', color: '#cbd5e1' }}>Il server sta interrogando Gemini con i dati geometrici...</p>
            ) : (
              <div style={{ padding: 10, background: '#0f172a', borderRadius: 6, borderLeft: '4px solid #f43f5e' }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{aiFeedback}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;