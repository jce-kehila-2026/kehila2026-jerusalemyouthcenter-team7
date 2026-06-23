import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TEAL = "#039899";

type Props = { title: string };

export function GlobalHeader({ title }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar style="light" />
      <View style={[s.container, { paddingTop: insets.top + 10 }]}>
        <Text style={s.orgLabel}>🎵 Jerusalem Youth Chorus</Text>
        <Text style={s.title}>{title}</Text>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: TEAL,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  orgLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
  },
});
