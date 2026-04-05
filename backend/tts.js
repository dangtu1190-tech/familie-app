// ============================================================
// tts.js – Text zu Sprache mit ElevenLabs
// ============================================================

const axios = require('axios');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'nxUQgc5DYfK7TMXROBwe';

// Pausen einfügen damit Wörter klar getrennt gesprochen werden
function textMitPausen(text) {
  // Nach Kommas, Zeilenumbrüchen und Aufzählungen Pausen einfügen
  return text
    .replace(/,\s*/g, ', ... ')        // Pause nach Komma
    .replace(/\n/g, ' ... ... ')       // Längere Pause bei neuer Zeile
    .replace(/:\s*/g, ': ... ');       // Pause nach Doppelpunkt
}

async function vietnamesischSprechen(text) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY fehlt!');
  }

  const textPausen = textMitPausen(text);
  console.log(`  → ElevenLabs spricht: "${textPausen.slice(0, 50)}..."`);

  const antwort = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      text: textPausen,
      model_id: 'eleven_turbo_v2_5',
      language_code: 'vi',
      speed: 0.75,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    },
    {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      responseType: 'arraybuffer',
      timeout: 60000
    }
  );

  return Buffer.from(antwort.data);
}

module.exports = { vietnamesischSprechen };
