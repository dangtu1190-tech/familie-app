// ============================================================
// llm.js – Verbindung zu Langdock / GPT-4.1
// ============================================================

const OpenAI = require('openai');

// Langdock-Client erstellen
// Langdock ist OpenAI-kompatibel → wir nutzen das openai-Paket
// und ändern nur die Basis-URL auf Langdock
const client = new OpenAI({
  apiKey:  process.env.LANGDOCK_API_KEY,
  baseURL: process.env.LANGDOCK_API_URL, // z.B. https://api.langdock.com/openai/eu1/v1
});

const MODELL_OCR         = process.env.LANGDOCK_MODEL         || 'gpt-4.1-eu';
const MODELL_UEBERSETZUNG = process.env.LANGDOCK_MODEL_TRANSLATION || MODELL_OCR;

// ------------------------------------------------------------
// Funktion 1: Text aus einem Foto lesen (OCR mit Vision)
// ------------------------------------------------------------
async function textAusFotoLesen(bildBase64, bildMimeType = 'image/jpeg') {
  console.log('  → GPT-4.1 liest Text aus Foto...');

  const antwort = await client.chat.completions.create({
    model: MODELL_OCR,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${bildMimeType};base64,${bildBase64}`,
            },
          },
          {
            type: 'text',
            text: 'Lies den gesamten Text aus diesem Bild ab. Antworte NUR mit dem erkannten Text, ohne Erklärungen oder Kommentare. Erhalte alle Zeilenumbrüche und Formatierungen. Wenn kein Text erkennbar ist, antworte mit "Kein Text gefunden".',
          },
        ],
      },
    ],
  });

  return antwort.choices[0].message.content;
}

// ------------------------------------------------------------
// Funktion 2: Deutschen Text ins Südvietnamesische übersetzen
// ------------------------------------------------------------
async function textUebersetzen(deutscherText) {
  console.log('  → GPT-4.1 übersetzt Text...');

  const antwort = await client.chat.completions.create({
    model: MODELL_UEBERSETZUNG,
    max_tokens: 4096,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `Du bist ein Übersetzungsassistent für eine südvietnamesische Familie in Deutschland.
Übersetze den GESAMTEN deutschen Text ins Südvietnamesische (giọng Nam / miền Nam) – auch Absender, Adresszeilen, Betreff und Grußformel.
Benutze IMMER südvietnamesisches Vokabular: muỗng, heo, bắp, mắc, thơm, chén, tui, dạ.
Deutsche Wörter lässt du auf Deutsch – markiere sie mit [D]...[/D] Tags. Das betrifft:
- Straßennamen, Städte, Postleitzahlen: [D]Rosenheimer Straße 42[/D], [D]81669 München[/D]
- Behörden, Firmen, Institutionen: [D]Einwohnermeldeamt[/D], [D]Stadtwerke München[/D]
- Vor- und Nachnamen von Personen: [D]Hans Müller[/D], [D]Familie Nguyen[/D]
- Uhrzeiten: [D]10:00 Uhr[/D]
Datumsangaben übersetzt du ins Vietnamesische: "20. März 2026" → "ngày 20 tháng 3 năm 2026".
Übersetze JEDEN Satz und JEDE Zeile – lasse nichts weg.
Antworte NUR mit der Übersetzung inklusive [D] Tags, ohne Erklärungen.`,
      },
      {
        role: 'user',
        content: deutscherText,
      },
    ],
  });

  return antwort.choices[0].message.content;
}

module.exports = { textAusFotoLesen, textUebersetzen };
