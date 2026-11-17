import { useState, type ReactElement, type ReactNode } from 'react';
import { SectionList, StyleSheet } from 'react-native';

import { GameRow } from '@/components/games/game-row';
import { ThemedText } from '@/components/themed-text';
import type { GameWithOwners } from '@/db/games';

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
  /** Extra lines under a game's owners. */
  extra?: (game: GameWithOwners, sectionKey: string) => ReactNode;
  /**
   * The row open for editing. Pass both to control it from outside, e.g. to
   * close rows when an add form opens; omit both and the list keeps its own.
   */
  editingId?: string | null;
  onEditingChange?: (id: string | null) => void;
};

/** Games in sections, each tappable to edit in place, one at a time. */
export function GameList({
  sections,
  header,
  empty,
  here,
  sectionTitle,
  extra,
  editingId: controlledId,
  onEditingChange,
}: Props) {
  const [ownId, setOwnId] = useState<string | null>(null);
  const editingId = controlledId !== undefined ? controlledId : ownId;
  const setEditingId = onEditingChange ?? setOwnId;

  return (
    <SectionList
      style={styles.list}
      sections={sections}
      keyExtractor={(item) => item.id}
      extraData={editingId}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={header}
      renderSectionHeader={sectionTitle ? ({ section }) => sectionTitle(section.key) : undefined}
      renderItem={({ item, section }) => (
        <GameRow
          game={item}
          here={here}
          editing={item.id === editingId}
          onStartEdit={() => setEditingId(item.id)}
          onDone={() => setEditingId(null)}>
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
