// ============================================================
// server.js – Der Hauptserver der Familie-App
// Startet einen Webserver auf Port 3000 und verbindet
// Frontend mit den KI-APIs (Claude + ElevenLabs)
// ============================================================

// Umgebungsvariablen aus .env laden (API-Keys, Port)
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

// Eigene Module
const { textAusFotoLesen, textUebersetzen } = require('./llm');
const { vietnamesischSprechen }             = require('./tts');

const app  = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// Middleware: Grundeinstellungen des Servers
// ------------------------------------------------------------
app.use(cors());                                             // Erlaubt Anfragen vom Browser
app.use(express.json({ limit: '20mb' }));                   // Große Bilder (Base64) erlauben
app.use(express.static(path.join(__dirname, '../frontend'))); // Frontend-Dateien ausliefern

// ------------------------------------------------------------
// Wörterbuch laden: Nord- → Südvietnamesisch
// ------------------------------------------------------------
const woerterbuchPfad = path.join(__dirname, '../data/woerterbuch.json');
let woerterbuch = [];

try {
  woerterbuch = JSON.parse(fs.readFileSync(woerterbuchPfad, 'utf-8'));
  console.log(`✅ Wörterbuch geladen: ${woerterbuch.length} Einträge`);
} catch (fehler) {
  console.warn('⚠️  Wörterbuch nicht gefunden, fahre ohne fort:', fehler.message);
}

// ------------------------------------------------------------
// Hilfsfunktion: Nordvietnamesische Wörter ersetzen
// Geht durch alle Einträge im Wörterbuch und tauscht aus
// ------------------------------------------------------------
function woerterbuchAnwenden(text) {
  let ergebnis = text;
  for (const eintrag of woerterbuch) {
    // Alle Vorkommen ersetzen, Wortgrenzen beachten
    try {
      const muster = new RegExp(`\\b${eintrag.nord}\\b`, 'gi');
      ergebnis = ergebnis.replace(muster, eintrag.sued);
    } catch {
      // Bei ungültigen Regex einfach direkt ersetzen
      ergebnis = ergebnis.split(eintrag.nord).join(eintrag.sued);
    }
  }
  return ergebnis;
}

// ------------------------------------------------------------
// Hilfsfunktion: Text anhand [D]...[/D] Tags aufteilen
// [D]...[/D] = deutsche Wörter (vom LLM markiert) → Browser spricht Deutsch
// Rest = Vietnamesisch → ElevenLabs spricht Vietnamesisch
// ------------------------------------------------------------
function textInSegmenteAufteilen(text) {
  const segmente = [];
  const regex = /\[D\](.*?)\[\/D\]/gs;
  let letztePos = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Vietnamesischer Teil vor dem deutschen Tag
    if (match.index > letztePos) {
      const viet = text.slice(letztePos, match.index).trim();
      if (viet) segmente.push({ typ: 'vietnamesisch', text: viet });
    }
    // Deutschen Teil hinzufügen
    if (match[1].trim()) segmente.push({ typ: 'deutsch', text: match[1].trim() });
    letztePos = match.index + match[0].length;
  }

  // Restlicher vietnamesischer Text nach dem letzten Tag
  if (letztePos < text.length) {
    const rest = text.slice(letztePos).trim();
    if (rest) segmente.push({ typ: 'vietnamesisch', text: rest });
  }

  return segmente.length > 0
    ? segmente
    : [{ typ: 'vietnamesisch', text: text }];
}

// Entfernt [D]...[/D] Tags für die Anzeige
function tagsEntfernen(text) {
  return text.replace(/\[D\](.*?)\[\/D\]/gs, '$1');
}

// ============================================================
// API-Routen (Endpunkte die das Frontend aufruft)
// ============================================================

// ------------------------------------------------------------
// Route 1: POST /api/ocr
// Nimmt ein Foto entgegen und liest den deutschen Text heraus
// ------------------------------------------------------------
app.post('/api/ocr', async (req, res) => {
  try {
    const { bild, mimeType } = req.body;

    if (!bild) {
      return res.status(400).json({ fehler: 'Kein Bild übermittelt' });
    }

    console.log('\n📸 OCR-Anfrage erhalten...');
    const erkannterText = await textAusFotoLesen(bild, mimeType || 'image/jpeg');
    console.log(`  ✅ Text erkannt: "${erkannterText.slice(0, 80)}..."`);

    res.json({ text: erkannterText });

  } catch (fehler) {
    console.error('❌ OCR-Fehler:', fehler.message);
    res.status(500).json({ fehler: 'Fehler beim Lesen des Textes: ' + fehler.message });
  }
});

