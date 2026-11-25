# Spec Delta

## Purpose

Defines what a reader sees for each dua: its title, intro, Arabic text, transliteration, translation, closing text
and reference, including duas stored as several parts, and the stable anchors that link to them.

## ADDED Requirements

### Requirement: One card per dua
The app SHALL show each dua as exactly one card. Content rows that share a `dua.id` SHALL be shown as the parts of
that one card, in the order they are stored. The card's title SHALL come from the part that has a name.

#### Scenario: Dua stored as five rows
- **WHEN** a reader opens `/duas/morning-evening?cat=5`
- **THEN** dua 123 ("Tasbeeh") appears as one card with five parts, in stored order, starting with "سُبْحَانَ اللَّهِ"

#### Scenario: Dua stored as one row
- **WHEN** a reader opens `/duas/duas-importance?cat=1`
- **THEN** dua 4 ("Allah's guidance #1") appears as one card with one part

### Requirement: Part content and order
Each part SHALL show the following fields, in this order, when they have a value: the intro text (`top_*`), the Arabic
text (`dua_arabic`), the transliteration, the translation, the closing text (`bottom_*`) and the reference (`refference_*`).
A field with no value SHALL be left out together with its label, and no placeholder text such as "null" or
"undefined" SHALL appear.

#### Scenario: Part with every field
- **WHEN** a reader views dua 4 in English
- **THEN** the card shows, in order, the Arabic "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", the transliteration, the translation
  "It is You we worship and It is You we ask for help.", the closing text, and the reference "Surah Al-Fatihah 1:5"
- **AND** no intro text is shown, because dua 4 has none

#### Scenario: Dua without Arabic text
- **WHEN** a reader views a dua whose parts have no `dua_arabic` (37 rows have none)
- **THEN** the card shows its other fields, and no empty Arabic block

### Requirement: Arabic text presentation
Arabic text SHALL be shown exactly as stored in `dua_arabic`, without changes, marked as Arabic and laid out right to left.

#### Scenario: Arabic block direction
- **WHEN** a reader views any dua that has Arabic text
- **THEN** the Arabic block is marked with language `ar` and direction `rtl`
- **AND** its text is identical to the stored `dua_arabic` value

### Requirement: Line breaks preserved
Line breaks stored in any displayed field SHALL be shown as line breaks.

#### Scenario: Reference with two sources
- **WHEN** a reader views dua 40, whose reference is "[1] Bukhari: 1145" and "[2] Surah Az-Zariyat: 51: 17-18" on two lines
- **THEN** the two sources appear on separate lines

### Requirement: Stable anchors
Each subcategory heading SHALL have the ID `subcat-<subcat_id>`, and each dua card SHALL have the ID `dua-<dua.id>`.
No two elements on a page SHALL share an ID.

#### Scenario: Linking to a dua
- **WHEN** a reader opens `/duas/sleep?cat=6#dua-200`
- **THEN** the browser scrolls to the card for dua 200

#### Scenario: No duplicate IDs
- **WHEN** any category page is rendered
- **THEN** every `id` attribute on the page is unique

### Requirement: No audio until a working source exists
Dua cards SHALL NOT render audio elements or audio controls. The stored `audio` URLs are dead.

#### Scenario: Card without audio
- **WHEN** a reader views any dua card
- **THEN** the card contains no `<audio>` element and makes no request to `ihadis.com`
