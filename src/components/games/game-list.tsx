import type { ReactElement, ReactNode } from 'react';
import { SectionList, StyleSheet } from 'react-native';

import { GameRow } from '@/components/games/game-row';
import { ThemedText } from '@/components/themed-text';
import type { GameWithOwners } from '@/db/games';
import { usePlayStats } from '@/db/plays';
import { formatPlayStats } from '@/lib/plays';

export type GameSection = { key: string; data: GameWithOwners[] };

type Props = {
  sections: GameSection[];
  /** Above the games, e.g. an add form or filters. Scrolls with the list. */
  header?: ReactElement;
  /** Shown when there are no games in any section. Omit to show nothing. */
  empty?: string;
  /** People to put first and bold in owner lists. */
  here?: ReadonlySet<string>;
  /** Heading for a section, or nothing for an untitled one. */
  sectionTitle?: (key: string) => ReactNode;
  /** Extra lines under a game's play stats. */
  extra?: (game: GameWithOwners, sectionKey: string) => ReactNode;
};

/** Games in sections, each with its play stats. Tap one to open its screen. */
export function GameList({ sections, header, empty, here, sectionTitle, extra }: Props) {
  const playStats = usePlayStats();

  return (
    <SectionList
      style={styles.list}
      sections={sections}
      keyExtractor={(item) => item.id}
      extraData={playStats}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={header}
      renderSectionHeader={sectionTitle ? ({ section }) => sectionTitle(section.key) : undefined}
      renderItem={({ item, section }) => (
        <GameRow game={item} here={here}>
          <ThemedText type="small" themeColor="textSecondary">
            {formatPlayStats(playStats.get(item.id))}
          </ThemedText>
          {extra?.(item, section.key)}
        </GameRow>
      )}
      ListEmptyComponent={
        empty ? <ThemedText themeColor="textSecondary">{empty}</ThemedText> : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    alignSelf: 'stretch',
  },
});
