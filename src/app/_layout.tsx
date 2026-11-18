import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { FirstRun } from '@/components/first-run';
import { LogPlayProvider } from '@/components/plays/log-play';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UndoProvider } from '@/components/undo-snackbar';
import { WhosHereProvider } from '@/components/whos-here';
import { Spacing } from '@/constants/theme';
import { CurrentUserProvider } from '@/db/current-user';
import { useDatabaseMigrations } from '@/db/migrate';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
          <WhosHereProvider>
            <LogPlayProvider>
              {/* Tabs at the root; a game's screen is pushed over them, hiding the tab bar. */}
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="game/[id]" options={{ title: '', headerBackTitle: 'Back' }} />
              </Stack>
            </LogPlayProvider>
          </WhosHereProvider>
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
