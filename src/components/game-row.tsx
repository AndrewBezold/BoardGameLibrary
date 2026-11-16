import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DANGER } from '@/components/confirm-button';
import { OwnerPicker } from '@/components/owner-picker';
import { ThemedText } from '@/components/themed-text';
import { useUndo } from '@/components/undo-snackbar';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import { toUserMessage } from '@/db/errors';
import { deleteGame, getGameOwnerIds, updateGame, type GameWithOwners } from '@/db/games';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  game: GameWithOwners;
  editing: boolean;
  onStartEdit: () => void;
  onDone: () => void;
};

/** A game in the list, with its owners. Tap (the pencil marks it) to edit its name and owners in place. */
export function GameRow({ game, editing, onStartEdit, onDone }: Props) {
  const me = useCurrentUser();
  const theme = useTheme();
  if (!editing) {
    // Device user first, labelled like the owner picker.
    const owners = [...game.owners]
      .sort((a, b) => Number(b.id === me.id) - Number(a.id === me.id))
      .map((o) => (o.id === me.id ? `${o.name} (me)` : o.name))
      .join(', ');
    return (
      <Pressable
        onPress={onStartEdit}
        accessibilityRole="button"
        accessibilityHint="Edit this game"
        style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
        <View style={styles.itemText}>
          <ThemedText>{game.name}</ThemedText>
          {owners.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {owners}
            </ThemedText>
          )}
        </View>
        <SymbolView
          name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
          size={18}
          tintColor={theme.textSecondary}
          accessible={false}
          importantForAccessibility="no"
        />
      </Pressable>
    );
  }
  return <GameEditor game={game} onDone={onDone} />;
}

function GameEditor({ game, onDone }: { game: GameWithOwners; onDone: () => void }) {
  const theme = useTheme();
  const showUndo = useUndo();
  const [name, setName] = useState(game.name);
  const [ownerIds, setOwnerIds] = useState(() => getGameOwnerIds(game.id));
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && ownerIds.length > 0;

  function handleSave() {
    if (!canSave) return;
    try {
      updateGame(game.id, trimmed, ownerIds);
      onDone();
    } catch (e) {
      setError(toUserMessage(e, 'Could not save game'));
    }
  }

  function handleDelete() {
    try {
      const undo = deleteGame(game.id);
      onDone();
      showUndo(`Deleted ${game.name}`, undo);
    } catch (e) {
      setError(toUserMessage(e, 'Could not delete game'));
    }
  }

  return (
    <View style={[styles.editor, { backgroundColor: theme.backgroundElement }]}>
      <TextInput
        autoFocus
        value={name}
        onChangeText={setName}
        placeholder="Game name"
        placeholderTextColor={theme.textSecondary}
        returnKeyType="done"
        onSubmitEditing={handleSave}
        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
      />

      <ThemedText type="small" themeColor="textSecondary">
        Owned by
      </ThemedText>
      <OwnerPicker value={ownerIds} onChange={setOwnerIds} />

      {error && (
        <ThemedText type="small" style={styles.danger}>
          {error}
        </ThemedText>
      )}

      <View style={styles.actions}>
        {/* No confirmation: the snackbar offers Undo instead. */}
        <Pressable
          onPress={handleDelete}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { borderWidth: 1, borderColor: DANGER },
            pressed && { opacity: 0.7 },
          ]}>
          <ThemedText type="smallBold" style={styles.danger}>
            Delete
          </ThemedText>
        </Pressable>
        <View style={styles.spacer} />
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
          onPress={handleSave}
          disabled={!canSave}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.text, opacity: !canSave ? 0.4 : pressed ? 0.7 : 1 },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            Save
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  itemText: {
    flex: 1,
    gap: Spacing.half,
  },
  editor: {
    gap: Spacing.two,
    padding: Spacing.three,
    marginVertical: Spacing.one,
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
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  spacer: {
    flex: 1,
  },
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  danger: {
    color: DANGER,
  },
});
