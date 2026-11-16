import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddGameForm } from '@/components/add-game-form';
import { GameRow } from '@/components/game-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useGamesWithOwners } from '@/db/games';
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
  function startEditing(id: string) {
    setAdding(false);
    setEditingId(id);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Games</ThemedText>
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
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              size={20}
              tintColor={theme.background}
            />
          </Pressable>
        </View>
        <FlatList
          style={styles.list}
          data={allGames}
          keyExtractor={(item) => item.id}
          extraData={editingId}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={adding ? <AddGameForm onDone={() => setAdding(false)} /> : undefined}
          renderItem={({ item }) => (
            <GameRow
              game={item}
              editing={item.id === editingId}
              onStartEdit={() => startEditing(item.id)}
              onDone={() => setEditingId(null)}
            />
          )}
          ListEmptyComponent={
            adding ? undefined : (
              <ThemedText themeColor="textSecondary">No games yet. Tap + to add one.</ThemedText>
            )
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    alignSelf: 'stretch',
  },
});
