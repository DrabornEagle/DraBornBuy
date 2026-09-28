import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function Dbb_Layout() {
  return <SafeAreaProvider><StatusBar style="light" /><Stack screenOptions={{ headerShown: false }} /></SafeAreaProvider>;
}
