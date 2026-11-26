# content-localization Specification

## Purpose

Lets readers read the dua content in English (the default) or Bangla, with the language chosen by the URL so
every page has one fixed language that can be linked to and cached.

## Requirements

### Requirement: Language chosen by URL prefix
Pages under `/duas` SHALL be in English. The same pages under `/bn/duas` SHALL be in Bangla, with the same slugs,
the same `cat` values and the same behavior, including redirects and not-found responses. The language SHALL NOT
depend on cookies, headers or browser settings.

#### Scenario: Bangla category page
- **WHEN** a reader opens `/bn/duas/sleep?cat=6`
- **THEN** the page shows the "ঘুম" category with status 200

#### Scenario: Bangla redirect keeps the prefix
- **WHEN** a reader opens `/bn/duas/sleep?cat=5`
- **THEN** the response is a permanent redirect to `/bn/duas/morning-evening?cat=5`

#### Scenario: Bangla landing page
- **WHEN** a reader opens `/bn/duas`
- **THEN** the page shows the 10 category cards with Bangla names, linking to `/bn/duas/...` URLs

#### Scenario: Browser language is ignored
- **WHEN** a browser that prefers Bangla opens `/duas/sleep?cat=6`
- **THEN** the page is in English

### Requirement: Content fields follow the page language
Category names, subcategory names, dua titles, intro text, transliteration, translation, closing text and
references SHALL come from the page language's columns (`_en` or `_bn`). When a field has no value in the page
language, the app SHALL leave it out and SHALL NOT show the other language's value. Arabic text is shown in both.

#### Scenario: Bangla dua card
- **WHEN** a reader views dua 4 on `/bn/duas/duas-importance?cat=1`
- **THEN** the title is "হিদায়াত বা পথ-নির্দেশনা #১" and the reference is "সূরা আল-ফাতিহা ১:৫"
- **AND** the Arabic text is the same as on the English page

#### Scenario: Field missing in Bangla only
- **WHEN** a dua part has `translation_en` but no `translation_bn`
- **THEN** its Bangla card shows no translation, and its English card shows the English translation

### Requirement: Bangla interface labels
On Bangla pages, the labels in the content area and the category list SHALL be in Bangla. This covers the
category list heading, the search placeholder, the subcategory and dua count labels, and the field labels on
dua cards. The content area SHALL be marked with language `bn`.

#### Scenario: Reference label in Bangla
- **WHEN** a reader views a dua card on a `/bn/duas` page
- **THEN** its reference label is in Bangla, not "Reference:"
- **AND** the content area's `lang` attribute is `bn`

### Requirement: Language switch
The language buttons in the Settings panel SHALL show which language is active and SHALL take the reader to the
same page in the other language, keeping the slug, the query string and the fragment. The home page `/` and `/bn` SHALL
be each other's other-language page. On a page that has no Bangla version, the Bangla button SHALL go to `/bn/duas`.

#### Scenario: Switch to Bangla on a category page
- **WHEN** a reader on `/duas/sleep?cat=6` selects "বাংলা"
- **THEN** the browser goes to `/bn/duas/sleep?cat=6`

#### Scenario: Switch back to English
- **WHEN** a reader on `/bn/duas/sleep?cat=6` selects "English"
- **THEN** the browser goes to `/duas/sleep?cat=6`

#### Scenario: Switch on the home page
- **WHEN** a reader on `/` selects "বাংলা"
- **THEN** the browser goes to `/bn`
- **AND** selecting "English" there goes back to `/`

#### Scenario: Page without a Bangla version
- **WHEN** a reader on `/support` selects "বাংলা"
- **THEN** the browser goes to `/bn/duas`

#### Scenario: Active language shown
- **WHEN** a reader is on `/bn` or any `/bn/duas` page
- **THEN** the "বাংলা" button is shown as the active one

### Requirement: Bangla home page
`/bn` SHALL be the Bangla version of the home page at `/`. Its links to dua and category pages SHALL go to their
`/bn/duas/...` versions, and the sidebar's home icon SHALL go to `/bn` from Bangla pages and to `/` from English ones.

#### Scenario: Home icon on a Bangla page
- **WHEN** a reader on `/bn/duas/sleep?cat=6` activates the sidebar's home icon
- **THEN** the browser goes to `/bn`

#### Scenario: Home icon on an English page
- **WHEN** a reader on `/duas/sleep?cat=6` activates the sidebar's home icon
- **THEN** the browser goes to `/`
