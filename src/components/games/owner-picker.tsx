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
};

/** Chip list for choosing which people own a game, with inline "add person". */
export function OwnerPicker({ value, onChange }: Props) {
  const theme = useTheme();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addOwner(name: string) {
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
            style={[chipStyle, { borderColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">
              + Person
            </ThemedText>
          </Pressable>
        )}
      </PersonChips>

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
