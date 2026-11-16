import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { NameField } from '@/components/editable-name';
import { ErrorText } from '@/components/error-text';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import { findOrAddPerson, usePeople } from '@/db/people';
import { useTheme } from '@/hooks/use-theme';
import { meFirst, personLabel } from '@/lib/people';

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
};

/** Chip list for choosing which people own a game, with inline "add person". */
export function OwnerPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const me = useCurrentUser();
  const people = meFirst(usePeople(), me.id);

  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleOwner(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  function addOwner(name: string) {
    // Typing someone who already exists selects them rather than erroring.
    const person = findOrAddPerson(name);
    if (!value.includes(person.id)) onChange([...value, person.id]);
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
                {personLabel(person, me.id)}
              </ThemedText>
            </Pressable>
          );
        })}
        {adding ? (
          <NameField
            initial=""
            placeholder="Name"
            accessibilityLabel="New person's name"
            failureText="Could not add person"
            save={addOwner}
            onClose={(message) => {
              setAdding(false);
              setError(message);
            }}
            style={styles.personField}
            inputStyle={styles.personInput}
          />
        ) : (
          <Pressable
            onPress={() => {
              setError(null);
              setAdding(true);
            }}
            accessibilityRole="button"
            style={[styles.chip, { borderColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">
              + Person
            </ThemedText>
          </Pressable>
        )}
      </View>

      {value.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Pick at least one owner.
        </ThemedText>
      )}
      <ErrorText>{error}</ErrorText>
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
  // Chip-sized instead of NameField's full-width default.
  personField: {
    flex: 0,
    minWidth: 140,
  },
  personInput: {
    minHeight: 0,
    paddingVertical: Spacing.one,
    fontSize: 14,
  },
});
