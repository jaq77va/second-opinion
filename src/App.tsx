import { useState, useRef } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

type Exercise = 'squat' | 'stacco' | 'panca_piana' | 'lat_machine' | 'alzate_laterali';

const EXERCISES: { id: Exercise; label: string; viewHint: string }[] = [
  { id: 'squat', label: 'Squat', viewHint: 'Inquadratura laterale o frontale a figura intera' },
  { id: 'stacco', label: 'Stacco da terra', viewHint: 'Inquadratura laterale a altezza bacino' },
  { id: 'panca_piana', label: 'Panca piana', viewHint: 'Inquadratura laterale o obliqua a 45°' },
  { id: 'lat_machine', label: 'Lat machine', viewHint: 'Inquadratura posteriore o laterale' },
  { id: 'alzate_laterali', label: 'Alzate laterali manubri', viewHint: 'Inquadratura frontale dal bacino in su' },
];

export function App() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise>('squat');
  const [status, setStatus] = useState<string>('Pronto. Seleziona un video dal rullino.');
  const [framesExtracted, setFramesExtracted] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !videoRef.current) return;

    setStatus('Caricamento modello AI in corso...');
    setFramesExtracted(0);

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      const video = videoRef.current;
      video.src = URL.createObjectURL(file);

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      setStatus('Analisi frame in corso (100% locale)...');
      const step = 0.05; // 20 FPS
      let currentTime = 0;
      let count = 0;

      while (currentTime < video.duration) {
        video.currentTime = currentTime;
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });

        const result = landmarker.detectForVideo(video, performance.now());
        if (result.landmarks && result.landmarks.length > 0) {
          count++;
        }
        currentTime += step;
      }

      setFramesExtracted(count);
      setStatus(`Completato! Estratti ${count} frame validi senza inviare dati al server.`);
      landmarker.close();
    } catch (err) {
      setStatus(`Errore durante l'analisi: ${(err as Error).message}`);
    }
  };

  const currentHint = EXERCISES.find((ex) => ex.id === selectedExercise)?.viewHint;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Second Opinion</h2>
      <p style={{ fontSize: 14, color: '#555' }}>Analisi biomeccanica locale · Zero upload</p>

      <label style={{ display: 'block', marginTop: 16, fontWeight: 'bold' }}>1. Scegli esercizio</label>
      <select
        value={selectedExercise}
        onChange={(e) => setSelectedExercise(e.target.value as Exercise)}
        style={{ width: '100%', padding: 10, marginTop: 6, fontSize: 16 }}
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

      <label style={{ display: 'block', marginTop: 20, fontWeight: 'bold' }}>2. Carica video dalla galleria</label>
      <input
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        style={{ marginTop: 8, width: '100%' }}
      />

      <video ref={videoRef} style={{ display: 'none' }} muted playsInline />

      <div style={{ marginTop: 20, padding: 12, border: '1px solid #ddd', borderRadius: 6 }}>
        <strong>Stato:</strong> {status}
        {framesExtracted > 0 && <p style={{ margin: '8px 0 0', color: 'green' }}>Landmark rilevati con successo.</p>}
      </div>
    </div>
  );
}

export default App;