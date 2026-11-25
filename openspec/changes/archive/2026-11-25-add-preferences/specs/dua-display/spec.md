# Spec Delta

## MODIFIED Requirements

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
