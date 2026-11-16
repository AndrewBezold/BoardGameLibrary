import { Alert, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export const DANGER = '#d93025';

type Props = {
  label: string;
  /** Dialog title, e.g. "Delete Catan?". */
  title: string;
  /** Dialog body. A function is evaluated when the button is tapped. */
  message?: string | (() => string | undefined);
  /** Text of the destructive button in the dialog. Defaults to `label`. */
  confirmText?: string;
  onConfirm: () => void;
};

/** Destructive button that asks for confirmation in a native alert dialog. */
export function ConfirmButton({ label, title, message, confirmText = label, onConfirm }: Props) {
  function handlePress() {
    Alert.alert(
      title,
      typeof message === 'function' ? message() : message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: confirmText, style: 'destructive', onPress: onConfirm },
      ],
      { cancelable: true }
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}>
      <ThemedText type="smallBold" style={{ color: DANGER }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: DANGER,
  },
});
