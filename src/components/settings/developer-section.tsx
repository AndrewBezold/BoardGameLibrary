import { StyleSheet, View } from 'react-native';

import { ConfirmButton } from '@/components/confirm-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDevTools } from '@/db/dev-tools';

/** Dev-only tools on the Settings page. Render it behind `__DEV__`. */
export function DeveloperSection() {
  const { resetDatabase, loadSampleData } = useDevTools();
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Developer</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Both of these delete every game, person and play first. Sample data then adds a set of
        people, games, deleted items and plays to test with.
      </ThemedText>
      <View style={styles.buttons}>
        <ConfirmButton
          label="Load sample data"
          title="Load sample data?"
          message="Everything in the app will be replaced with sample data. This can't be undone."
          confirmText="Replace"
          onConfirm={loadSampleData}
        />
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
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
