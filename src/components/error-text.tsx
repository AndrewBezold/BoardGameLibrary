import type { StyleProp, TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DANGER } from '@/constants/theme';

/** A short error message in red. Renders nothing when `children` is empty. */
export function ErrorText({
  children,
  style,
}: {
  children: string | null | undefined;
  style?: StyleProp<TextStyle>;
}) {
  if (!children) return null;
  return (
    <ThemedText type="small" style={[{ color: DANGER }, style]}>
      {children}
    </ThemedText>
  );
}
