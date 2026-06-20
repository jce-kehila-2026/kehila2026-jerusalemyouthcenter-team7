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
            headerShown: true,
            title: "Student Details",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="event/[id]"
          options={{
            headerShown: true,
            title: "Event Details",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="form/[id]"
          options={{
            headerShown: true,
            title: "Form",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            headerShown: true,
            title: "My Profile",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen name="statistics" options={{ headerShown: false }} />
        <Stack.Screen name="manage-years" options={{ headerShown: false }} />
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
