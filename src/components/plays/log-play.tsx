import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { createContext, use, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ConfirmButton } from '@/components/confirm-button';
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
import { deletePlay, getPlay, logPlay, updatePlay, type PlayDetails } from '@/db/plays';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel, parseLocalDate, toLocalDate } from '@/lib/format';

/** Opens the Log a play sheet, with the game filled in if given. */
type OpenLogPlay = (gameId?: string) => void;
/** Opens the same sheet to fix or delete a logged play. */
type OpenEditPlay = (playId: string) => void;

const LogPlayContext = createContext<{ log: OpenLogPlay; edit: OpenEditPlay } | null>(null);

function usePlaySheet() {
  const value = use(LogPlayContext);
  if (!value) throw new Error('useLogPlay and useEditPlay must be used inside LogPlayProvider');
  return value;
}

export function useLogPlay(): OpenLogPlay {
  return usePlaySheet().log;
}

export function useEditPlay(): OpenEditPlay {
  return usePlaySheet().edit;
}

/**
 * `key` gives every opening a fresh form. The sheet's content stays while it
 * slides away. `playId` is set when editing a play.
 */
type Request = { key: number; gameId: string | null; playId: string | null; open: boolean };

let nextKey = 0;

/** Hosts the one play sheet (log or edit), over whatever screen is showing. Must be inside UndoProvider. */
export function LogPlayProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const close = () => setRequest((r) => (r ? { ...r, open: false } : r));
  const [actions] = useState(() => ({
    log: (gameId?: string) => setRequest({ key: nextKey++, gameId: gameId ?? null, playId: null, open: true }),
    edit: (playId: string) => setRequest({ key: nextKey++, gameId: null, playId, open: true }),
  }));

  return (
    <LogPlayContext value={actions}>
      {children}
      <Modal
        visible={request?.open ?? false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={close}>
        {/* A modal is its own window on Android, so it needs its own safe area. */}
        <SafeAreaProvider>
          {request && (
            <PlaySheet key={request.key} initialGameId={request.gameId} playId={request.playId} onClose={close} />
          )}
        </SafeAreaProvider>
      </Modal>
    </LogPlayContext>
  );
}

type SheetProps = { initialGameId: string | null; playId: string | null; onClose: () => void };

/** Reads the play being edited once, when the sheet opens. */
function PlaySheet({ initialGameId, playId, onClose }: SheetProps) {
  const [existing] = useState(() => (playId ? getPlay(playId) : null));

  if (playId && !existing) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="subtitle">Edit play</ThemedText>
          <ThemedText themeColor="textSecondary">This play was deleted.</ThemedText>
          <View style={styles.actions}>
            <Button label="Close" onPress={onClose} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }
  return (
    <PlayForm
      initialGameId={existing?.gameId ?? initialGameId}
      existing={playId && existing ? { id: playId, ...existing } : null}
      onClose={onClose}
    />
  );
}

type PlayFormProps = {
  initialGameId: string | null;
  /** The play being edited, or null when logging a new one. */
  existing: (PlayDetails & { id: string }) | null;
  onClose: () => void;
};

function PlayForm({ initialGameId, existing, onClose }: PlayFormProps) {
  const theme = useTheme();
  const me = useCurrentUser();
  const games = useGamesWithOwners();
  const [whosHere] = useWhosHere();
  const showUndo = useUndo();

  const [gameId, setGameId] = useState(initialGameId);
  const [choosingGame, setChoosingGame] = useState(initialGameId === null);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState(() => (existing ? parseLocalDate(existing.playedOn) : new Date()));
  const [showCalendar, setShowCalendar] = useState(false);
  const [playerIds, setPlayerIds] = useState<string[]>(() => {
    if (existing) return [...existing.playerIds];
    return whosHere.length > 0 ? whosHere : [me.id];
  });
  const [winnerIds, setWinnerIds] = useState<string[]>(() => (existing ? [...existing.winnerIds] : []));
  const [error, setError] = useState<string | null>(null);

  // People deleted since the play was logged: still shown, so they can stay in it.
  const deletedPlayers = existing?.players.filter((p) => p.deleted) ?? [];

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
    const play = { gameId: game.id, playedOn: toLocalDate(date), playerIds, winnerIds: winners };
    try {
      if (existing) {
        updatePlay(existing.id, play);
        onClose();
      } else {
        const undo = logPlay(play);
        onClose();
        showUndo(`Logged ${game.name}`, undo);
      }
    } catch (e) {
      setError(toUserMessage(e, existing ? 'Could not save play' : 'Could not log play'));
    }
  }

  function remove() {
    if (!existing) return;
    try {
      const undo = deletePlay(existing.id);
      onClose();
      showUndo('Deleted play', undo);
    } catch (e) {
      setError(toUserMessage(e, 'Could not delete play'));
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
          <ThemedText type="subtitle">{existing ? 'Edit play' : 'Log a play'}</ThemedText>
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
            <PersonPicker
              value={playerIds}
              onChange={setPlayerIds}
              extra={deletedPlayers}
              emptyText="Pick at least one player."
            />
          </View>

          <View style={styles.section}>
            <ThemedText type="small" themeColor="textSecondary">
              Winners
            </ThemedText>
            {playerIds.length > 0 && (
              <PersonChips value={winners} onChange={setWinnerIds} only={playerIds} extra={deletedPlayers} />
            )}
            {winnersHint && (
              <ThemedText type="small" themeColor="textSecondary">
                {winnersHint}
              </ThemedText>
            )}
          </View>

          <ErrorText>{error}</ErrorText>

          <View style={styles.actions}>
            {existing && (
              <>
                <ConfirmButton
                  label="Delete"
                  title="Delete this play?"
                  message={`${game?.name ?? 'This game'}, ${formatDayLabel(parseLocalDate(existing.playedOn))}. It's removed from the history and play count.`}
                  onConfirm={remove}
                />
                <View style={styles.grow} />
              </>
            )}
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
