import { StyleSheet, View } from 'react-native';

import { ConfirmButton } from '@/components/confirm-button';
import { EditableName } from '@/components/editable-name';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { addPerson, countSoleOwnedGames, renamePerson, type Person } from '@/db/people';
import { useTheme } from '@/hooks/use-theme';
import { plural } from '@/lib/format';

/** Dialog text for deleting a person, naming how many games go with them. */
function deleteMessage(personId: string) {
  const count = countSoleOwnedGames(personId);
  if (count === 0) return undefined;
  return `This also deletes ${plural(count, 'game')} only they own.`;
}

/** A person: tap the name to rename. Everyone but you has Delete, which asks first. */
export function PersonRow({
  person,
  isMe,
  onDelete,
}: {
  person: Person;
  isMe: boolean;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
      <EditableName
        initial={person.name}
        placeholder={isMe ? 'Your name' : 'Name'}
        label={isMe ? `${person.name}, you` : person.name}
        accessibilityHint="Rename"
        accessibilityLabel={`Rename ${person.name}`}
        failureText="Could not rename"
        save={(name) => renamePerson(person.id, name)}>
        <ThemedText>
          {person.name}
          {isMe && <ThemedText themeColor="textSecondary"> (me)</ThemedText>}
        </ThemedText>
      </EditableName>
      {!isMe && (
        <ConfirmButton
          label="Delete"
          title={`Delete ${person.name}?`}
          message={() => deleteMessage(person.id)}
          onConfirm={onDelete}
        />
      )}
    </View>
  );
}

/** "+ Add person" at the end of the list, which opens a name field. */
export function AddPersonRow() {
  return (
    <View style={styles.addRow}>
      <EditableName
        initial=""
        placeholder="Name"
        accessibilityLabel="New person's name"
        failureText="Could not add person"
        save={(name) => {
          addPerson(name);
        }}>
        <ThemedText themeColor="textSecondary">+ Add person</ThemedText>
      </EditableName>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.two,
  },
});
