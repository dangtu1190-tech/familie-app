// ============================================================
// anthropic.js – Verbindung zur Claude KI (Anthropic API)
// ============================================================

const Anthropic = require('@anthropic-ai/sdk');

// Claude-Client erstellen (API-Key kommt aus .env)
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ------------------------------------------------------------
// Funktion 1: Text aus einem Foto lesen (OCR)
// Schickt das Bild an Claude und bekommt den enthaltenen Text zurück
// ------------------------------------------------------------
async function textAusFotoLesen(bildBase64, bildMimeType = 'image/jpeg') {
  console.log('  → Claude liest Text aus Foto...');

  const antwort = await client.messages.create({
    model: 'claude-opus-4-5',       // Vision-fähiges Modell
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            // Das Bild als Base64
            type: 'image',
            source: {
              type: 'base64',
              media_type: bildMimeType,
              data: bildBase64,
            },
          },
          {
            // Anweisung an Claude: Nur den Text ausgeben, nichts anderes
            type: 'text',
            text: 'Lies den gesamten Text aus diesem Bild ab. Antworte NUR mit dem erkannten Text, ohne Erklärungen oder Kommentare. Erhalte alle Zeilenumbrüche und Formatierungen. Wenn kein Text erkennbar ist, antworte mit "Kein Text gefunden".',
          },
        ],
      },
    ],
  });

  return antwort.content[0].text;
}

// ------------------------------------------------------------
// Funktion 2: Deutschen Text ins Südvietnamesische übersetzen
// Claude kennt südvietnamesisches Vokabular und behält
// deutsche Eigennamen (Straßen, Ämter) auf Deutsch
// ------------------------------------------------------------
async function textUebersetzen(deutscherText) {
  console.log('  → Claude übersetzt Text...');

  const antwort = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    system: `Du bist ein Übersetzungsassistent für eine südvietnamesische Familie in Deutschland.
Übersetze deutschen Text ins Südvietnamesische (giọng Nam / miền Nam).
Benutze IMMER südvietnamesisches Vokabular: muỗng, heo, bắp, mắc, thơm, chén, tui, dạ.
Deutsche Straßennamen, Städte, Eigennamen und Behörden lässt du IMMER auf Deutsch.
Antworte NUR mit der Übersetzung, ohne Erklärungen.`,
    messages: [
      {
        role: 'user',
        content: deutscherText,
      },
    ],
  });

  return antwort.content[0].text;
}

// Diese Funktionen für andere Dateien verfügbar machen
module.exports = { textAusFotoLesen, textUebersetzen };
