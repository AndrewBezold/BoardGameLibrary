import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GameForm } from '@/components/game-form';
import { ThemedText } from '@/components/themed-text';
import { useUndo } from '@/components/undo-snackbar';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import {
  deleteGame,
  formatGameDetails,
  getGameOwnerIds,
  updateGame,
  type GameWithOwners,
} from '@/db/games';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  game: GameWithOwners;
  editing: boolean;
  onStartEdit: () => void;
  onDone: () => void;
};

/** A game in the list, with its details and owners. Tap (the pencil marks it) to edit it in place. */
export function GameRow({ game, editing, onStartEdit, onDone }: Props) {
  const me = useCurrentUser();
  const theme = useTheme();
  if (!editing) {
    // Device user first, labelled like the owner picker.
    const owners = [...game.owners]
      .sort((a, b) => Number(b.id === me.id) - Number(a.id === me.id))
      .map((o) => (o.id === me.id ? `${o.name} (me)` : o.name))
      .join(', ');
    const details = formatGameDetails(game);
    return (
      <Pressable
        onPress={onStartEdit}
        accessibilityRole="button"
        accessibilityHint="Edit this game"
        style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
        <View style={styles.itemText}>
          <ThemedText>{game.name}</ThemedText>
          {details.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {details}
            </ThemedText>
          )}
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
  const showUndo = useUndo();
  // Read once when editing starts, not on every render.
  const [ownerIds] = useState(() => getGameOwnerIds(game.id));

  return (
    <GameForm
      game={game}
      initialOwnerIds={ownerIds}
      submitLabel="Save"
      onSubmit={(values, owners) => {
        updateGame(game.id, values, owners);
        onDone();
      }}
      onCancel={onDone}
      // No confirmation: the snackbar offers Undo instead.
      onDelete={() => {
        const undo = deleteGame(game.id);
        onDone();
        showUndo(`Deleted ${game.name}`, undo);
      }}
      style={styles.editor}
    />
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
    marginVertical: Spacing.one,
  },
});
