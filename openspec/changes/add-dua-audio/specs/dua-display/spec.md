# Spec Delta

## REMOVED Requirements

### Requirement: No audio until a working source exists
**Reason**: A working source now exists for part of the content. What a card shows and requests is defined by the
`dua-audio` capability, and which recordings it may offer by `audio-matching`.
**Migration**: None for readers. Cards still make no request to `ihadis.com`, because its dead URLs are never listed.
