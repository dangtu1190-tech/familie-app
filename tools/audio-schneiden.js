// ============================================================
// audio-schneiden.js
// Schneidet die Audio-Datei: überspringt erste 5 Sekunden,
// nimmt dann 90 Sekunden → speichert als "familienstimme.mp3"
//
// Verwendung: node tools/audio-schneiden.js
// ============================================================

const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const FFMPEG    = require('ffmpeg-static');
const EINGABE   = path.join(__dirname, '../../WhatsApp Audio 2026-03-14 at 15.05.50.mp4');
const AUSGABE   = path.join(__dirname, '../../familienstimme.mp3');

console.log('✂️  Schneide Audio...');
console.log('   Überspringe erste 5 Sekunden');
console.log('   Nehme 90 Sekunden');

const befehl = `"${FFMPEG}" -i "${EINGABE}" -ss 5 -t 90 -acodec libmp3lame -q:a 2 "${AUSGABE}" -y`;

try {
  execSync(befehl, { stdio: 'inherit' });
  const groesse = Math.round(fs.statSync(AUSGABE).size / 1024);
  console.log(`\n✅ Fertig! Gespeichert als: familienstimme.mp3 (${groesse} KB)`);
  console.log('   Diese Datei bei Fish Audio hochladen!');
} catch (fehler) {
  console.error('❌ Fehler:', fehler.message);
}
