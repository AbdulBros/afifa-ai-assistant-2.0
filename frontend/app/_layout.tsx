import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "@/src/auth/AuthContext";
import { ToastProvider } from "@/src/components/Toast";
import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { ThemeProvider } from "@/src/theme/ThemeContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#050505" }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "#050505" },
                    animation: "fade",
                  }}
                />
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
