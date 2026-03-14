// ============================================================
// stimme-hochladen.js
// Lädt die Familienstimme zu ElevenLabs hoch und speichert
// die neue Voice ID automatisch in der .env Datei
//
// Verwendung: node tools/stimme-hochladen.js
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios    = require('axios');

const API_KEY    = process.env.ELEVENLABS_API_KEY;
const AUDIO_PFAD = path.join(__dirname, '../../WhatsApp Audio 2026-03-14 at 15.05.50.mp4');
const ENV_PFAD   = path.join(__dirname, '../.env');

async function stimmeHochladen() {
  console.log('🎙️  Lade Familienstimme zu ElevenLabs hoch...');
  console.log('   Datei:', AUDIO_PFAD);

  if (!fs.existsSync(AUDIO_PFAD)) {
    console.error('❌ Audio-Datei nicht gefunden:', AUDIO_PFAD);
    process.exit(1);
  }

  const form = new FormData();
  form.append('name', 'Familienstimme');
  form.append('description', 'Stimme vom Familienmitglied (WhatsApp Audio)');
  form.append('files', fs.createReadStream(AUDIO_PFAD), {
    filename:    'familienstimme.mp4',
    contentType: 'audio/mp4',
  });

  try {
    const antwort = await axios.post(
      'https://api.elevenlabs.io/v1/voices/add',
      form,
      {
        headers: {
          'xi-api-key': API_KEY,
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength:    Infinity,
      }
    );

    const voiceId = antwort.data.voice_id;
    console.log('\n✅ Stimme erfolgreich hochgeladen!');
    console.log('   Voice ID:', voiceId);

    // .env Datei aktualisieren
    let envInhalt = fs.readFileSync(ENV_PFAD, 'utf-8');
    envInhalt = envInhalt.replace(
      /ELEVENLABS_VOICE_ID=.*/,
      `ELEVENLABS_VOICE_ID=${voiceId}`
    );
    fs.writeFileSync(ENV_PFAD, envInhalt, 'utf-8');

    console.log('   .env wurde aktualisiert ✅');
    console.log('\n🚀 Starte den Server neu mit: npm start');

  } catch (fehler) {
    const status  = fehler.response?.status;
    const details = fehler.response?.data?.detail;
    console.error(`\n❌ Fehler ${status}:`, details?.message || fehler.message);

    if (status === 401) console.error('   → API Key falsch oder abgelaufen');
    if (status === 402) console.error('   → Gratis-Plan voll, Voice Cloning nicht verfügbar');
    if (status === 422) console.error('   → Audio-Datei zu kurz (min. 1 Minute empfohlen)');
  }
}

stimmeHochladen();
