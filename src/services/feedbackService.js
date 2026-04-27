import * as Haptics from 'expo-haptics';

async function safeRun(fn) {
  try {
    await fn();
  } catch {
    // no-op on unsupported devices/platforms
  }
}

export function tapFeedback() {
  return safeRun(() => Haptics.selectionAsync());
}

export function successFeedback() {
  return safeRun(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warningFeedback() {
  return safeRun(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function errorFeedback() {
  return safeRun(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

export function softImpact() {
  return safeRun(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function mediumImpact() {
  return safeRun(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}
