import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { DANGER } from '@/components/confirm-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { toUserMessage } from '@/db/errors';
import { restoreDeleted, useRecentlyDeleted, type DeletedItem } from '@/db/recently-deleted';
import { useTheme } from '@/hooks/use-theme';

export default function RecentlyDeletedScreen() {
  const items = useRecentlyDeleted();
  const [error, setError] = useState<string | null>(null);

  function handleRestore(item: DeletedItem) {
    try {
      restoreDeleted(item);
      setError(null);
    } catch (e) {
      setError(toUserMessage(e, `Could not restore ${item.name}`));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.content}
        data={items}
        keyExtractor={(item) => `${item.kind}:${item.id}`}
        ListHeaderComponent={
          error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : undefined
        }
        renderItem={({ item }) => <DeletedRow item={item} onRestore={() => handleRestore(item)} />}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">Nothing deleted. Deleted games and people show up here.</ThemedText>
        }
      />
    </ThemedView>
  );
}

function DeletedRow({ item, onRestore }: { item: DeletedItem; onRestore: () => void }) {
  const theme = useTheme();
  const detail = [
    item.kind === 'person' ? 'Person' : 'Game',
    `deleted ${formatDeletedAt(item.deletedAt)}`,
  ].join(', ');

  return (
    <View style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
      <View style={styles.text}>
        <ThemedText>{item.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {detail}
        </ThemedText>
        {item.kind === 'person' && item.games.length > 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Restores {item.games.map((game) => game.name).join(', ')} too
          </ThemedText>
        )}
      </View>
      <Pressable
        onPress={onRestore}
        accessibilityRole="button"
        accessibilityLabel={`Restore ${item.name}`}
        style={({ pressed }) => [
          styles.button,
          { borderColor: theme.backgroundSelected },
          pressed && { opacity: 0.7 },
        ]}>
        <ThemedText type="smallBold">Restore</ThemedText>
      </Pressable>
    </View>
  );
}

/** "today", "yesterday", "Nov 3", or "Nov 3, 2025" for other years. */
function formatDeletedAt(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const days = Math.round(
    (startOfDay(today).getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000)
  );
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  list: {
    alignSelf: 'stretch',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
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
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  error: {
    color: DANGER,
    paddingBottom: Spacing.two,
  },
});
