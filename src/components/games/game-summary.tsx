import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import type { GameWithOwners } from '@/db/games';
import { formatGameDetails } from '@/lib/games';
import { ownersInOrder, personLabel } from '@/lib/people';

type Props = {
  game: GameWithOwners;
  /** People to put first and bold, e.g. tonight's people on the Pick tab. */
  here?: ReadonlySet<string>;
  /** Extra lines under the owners. */
  children?: ReactNode;
};

/** A game's name, details and owners, read-only. Used in game lists and the Pick tab. */
export function GameSummary({ game, here, children }: Props) {
  const me = useCurrentUser();
  const owners = ownersInOrder(game.owners, me.id, here);
  const details = formatGameDetails(game);

  return (
    <View style={styles.summary}>
      <ThemedText>{game.name}</ThemedText>
      {details.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          {details}
        </ThemedText>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        {owners.length === 0
          ? 'No owners'
          : owners.map((owner, i) => (
              <Fragment key={owner.id}>
                {i > 0 && ', '}
                {here?.has(owner.id) ? (
                  <ThemedText type="smallBold">{personLabel(owner, me.id)}</ThemedText>
                ) : (
                  personLabel(owner, me.id)
                )}
              </Fragment>
            ))}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    flex: 1,
    gap: Spacing.half,
  },
});
