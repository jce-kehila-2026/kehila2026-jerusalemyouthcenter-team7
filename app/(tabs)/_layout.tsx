import { AppColors, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { EventsProvider } from "../../src/context/EventsContext";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  return (
    <EventsProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: AppColors.primary,
          tabBarInactiveTintColor: theme.tabIconDefault,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            paddingBottom: 4,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <TabIcon name="grid-outline" color={color} size={size} /> }} />
        <Tabs.Screen
          name="students"
          options={{
            title: "Students",
            tabBarIcon: ({ color, size }) => <TabIcon name="people-outline" color={color} size={size} />,
            href: isStudent ? null : undefined,
          }}
        />
        <Tabs.Screen name="events" options={{ title: "Events", tabBarIcon: ({ color, size }) => <TabIcon name="calendar-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="forms" options={{ title: "Forms", tabBarIcon: ({ color, size }) => <TabIcon name="document-text-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="library" options={{ title: "Library", tabBarIcon: ({ color, size }) => <TabIcon name="musical-notes-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="calendar" options={{ title: "Calendar", tabBarIcon: ({ color, size }) => <TabIcon name="calendar-outline" color={color} size={size} /> }} />
        {/* Screens accessible via header buttons, not the tab bar */}
        <Tabs.Screen name="messages" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="explore" options={{ href: null }} />
        <Tabs.Screen name="admin" options={{ href: null }} />
        <Tabs.Screen name="student-events" options={{ href: null }} />
        <Tabs.Screen name="student-calender" options={{ href: null }} />
      </Tabs>
    </EventsProvider>
  );
}
