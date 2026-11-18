import { useState } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/button';
import { ErrorText } from '@/components/error-text';
import { PersonPicker } from '@/components/person-picker';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import { toUserMessage } from '@/db/errors';
import type { EditableGame } from '@/db/games';
import { useTheme } from '@/hooks/use-theme';
import { gameDetailsProblem } from '@/lib/games';
import { parseCount } from '@/lib/numbers';

type DetailKey = Exclude<keyof EditableGame, 'name'>;

const DETAIL_FIELDS: { key: DetailKey; label: string; a11yLabel: string }[] = [
  { key: 'minPlayers', label: 'Min players', a11yLabel: 'Min players' },
  { key: 'maxPlayers', label: 'Max players', a11yLabel: 'Max players' },
  { key: 'playTimeMinutes', label: 'Minutes', a11yLabel: 'Play time in minutes' },
];

const toText = (n: number | null | undefined) => (n == null ? '' : String(n));

type Props = {
  /** The game being edited. Omit to add a new one. */
  game?: EditableGame;
  /** Owners to start with. Defaults to the device user. */
  initialOwnerIds?: string[];
  submitLabel: string;
  /** Saves the game. Thrown errors are shown in the form, which stays open. */
  onSubmit: (game: EditableGame, ownerIds: string[]) => void;
  onCancel: () => void;
  /** Shows a Delete button when set. Thrown errors are shown in the form. */
  onDelete?: () => void;
  /** Shows a Log play button when set. */
  onLogPlay?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Card for adding or editing a game: name, owners and optional details. */
export function GameForm({
  game,
  initialOwnerIds,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
  onLogPlay,
  style,
}: Props) {
  const theme = useTheme();
  const me = useCurrentUser();

  const [name, setName] = useState(game?.name ?? '');
  const [ownerIds, setOwnerIds] = useState(() => initialOwnerIds ?? [me.id]);
  // Kept as typed so half-entered values don't jump around; parsed on every render.
  const [detailsText, setDetailsText] = useState<Record<DetailKey, string>>(() => ({
    minPlayers: toText(game?.minPlayers),
    maxPlayers: toText(game?.maxPlayers),
    playTimeMinutes: toText(game?.playTimeMinutes),
  }));
  const [error, setError] = useState<string | null>(null);

  const values: EditableGame = {
    name: name.trim(),
    minPlayers: parseCount(detailsText.minPlayers),
    maxPlayers: parseCount(detailsText.maxPlayers),
    playTimeMinutes: parseCount(detailsText.playTimeMinutes),
  };
  const detailsProblem = gameDetailsProblem(values);
  const canSubmit = values.name.length > 0 && ownerIds.length > 0 && !detailsProblem;

  function handleSubmit() {
    if (!canSubmit) return;
    try {
      onSubmit(values, ownerIds);
    } catch (e) {
      setError(toUserMessage(e, `Could not ${game ? 'save' : 'add'} game`));
    }
  }

  function handleDelete() {
    try {
      onDelete?.();
    } catch (e) {
      setError(toUserMessage(e, 'Could not delete game'));
    }
  }

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.background }];

  return (
    <View style={[styles.form, { backgroundColor: theme.backgroundElement }, style]}>
      <TextInput
        autoFocus
        value={name}
        onChangeText={setName}
        placeholder="Game name"
        placeholderTextColor={theme.textSecondary}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        style={inputStyle}
      />

      <ThemedText type="small" themeColor="textSecondary">
        Owned by
      </ThemedText>
      <PersonPicker value={ownerIds} onChange={setOwnerIds} emptyText="Pick at least one owner." />

      <View style={styles.detailsRow}>
        {DETAIL_FIELDS.map(({ key, label, a11yLabel }) => (
          <View key={key} style={styles.detailField}>
            <ThemedText type="small" themeColor="textSecondary">
              {label}
            </ThemedText>
            <TextInput
              value={detailsText[key]}
              onChangeText={(text) => setDetailsText((prev) => ({ ...prev, [key]: text }))}
              placeholder="–"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel={a11yLabel}
              style={inputStyle}
            />
          </View>
        ))}
      </View>

      <ErrorText>{detailsProblem ?? error}</ErrorText>

      {/* Its own row: there's no room beside Delete, Cancel and Save on a phone. */}
      {onLogPlay && (
        <View style={styles.actions}>
          <Button label="Log play" onPress={onLogPlay} />
        </View>
      )}

      <View style={styles.actions}>
        {/* No confirmation: the caller offers Undo instead. */}
        {onDelete && <Button label="Delete" variant="danger" onPress={handleDelete} />}
        <View style={styles.spacer} />
        <Button label="Cancel" onPress={onCancel} />
        <Button label={submitLabel} variant="primary" onPress={handleSubmit} disabled={!canSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  detailField: {
    flex: 1,
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  spacer: {
    flex: 1,
  },
});
