import { Alert } from 'react-native';

import { Button } from '@/components/button';

type Props = {
  label: string;
  /** Dialog title, e.g. "Delete Catan?". */
  title: string;
  /** Dialog body. A function is evaluated when the button is tapped. */
  message?: string | (() => string | undefined);
  /** Text of the destructive button in the dialog. Defaults to `label`. */
  confirmText?: string;
  onConfirm: () => void;
};

/** Destructive button that asks for confirmation in a native alert dialog. */
export function ConfirmButton({ label, title, message, confirmText = label, onConfirm }: Props) {
  function handlePress() {
    Alert.alert(
      title,
      typeof message === 'function' ? message() : message,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: confirmText, style: 'destructive', onPress: onConfirm },
      ],
      { cancelable: true }
    );
  }

  return <Button label={label} variant="danger" onPress={handlePress} />;
}
