import { StyleSheet, View } from 'react-native';

import { ConfirmButton } from '@/components/confirm-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useResetDatabase } from '@/db/current-user';

/** Dev-only tools on the Settings page. Render it behind `__DEV__`. */
export function DeveloperSection() {
  const resetDatabase = useResetDatabase();
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Developer</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Deletes every game and person, then starts over as on first launch.
      </ThemedText>
      <View style={styles.alignStart}>
        <ConfirmButton
          label="Reset database"
          title="Reset database?"
          message="Every game and person will be deleted. This can't be undone."
          confirmText="Reset"
          onConfirm={resetDatabase}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  alignStart: {
    alignItems: 'flex-start',
  },
});
