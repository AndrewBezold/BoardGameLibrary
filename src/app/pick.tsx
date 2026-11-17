import { useState } from 'react';
import { FlatList, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ErrorText } from '@/components/error-text';
import { GameSummary } from '@/components/games/game-summary';
import { PersonChips } from '@/components/person-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useGamesWithOwners } from '@/db/games';
import { usePeople } from '@/db/people';
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
  const people = usePeople();
  const [selected, setSelected] = useState<string[]>([]);
  const [onlyTheirGames, setOnlyTheirGames] = useState(true);
  const [playersText, setPlayersText] = useState('');
  const [minutesText, setMinutesText] = useState('');

  // Drop anyone deleted since they were picked.
  const hereIds = selected.filter((id) => people.some((person) => person.id === id));
  const here = new Set(hereIds);

  function pickPeople(ids: string[]) {
    setSelected(ids);
    // The player count follows the people picked; it can still be changed by hand.
    setPlayersText(ids.length > 0 ? String(ids.length) : '');
  }

  const players = filterValue(playersText);
  const minutes = filterValue(minutesText);
  const filter: PickerFilter = {
    players: players.value,
    maxMinutes: minutes.value,
    ownedByAnyOf: here.size > 0 && onlyTheirGames ? here : null,
  };

  const results = allGames.filter((game) => gameFit(game, filter) === 'fits');

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];
  const fields = [
    { label: 'Players', text: playersText, setText: setPlayersText, a11y: 'Number of players' },
    { label: 'Max minutes', text: minutesText, setText: setMinutesText, a11y: 'Maximum play time in minutes' },
  ];

  let empty: string;
  if (allGames.length === 0) empty = 'No games yet. Add some on the Home tab.';
  else if (filter.ownedByAnyOf) empty = 'Nothing fits. Try more time, a different player count, or all games.';
  else empty = 'Nothing fits. Try more time or a different player count.';

  const header = (
    <View style={styles.header}>
      <View style={styles.section}>
        <View style={styles.sectionTitle}>
          <ThemedText type="small" themeColor="textSecondary">
            {"Who's here?"}
          </ThemedText>
          {here.size > 0 && <Button label="Clear" onPress={() => pickPeople([])} />}
        </View>
        <PersonChips value={hereIds} onChange={pickPeople} />
        {here.size > 0 && (
          <View style={styles.switchRow}>
            <ThemedText type="small" style={styles.switchLabel}>
              Only games they own
            </ThemedText>
            <Switch
              value={onlyTheirGames}
              onValueChange={setOnlyTheirGames}
              accessibilityLabel="Only games owned by people who are here"
            />
          </View>
        )}
      </View>

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

      {results.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          {`${plural(results.length, 'game')} ${results.length === 1 ? 'fits' : 'fit'}`}
        </ThemedText>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Pick a game</ThemedText>
        <FlatList
          style={styles.list}
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <GameSummary game={item} here={here} />
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
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    flex: 1,
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
  item: {
    paddingVertical: Spacing.two,
  },
});
