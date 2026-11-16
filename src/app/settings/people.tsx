import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ErrorText } from '@/components/error-text';
import { AddPersonRow, PersonRow } from '@/components/people/person-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUndo } from '@/components/undo-snackbar';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import { toUserMessage } from '@/db/errors';
import { deletePerson, usePeople, type Person } from '@/db/people';
import { plural } from '@/lib/format';
import { meFirst } from '@/lib/people';

/** Everyone in the group: rename anyone, delete anyone but yourself, add people. */
export default function PeopleScreen() {
  const me = useCurrentUser();
  const people = meFirst(usePeople(), me.id);
  const showUndo = useUndo();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(person: Person) {
    try {
      const { deletedGameCount, undo } = deletePerson(person.id);
      setError(null);
      const also = deletedGameCount === 0 ? '' : ` and ${plural(deletedGameCount, 'game')}`;
      showUndo(`Deleted ${person.name}${also}`, undo);
    } catch (e) {
      setError(toUserMessage(e, 'Could not delete person'));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <ThemedText type="small" themeColor="textSecondary">
          Tap a name to change it.
        </ThemedText>
        <View>
          {people.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              isMe={person.id === me.id}
              onDelete={() => handleDelete(person)}
            />
          ))}
          <AddPersonRow />
        </View>
        <ErrorText>{error}</ErrorText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  scroll: {
    alignSelf: 'stretch',
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.two,
  },
});
