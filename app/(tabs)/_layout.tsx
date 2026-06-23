import { GlobalHeader } from "@/components/GlobalHeader";
import { AppColors, Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ForcePasswordChangeModal } from "@/src/components/ForcePasswordChangeModal";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { EventsProvider } from "../../src/context/EventsContext";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
function TabIcon({
  name,
  color,
  size,
}: {
  name: IoniconsName;
  color: string;
  size: number;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const [showForceChange, setShowForceChange] = useState(false);
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const currentId = user?.uid ?? null;

    // Only trigger on a genuine login transition (null → user).
    // This prevents false positives from secondary-app auth state broadcasts.
    if (!prevId && currentId && user?.mustChangePassword) {
      setShowForceChange(true);
    }
    if (!currentId) {
      setShowForceChange(false);
    }

    prevUserIdRef.current = currentId;
  }, [user]);

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
          headerShown: true,
          header: ({ options }) => <GlobalHeader title={options.title ?? ""} />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="grid-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="students"
          options={{
            title: "Students",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="people-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: "Events",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="calendar-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="forms"
          options={{
            title: "Forms",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="document-text-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="notifications"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Library",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="musical-notes-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="Join-requests"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="admin"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="student-events"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="student-calender"
          options={{ href: null, headerShown: false }}
        />
        <Tabs.Screen
          name="calendar"
          options={{ href: null, headerShown: false }}
        />
      </Tabs>

      <ForcePasswordChangeModal
        visible={showForceChange && !!user}
        uid={user?.uid ?? ""}
        onDone={() => setShowForceChange(false)}
      />
    </EventsProvider>
  );
}
