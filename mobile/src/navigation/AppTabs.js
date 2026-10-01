import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, Search, Heart, Plus } from "lucide-react-native";

import HomeScreen from "../screens/HomeScreen";
import FindRoomsScreen from "../screens/FindRoomsScreen";
import ListRoomScreen from "../screens/ListRoomScreen";
import WishlistScreen from "../screens/WishlistScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { FONTS } from "../theme";

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          paddingTop: 8 },
        tabBarActiveTintColor: "#7c3aed",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          fontFamily: FONTS.bold } }}
    >
      <Tab.Screen
        name="Explore"
        component={HomeScreen}
        options={{
          tabBarLabel: "Explore",
          tabBarIcon: ({ color, focused }) => (
            <Home size={20} color={color} strokeWidth={focused ? 2.4 : 2} />
          ) }}
      />

      <Tab.Screen
        name="Find"
        component={FindRoomsScreen}
        options={{
          tabBarLabel: "Search",
          tabBarIcon: ({ color, focused }) => (
            <Search size={20} color={color} strokeWidth={focused ? 2.4 : 2} />
          ) }}
      />

      <Tab.Screen
        name="ListRoom"
        component={ListRoomScreen}
        options={{
          tabBarLabel: "List Room",
          tabBarIcon: ({ focused }) => (
            <View style={styles.listTabCircle}>
              <Plus size={20} color="#ffffff" strokeWidth={2.6} />
            </View>
          ) }}
      />

      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarLabel: "Saved",
          tabBarIcon: ({ color, focused }) => (
            <Heart size={20} color={color} fill={focused ? color : "transparent"} strokeWidth={2} />
          ) }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Text style={{ fontSize: 20, color }}>👤</Text>
          ) }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  listTabCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.OS === "ios" ? 12 : 8,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6 }
});
