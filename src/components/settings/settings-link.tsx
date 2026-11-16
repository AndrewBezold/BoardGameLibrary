import { Link, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A row on the Settings page that opens another screen, with an optional count. */
export function SettingsLink({ href, label, detail }: { href: Href; label: string; detail?: number }) {
  const theme = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: theme.backgroundElement },
          pressed && { opacity: 0.7 },
        ]}>
        <ThemedText style={styles.grow}>{label}</ThemedText>
        {detail !== undefined && <ThemedText themeColor="textSecondary">{detail}</ThemedText>}
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={18}
          tintColor={theme.textSecondary}
          accessible={false}
          importantForAccessibility="no"
        />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  grow: {
    flex: 1,
  },
});
