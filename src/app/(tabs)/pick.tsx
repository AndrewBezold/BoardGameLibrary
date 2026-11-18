import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorText } from '@/components/error-text';
import { GameList } from '@/components/games/game-list';
import { GameSummary } from '@/components/games/game-summary';
import { PersonChips } from '@/components/person-chips';
import { useLogPlay } from '@/components/plays/log-play';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useWhosHere } from '@/components/whos-here';
import { Spacing } from '@/constants/theme';
import { useGamesWithOwners, type GameWithOwners } from '@/db/games';
import { usePlayStats } from '@/db/plays';
import { useTheme } from '@/hooks/use-theme';
import { plural } from '@/lib/format';
import { gameFit, leastRecentlyPlayedFirst, missingDetails, type GameFilter } from '@/lib/game-filter';
import { isPositiveCount, parseCount } from '@/lib/numbers';
import { formatPlayStats } from '@/lib/plays';
import { pickRandom } from '@/lib/random';

/** A typed filter value: the number to filter by (null if blank or invalid), and whether it's invalid. */
function filterValue(text: string): { value: number | null; invalid: boolean } {
  const parsed = parseCount(text);
  if (parsed === null) return { value: null, invalid: false };
  return isPositiveCount(parsed) ? { value: parsed, invalid: false } : { value: null, invalid: true };
}

export default function PickScreen() {
  const theme = useTheme();
  const allGames = useGamesWithOwners();
  const playStats = usePlayStats();
  const openLogPlay = useLogPlay();
  // Shared with Log a play, which starts with these people as players.
  const [hereIds, setHereIds] = useWhosHere();
  const [onlyTheirGames, setOnlyTheirGames] = useState(true);
  const [playersText, setPlayersText] = useState('');
  const [minutesText, setMinutesText] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [neglected, setNeglected] = useState(false);

  const here = new Set(hereIds);

  function pickPeople(ids: string[]) {
    setHereIds(ids);
    // The player count follows the people picked; it can still be changed by hand.
    setPlayersText(ids.length > 0 ? String(ids.length) : '');
  }

  const players = filterValue(playersText);
  const minutes = filterValue(minutesText);
  const filter: GameFilter = {
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
    fits = leastRecentlyPlayedFirst(fits, lastPlayedOn);
    unknown = leastRecentlyPlayedFirst(unknown, lastPlayedOn);
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
        {allGames.length > 0 && (
          <View style={styles.logRow}>
            <Button label="Log a play" onPress={() => openLogPlay()} />
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
    <Screen title="Pick a game">
      {picked && (
        <View style={[styles.pickedCard, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {"Tonight's pick"}
          </ThemedText>
          <GameSummary game={picked} here={here}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatPlayStats(playStats.get(picked.id))}
            </ThemedText>
          </GameSummary>
          <View style={styles.pickedActions}>
            <Button label="Log play" onPress={() => openLogPlay(picked.id)} />
            <View style={styles.spacer} />
            <Button label="Done" onPress={() => setPickedId(null)} />
            {fits.length > 1 && <Button label="Pick again" variant="primary" onPress={pickOne} />}
          </View>
        </View>
      )}
      <GameList
        sections={sections}
        header={header}
        empty={empty}
        here={here}
        sectionTitle={(key) =>
          key === 'unknown' ? (
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">Unknown fit</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {"These might fit, but they're missing a detail needed to check."}
              </ThemedText>
            </View>
          ) : null
        }
        extra={(game, key) => {
          const missing = key === 'unknown' ? missingDetails(game, filter) : [];
          return missing.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.missing}>
              {`No ${missing.join(' or ')} set`}
            </ThemedText>
          ) : null;
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    gap: Spacing.two,
  },
  spacer: {
    flex: 1,
  },
  logRow: {
    flexDirection: 'row',
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
