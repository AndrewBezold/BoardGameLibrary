import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeveloperSection } from '@/components/settings/developer-section';
import { SettingsLink } from '@/components/settings/settings-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { usePeople } from '@/db/people';
import { useRecentlyDeleted } from '@/db/recently-deleted';

export default function SettingsScreen() {
  const peopleCount = usePeople().length;
  const deletedCount = useRecentlyDeleted().length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Settings</ThemedText>
          <View style={styles.links}>
            <SettingsLink href="/settings/people" label="People" detail={peopleCount} />
            <SettingsLink
              href="/settings/recently-deleted"
              label="Recently deleted"
              detail={deletedCount || undefined}
            />
          </View>
          {__DEV__ && <DeveloperSection />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.five,
  },
  links: {
    gap: Spacing.two,
  },
});
