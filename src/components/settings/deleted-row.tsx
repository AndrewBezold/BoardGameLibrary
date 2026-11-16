import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DeletedItem } from '@/db/recently-deleted';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeDay } from '@/lib/format';

/** A deleted game or person with when it went, and a Restore button. */
export function DeletedRow({ item, onRestore }: { item: DeletedItem; onRestore: () => void }) {
  const theme = useTheme();
  const kind = item.kind === 'person' ? 'Person' : 'Game';

  return (
    <View style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
      <View style={styles.text}>
        <ThemedText>{item.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {kind}, deleted {formatRelativeDay(item.deletedAt)}
        </ThemedText>
        {item.kind === 'person' && item.games.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Restores {item.games.map((game) => game.name).join(', ')} too
          </ThemedText>
        )}
      </View>
      <Button label="Restore" onPress={onRestore} accessibilityLabel={`Restore ${item.name}`} />
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
