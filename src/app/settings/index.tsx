import { Link, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmButton } from '@/components/confirm-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useResetDatabase } from '@/db/current-user';
import { usePeople } from '@/db/people';
import { useRecentlyDeleted } from '@/db/recently-deleted';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="subtitle">Settings</ThemedText>
          <View style={styles.links}>
            <PeopleLink />
            <RecentlyDeletedLink />
          </View>
          {__DEV__ && <DeveloperSection />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function PeopleLink() {
  const count = usePeople().length;
  return <SettingsLink href="/settings/people" label="People" detail={count} />;
}

function RecentlyDeletedLink() {
  const count = useRecentlyDeleted().length;
  return (
    <SettingsLink href="/settings/recently-deleted" label="Recently deleted" detail={count || undefined} />
  );
}

function SettingsLink({ href, label, detail }: { href: Href; label: string; detail?: number }) {
  const theme = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.linkRow,
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

function DeveloperSection() {
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
  section: {
    gap: Spacing.two,
  },
  links: {
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  alignStart: {
    alignItems: 'flex-start',
  },
});
