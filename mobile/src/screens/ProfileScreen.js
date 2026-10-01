import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { Building2, Plus, Camera, Heart, Shield } from "lucide-react-native";
import { logout } from "../store/authSlice";
import { FONTS } from "../theme";

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [role, setRole] = useState(user?.role || "owner");

  function handleLogout() {
    Alert.alert("Confirm Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          dispatch(logout());
          navigation.replace("Login");
        } },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            {user?.name ? (
              <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
            ) : (
              <Text>👤</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name || "Sunita Sharma"}</Text>
            <Text style={styles.userEmail}>{user?.email || "owner@roomsfind.com"}</Text>
            <View style={styles.roleBadge}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                {role === "owner" ? <Building2 size={12} color="#7c3aed" /> : <Text>👤</Text>}
                <Text style={styles.roleBadgeText}>
                  {role === "owner" ? "Property Owner" : "Room Seeker"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Role Toggle Switch */}
        <View style={styles.roleToggleCard}>
          <Text style={styles.roleToggleLabel}>SWITCH ROLE MODE</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleBtn, role === "owner" && styles.roleBtnActive]}
              onPress={() => setRole("owner")}
            >
              <Text style={[styles.roleText, role === "owner" && styles.roleTextActive]}>
                Owner Studio
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleBtn, role === "tenant" && styles.roleBtnActive]}
              onPress={() => setRole("tenant")}
            >
              <Text style={[styles.roleText, role === "tenant" && styles.roleTextActive]}>
                Room Seeker
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.menuHeader}>PROPERTY MANAGEMENT</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("MyListings")}
          >
            <View style={styles.menuIconWrap}><Building2 size={20} color="#7c3aed" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>My Listings</Text>
              <Text style={styles.menuDesc}>View and manage your listed rooms</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("ListRoom")}
          >
            <View style={styles.menuIconWrap}><Plus size={20} color="#7c3aed" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Post a New Room</Text>
              <Text style={styles.menuDesc}>List single room, PG, flat with 360 view</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              navigation.navigate("GuidedCapture", {
                listingId: "demo_listing",
                listingTitle: "360 Studio Demo" })
            }
          >
            <View style={styles.menuIconWrap}><Camera size={20} color="#7c3aed" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>360° Room Capture Studio</Text>
              <Text style={styles.menuDesc}>Test multi-row gyro camera capture</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuHeader}>PREFERENCES & SAVED</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate("Wishlist")}
          >
            <View style={styles.menuIconWrap}><Heart size={20} color="#ef4444" fill="#ef4444" /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Saved Wishlist</Text>
              <Text style={styles.menuDesc}>Quick access to your bookmarked rooms</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          {user?.email?.toLowerCase() === "mahendrapra0077@gmail.com" || user?.role === "admin" ? (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate("AdminDashboard")}
            >
              <View style={styles.menuIconWrap}><Shield size={20} color="#7c3aed" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>Admin Dashboard</Text>
                <Text style={styles.menuDesc}>Overview • Users • Rooms • Reports</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign Out of Account</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          RoomsFind v1.0.0 • Pure MERN Native Mobile App
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0" },
  headerTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
    fontFamily: FONTS.black },
  content: {
    padding: 16,
    paddingBottom: 100 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 14,
    marginBottom: 16 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center" },
  avatarText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    fontFamily: FONTS.black },
  userName: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "800",
    fontFamily: FONTS.bold },
  userEmail: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 2,
    fontFamily: FONTS.regular },
  roleBadge: {
    backgroundColor: "#ede9fe",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6 },
  roleBadgeText: {
    color: "#7c3aed",
    fontSize: 10,
    fontWeight: "800" },
  roleToggleCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16 },
  roleToggleLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8 },
  roleRow: {
    flexDirection: "row",
    gap: 8 },
  roleBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center" },
  roleBtnActive: {
    backgroundColor: "#7c3aed" },
  roleText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700" },
  roleTextActive: {
    color: "#ffffff",
    fontWeight: "900" },
  menuSection: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16 },
  menuHeader: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
    gap: 12 },
  menuIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0" },
  menuTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700" },
  menuDesc: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 1 },
  menuArrow: {
    color: "#64748b",
    fontSize: 20 },
  logoutBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8 },
  logoutBtnText: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "800" },
  versionText: {
    color: "#475569",
    fontSize: 11,
    textAlign: "center",
    marginTop: 24 }
});
