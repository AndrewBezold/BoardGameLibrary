import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { NameField } from '@/components/editable-name';
import { ErrorText } from '@/components/error-text';
import { chipStyle, PersonChips } from '@/components/person-chips';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { findOrAddPerson } from '@/db/people';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Hint shown while nobody is chosen, e.g. "Pick at least one owner." */
  emptyText?: string;
};

/** Chip list for choosing people (owners, players), with inline "add person". */
export function PersonPicker({ value, onChange, emptyText }: Props) {
  const theme = useTheme();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addPerson(name: string) {
    // Typing someone who already exists selects them rather than erroring.
    const person = findOrAddPerson(name);
    if (!value.includes(person.id)) onChange([...value, person.id]);
  }

  return (
    <View style={styles.container}>
      <PersonChips value={value} onChange={onChange}>
        {adding ? (
          <NameField
            initial=""
            placeholder="Name"
            accessibilityLabel="New person's name"
            failureText="Could not add person"
            save={addPerson}
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
            style={[chipStyle, { borderColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">
              + Person
            </ThemedText>
          </Pressable>
        )}
      </PersonChips>

      {value.length === 0 && emptyText && (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyText}
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
