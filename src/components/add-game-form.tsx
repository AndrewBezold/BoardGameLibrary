import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { OwnerPicker } from '@/components/owner-picker';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import { toUserMessage } from '@/db/errors';
import { addGame } from '@/db/games';
import { useTheme } from '@/hooks/use-theme';

/** Card for adding a game, opened from the + button. Closes on add or cancel. */
export function AddGameForm({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const me = useCurrentUser();

  const [name, setName] = useState('');
  const [ownerIds, setOwnerIds] = useState<string[]>([me.id]);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && ownerIds.length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    try {
      addGame(trimmed, ownerIds);
      onDone();
    } catch (e) {
      setError(toUserMessage(e, 'Could not add game'));
    }
  }

  return (
    <View style={[styles.form, { backgroundColor: theme.backgroundElement }]}>
      <TextInput
        autoFocus
        value={name}
        onChangeText={setName}
        placeholder="Game name"
        placeholderTextColor={theme.textSecondary}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
      />

      <ThemedText type="small" themeColor="textSecondary">
        Owned by
      </ThemedText>
      <OwnerPicker value={ownerIds} onChange={setOwnerIds} />

      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { borderWidth: 1, borderColor: theme.backgroundSelected },
            pressed && { opacity: 0.7 },
          ]}>
          <ThemedText type="smallBold">Cancel</ThemedText>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.text, opacity: !canSubmit ? 0.4 : pressed ? 0.7 : 1 },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            Add
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderRadius: Spacing.three,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  error: {
    color: '#d93025',
  },
});
