import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import type { DeletedItem } from '@/db/recently-deleted';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDay, parseLocalDate } from '@/lib/format';
import { personLabel } from '@/lib/people';

/** A deleted game, person or play with when it went, and a Restore button. */
export function DeletedRow({ item, onRestore }: { item: DeletedItem; onRestore: () => void }) {
  const theme = useTheme();
  const me = useCurrentUser();
  const deleted = `deleted ${formatRelativeDay(item.deletedAt)}`;

  let kind: string;
  let restoreLabel = `Restore ${item.name}`;
  if (item.kind === 'play') {
    const day = formatRelativeDay(parseLocalDate(item.playedOn));
    kind = `Play from ${day}, ${deleted}`;
    restoreLabel = `Restore the ${item.name} play from ${day}`;
  } else {
    kind = `${item.kind === 'person' ? 'Person' : 'Game'}, ${deleted}`;
  }

  return (
    <View style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
      <View style={styles.text}>
        <ThemedText>{item.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {kind}
        </ThemedText>
        {item.kind === 'person' && item.games.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Restores {item.games.map((game) => game.name).join(', ')} too
          </ThemedText>
        )}
        {item.kind === 'play' && item.players.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            {item.players.map((p) => personLabel(p, me.id)).join(', ')}
          </ThemedText>
        )}
        {item.kind === 'play' && item.gameDeleted && (
          <ThemedText type="small" themeColor="textSecondary">
            {item.name} is deleted too. Restore it first.
          </ThemedText>
        )}
      </View>
      <Button label="Restore" onPress={onRestore} accessibilityLabel={restoreLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
