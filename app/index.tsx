import { useAuth } from '@/src/context/AuthContext';
import { Redirect } from 'expo-router';
import { View } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <View style={{ flex: 1, backgroundColor: '#1a1a2e' }} />;
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
