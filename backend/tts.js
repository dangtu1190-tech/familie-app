// ============================================================
// tts.js – Text zu Sprache mit Familienstimme (HuggingFace Space)
// Gradio 5.x/6.x API (queue-basiert)
// ============================================================

const axios = require('axios');

const HF_SPACE_URL = process.env.HF_SPACE_URL || '';

// Text aufteilen (max ~200 Zeichen pro Anfrage)
function textAufteilen(text, maxLaenge = 180) {
  const saetze = text.split(/([.!?。،؟]\s*)/);
  const teile  = [];
  let aktuell  = '';

  for (const satz of saetze) {
    if ((aktuell + satz).length > maxLaenge && aktuell) {
      teile.push(aktuell.trim());
      aktuell = satz;
    } else {
      aktuell += satz;
    }
  }
  if (aktuell.trim()) teile.push(aktuell.trim());
  return teile.filter(t => t.length > 0);
}

// Gradio 5.x/6.x: POST → event_id, dann GET (SSE) → Ergebnis
async function gradioVorhersage(text) {
  // Schritt 1: Job starten
  const startAntwort = await axios.post(
    `${HF_SPACE_URL}/gradio_api/call/predict`,
    { data: [text] },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );

  const eventId = startAntwort.data.event_id;
  if (!eventId) throw new Error('Keine event_id von Gradio erhalten');

  // Schritt 2: Auf Ergebnis warten (SSE-Stream lesen)
  const ergebnisAntwort = await axios.get(
    `${HF_SPACE_URL}/gradio_api/call/predict/${eventId}`,
    {
      responseType: 'text',
      timeout: 180000, // 3 Minuten (CPU ist langsam)
    }
  );

  // SSE-Stream parsen: "data: {...}" Zeilen suchen
  const zeilen = ergebnisAntwort.data.split('\n');
  for (const zeile of zeilen) {
    if (zeile.startsWith('data: ')) {
      const json = JSON.parse(zeile.slice(6));
      if (json && json.length > 0) {
        return json[0]; // Audio-Info zurückgeben
      }
    }
  }

  throw new Error('Kein Audio in der Gradio-Antwort gefunden');
}

async function vietnamesischSprechen(text) {
  if (!HF_SPACE_URL) {
    throw new Error('HF_SPACE_URL fehlt in der .env Datei!');
  }

  console.log(`  → HuggingFace Space spricht: "${text.slice(0, 50)}..."`);

  const teile   = textAufteilen(text);
  const buffers = [];

  for (const teil of teile) {
    const audioInfo = await gradioVorhersage(teil);

    // Audio-URL aus der Antwort holen
    const audioUrl = audioInfo.url
      ? audioInfo.url
      : `${HF_SPACE_URL}/gradio_api/file=${audioInfo.path || audioInfo}`;

    // Audio herunterladen
    const audioAntwort = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
    });

    buffers.push(Buffer.from(audioAntwort.data));
  }

  return Buffer.concat(buffers);
}

module.exports = { vietnamesischSprechen };
