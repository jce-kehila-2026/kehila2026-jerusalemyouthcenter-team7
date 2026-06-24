import { CustomHeader } from "@/components/CustomHeader";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider } from "@/src/context/AuthContext";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export const unstable_settings = {
  initialRouteName: "index",
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="student/[id]"
          options={{
            title: "Student Details",
            header: ({ navigation, options, back }) => (
              <CustomHeader
                title={options.title ?? "Student Details"}
                canGoBack={!!back}
                onBack={() => navigation.goBack()}
              />
            ),
          }}
        />
        <Stack.Screen
          name="event/[id]"
          options={{
            title: "Event Details",
            header: ({ navigation, options, back }) => (
              <CustomHeader
                title={options.title ?? "Event Details"}
                canGoBack={!!back}
                onBack={() => navigation.goBack()}
              />
            ),
          }}
        />
        <Stack.Screen
          name="form/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: "My Profile",
            header: ({ navigation, options, back }) => (
              <CustomHeader
                title={options.title ?? "My Profile"}
                canGoBack={!!back}
                onBack={() => navigation.goBack()}
              />
            ),
          }}
        />
        <Stack.Screen name="statistics" options={{ headerShown: false }} />
        <Stack.Screen name="manage-years" options={{ headerShown: false }} />
        <Stack.Screen name="manage-leaderboard" options={{ headerShown: false }} />
        <Stack.Screen name="leaderboard" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
