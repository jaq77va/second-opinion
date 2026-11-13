export async function getGeminiFeedback(
  apiKey: string,
  exercise: string,
  minAngle: number,
  maxAngle: number,
  angleTrendSummary: string
): Promise<string> {
  if (!apiKey || apiKey.trim() === '') {
    return "Inserisci una Google AI Studio API Key valida nel campo in alto per ricevere il feedback dall'IA.";
  }

  const prompt = `Sei un preparatore atletico professionista e uno specialista in biomeccanica dello sport.
L'atleta ha appena eseguito l'esercizio: ${exercise}.
Dati cinematici estratti localmente tramite computer vision:
- Angolo minimo registrato (punto di massimo carico/affondo): ${minAngle}°
- Angolo massimo registrato (estensione/ritorno): ${maxAngle}°
- Andamento cinematico della serie: ${angleTrendSummary}

Analizza questi dati numerici con rigore tecnico ma con un tono diretto, motivante e da coach esperto.
Fornisci UN UNICO consiglio correttivo principale (il "Singolo Cue") chiaro, azionabile e mirato, spiegando brevemente il perché in base ai gradi registrati. Evita elenchi lunghi: scrivi un paragrafo discorsivo ed efficace.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `Errore HTTP ${response.status}`);
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Nessuna risposta generata dal modello.';
    return text.trim();
  } catch (err) {
    return `Errore durante la chiamata a Gemini: ${(err as Error).message}`;
  }
}