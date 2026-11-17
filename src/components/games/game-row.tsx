import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { GameForm } from '@/components/games/game-form';
import { GameSummary } from '@/components/games/game-summary';
import { useUndo } from '@/components/undo-snackbar';
import { Spacing } from '@/constants/theme';
import { deleteGame, getGameOwnerIds, updateGame, type GameWithOwners } from '@/db/games';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  game: GameWithOwners;
  /** People to put first and bold in the owner list. */
  here?: ReadonlySet<string>;
  editing: boolean;
  onStartEdit: () => void;
  onDone: () => void;
  /** Extra lines under the owners. */
  children?: ReactNode;
};

/** A game in the list, with its details and owners. Tap (the pencil marks it) to edit it in place. */
export function GameRow({ game, here, editing, onStartEdit, onDone, children }: Props) {
  const theme = useTheme();
  if (!editing) {
    return (
      <Pressable
        onPress={onStartEdit}
        accessibilityRole="button"
        accessibilityHint="Edit this game"
        style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
        <GameSummary game={game} here={here}>
          {children}
        </GameSummary>
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
  editor: {
    marginVertical: Spacing.one,
  },
});
