import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ErrorText } from '@/components/error-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { toUserMessage } from '@/db/errors';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** Creates the user. Throws to refuse the name; the error is shown under the field. */
  save: (name: string) => void;
};

/** Shown on first launch, before anything else, to ask for the user's name. */
export function FirstRun({ save }: Props) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const canSubmit = name.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    try {
      save(name);
    } catch (e) {
      setError(toUserMessage(e, 'Could not save your name'));
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="subtitle">Board Game Library</ThemedText>
        <ThemedText themeColor="textSecondary">
          Keep track of the board games you and your friends own, and who has what.
        </ThemedText>

        <View style={styles.field}>
          <ThemedText type="smallBold">{"What's your name?"}</ThemedText>
          <TextInput
            autoFocus
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder="Your name"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="done"
            submitBehavior="submit"
            onSubmitEditing={submit}
            accessibilityLabel="Your name"
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <ErrorText>{error}</ErrorText>
        </View>

        <View style={styles.actions}>
          <Button label="Continue" variant="primary" onPress={submit} disabled={!canSubmit} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  // Content sits near the top so the keyboard never covers it.
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
