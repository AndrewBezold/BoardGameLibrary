import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import type { GameWithOwners } from '@/db/games';
import { formatGameDetails } from '@/lib/games';
import { meFirst, personLabel } from '@/lib/people';

/** A game's name, details and owners, read-only. Used in the catalog and the picker. */
export function GameSummary({ game }: { game: GameWithOwners }) {
  const me = useCurrentUser();
  const owners = meFirst(game.owners, me.id)
    .map((owner) => personLabel(owner, me.id))
    .join(', ');
  const details = formatGameDetails(game);

  return (
    <View style={styles.summary}>
      <ThemedText>{game.name}</ThemedText>
      {details.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          {details}
        </ThemedText>
      )}
      {owners.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          {owners}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flex: 1,
    gap: Spacing.half,
  },
});
