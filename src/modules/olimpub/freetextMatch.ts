/** docs/olimpub.md §8.2 — lower, NFD ékezet strip, whitespace collapse. */

export function normalizeOpFreetext(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cur = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

export function matchOpFreetext(raw: string, synonyms: string[]) {
  const text = normalizeOpFreetext(raw);
  if (!text) return false;
  return synonyms.some((item) => {
    const syn = normalizeOpFreetext(item);
    if (!syn) return false;
    if (text === syn) return true;
    // 1 karakteres válasz: "3" vs "7" Levenshtein = 1, ne engedjük a fuzzy-t.
    if (text.length < 2 || syn.length < 2) return syn.split(' ').some((token) => token === text);
    const dist = levenshtein(text, syn);
    if (dist <= 1) return true;
    const longest = Math.max(text.length, syn.length);
    if (longest && 1 - dist / longest >= 0.8) return true;
    return syn.split(' ').some((token) => token === text);
  });
}
