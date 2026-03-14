// ============================================================
// tts.js – Text zu Sprache mit Familienstimme (HuggingFace Space)
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

async function vietnamesischSprechen(text) {
  if (!HF_SPACE_URL) {
    throw new Error('HF_SPACE_URL fehlt in der .env Datei!');
  }

  console.log(`  → HuggingFace Space spricht: "${text.slice(0, 50)}..."`);

  const teile   = textAufteilen(text);
  const buffers = [];

  for (const teil of teile) {
    // Gradio API aufrufen
    const antwort = await axios.post(
      `${HF_SPACE_URL}/api/predict`,
      { data: [teil] },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000, // 2 Minuten Timeout (CPU kann langsam sein)
      }
    );

    // Audio-URL aus der Antwort holen
    const audioInfo = antwort.data.data[0];
    const audioUrl  = audioInfo.url
      ? audioInfo.url
      : `${HF_SPACE_URL}/file=${audioInfo}`;

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
