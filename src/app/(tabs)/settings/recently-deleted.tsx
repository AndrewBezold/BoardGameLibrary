import { useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { ErrorText } from '@/components/error-text';
import { DeletedRow } from '@/components/settings/deleted-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { toUserMessage } from '@/db/errors';
import { restoreDeleted, useRecentlyDeleted, type DeletedItem } from '@/db/recently-deleted';

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
        ListHeaderComponent={<ErrorText style={styles.error}>{error}</ErrorText>}
        renderItem={({ item }) => <DeletedRow item={item} onRestore={() => handleRestore(item)} />}
        ListEmptyComponent={
          <ThemedText themeColor="textSecondary">Nothing deleted. Deleted games, people and plays show up here.</ThemedText>
        }
      />
    </ThemedView>
  );
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
  error: {
    paddingBottom: Spacing.two,
  },
});
