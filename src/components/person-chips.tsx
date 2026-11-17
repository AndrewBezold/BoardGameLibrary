import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import { usePeople } from '@/db/people';
import { useTheme } from '@/hooks/use-theme';
import { meFirst, personLabel } from '@/lib/people';

type Props = {
  value: readonly string[];
  onChange: (ids: string[]) => void;
  /** Rendered after the last chip, e.g. an "add person" chip. */
  children?: ReactNode;
};

/** Everyone as toggleable chips, me first. */
export function PersonChips({ value, onChange, children }: Props) {
  const theme = useTheme();
  const me = useCurrentUser();
  const people = meFirst(usePeople(), me.id);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  return (
    <View style={styles.chips}>
      {people.map((person) => {
        const selected = value.includes(person.id);
        return (
          <Pressable
            key={person.id}
            onPress={() => toggle(person.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            style={[
              chipStyle,
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
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
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
});

/** Shape of a chip, for extra chips passed as children. */
export const chipStyle = styles.chip;
