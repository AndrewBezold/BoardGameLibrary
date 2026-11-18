import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GameForm } from '@/components/games/game-form';
import { GameSummary } from '@/components/games/game-summary';
import { useLogPlay } from '@/components/plays/log-play';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUndo } from '@/components/undo-snackbar';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import { deleteGame, getGameOwnerIds, updateGame, useGamesWithOwners, type GameWithOwners } from '@/db/games';
import { useGamePlays, type PlaySummary } from '@/db/plays';
import { formatDayLabel, parseLocalDate } from '@/lib/format';
import { personLabel } from '@/lib/people';
import { formatPlayStats, winnerSummary } from '@/lib/plays';

/** One game: its details, play stats and play history, newest first. */
export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const game = useGamesWithOwners().find((g) => g.id === id) ?? null;
  const plays = useGamePlays(id);
  const openLogPlay = useLogPlay();
  const [editing, setEditing] = useState(false);

  const content = { paddingBottom: insets.bottom + Spacing.three };

  if (!game) {
    // Deleted here (on the way back to the list) or elsewhere.
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.column, styles.content, content]}>
          <ThemedText themeColor="textSecondary">This game was deleted.</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const stats = plays.length > 0 ? { lastPlayedOn: plays[0].playedOn, playCount: plays.length } : undefined;

  const header = (
    <View style={styles.header}>
      {editing ? (
        <GameEditor game={game} onDone={() => setEditing(false)} />
      ) : (
        <>
          <GameSummary game={game}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatPlayStats(stats)}
            </ThemedText>
          </GameSummary>
          <View style={styles.actions}>
            <Button label="Log a play" variant="primary" onPress={() => openLogPlay(game.id)} />
            <Button label="Edit" onPress={() => setEditing(true)} />
          </View>
        </>
      )}
      <ThemedText type="smallBold" style={styles.playsTitle}>
        Plays
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: game.name }} />
      <FlatList
        style={styles.column}
        contentContainerStyle={[styles.content, content]}
        data={plays}
        keyExtractor={(play) => play.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        renderItem={({ item }) => <PlayRow play={item} />}
        ListEmptyComponent={<ThemedText themeColor="textSecondary">No plays yet.</ThemedText>}
      />
    </ThemedView>
  );
}

/** The edit form, in place of the summary. Delete goes back to the list with Undo. */
function GameEditor({ game, onDone }: { game: GameWithOwners; onDone: () => void }) {
  const showUndo = useUndo();
  const openLogPlay = useLogPlay();
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
        showUndo(`Deleted ${game.name}`, undo);
        router.back();
      }}
      // The form stays open behind the sheet, so unsaved edits aren't lost.
      onLogPlay={() => openLogPlay(game.id)}
    />
  );
}

/** A play's date, then its players: winners first, in bold with a trophy. */
function PlayRow({ play }: { play: PlaySummary }) {
  const me = useCurrentUser();
  const day = formatDayLabel(parseLocalDate(play.playedOn));
  const summary = winnerSummary(play.players);
  // With no winners or everyone winning, the summary line says it; no marks needed.
  const markWinners = summary === null;
  const names = play.players.map((p) => personLabel(p, me.id));
  const winners = play.players.filter((p) => p.isWinner).map((p) => personLabel(p, me.id));

  return (
    <View
      style={styles.play}
      accessible
      accessibilityLabel={`${day}. Played by ${names.join(', ')}. ${summary ?? `Won by ${winners.join(', ')}`}.`}>
      <ThemedText type="small" themeColor="textSecondary">
        {day}
      </ThemedText>
      <ThemedText>
        {play.players.map((player, i) => {
          const name = personLabel(player, me.id);
          const marked = markWinners && player.isWinner;
          return (
            <Fragment key={player.id}>
              {i > 0 && ', '}
              <ThemedText
                themeColor={player.deleted ? 'textSecondary' : 'text'}
                style={marked ? styles.winner : undefined}>
                {marked ? `${name} 🏆` : name}
              </ThemedText>
            </Fragment>
          );
        })}
      </ThemedText>
      {summary && (
        <ThemedText type="small" themeColor="textSecondary">
          {summary}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  column: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  playsTitle: {
    marginTop: Spacing.three,
  },
  play: {
    gap: Spacing.half,
    paddingVertical: Spacing.two,
  },
  winner: {
    fontWeight: '700',
  },
});
