import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { FirstRun } from '@/components/first-run';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UndoProvider } from '@/components/undo-snackbar';
import { Spacing } from '@/constants/theme';
import { CurrentUserProvider } from '@/db/current-user';
import { useDatabaseMigrations } from '@/db/migrate';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { success, error } = useDatabaseMigrations();
  const ready = success || error !== undefined;

  // Keep the native splash up until the database is ready (or has failed),
  // so there's no blank frame between the splash and the first screen.
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  let content = null;
  if (error) {
    content = (
      <ThemedView style={styles.error}>
        <ThemedText type="smallBold">Could not set up the database</ThemedText>
        <ThemedText type="small">
          {__DEV__ ? error.message : 'Try closing and reopening the app.'}
        </ThemedText>
      </ThemedView>
    );
  } else if (success) {
    content = (
      <CurrentUserProvider firstRun={(save) => <FirstRun save={save} />}>
        <UndoProvider>
          <AppTabs />
        </UndoProvider>
      </CurrentUserProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {content}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
