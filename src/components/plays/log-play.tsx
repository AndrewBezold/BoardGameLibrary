import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createContext, use, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ErrorText } from '@/components/error-text';
import { PersonChips } from '@/components/person-chips';
import { PersonPicker } from '@/components/person-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUndo } from '@/components/undo-snackbar';
import { useWhosHere } from '@/components/whos-here';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import { toUserMessage } from '@/db/errors';
import { useGamesWithOwners } from '@/db/games';
import { logPlay } from '@/db/plays';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel, toLocalDate } from '@/lib/format';

/** Opens the Log a play sheet, with the game filled in if given. */
type OpenLogPlay = (gameId?: string) => void;

const LogPlayContext = createContext<OpenLogPlay | null>(null);

export function useLogPlay(): OpenLogPlay {
  const open = use(LogPlayContext);
  if (!open) throw new Error('useLogPlay must be used inside LogPlayProvider');
  return open;
}

/** `key` gives every opening a fresh form. The sheet's content stays while it slides away. */
type Request = { key: number; gameId: string | null; open: boolean };

let nextKey = 0;

/** Hosts the one Log a play sheet, over whatever tab is showing. Must be inside UndoProvider. */
export function LogPlayProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const close = () => setRequest((r) => (r ? { ...r, open: false } : r));

  return (
    <LogPlayContext value={(gameId) => setRequest({ key: nextKey++, gameId: gameId ?? null, open: true })}>
      {children}
      <Modal
        visible={request?.open ?? false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}>
        {/* A modal is its own window on Android, so it needs its own safe area. */}
        <SafeAreaProvider>
          {request && <LogPlaySheet key={request.key} initialGameId={request.gameId} onClose={close} />}
        </SafeAreaProvider>
      </Modal>
    </LogPlayContext>
  );
}

function LogPlaySheet({ initialGameId, onClose }: { initialGameId: string | null; onClose: () => void }) {
  const theme = useTheme();
  const me = useCurrentUser();
  const games = useGamesWithOwners();
  const [whosHere] = useWhosHere();
  const showUndo = useUndo();

  const [gameId, setGameId] = useState(initialGameId);
  const [choosingGame, setChoosingGame] = useState(initialGameId === null);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [playerIds, setPlayerIds] = useState(() => (whosHere.length > 0 ? whosHere : [me.id]));
  const [winnerIds, setWinnerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Gone if it was deleted while the sheet was open.
  const game = games.find((g) => g.id === gameId) ?? null;
  // Only players can win: dropping a player drops them as a winner.
  const winners = winnerIds.filter((id) => playerIds.includes(id));
  const canSave = game !== null && playerIds.length > 0;

  const query = search.trim().toLowerCase();
  const matches = query ? games.filter((g) => g.name.toLowerCase().includes(query)) : games;

  function chooseGame(id: string) {
    setGameId(id);
    setChoosingGame(false);
    setSearch('');
    setError(null);
  }

  function changeDate() {
    const today = new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        maximumDate: today,
        onValueChange: (_event, picked) => setDate(picked),
      });
    } else {
      setShowCalendar((shown) => !shown);
    }
  }

  function save() {
    if (!game) return;
    try {
      const undo = logPlay({ gameId: game.id, playedOn: toLocalDate(date), playerIds, winnerIds: winners });
      onClose();
      showUndo(`Logged ${game.name}`, undo);
    } catch (e) {
      setError(toUserMessage(e, 'Could not log play'));
    }
  }

  let winnersHint: string | null = null;
  if (playerIds.length === 0) winnersHint = 'Choose players first.';
  else if (winners.length === 0) winnersHint = 'No winners: a co-op loss or an unfinished game';
  else if (playerIds.length > 1 && winners.length === playerIds.length) winnersHint = 'Everyone won: a co-op win';

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Log a play</ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Game
            </ThemedText>
            {game && !choosingGame ? (
              <Pressable
                onPress={() => setChoosingGame(true)}
                accessibilityRole="button"
                accessibilityHint="Choose a different game"
                style={({ pressed }) => [styles.valueRow, pressed && { opacity: 0.6 }]}>
                <ThemedText type="smallBold" style={styles.grow}>
                  {game.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Change
                </ThemedText>
              </Pressable>
            ) : (
              <>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search games"
                  placeholderTextColor={theme.textSecondary}
                  autoFocus={initialGameId === null}
                  returnKeyType="search"
                  accessibilityLabel="Search games"
                  style={inputStyle}
                />
                {matches.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {games.length === 0 ? 'No games yet. Add some on the Home tab.' : 'No games match.'}
                  </ThemedText>
                ) : (
                  matches.map((g) => (
                    <Pressable
                      key={g.id}
                      onPress={() => chooseGame(g.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: g.id === gameId }}
                      style={({ pressed }) => [styles.valueRow, pressed && { opacity: 0.6 }]}>
                      <ThemedText type={g.id === gameId ? 'smallBold' : 'small'}>{g.name}</ThemedText>
                    </Pressable>
                  ))
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Date
            </ThemedText>
            <Pressable
              onPress={changeDate}
              disabled={Platform.OS === 'web'}
              accessibilityRole="button"
              accessibilityHint="Change the date played"
              style={({ pressed }) => [styles.valueRow, pressed && { opacity: 0.6 }]}>
              <ThemedText type="smallBold" style={styles.grow}>
                {formatDayLabel(date)}
              </ThemedText>
              {Platform.OS !== 'web' && (
                <ThemedText type="small" themeColor="textSecondary">
                  {showCalendar ? 'Done' : 'Change'}
                </ThemedText>
              )}
            </Pressable>
            {showCalendar && (
              <DateTimePicker
                value={date}
                mode="date"
                display="inline"
                maximumDate={new Date()}
                onValueChange={(_event, picked) => {
                  setDate(picked);
                  setShowCalendar(false);
                }}
              />
            )}
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Players
            </ThemedText>
            <PersonPicker value={playerIds} onChange={setPlayerIds} emptyText="Pick at least one player." />
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Winners
            </ThemedText>
            {playerIds.length > 0 && <PersonChips value={winners} onChange={setWinnerIds} only={playerIds} />}
            {winnersHint && (
              <ThemedText type="small" themeColor="textSecondary">
                {winnersHint}
              </ThemedText>
            )}
          </View>

          <ErrorText>{error}</ErrorText>

          <View style={styles.actions}>
            <Button label="Cancel" onPress={onClose} />
            <Button label="Save" variant="primary" onPress={save} disabled={!canSave} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 40,
  },
  grow: {
    flex: 1,
  },
  input: {
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
});
