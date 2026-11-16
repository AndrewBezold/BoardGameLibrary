type Named = { id: string; name: string };

/** The device user first, everyone else in their existing order. Doesn't change `people`. */
export function meFirst<T extends { id: string }>(people: readonly T[], meId: string): T[] {
  return [...people].sort((a, b) => Number(b.id === meId) - Number(a.id === meId));
}

/** A person's name as shown in lists and pickers: the device user gets "(me)". */
export function personLabel(person: Named, meId: string): string {
  return person.id === meId ? `${person.name} (me)` : person.name;
}
