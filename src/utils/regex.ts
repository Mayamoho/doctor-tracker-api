/** Escapes user input so a search box can never inject regex syntax. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Left-anchored pattern, built from input that is already lowercased and
 * alphanumeric (see `utils/search.ts`).
 *
 * Two details carry the whole optimization, and both are measured in
 * `scripts/explainSearch.ts`:
 *   - the `^` anchor is what lets the planner turn the pattern into index bounds;
 *     drop it and the same query scans every key in the index;
 *   - no `i` flag, because a case-insensitive regex cannot use bounds either.
 *     Case-insensitivity is bought by normalizing the stored tokens instead.
 */
export function prefixRegex(term: string): { $regex: string } {
  return { $regex: `^${escapeRegex(term)}` };
}
