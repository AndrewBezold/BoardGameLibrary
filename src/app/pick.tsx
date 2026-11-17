import { useState } from 'react';
import { SectionList, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ErrorText } from '@/components/error-text';
import { GameSummary } from '@/components/games/game-summary';
import { PersonChips } from '@/components/person-chips';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useGamesWithOwners, type GameWithOwners } from '@/db/games';
import { usePeople } from '@/db/people';
import { usePlayStats } from '@/db/plays';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDay, parseLocalDate, plural } from '@/lib/format';
import { isPositiveCount, parseCount } from '@/lib/numbers';
import { gameFit, missingDetails, neglectedFirst, pickRandom, type PickerFilter } from '@/lib/picker';

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
  const playStats = usePlayStats();
  const [selected, setSelected] = useState<string[]>([]);
  const [onlyTheirGames, setOnlyTheirGames] = useState(true);
  const [playersText, setPlayersText] = useState('');
  const [minutesText, setMinutesText] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [neglected, setNeglected] = useState(false);

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

  let fits: GameWithOwners[] = [];
  let unknown: GameWithOwners[] = [];
  for (const game of allGames) {
    const fit = gameFit(game, filter);
    if (fit === 'fits') fits.push(game);
    else if (fit === 'unknown') unknown.push(game);
  }
  if (neglected) {
    const lastPlayedOn = (id: string) => playStats.get(id)?.lastPlayedOn ?? null;
    fits = neglectedFirst(fits, lastPlayedOn);
    unknown = neglectedFirst(unknown, lastPlayedOn);
  }

  function lastPlayedText(gameId: string): string {
    const stats = playStats.get(gameId);
    return stats ? `Last played ${formatRelativeDay(parseLocalDate(stats.lastPlayedOn))}` : 'Never played';
  }

  // Games known to fit first, then those that might; empty sections are left out.
  const sections = [
    { key: 'fits', data: fits },
    { key: 'unknown', data: unknown },
  ].filter((section) => section.data.length > 0);

  // The random pick, while it still fits (changing the filters can rule it out).
  const picked = fits.find((game) => game.id === pickedId) ?? null;

  function pickOne() {
    setPickedId(pickRandom(fits, picked?.id ?? null)?.id ?? null);
  }

  let countText = '';
  if (fits.length > 0) countText = `${plural(fits.length, 'game')} ${fits.length === 1 ? 'fits' : 'fit'}`;
  else if (unknown.length > 0) countText = 'Nothing is known to fit';
  if (unknown.length > 0) countText += ` · ${unknown.length} might`;

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

      <View style={styles.switchRow}>
        <ThemedText type="small" style={styles.switchLabel}>
          Least recently played first
        </ThemedText>
        <Switch
          value={neglected}
          onValueChange={setNeglected}
          accessibilityLabel="Show never played and least recently played games first"
        />
      </View>

      {countText.length > 0 && (
        <View style={styles.countRow}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.countText}>
            {countText}
          </ThemedText>
          {fits.length > 0 && <Button label="Pick one" variant="primary" onPress={pickOne} />}
        </View>
      )}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Pick a game</ThemedText>
        {picked && (
          <View style={[styles.pickedCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {"Tonight's pick"}
            </ThemedText>
            <GameSummary game={picked} here={here} />
            <View style={styles.pickedActions}>
              <Button label="Done" onPress={() => setPickedId(null)} />
              {fits.length > 1 && <Button label="Pick again" variant="primary" onPress={pickOne} />}
            </View>
          </View>
        )}
        <SectionList
          style={styles.list}
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={header}
          renderSectionHeader={({ section }) =>
            section.key === 'unknown' ? (
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">Unknown fit</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {"These might fit, but they're missing a detail needed to check."}
                </ThemedText>
              </View>
            ) : null
          }
          renderItem={({ item, section }) => {
            const missing = section.key === 'unknown' ? missingDetails(item, filter) : [];
            return (
              <View style={styles.item}>
                <GameSummary game={item} here={here} />
                <ThemedText type="small" themeColor="textSecondary">
                  {lastPlayedText(item.id)}
                </ThemedText>
                {missing.length > 0 && (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.missing}>
                    {`No ${missing.join(' or ')} set`}
                  </ThemedText>
                )}
              </View>
            );
          }}
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
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  countText: {
    flex: 1,
  },
  pickedCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  pickedActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  sectionHeader: {
    gap: Spacing.half,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.one,
  },
  missing: {
    fontStyle: 'italic',
  },
});
