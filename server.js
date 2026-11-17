import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint protetto per il coaching di Gemini (con istruzioni orientate ai consigli pratici e senza gradi)
app.post('/api/coach', async (req, res) => {
  const { exercise, minAngle, maxAngle, trendSummary } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY non configurata sul server.' });
  }

  const prompt = `Sei un preparatore atletico professionista e un personal trainer di grande esperienza in sala pesi.
L'atleta ha appena eseguito l'esercizio: ${exercise}.
Dati cinematici di sintesi:
- ROM/Ampiezza del movimento registrata: ${minAngle}° (min) / ${maxAngle}° (max)
- Andamento generale: ${trendSummary}

REGOLE TASSATIVE PER LA RISPOSTA:
1. NON MENZIONARE MAI GRADI, ANGOLI O NUMERI TECNICI (es. vieta l'uso di parole come "gradi", "45°", "90°", ecc.). L'utente è in mezzo all'allenamento e non deve fare calcoli matematici.
2. Parla con un tono diretto, motivante, semplice e focalizzato sull'azione pratica (usa il "tu").
3. Fornisci UN UNICO consiglio correttivo principale (il "Singolo Cue") visivo e immediato, spiegando con parole di tutti i giorni cosa correggere nella postura o nella spinta (es. "pensa a sederti più indietro", "spingi di più sui talloni", "apri meglio le braccia").
4. Scrivi un paragrafo discorsivo ed efficace, senza elenchi puntati o preamboli formali.`;

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