import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ConfirmButton, DANGER } from '@/components/confirm-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUndo } from '@/components/undo-snackbar';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import { toUserMessage } from '@/db/errors';
import {
  addPerson,
  countSoleOwnedGames,
  deletePerson,
  renamePerson,
  usePeople,
  type Person,
} from '@/db/people';
import { useTheme } from '@/hooks/use-theme';

/** Everyone in the group: rename anyone, delete anyone but yourself, add people. */
export default function PeopleScreen() {
  const me = useCurrentUser();
  const allPeople = usePeople();
  const showUndo = useUndo();
  const [error, setError] = useState<string | null>(null);

  // You first, everyone else alphabetically.
  const people = [...allPeople].sort((a, b) => Number(b.id === me.id) - Number(a.id === me.id));

  function handleDelete(person: Person) {
    try {
      const games = countSoleOwnedGames(person.id);
      const undo = deletePerson(person.id);
      setError(null);
      const also = games === 0 ? '' : ` and ${games} game${games === 1 ? '' : 's'}`;
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
        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function deleteMessage(personId: string) {
  const count = countSoleOwnedGames(personId);
  if (count === 0) return undefined;
  return `This also deletes ${count} game${count === 1 ? '' : 's'} only they own.`;
}

/**
 * Inline name entry. Return saves, and on failure keeps the field open with the
 * error. Tapping away also saves, but on failure puts the old name back.
 * Empty or unchanged input just closes the field.
 */
function NameField({
  initial,
  placeholder,
  accessibilityLabel,
  failureText,
  save,
  onClose,
}: {
  initial: string;
  placeholder: string;
  accessibilityLabel: string;
  failureText: string;
  /** Throws to refuse, e.g. a duplicate name. */
  save: (name: string) => void;
  onClose: (error: string | null) => void;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  // The field unmounts on close, which can fire one last blur: ignore it.
  const closedRef = useRef(false);

  function close(message: string | null) {
    closedRef.current = true;
    onClose(message);
  }

  function commit(onFailure: 'keep' | 'revert') {
    if (closedRef.current) return;
    const name = draft.trim();
    if (!name || name === initial) return close(null);
    try {
      save(name);
      close(null);
    } catch (e) {
      const message = toUserMessage(e, failureText);
      if (onFailure === 'revert') close(message);
      else setError(message);
    }
  }

  return (
    <View style={styles.field}>
      <TextInput
        autoFocus
        selectTextOnFocus
        value={draft}
        onChangeText={(text) => {
          setDraft(text);
          setError(null);
        }}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={() => commit('keep')}
        onBlur={() => commit('revert')}
        accessibilityLabel={accessibilityLabel}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

/** A name that opens a NameField when tapped. Keeps the last refusal visible after closing. */
function EditableName({
  label,
  accessibilityLabel,
  accessibilityHint,
  children,
  ...field
}: Omit<Parameters<typeof NameField>[0], 'onClose'> & {
  label?: string;
  accessibilityHint?: string;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <NameField
        {...field}
        accessibilityLabel={accessibilityLabel}
        onClose={(message) => {
          setEditing(false);
          setError(message);
        }}
      />
    );
  }

  return (
    <View style={styles.field}>
      <Pressable
        onPress={() => {
          setError(null);
          setEditing(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [styles.nameButton, pressed && { opacity: 0.6 }]}>
        {children}
      </Pressable>
      {error && (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

function PersonRow({
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

function AddPersonRow() {
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  field: {
    flex: 1,
    gap: Spacing.one,
  },
  addRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.two,
  },
  nameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  input: {
    fontSize: 16,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  error: {
    color: DANGER,
  },
});
