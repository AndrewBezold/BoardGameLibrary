import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import { toUserMessage } from '@/db/errors';
import { addPerson, findPersonByName, usePeople } from '@/db/people';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
};

/** Chip list for choosing which people own a game, with inline "add person". */
export function OwnerPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const me = useCurrentUser();
  const allPeople = usePeople();

  const [newPerson, setNewPerson] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const committedRef = useRef(false);

  // Device user first, everyone else alphabetically.
  const people = [...allPeople].sort((a, b) => Number(b.id === me.id) - Number(a.id === me.id));

  function toggleOwner(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  function startAddPerson() {
    committedRef.current = false;
    setNewPerson('');
  }

  // Return-key submit is followed by a blur, and both call this before React
  // re-renders, so guard against committing the same entry twice.
  function handleAddPerson() {
    if (committedRef.current) return;
    committedRef.current = true;

    const personName = newPerson?.trim();
    if (!personName) {
      setNewPerson(null);
      return;
    }
    try {
      // Typing someone who already exists selects them rather than erroring.
      const person = findPersonByName(personName) ?? addPerson(personName);
      if (!value.includes(person.id)) onChange([...value, person.id]);
      setNewPerson(null);
      setError(null);
    } catch (e) {
      committedRef.current = false;
      setError(toUserMessage(e, 'Could not add person'));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {people.map((person) => {
          const selected = value.includes(person.id);
          return (
            <Pressable
              key={person.id}
              onPress={() => toggleOwner(person.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              style={[
                styles.chip,
                selected
                  ? { backgroundColor: theme.text, borderColor: theme.text }
                  : { borderColor: theme.backgroundSelected },
              ]}>
              <ThemedText type="small" style={selected && { color: theme.background }}>
                {person.id === me.id ? `${person.name} (me)` : person.name}
              </ThemedText>
            </Pressable>
          );
        })}
        {newPerson === null ? (
          <Pressable
            onPress={startAddPerson}
            accessibilityRole="button"
            style={[styles.chip, { borderColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">
              + Person
            </ThemedText>
          </Pressable>
        ) : (
          <TextInput
            autoFocus
            value={newPerson}
            onChangeText={setNewPerson}
            placeholder="Name"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="done"
            onSubmitEditing={handleAddPerson}
            onBlur={handleAddPerson}
            style={[
              styles.personInput,
              { color: theme.text, backgroundColor: theme.backgroundElement },
            ]}
          />
        )}
      </View>

      {value.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Pick at least one owner.
        </ThemedText>
      )}
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  personInput: {
    minWidth: 140,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    fontSize: 14,
  },
  error: {
    color: '#d93025',
  },
});