// ------------------------------------------------------------
// Route 2: POST /api/uebersetzen
// Übersetzt deutschen Text ins Südvietnamesische
// Wendet danach das Wörterbuch (Nord→Süd) an
// ------------------------------------------------------------
app.post('/api/uebersetzen', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ fehler: 'Kein Text zum Übersetzen' });
    }

    console.log('\n🌐 Übersetzungs-Anfrage erhalten...');

    // Schritt 1: Claude übersetzt
    const roheUebersetzung = await textUebersetzen(text);

    // Schritt 2: Wörterbuch anwenden (nordviet. Wörter → südviet. Wörter)
    const mitTags = woerterbuchAnwenden(roheUebersetzung);

    // Schritt 3: [D] Tags für Anzeige entfernen
    const suedVietnamesisch = tagsEntfernen(mitTags);

    console.log(`  ✅ Übersetzt: "${suedVietnamesisch.slice(0, 80)}..."`);

    // mitTags für Audio zurückgeben, suedVietnamesisch für Anzeige
    res.json({ uebersetzung: suedVietnamesisch, uebersetzungMitTags: mitTags });

  } catch (fehler) {
    console.error('❌ Übersetzungsfehler:', fehler.message);
    res.status(500).json({ fehler: 'Fehler bei der Übersetzung: ' + fehler.message });
  }
});

// ------------------------------------------------------------
// Route 3: POST /api/vorlesen
// Wandelt übersetzten Text in Audio um (zwei Stimmen):
// - Vietnamesischer Text → ElevenLabs (Familienstimme)
// - Deutsche Wörter → Browser Web Speech API (wird im Frontend erledigt)
// Gibt Segmente mit Audio-Daten zurück
// ------------------------------------------------------------
app.post('/api/vorlesen', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ fehler: 'Kein Text zum Vorlesen' });
    }

    console.log('\n🔊 Vorlese-Anfrage erhalten...');

    // Text anhand [D] Tags aufteilen
    const segmente = textInSegmenteAufteilen(text);
    console.log(`  → ${segmente.length} Segmente gefunden`);

    const ergebnisSegmente = [];

    for (const segment of segmente) {
      if (segment.typ === 'vietnamesisch' && segment.text.trim()) {
        const audioBuffer = await vietnamesischSprechen(segment.text);
        ergebnisSegmente.push({
          typ:   'elevenlabs',
          audio: audioBuffer.toString('base64'),
        });
      } else if (segment.typ === 'deutsch' && segment.text.trim()) {
        ergebnisSegmente.push({
          typ:  'deutsch',
          text: segment.text,
        });
      }
    }

    console.log(`  ✅ Audio erstellt für ${ergebnisSegmente.length} Segmente`);
    res.json({ segmente: ergebnisSegmente });

  } catch (fehler) {
    console.error('❌ Vorlese-Fehler:', fehler.message);
    res.status(500).json({ fehler: 'Fehler beim Vorlesen: ' + fehler.message });
  }
});

// ------------------------------------------------------------
// Route 4: POST /api/alles
// Komfort-Route: OCR + Übersetzen + Vorlesen in einem Schritt
// Das Frontend ruft nur diese eine Route auf
// ------------------------------------------------------------
app.post('/api/alles', async (req, res) => {
  try {
    const { bild, mimeType } = req.body;

    if (!bild) {
      return res.status(400).json({ fehler: 'Kein Bild übermittelt' });
    }

    console.log('\n🚀 Komplett-Anfrage (OCR + Übersetzen + Vorlesen)...');

    // Schritt 1: Text aus Foto lesen
    const erkannterText = await textAusFotoLesen(bild, mimeType || 'image/jpeg');

    if (erkannterText.toLowerCase().includes('kein text gefunden')) {
      return res.json({
        erkannterText: 'Kein Text gefunden',
        uebersetzung:  '',
        segmente:      [],
      });
    }

    // Schritt 2: Übersetzen + Wörterbuch anwenden
    const roheUebersetzung = await textUebersetzen(erkannterText);
    const mitTags          = woerterbuchAnwenden(roheUebersetzung);
    const anzeigeText      = tagsEntfernen(mitTags);

    // Schritt 3: Audio erstellen (mit [D] Tags segmentieren)
    const segmente = textInSegmenteAufteilen(mitTags);
    const ergebnisSegmente = [];

    for (const segment of segmente) {
      if (segment.typ === 'vietnamesisch' && segment.text.trim()) {
        const audioBuffer = await vietnamesischSprechen(segment.text);
        ergebnisSegmente.push({
          typ:   'elevenlabs',
          audio: audioBuffer.toString('base64'),
        });
      } else if (segment.typ === 'deutsch' && segment.text.trim()) {
        ergebnisSegmente.push({
          typ:  'deutsch',
          text: segment.text,
        });
      }
    }

    console.log('  ✅ Komplett-Anfrage abgeschlossen!');

    res.json({
      erkannterText: erkannterText,
      uebersetzung:  anzeigeText,
      segmente:      ergebnisSegmente,
    });

  } catch (fehler) {
    console.error('❌ Komplett-Fehler:', fehler.message);
    res.status(500).json({ fehler: 'Fehler: ' + fehler.message });
  }
});

// ------------------------------------------------------------
// Server starten
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║       🇻🇳  Familie App  🇩🇪             ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  ✅  Server läuft auf Port ${PORT}         ║`);
  console.log(`║  🌐  http://localhost:${PORT}              ║`);
  console.log('╚════════════════════════════════════════╝\n');

  // API-Keys prüfen
  if (!process.env.LANGDOCK_API_KEY) {
    console.warn('⚠️  LANGDOCK_API_KEY fehlt in der .env Datei!');
  }
  if (!process.env.FISHAUDIO_API_KEY) {
    console.warn('⚠️  FISHAUDIO_API_KEY fehlt in der .env Datei!');
  }
});
