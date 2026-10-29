import { Alert as RNAlert, Platform } from 'react-native';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

/**
 * Cross-platform replacement for React Native's Alert.
 * `Alert.alert` does nothing in a web browser, so on web we fall back to
 * window.alert / window.confirm with the same call signature:
 *   - 0 or 1 button  -> window.alert, then that button's onPress
 *   - 2+ buttons     -> window.confirm; OK runs the action button, Cancel runs the 'cancel' button
 */
export function showAlert(title: string, message?: string, buttons?: DialogButton[]): void {
  if (Platform.OS !== 'web') {
    RNAlert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const cancel = buttons.find((b) => b.style === 'cancel');
  const action = buttons.find((b) => b !== cancel) ?? buttons[0];
  const confirmed = window.confirm(text);
  (confirmed ? action : cancel)?.onPress?.();
}

/** Drop-in: `import { Alert } from '../utils/dialog'` then `Alert.alert(...)` as before. */
export const Alert = { alert: showAlert };
