import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { ErrorText } from '@/components/error-text';
import { Spacing } from '@/constants/theme';
import { toUserMessage } from '@/db/errors';
import { useTheme } from '@/hooks/use-theme';

type FieldProps = {
  initial: string;
  placeholder: string;
  accessibilityLabel: string;
  /** Describes the failed action, e.g. "Could not rename". */
  failureText: string;
  /** Throws to refuse, e.g. a duplicate name. */
  save: (name: string) => void;
};

/**
 * Inline name entry. Return saves, and on failure keeps the field open with the
 * error. Tapping away also saves, but on failure closes and hands the error to
 * `onClose`. Empty or unchanged input just closes the field.
 */
export function NameField({
  initial,
  placeholder,
  accessibilityLabel,
  failureText,
  save,
  onClose,
  style,
  inputStyle,
}: FieldProps & {
  onClose: (error: string | null) => void;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
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
    <View style={[styles.field, style]}>
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
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundElement },
          inputStyle,
        ]}
      />
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

/**
 * Shows `children` until tapped, then an inline name field. Keeps the last
 * refusal visible after the field closes.
 */
export function EditableName({
  label,
  accessibilityHint,
  children,
  ...field
}: FieldProps & {
  /** Accessibility label of the tappable name. */
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
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    gap: Spacing.one,
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
});
