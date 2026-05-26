# Biberl Reader

Minimale lokale Web-App zum Lesen chinesischer Texte mit integrierter Sprachhilfe.

## Setup

1. Dependencies installieren:

   ```bash
   npm install
   ```

2. Entwicklungsserver starten:

   ```bash
   npm run dev
   ```

3. App öffnen:

   ```text
   http://localhost:3000
   ```

4. Optional prüfen:

   ```bash
   npm run typecheck
   npm run build
   ```

## Projektstruktur

```text
src/
  app/
    api/analyze/route.ts       Server-Route für Segmentierung und Wörterbuch-Lookup
    api/extract-pdf/route.ts   Server-Route für textbasierte PDF-Textextraktion
    globals.css                Tailwind-Basis und Reader-Styles
    layout.tsx                 App-Metadaten
    page.tsx                   MVP-Screen und State-Orchestrierung
  components/
    FileUpload.tsx             TXT/PDF-Upload
    LanguageToggle.tsx         DE/EN-Umschalter
    Reader.tsx                 Mobile/Desktop Reader mit Hover/Tap-Wörtern
    SavedWordsPanel.tsx        LocalStorage-Vokabelliste
    TextInputPanel.tsx         Direkte Texteingabe
    WordPopup.tsx              Pinyin, Bedeutung und Speichern
  hooks/
    useSavedWords.ts           localStorage-Speicherung
  lib/
    context.ts                 Kontextsatz für gespeicherte Wörter
    dictionary.ts              CC-CEDICT-kompatible Wörterbuchstruktur
    epub.ts                    Vorbereitete EPUB-Schnittstelle
    segmenter.ts               nodejieba plus Dictionary-Fallback
  types/
    reader.ts                  Gemeinsame Reader- und Dictionary-Typen
```

## MVP-Architektur

- Die UI läuft als Client-Komponente in `src/app/page.tsx`.
- TXT-Dateien werden direkt im Browser mit `File.text()` gelesen.
- PDFs werden an `POST /api/extract-pdf` geschickt und serverseitig mit `pdf-parse` extrahiert.
- Wenn eine PDF keinen Text liefert, gibt die API die MVP-Meldung zurück:  
  `Diese PDF scheint gescannt zu sein. OCR wird im ersten MVP noch nicht unterstützt.`
- Chinesischer Text wird über `POST /api/analyze` serverseitig mit `nodejieba` segmentiert.
- Falls `nodejieba` lokal nicht geladen werden kann, nutzt `src/lib/segmenter.ts` einen einfachen längsten-Wörterbuchtreffer als Fallback.
- Das Wörterbuch ist langfristig mehrsprachig angelegt. Die Seed-Daten folgen einer CC-CEDICT-kompatiblen Struktur und werden durch ein kleines deutsches Feld erweitert.
- Gespeicherte Wörter liegen ohne Login und ohne Datenbank in `localStorage`.
- EPUB ist in `src/lib/epub.ts` als klare Schnittstelle vorbereitet, aber im MVP absichtlich nicht aktiv.

## Benötigte npm Packages

- `next`, `react`, `react-dom`
- `typescript`
- `tailwindcss`, `postcss`, `autoprefixer`
- `nodejieba` für chinesische Wortsegmentierung
- `pdf-parse` für textbasierte PDF-Textextraktion
- `pinyin-pro` für Pinyin-Generierung
- `lucide-react` für UI-Icons

## Wörterbuch-Daten

Die aktuelle Datei `src/lib/dictionary.ts` enthält nur MVP-Seed-Daten. Für echte Abdeckung kann später ein Import-Schritt ergänzt werden, der CC-CEDICT-Zeilen in diese Struktur überführt:

```ts
{
  simplified: "喜欢",
  traditional: "喜歡",
  pinyin: "xǐ huān",
  english: ["to like", "to enjoy"],
  german: ["mögen", "gern haben"]
}
```

Wenn keine deutsche Übersetzung vorhanden ist, zeigt das Popup weiterhin Pinyin und Englisch und nutzt für Deutsch den Platzhalter: `Noch keine deutsche Übersetzung vorhanden`.

## Verbesserungsvorschläge nach dem MVP

- Vollständigen CC-CEDICT-Importer bauen und Dictionary-Daten versionieren.
- Deutsche Übersetzungen aus einer kuratierten Datenquelle ergänzen.
- EPUB-Extraktion mit Kapitelstruktur implementieren.
- Sehr lange Texte virtuell rendern, zum Beispiel kapitel- oder abschnittsweise.
- Optional Export/Import für gespeicherte Vokabeln anbieten.
