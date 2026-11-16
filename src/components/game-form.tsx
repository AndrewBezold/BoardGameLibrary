import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { DANGER } from '@/components/confirm-button';
import { OwnerPicker } from '@/components/owner-picker';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/db/current-user';
import { toUserMessage } from '@/db/errors';
import { gameDetailsProblem, type EditableGame } from '@/db/games';
import { useTheme } from '@/hooks/use-theme';

type DetailKey = Exclude<keyof EditableGame, 'name'>;

const DETAIL_FIELDS: { key: DetailKey; label: string; a11yLabel: string }[] = [
  { key: 'minPlayers', label: 'Min players', a11yLabel: 'Min players' },
  { key: 'maxPlayers', label: 'Max players', a11yLabel: 'Max players' },
  { key: 'playTimeMinutes', label: 'Minutes', a11yLabel: 'Play time in minutes' },
];

const toText = (n: number | null | undefined) => (n == null ? '' : String(n));

/** Blank is unknown (null). Anything other than digits becomes NaN, which fails validation. */
function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
}

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
    minPlayers: parseNumber(detailsText.minPlayers),
    maxPlayers: parseNumber(detailsText.maxPlayers),
    playTimeMinutes: parseNumber(detailsText.playTimeMinutes),
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
      <OwnerPicker value={ownerIds} onChange={setOwnerIds} />

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

      {(detailsProblem ?? error) && (
        <ThemedText type="small" style={styles.danger}>
          {detailsProblem ?? error}
        </ThemedText>
      )}

      <View style={styles.actions}>
        {onDelete && (
          // No confirmation: the caller offers Undo instead.
          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              { borderWidth: 1, borderColor: DANGER },
              pressed && { opacity: 0.7 },
            ]}>
            <ThemedText type="smallBold" style={styles.danger}>
              Delete
            </ThemedText>
          </Pressable>
        )}
        <View style={styles.spacer} />
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { borderWidth: 1, borderColor: theme.backgroundSelected },
            pressed && { opacity: 0.7 },
          ]}>
          <ThemedText type="smallBold">Cancel</ThemedText>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.text, opacity: !canSubmit ? 0.4 : pressed ? 0.7 : 1 },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            {submitLabel}
          </ThemedText>
        </Pressable>
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
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  danger: {
    color: DANGER,
  },
});
