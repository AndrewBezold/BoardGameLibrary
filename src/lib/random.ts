/**
 * A random item, avoiding `previousId` when there's anything else to choose,
 * so choosing again always gives something different. Null if `items` is empty.
 */
export function pickRandom<T extends { id: string }>(
  items: readonly T[],
  previousId: string | null = null,
  random: () => number = Math.random
): T | null {
  const choices = items.length > 1 ? items.filter((item) => item.id !== previousId) : items;
  if (choices.length === 0) return null;
  return choices[Math.floor(random() * choices.length)];
}
