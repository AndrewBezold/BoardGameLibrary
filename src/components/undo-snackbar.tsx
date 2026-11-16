import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { toUserMessage } from '@/db/errors';
import { useTheme } from '@/hooks/use-theme';

const VISIBLE_MS = 6000;

type Snack = { id: number; message: string; undo?: () => void };

const ShowUndoContext = createContext<((message: string, undo: () => void) => void) | null>(null);

/** Shows a snackbar like "Deleted Catan · Undo". A new one replaces the current one. */
export function useUndo() {
  const show = use(ShowUndoContext);
  if (!show) throw new Error('useUndo must be used inside UndoProvider');
  return show;
}

let nextId = 0;

export function UndoProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<Snack | null>(null);

  function show(message: string, undo?: () => void) {
    setSnack({ id: nextId++, message, undo });
    AccessibilityInfo.announceForAccessibility(undo ? `${message}. Undo available.` : message);
  }

  function handleUndo() {
    if (!snack?.undo) return;
    try {
      snack.undo();
      setSnack(null);
    } catch (e) {
      show(toUserMessage(e, 'Could not undo'));
    }
  }

  useEffect(() => {
    if (!snack) return;
    const timer = setTimeout(() => setSnack(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [snack]);

  return (
    <ShowUndoContext value={show}>
      <View style={styles.root}>
        {children}
        {snack && <SnackBar snack={snack} onUndo={handleUndo} />}
      </View>
    </ShowUndoContext>
  );
}

function SnackBar({ snack, onUndo }: { snack: Snack; onUndo: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.anchor} pointerEvents="box-none">
      <View
        accessibilityLiveRegion="polite"
        style={[styles.bar, { backgroundColor: theme.text }]}>
        <ThemedText type="small" style={[styles.message, { color: theme.background }]}>
          {snack.message}
        </ThemedText>
        {snack.undo && (
          <Pressable
            onPress={onUndo}
            accessibilityRole="button"
            hitSlop={Spacing.two}
            style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              Undo
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BottomTabInset + Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  message: {
    flex: 1,
  },
  action: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
