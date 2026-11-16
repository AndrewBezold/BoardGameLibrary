import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DANGER, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  /** primary: filled, for the main action. secondary: outlined. danger: red outline. */
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const look = {
    primary: { box: { backgroundColor: theme.text }, text: theme.background },
    secondary: { box: { borderWidth: 1, borderColor: theme.backgroundSelected }, text: theme.text },
    danger: { box: { borderWidth: 1, borderColor: DANGER }, text: DANGER },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        look.box,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <ThemedText type="smallBold" style={{ color: look.text }}>
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
  },
});
