// How alike two normalized texts are (design D2). Pure.
//
// `likeness` compares the two whole texts; only it can accept a recording automatically. `contained` says how well the
// shorter text is found somewhere inside the longer one; it can only ask a person to look, because a contained match
// means the recording says more, or less, than the card.

export const ACCEPT_AT = 0.95;
export const REVIEW_AT = 0.85;
export const REPORT_AT = 0.6;

/**
 * Edit distance from `a` to `b`, one row at a time. With `anywhere`, skipping the start and the end of `b` costs
 * nothing, which gives the distance from `a` to the closest stretch of `b`.
 */
function distance(a, b, anywhere) {
  const row = new Int32Array(b.length + 1);
  if (!anywhere) for (let j = 0; j <= b.length; j++) row[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    const code = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      const substitute = diagonal + (code === b.charCodeAt(j - 1) ? 0 : 1);
      row[j] = Math.min(substitute, above + 1, row[j - 1] + 1);
      diagonal = above;
    }
  }
  if (!anywhere) return row[b.length];
  let best = row[0];
  for (let j = 1; j <= b.length; j++) best = Math.min(best, row[j]);
  return best;
}

/** The likeness of two whole, non-empty normalized texts: half the work of `compare` when only this figure is needed. */
export function likenessOf(a, b) {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return 1 - distance(shorter, longer, false) / longer.length;
}

/**
 * @param {string} a normalized text
 * @param {string} b normalized text
 * @returns {{ likeness: number, contained: number }} each from 0 to 1, unrounded; both 0 when either text is empty
 */
export function compare(a, b) {
  if (!a || !b) return { likeness: 0, contained: 0 };
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return {
    likeness: 1 - distance(shorter, longer, false) / longer.length,
    contained: 1 - distance(shorter, longer, true) / shorter.length,
  };
}

export const isAutoAccepted = ({ likeness }) => likeness >= ACCEPT_AT;

/** Not accepted on its own, but close enough that a person should look. */
export const needsReview = (figures) =>
  !isAutoAccepted(figures) && Math.max(figures.likeness, figures.contained) >= REVIEW_AT;

export const isReportable = ({ likeness, contained }) => Math.max(likeness, contained) >= REPORT_AT;
