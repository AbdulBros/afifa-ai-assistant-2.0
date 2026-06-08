import { Tabs } from "expo-router";
import { Home, MessageSquare, Grid3x3, Brain, User } from "lucide-react-native";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/src/theme/ThemeContext";

export default function TabsLayout() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.primary,
        tabBarInactiveTintColor: tokens.textDim,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        tabBarStyle: {
          backgroundColor: "rgba(8,8,10,0.92)",
          borderTopColor: tokens.border,
          borderTopWidth: 1,
          height: 64 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 8,
          position: Platform.OS === "web" ? "relative" : "absolute",
        },
        sceneStyle: { backgroundColor: tokens.bg },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home color={color} size={22} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => <MessageSquare color={color} size={22} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="modules"
        options={{
          title: "Modules",
          tabBarIcon: ({ color }) => <Grid3x3 color={color} size={22} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: "Memory",
          tabBarIcon: ({ color }) => <Brain color={color} size={22} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User color={color} size={22} strokeWidth={1.6} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
