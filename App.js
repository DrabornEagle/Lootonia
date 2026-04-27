import React, { useEffect, useRef, useState } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getCurrentSession, onSessionChange } from './src/services/authService';
import AuthScreen from './src/features/auth/AuthScreen';
import GameFlow from './src/core/GameFlow';
const IGNORE_PATTERNS = [
  'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
];

LogBox.ignoreLogs(IGNORE_PATTERNS);

export default function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const patchedConsoleRef = useRef(false);

  useEffect(() => {
    if (patchedConsoleRef.current) return;
    patchedConsoleRef.current = true;

    const originalError = console.error;
    const originalWarn = console.warn;

    const shouldIgnore = (args) => {
      const text = args.map((item) => String(item ?? '')).join(' ');
      return IGNORE_PATTERNS.some((pattern) => text.includes(pattern));
    };

    console.error = (...args) => {
      if (shouldIgnore(args)) return;
      originalError(...args);
    };

    console.warn = (...args) => {
      if (shouldIgnore(args)) return;
      originalWarn(...args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      patchedConsoleRef.current = false;
    };
  }, []);

  useEffect(() => {
    getCurrentSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = onSessionChange((nextSession) => setSession(nextSession));
    return () => sub.subscription.unsubscribe();
  }, []);

  const dkd_root_content_node = !session
    ? <AuthScreen mode={authMode} setMode={setAuthMode} />
    : <GameFlow session={session} onSignedOut={() => setSession(null)} />;

  return <SafeAreaProvider>{dkd_root_content_node}</SafeAreaProvider>;
}
