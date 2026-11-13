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

export function App() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise>('squat');
  const [status, setStatus] = useState<string>('Pronto. Seleziona un esercizio e carica il video.');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarksBufferRef = useRef<any[][]>([]);

  const currentHint = EXERCISES.find((ex) => ex.id === selectedExercise)?.viewHint;

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setAnalysisResult(null);
    setAiFeedback('');
    setStatus('Caricamento modello AI locale in corso...');
    landmarksBufferRef.current = [];

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: './models/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      video.src = URL.createObjectURL(file);

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          resolve();
        };
      });

      setStatus('Analisi biomeccanica locale in corso...');
      video.play();

      const processFrame = () => {
        if (video.ended || video.paused) {
          setIsProcessing(false);
          setStatus('Analisi geometrica completata!');
          
          // 1. Calcolo geometrico locale
          const geomResult = analyzeExerciseGeometry(selectedExercise, landmarksBufferRef.current);
          setAnalysisResult(geomResult);

          // 2. Richiesta di coaching protetta tramite il backend
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

        const result = landmarker.detectForVideo(video, performance.now());

        if (result.landmarks && result.landmarks.length > 0) {
          landmarksBufferRef.current.push(result.landmarks[0]);
        }

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          if (result.landmarks && result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];

            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 3;
            POSE_CONNECTIONS.forEach(([i, j]) => {
              const p1 = landmarks[i];
              const p2 = landmarks[j];
              if (p1 && p2 && p1.visibility && p1.visibility > 0.5 && p2.visibility && p2.visibility > 0.5) {
                ctx.beginPath();
                ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                ctx.stroke();
              }
            });

            ctx.fillStyle = '#ff0055';
            landmarks.forEach((lm) => {
              if (lm.visibility && lm.visibility > 0.5) {
                ctx.beginPath();
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI);
                ctx.fill();
              }
            });
          }
        }

        requestAnimationFrame(processFrame);
      };

      requestAnimationFrame(processFrame);

    } catch (err) {
      setIsProcessing(false);
      setStatus(`Errore: ${(err as Error).message}`);
    }
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

      <div style={{ position: 'relative', marginTop: 20, width: '100%', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
        <video ref={videoRef} style={{ display: 'none' }} muted playsInline />
        <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      <div style={{ marginTop: 15, padding: 12, border: '1px solid #ddd', borderRadius: 6, background: '#fafafa' }}>
        <strong>Stato:</strong> {status}
      </div>

      {analysisResult && (
        <div style={{ marginTop: 20, padding: 16, background: '#1e293b', color: '#fff', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: 18 }}>Analisi Geometrica Locale</h3>
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