import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'lootonia:onboarding:v1';

export async function hasCompletedOnboarding(userId) {
  if (!userId) return false;
  try {
    const value = await AsyncStorage.getItem(`${KEY}:${userId}`);
    return value === 'done';
  } catch {
    return false;
  }
}

export async function completeOnboarding(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(`${KEY}:${userId}`, 'done');
  } catch {
    // ignore storage failures
  }
}

export async function resetOnboarding(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(`${KEY}:${userId}`);
  } catch {
    // ignore storage failures
  }
}
