import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { GameForm } from '@/components/games/game-form';
import { GameList } from '@/components/games/game-list';
import { Screen } from '@/components/screen';
import { Spacing } from '@/constants/theme';
import { addGame, useGamesWithOwners } from '@/db/games';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();
  const allGames = useGamesWithOwners();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Only one inline form open at a time.
  function startAdding() {
    setEditingId(null);
    setAdding(true);
  }
  function changeEditing(id: string | null) {
    if (id !== null) setAdding(false);
    setEditingId(id);
  }

  const addButton = (
    <Pressable
      onPress={startAdding}
      disabled={adding}
      accessibilityRole="button"
      accessibilityLabel="Add a game"
      hitSlop={Spacing.two}
      style={({ pressed }) => [
        styles.addButton,
        { backgroundColor: theme.text, opacity: adding ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={20} tintColor={theme.background} />
    </Pressable>
  );

  return (
    <Screen title="Games" action={addButton}>
      <GameList
        sections={allGames.length > 0 ? [{ key: 'all', data: allGames }] : []}
        editingId={editingId}
        onEditingChange={changeEditing}
        header={
          adding ? (
            <GameForm
              submitLabel="Add"
              onSubmit={(game, ownerIds) => {
                addGame(game, ownerIds);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
              style={styles.addForm}
            />
          ) : undefined
        }
        empty={adding ? undefined : 'No games yet. Tap + to add one.'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addForm: {
    marginBottom: Spacing.two,
  },
});
