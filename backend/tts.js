// ============================================================
// tts.js – Text zu Sprache mit ElevenLabs
// ============================================================

const axios = require('axios');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'nxUQgc5DYfK7TMXROBwe';

async function vietnamesischSprechen(text) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY fehlt!');
  }

  console.log(`  → ElevenLabs spricht: "${text.slice(0, 50)}..."`);

  const antwort = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      text: text,
      model_id: 'eleven_turbo_v2_5',
      language_code: 'vi',
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
