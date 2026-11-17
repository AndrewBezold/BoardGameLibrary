type Named = { id: string; name: string };

/** The device user first, everyone else in their existing order. Doesn't change `people`. */
export function meFirst<T extends { id: string }>(people: readonly T[], meId: string): T[] {
  return [...people].sort((a, b) => Number(b.id === meId) - Number(a.id === meId));
}

/**
 * Owners in display order: people in `here` first (tonight's people in the
 * picker), then everyone else, with the device user first within each part.
 */
export function ownersInOrder<T extends { id: string }>(
  owners: readonly T[],
  meId: string,
  here: ReadonlySet<string> = new Set()
): T[] {
  return meFirst(owners, meId).sort((a, b) => Number(here.has(b.id)) - Number(here.has(a.id)));
}

/** A person's name as shown in lists and pickers: the device user gets "(me)". */
export function personLabel(person: Named, meId: string): string {
  return person.id === meId ? `${person.name} (me)` : person.name;
}
