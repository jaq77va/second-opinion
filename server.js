import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint protetto per il coaching di Gemini
app.post('/api/coach', async (req, res) => {
  const { exercise, minAngle, maxAngle, trendSummary } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY non configurata sul server.' });
  }

  const prompt = `Sei un preparatore atletico professionista e uno specialista in biomeccanica dello sport.
L'atleta ha appena eseguito l'esercizio: ${exercise}.
Dati cinematici estratti localmente tramite computer vision:
- Angolo minimo registrato (punto di massimo carico/affondo): ${minAngle}°
- Angolo massimo registrato (estensione/ritorno): ${maxAngle}°
- Andamento cinematico della serie: ${trendSummary}

Analizza questi dati numerici con rigore tecnico ma con un tono diretto, motivante e da coach esperto.
Fornisci UN UNICO consiglio correttivo principale (il "Singolo Cue") chiaro, azionabile e mirato, spiegando brevemente il perché in base ai gradi registrati. Evita elenchi lunghi: scrivi un paragrafo discorsivo ed efficace.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Errore HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nessuna risposta generata.';
    res.json({ feedback: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve i file statici del frontend React (dopo il build)
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});