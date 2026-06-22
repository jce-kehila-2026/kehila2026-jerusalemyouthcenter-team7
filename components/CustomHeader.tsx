import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TEAL = "#039899";

type Props = {
  title: string;
  canGoBack: boolean;
  onBack: () => void;
};

export function CustomHeader({ title, canGoBack, onBack }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.inner}>
        {canGoBack ? (
          <Pressable onPress={onBack} style={s.side} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
        ) : (
          <View style={s.side} />
        )}
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={s.side} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: TEAL,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    paddingHorizontal: 16,
  },
  side: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
});
