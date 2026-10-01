import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AppTabs from "./AppTabs";
import LoginScreen from "../screens/LoginScreen";
import RoomDetailsScreen from "../screens/RoomDetailsScreen";
import ChatScreen from "../screens/ChatScreen";
import MyListingsScreen from "../screens/MyListingsScreen";
import GuidedCaptureScreen from "../screens/GuidedCaptureScreen";
import DirectPanoUploadScreen from "../screens/DirectPanoUploadScreen";
import ReviewScreen from "../screens/ReviewScreen";
import UploadProgressScreen from "../screens/UploadProgressScreen";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import DashboardScreen from "../screens/DashboardScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator({ initialRouteName = "MainTabs" }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#f8fafc" },
        animation: "fade_from_bottom" }}
    >
      <Stack.Screen name="MainTabs" component={AppTabs} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RoomDetails" component={RoomDetailsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="MyListings" component={MyListingsScreen} />
      <Stack.Screen
        name="GuidedCapture"
        component={GuidedCaptureScreen}
        options={{ gestureEnabled: false, orientation: "portrait" }}
      />
      <Stack.Screen name="DirectPanoUpload" component={DirectPanoUploadScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
      <Stack.Screen
        name="UploadProgress"
        component={UploadProgressScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
    </Stack.Navigator>
  );
}
