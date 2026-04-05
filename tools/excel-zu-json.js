// ============================================================
// excel-zu-json.js
// Liest die Excel-Datei "Suedvietnamesisches_Familienwoerterbuch.xlsx"
// und erstellt daraus die Datei data/woerterbuch.json
//
// Verwendung: node tools/excel-zu-json.js
// ============================================================

const XLSX = require('xlsx');
const fs   = require('fs');
const path = require('path');

// Pfade
const EXCEL_PFAD  = path.join(__dirname, '../../Suedvietnamesisches_Familienwoerterbuch.xlsx');
const JSON_PFAD   = path.join(__dirname, '../data/woerterbuch.json');

console.log('📂 Lese Excel-Datei:', EXCEL_PFAD);

// Excel-Datei lesen
let arbeitsmappe;
try {
  arbeitsmappe = XLSX.readFile(EXCEL_PFAD);
} catch (fehler) {
  console.error('❌ Excel-Datei nicht gefunden:', EXCEL_PFAD);
  console.error('   Bitte die Datei unter Desktop/Sprache/ ablegen.');
  process.exit(1);
}

console.log('📋 Gefundene Blätter:', arbeitsmappe.SheetNames.join(', '));

// Erstes Blatt verwenden
const blattName  = arbeitsmappe.SheetNames[0];
const blatt      = arbeitsmappe.Sheets[blattName];

// Als Array von Zeilen lesen (mit Kopfzeile)
const zeilen = XLSX.utils.sheet_to_json(blatt, { header: 1 });

console.log(`📊 ${zeilen.length} Zeilen gefunden`);
console.log('🔍 Erste 3 Zeilen:', JSON.stringify(zeilen.slice(0, 3), null, 2));

// Kopfzeile analysieren
const kopfzeile = zeilen[0];
console.log('\n📌 Kopfzeile:', kopfzeile);

// Automatisch die richtigen Spalten erkennen
// Sucht nach Spalten die "nord", "süd", "sud", "south", "north" enthalten
function spalteFinden(kopfzeile, begriffe) {
  for (let i = 0; i < kopfzeile.length; i++) {
    const wert = String(kopfzeile[i] || '').toLowerCase();
    for (const begriff of begriffe) {
      if (wert.includes(begriff)) return i;
    }
  }
  return -1;
}

const nordSpalte = spalteFinden(kopfzeile, ['nord', 'north', 'bắc', 'bac']);
const suedSpalte = spalteFinden(kopfzeile, ['süd', 'sued', 'sud', 'south', 'nam']);

let nordIndex = nordSpalte >= 0 ? nordSpalte : 0; // Fallback: erste Spalte
let suedIndex = suedSpalte >= 0 ? suedSpalte : 1; // Fallback: zweite Spalte

console.log(`\n✅ Nord-Spalte: Spalte ${nordIndex} (${kopfzeile[nordIndex]})`);
console.log(`✅ Süd-Spalte:  Spalte ${suedIndex} (${kopfzeile[suedIndex]})`);

// Wörterbuch aus den Daten erstellen
const woerterbuch = [];
let uebersprungen = 0;

for (let i = 1; i < zeilen.length; i++) {
  const zeile = zeilen[i];

  const nordWort = String(zeile[nordIndex] || '').trim();
  const suedWort = String(zeile[suedIndex] || '').trim();

  // Leere Zeilen überspringen
  if (!nordWort || !suedWort) {
    uebersprungen++;
    continue;
  }

  // Kopfzeilen-Wiederholungen überspringen
  if (nordWort.toLowerCase() === String(kopfzeile[nordIndex] || '').toLowerCase()) {
    continue;
  }

  woerterbuch.push({
    nord: nordWort,
    sued: suedWort,
  });
}

console.log(`\n📚 Wörterbuch: ${woerterbuch.length} Einträge (${uebersprungen} übersprungen)`);

// Erste 5 Einträge zur Kontrolle anzeigen
console.log('\n🔎 Erste 5 Einträge:');
woerterbuch.slice(0, 5).forEach(e => {
  console.log(`   "${e.nord}" → "${e.sued}"`);
});

// JSON-Datei speichern
const jsonInhalt = JSON.stringify(woerterbuch, null, 2);
fs.writeFileSync(JSON_PFAD, jsonInhalt, 'utf-8');

console.log(`\n✅ Gespeichert: ${JSON_PFAD}`);
console.log(`   ${woerterbuch.length} Wörter im Wörterbuch.`);
