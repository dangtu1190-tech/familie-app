# Familie-App – Projektübersicht für Claude

## Was ist diese App?
Eine Web-App für vietnamesische Eltern in Deutschland.
Sie fotografieren einen deutschen Brief → die App liest den Text, übersetzt ihn ins **Südvietnamesische** und liest ihn mit der **Familienstimme** vor.

## Deployment
- **Backend**: Railway → `familie-app-production-c31b.up.railway.app`
- **GitHub**: `dangtu1190-tech/familie-app` (Railway deployt automatisch bei jedem Push)
- **Startbefehl**: `node backend/server.js`

## Projektstruktur
```
familie-app/
├── backend/
│   ├── server.js   – Express-Server, Port aus process.env.PORT
│   ├── llm.js      – OCR + Übersetzung via Langdock (OpenAI-kompatibel)
│   └── tts.js      – Text-zu-Sprache via ElevenLabs
├── frontend/
│   └── index.html  – Single-Page-App, Farben: Gelb (#FFD700) + Rot (#CC0000) = Việt Nam Cộng Hòa
├── data/
│   └── woerterbuch.json – Nordviet. → Südviet. Ersetzungen
├── railway.json    – Railway-Konfiguration
└── .env            – Lokale API-Keys (nicht in Git)
```

## API-Keys (Railway Environment Variables)
| Variable | Beschreibung |
|---|---|
| `LANGDOCK_API_KEY` | Langdock API Key |
| `LANGDOCK_API_URL` | z.B. `https://api.langdock.com/openai/eu1/v1` |
| `LANGDOCK_MODEL` | OCR-Modell, z.B. `gpt-4.1-eu` |
| `LANGDOCK_MODEL_TRANSLATION` | Übersetzungs-Modell (optional, fällt auf LANGDOCK_MODEL zurück) |
| `ELEVENLABS_API_KEY` | ElevenLabs API Key (sk_...) |
| `ELEVENLABS_VOICE_ID` | Voice ID der Familienstimme (geklonte Stimme der Mutter) |

## Wichtige Regeln

### Sprache
- Übersetzung immer **Südvietnamesisch (giọng Nam / miền Nam)**
- Südviet. Vokabular: `muỗng, heo, bắp, mắc, thơm, chén, tui, dạ`
- Deutsche Straßennamen, Städte, Zahlen, Behördennamen **nicht übersetzen** – mit [D]...[/D] Tags markieren
- ALLES übersetzen: auch Absender, Empfänger, Betreff, Grußformel
- Datumsangaben und Uhrzeiten ins Vietnamesische übersetzen

### TTS (ElevenLabs)
- Modell: `eleven_multilingual_v2`
- Voice ID der Mutter: in `ELEVENLABS_VOICE_ID` gespeichert
- Audio-Segmentierung: [D] Tags = deutsche Wörter (Browser Web Speech API), Rest = Vietnamesisch (ElevenLabs)
- `speed: 0.85` für langsamere Wiedergabe

### Design
- Farben: Gelb `#FFD700` + Rot `#CC0000` (Flagge der Republik Vietnam / Việt Nam Cộng Hòa)
- Favicon: Flagge der Republik Vietnam (3 rote horizontale Streifen auf gelbem Grund)
- Keine kommunistische vietnamesische Flagge verwenden!

### Bildkomprimierung
- Frontend verkleinert Bilder auf max 1200px (längste Seite) vor dem Senden
- JPEG-Qualität 0.7 → reduziert Token-Verbrauch und Timeouts

### Git-Workflow
```bash
cd "c:\Users\Dang\Desktop\Sprache\familie-app"
git add <datei>
git commit -m "Beschreibung"
git push
# Railway deployt automatisch
```

## Häufige Fehler & Lösungen
| Fehler | Lösung |
|---|---|
| `ELEVENLABS_API_KEY fehlt` | Variable in Railway eintragen |
| ElevenLabs spricht kein Vietnamesisch | Voice aus der ElevenLabs Vietnamese Voice Library verwenden |
| Übersetzung lässt Adressblock weg | System-Prompt in llm.js: "Übersetze ALLES" |
| Railway Healthcheck schlägt fehl | `PORT` aus `process.env.PORT` verwenden |
| OCR hängt / kein Text erkannt | Bild zu groß → Frontend komprimiert auf 1200px, Timeout 30s |
| 400 bei Modell-Wechsel | Nicht alle Modelle unterstützen Vision oder gleiche API-Parameter |
