import { useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorText } from '@/components/error-text';
import { GameSummary } from '@/components/games/game-summary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useGamesWithOwners } from '@/db/games';
import { useTheme } from '@/hooks/use-theme';
import { plural } from '@/lib/format';
import { isPositiveCount, parseCount } from '@/lib/numbers';
import { gameFit, type PickerFilter } from '@/lib/picker';

/** A typed filter value: the number to filter by (null if blank or invalid), and whether it's invalid. */
function filterValue(text: string): { value: number | null; invalid: boolean } {
  const parsed = parseCount(text);
  if (parsed === null) return { value: null, invalid: false };
  return isPositiveCount(parsed) ? { value: parsed, invalid: false } : { value: null, invalid: true };
}

export default function PickScreen() {
  const theme = useTheme();
  const allGames = useGamesWithOwners();
  const [playersText, setPlayersText] = useState('');
  const [minutesText, setMinutesText] = useState('');

  const players = filterValue(playersText);
  const minutes = filterValue(minutesText);
  const filter: PickerFilter = { players: players.value, maxMinutes: minutes.value };

  const results = allGames.filter((game) => gameFit(game, filter) === 'fits');

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];
  const fields = [
    { label: 'Players', text: playersText, setText: setPlayersText, a11y: 'Number of players' },
    { label: 'Max minutes', text: minutesText, setText: setMinutesText, a11y: 'Maximum play time in minutes' },
  ];

  let empty: string;
  if (allGames.length === 0) empty = 'No games yet. Add some on the Home tab.';
  else empty = 'Nothing fits. Try more time or a different player count.';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Pick a game</ThemedText>

        <View style={styles.filters}>
          {fields.map(({ label, text, setText, a11y }) => (
            <View key={label} style={styles.filterField}>
              <ThemedText type="small" themeColor="textSecondary">
                {label}
              </ThemedText>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Any"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={4}
                accessibilityLabel={a11y}
                style={inputStyle}
              />
            </View>
          ))}
        </View>
        <ErrorText>
          {players.invalid || minutes.invalid ? 'Must be a whole number above zero.' : null}
        </ErrorText>

        <FlatList
          style={styles.list}
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={
            results.length > 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
                {`${plural(results.length, 'game')} ${results.length === 1 ? 'fits' : 'fit'}`}
              </ThemedText>
            ) : undefined
          }
          renderItem={({ item }) => (
            <View style={styles.item}>
              <GameSummary game={item} />
            </View>
          )}
          ListEmptyComponent={<ThemedText themeColor="textSecondary">{empty}</ThemedText>}
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
  filters: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  filterField: {
    flex: 1,
    gap: Spacing.one,
  },
  input: {
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  list: {
    alignSelf: 'stretch',
  },
  count: {
    marginBottom: Spacing.two,
  },
  item: {
    paddingVertical: Spacing.two,
  },
});
