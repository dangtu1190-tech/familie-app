// ============================================================
// elevenlabs.js – Verbindung zu ElevenLabs (Text → Sprache)
// ============================================================

const axios = require('axios');

// ------------------------------------------------------------
// Funktion: Text in Sprache umwandeln (vietnamesische Familienstimme)
// Gibt einen Audio-Buffer zurück, der direkt abgespielt werden kann
// ------------------------------------------------------------
async function textInSpracheUmwandeln(text) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const apiKey  = process.env.ELEVENLABS_API_KEY;

  if (!voiceId || !apiKey) {
    throw new Error('ELEVENLABS_VOICE_ID oder ELEVENLABS_API_KEY fehlt in der .env Datei');
  }

  console.log(`  → ElevenLabs spricht: "${text.slice(0, 50)}..."`);

  const antwort = await axios({
    method: 'post',
    url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    headers: {
      'Accept':       'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key':   apiKey,
    },
    data: {
      text: text,
      model_id: 'eleven_multilingual_v2', // Unterstützt Vietnamesisch
      voice_settings: {
        stability:        0.5,  // Stabilität der Stimme (0–1)
        similarity_boost: 0.75, // Ähnlichkeit zur Originalstimme (0–1)
      },
    },
    responseType: 'arraybuffer', // Audio als Byte-Array zurückgeben
  });

  return Buffer.from(antwort.data);
}

module.exports = { textInSpracheUmwandeln };
