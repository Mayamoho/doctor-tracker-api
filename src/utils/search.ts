/**
 * Search is built on a *normalized token array* rather than on `$regex` over the
 * raw string, and the reason is measurable (see `scripts/explainSearch.ts`):
 *
 * 1. `$regex` with the `i` flag cannot use index bounds at all — the planner scans
 *    the whole index. So case-insensitivity is produced by normalizing both the
 *    stored value and the query instead.
 * 2. A collection-level ICU collation (`strength: 2`) makes *every* `$regex` a
 *    collection scan, which is why these schemas deliberately carry no collation.
 * 3. Tokens, not the whole string, are indexed. `Hossain` is a real surname in this
 *    data but never a prefix of `"Dr. Farhana Yeasmin Hossain"`, so prefix search on
 *    `name` returns nothing for the thing users actually type.
 */

/** Lowercased alphanumeric tokens, in order, de-duplicated. */
export function tokenize(value: string): string[] {
  const tokens = value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return [...new Set(tokens)];
}

/**
 * Turns a search box into one query term.
 *
 * Digit-only input is a phone number being typed with spaces or a `+`, so it is
 * rejoined rather than split — `"01712 345678"` is one number, not two words.
 * Anything else keeps its last word: in "Abdul Karim" that is the part that
 * distinguishes the person, and one term keeps the query to a single bounded scan.
 */
export function searchTerm(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\d+()\s-]+$/.test(trimmed)) {
    return trimmed.replace(/\D/g, '') || null;
  }
  return tokenize(trimmed).at(-1) ?? null;
}

/**
 * A Bangladeshi mobile has three ways people write the same number, and a prefix
 * match only works from the start — so all three are indexed.
 * `+8801712345678`, `01712345678` and `1712345678` each find the row.
 */
export function phoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, '');
  // A withheld contact has no digits at all. Without this guard the `0` prefix below
  // survives the empty-string filter and every such record becomes findable by "0".
  if (!digits) return [];
  const withoutCountry = digits.startsWith('880') ? digits.slice(3) : digits.replace(/^0/, '');
  return [...new Set([digits, `0${withoutCountry}`, withoutCountry])].filter(Boolean);
}

/**
 * Everything a doctor record should be findable by: name, email, BMDC number, phone.
 * Specialization and hospital are deliberately excluded — they already have their
 * own filter dropdowns, and folding them into free text makes a search for "Dr"
 * return the whole register.
 */
export function doctorSearchTerms(input: {
  name: string;
  email: string;
  bmdcRegistration: string;
  phone: string;
}): string[] {
  const bmdc = input.bmdcRegistration.toLowerCase();
  const terms = [
    ...tokenize(input.name),
    // A withheld contact is prose, not an address. Tokenizing the string
    // `not published` would make every directory-sourced doctor match "published".
    ...tokenize(input.email.includes('@') ? input.email : ''),
    ...tokenize(bmdc),
    bmdc.replace(/[^a-z0-9]+/g, ''),
    ...phoneVariants(input.phone),
  ];
  return [...new Set(terms)];
}

export function patientSearchTerms(input: {
  name: string;
  condition: string;
  phone: string;
}): string[] {
  return [
    ...new Set([
      ...tokenize(input.name),
      ...tokenize(input.condition),
      ...phoneVariants(input.phone),
    ]),
  ];
}
