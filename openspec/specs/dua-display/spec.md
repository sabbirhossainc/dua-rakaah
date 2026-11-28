# dua-display Specification

## Purpose

Defines what a reader sees for each dua: its title, intro, Arabic text, transliteration, translation, closing text
and reference, including duas stored as several parts, and the stable anchors that link to them.

## Requirements

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
Its size SHALL follow the reader's Arabic text size setting, which changes only how large the text is drawn.

#### Scenario: Arabic block direction
- **WHEN** a reader views any dua that has Arabic text
- **THEN** the Arabic block is marked with language `ar` and direction `rtl`
- **AND** its text is identical to the stored `dua_arabic` value

#### Scenario: Text size follows the setting
- **GIVEN** the reader chose the "xlarge" Arabic text size
- **WHEN** they view a dua that has Arabic text
- **THEN** the Arabic text is drawn larger than at the default size, and its stored text is unchanged

#### Scenario: Default size
- **GIVEN** the reader has not changed the Arabic text size
- **WHEN** they view a dua that has Arabic text
- **THEN** the Arabic text is drawn at the medium size, the same size the cards use today

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

### Requirement: Dua card badge and border contrast
On every dua card, in light and dark themes, badge text (such as category, subcategory and reference tags) SHALL have a
contrast ratio of at least 4.5:1 against the badge's own background, and the badge's background or outline SHALL have
at least 3:1 against the card surface. The card's border SHALL have at least 3:1 against both the card surface and the
page background around it. These colors SHALL come from the theme palette.

#### Scenario: Light theme
- **WHEN** a category page is shown in the light theme
- **THEN** every dua card's badge text measures at least 4.5:1 against its badge, and the card border at least 3:1
  against the card and the page

#### Scenario: Dark theme
- **WHEN** the same page is shown in the dark theme
- **THEN** the same ratios hold
