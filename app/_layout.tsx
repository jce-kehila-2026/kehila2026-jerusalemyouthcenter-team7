import { AppColors } from '@/constants/theme';
import { useAuth, AuthProvider } from '@/src/context/AuthContext';
import { FirestoreMsg, messageService } from '@/src/data/messageService';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  initialRouteName: 'index',
};

// ── In-app message notification banner ────────────────────────────────────────
function MessageNotifier() {
  const { user } = useAuth();
  const router = useRouter();
  const { top } = useSafeAreaInsets();

  type BannerData = { name: string; text: string };
  const [banner, setBanner] = useState<BannerData | null>(null);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const seenIds = useRef(new Set<string>());
  const sessionStart = useRef(new Date().toISOString());
  const animRunning = useRef(false);

  useEffect(() => {
    if (!user) return;
    const isAdmin = user.role === 'admin';
    const myId = user.uid;

    const unsub = messageService.subscribe((msgs: FirestoreMsg[]) => {
      // Find messages directed at the current user that arrived after session start
      const fresh = msgs.filter(m => {
        if (seenIds.current.has(m.id)) return false;
        seenIds.current.add(m.id);
        if (m.timestamp <= sessionStart.current) return false;
        if (isAdmin) return m.receiver_id === 'admin';
        return m.receiver_id === myId;
      });

      if (fresh.length > 0 && !animRunning.current) {
        const last = fresh[fresh.length - 1];
        setBanner({ name: last.sender_name, text: last.content });
        animRunning.current = true;

        Animated.sequence([
          Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(3500),
          Animated.timing(slideAnim, { toValue: -120, duration: 280, useNativeDriver: true }),
        ]).start(() => {
          animRunning.current = false;
          setBanner(null);
        });
      }
    });

    return () => {
      unsub();
      seenIds.current.clear();
    };
  }, [user?.uid]);

  if (!banner) return null;

  return (
    <Animated.View
      style={[
        notifStyles.banner,
        { paddingTop: top + 10, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Pressable
        style={notifStyles.inner}
        onPress={() => router.push('/(tabs)/messages' as any)}
      >
        <View style={notifStyles.iconWrap}>
          <Ionicons name="chatbubbles" size={20} color={AppColors.primary} />
        </View>
        <View style={notifStyles.textWrap}>
          <Text style={notifStyles.senderName} numberOfLines={1}>{banner.name}</Text>
          <Text style={notifStyles.msgText} numberOfLines={1}>{banner.text}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#999" />
      </Pressable>
    </Animated.View>
  );
}

// ── Root navigation ───────────────────────────────────────────────────────────
function RootLayoutNav() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="student/[id]" options={{ headerShown: true, title: 'Student Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="event/[id]" options={{ headerShown: true, title: 'Event Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="form/[id]" options={{ headerShown: true, title: 'Form', headerBackTitle: 'Back' }} />
        <Stack.Screen name="profile" options={{ headerShown: true, title: 'My Profile', headerBackTitle: 'Back' }} />
      </Stack>
      {/* Floating notification banner — rendered above all screens */}
      <MessageNotifier />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const notifStyles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  senderName: { fontSize: 14, fontWeight: '700', color: '#11181C' },
  msgText: { fontSize: 13, color: '#687076', marginTop: 1 },
});
