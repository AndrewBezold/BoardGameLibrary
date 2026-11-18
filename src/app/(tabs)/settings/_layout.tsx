import { Stack } from 'expo-router';

/** Stack inside the Settings tab, so sub-screens get a native header and back button. */
export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="people" options={{ title: 'People' }} />
      <Stack.Screen name="recently-deleted" options={{ title: 'Recently deleted' }} />
    </Stack>
  );
}
