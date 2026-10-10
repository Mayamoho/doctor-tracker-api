/**
 * `searchTerms` is an internal index structure. Returning it would publish the
 * normalized form of every searchable field for no benefit to the client, so
 * every write response goes through here.
 */
export function toPublic<T extends { searchTerms?: unknown }>(doc: T): Omit<T, 'searchTerms'> {
  const { searchTerms: _internal, ...rest } = doc;
  return rest as Omit<T, 'searchTerms'>;
}
