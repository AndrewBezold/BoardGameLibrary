import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { GameSummary } from '@/components/games/game-summary';
import { Spacing } from '@/constants/theme';
import type { GameWithOwners } from '@/db/games';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  game: GameWithOwners;
  /** People to put first and bold in the owner list. */
  here?: ReadonlySet<string>;
  /** Extra lines under the owners. */
  children?: ReactNode;
};

/** A game in the list, with its details and owners. Tap to open its screen. */
export function GameRow({ game, here, children }: Props) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/game/[id]', params: { id: game.id } })}
      accessibilityRole="button"
      accessibilityHint="Shows this game's plays"
      style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
      <GameSummary game={game} here={here}>
        {children}
      </GameSummary>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={18}
        tintColor={theme.textSecondary}
        accessible={false}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
