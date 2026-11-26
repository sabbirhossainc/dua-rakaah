// Arabic text reduced to the letters that carry the words (design D2), so that two writings of the same recitation
// compare as equal. Used only for matching: the app shows the stored text unchanged.

// Spelling variants of one letter. Keys are the letters left after NFKC and after combining marks are removed.
const SAME_LETTER = new Map([
  ["آ", "ا"], // alef with madda -> alef
  ["أ", "ا"], // alef with hamza above -> alef
  ["إ", "ا"], // alef with hamza below -> alef
  ["ٱ", "ا"], // alef wasla -> alef
  ["ى", "ي"], // alef maqsura -> yeh
  ["ی", "ي"], // Persian yeh -> yeh
  ["ئ", "ي"], // yeh with hamza -> yeh
  ["ؤ", "و"], // waw with hamza -> waw
  ["ة", "ه"], // ta marbuta -> heh
  ["ھ", "ه"], // heh doachashmee -> heh
  ["ہ", "ه"], // heh goal -> heh
  ["ک", "ك"], // keheh -> kaf
]);

// A letter proper of the Arabic script. Digits, punctuation, spaces, tatweel and the small annotation letters of
// Quran typesetting (which are "modifier letters") are all outside it.
const ARABIC_LETTER = /^(?=\p{Script=Arabic})\p{Lo}$/u;

/** The Arabic letters of `text` in order, with spelling variants unified. A non-text value gives "". */
export function normalizeArabic(text) {
  if (typeof text !== "string") return "";
  let out = "";
  for (const ch of text.normalize("NFKC").replace(/\p{M}/gu, "")) {
    if (ARABIC_LETTER.test(ch)) out += SAME_LETTER.get(ch) ?? ch;
  }
  return out;
}
