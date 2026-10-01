import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_900Black } from "@expo-google-fonts/inter";
import { Provider } from "react-redux";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { store } from "./src/store";
import AppNavigator from "./src/navigation/AppNavigator";
import { AuthService } from "./src/services/auth";
import { ChatProvider } from "./src/context/ChatContext";
import ChatDrawer from "./src/components/ChatDrawer";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState("MainTabs");
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_700Bold, Inter_900Black });

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await AuthService.getToken();
        if (!token) {
          // If no token exists, user starts at MainTabs in guest/browsing mode
          // or can log in from Profile / List Room
          setInitialRoute("MainTabs");
        }
      } catch (err) {
        console.warn("[App] Auth restore notice:", err.message);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <Provider store={store}>
        <ChatProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <AppNavigator initialRouteName={initialRoute} />
          </NavigationContainer>
          <ChatDrawer />
        </ChatProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
});
