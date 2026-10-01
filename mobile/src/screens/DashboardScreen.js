import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { ApiService } from "../services/api";
import { fetchRooms } from "../store/roomsSlice";
import { COLORS } from "../theme";
import { formatPrice } from "../lib/format";

function Metric({ label, value, tone }) {
  const bg =
    tone === "success" ? COLORS.successSoft : tone === "ink" ? "#e2e8f0" : COLORS.brandSoft;
  const fg = tone === "success" ? COLORS.success : tone === "ink" ? COLORS.ink : COLORS.brand;
  const icon = tone === "success" ? "✓" : tone === "ink" ? "▣" : "♥";
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: bg }]}>
        <Text style={{ color: fg, fontWeight: "900", fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={styles.metricValue} numberOfLines={1}>
        {String(value)}
      </Text>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

function Panel({ title, children }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function EmptyState({ title, body, cta, onPress }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onPress}>
        <Text style={styles.emptyBtnText}>{cta}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { items, savedIds: roomSavedIds, contactedIds, postedIds } = useSelector(
    (state) => state.rooms
  );
  const wishlistSaved = useSelector((state) => state.wishlist?.savedIds || []);
  // unify: roomsSlice savedIds preferred, fallback to wishlist
  const savedIds = roomSavedIds && roomSavedIds.length ? roomSavedIds : wishlistSaved;
  const rooms = items && items.length ? items : [];
  const savedRooms = rooms.filter((room) =>
    savedIds.includes(String(room.id || room.slug || room._id))
  );
  const contactedRooms = rooms.filter((room) =>
    (contactedIds || []).includes(String(room.id || room.slug || room._id))
  );

  const [ownerRooms, setOwnerRooms] = useState([]);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const isOwner = user?.role === "owner";
  const ownerAvailableCount = ownerRooms.filter((r) => r.availability === "available").length;
  const ownerOccupiedCount = ownerRooms.filter((r) => r.availability === "occupied").length;
  const averageOwnerRent = ownerRooms.length
    ? Math.round(ownerRooms.reduce((sum, r) => sum + Number(r.price || 0), 0) / ownerRooms.length)
    : 0;

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  useEffect(() => {
    if (!isOwner) {
      setOwnerRooms([]);
      return;
    }
    let active = true;
    async function loadOwnerRooms() {
      setOwnerLoading(true);
      try {
        const payload = await ApiService.getMyListings();
        const normalized = Array.isArray(payload) ? payload : payload?.rooms || [];
        // website uses normalizeRooms; mobile payload already normalized roughly; map to expected shape
        const mapped = normalized.map((r) => ({
          id: String(r.id || r.slug || r._id),
          slug: r.slug || r.id || r._id,
          title: r.title,
          price: r.price,
          coverImage: r.coverImage || r.images?.[0] || "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
          location: r.location || r.address || r.city || "Bhopal, MP",
          availability: r.availability || "available",
        }));
        if (active) setOwnerRooms(mapped);
      } catch {
        if (active) setOwnerRooms([]);
      } finally {
        if (active) setOwnerLoading(false);
      }
    }
    loadOwnerRooms();
    return () => {
      active = false;
    };
  }, [isOwner]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{isOwner ? "Owner dashboard" : "User dashboard"}</Text>
            </View>
            <Text style={styles.h1}>{isOwner ? "Your RoomsFind owner activity" : "Your RoomsFind activity"}</Text>
            <Text style={styles.sub}>
              {isOwner
                ? "Track your listings, availability, leads, saved rooms, and seeker activity."
                : "Track saved rooms, contacted owners, and properties you have posted."}
            </Text>
          </View>
          <TouchableOpacity style={styles.myRoomsBtn} onPress={() => navigation.navigate("MyListings")}>
            <Text style={styles.myRoomsText}>◧ My listed rooms</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics */}
        <View style={styles.metricsGrid}>
          {isOwner ? (
            <>
              <Metric label="Live listings" value={ownerLoading ? "…" : ownerRooms.length} tone="ink" />
              <Metric label="Available" value={ownerAvailableCount} tone="success" />
              <Metric label="Occupied" value={ownerOccupiedCount} tone="brand" />
              <Metric label="Avg rent" value={formatPrice(averageOwnerRent)} tone="brand" />
            </>
          ) : (
            <>
              <Metric label="Wishlist" value={savedIds.length} tone="brand" />
              <Metric label="Contacted owners" value={contactedIds?.length || 0} tone="success" />
              <Metric label="Posted rooms" value={postedIds?.length || 0} tone="ink" />
              <Metric label="Verified leads" value="24h" tone="brand" />
            </>
          )}
        </View>

        {/* Owner-only section */}
        {isOwner && (
          <View style={styles.ownerSection}>
            <Panel title="Recent listed rooms">
              {ownerLoading ? (
                <ActivityIndicator color={COLORS.brand} />
              ) : ownerRooms.length ? (
                <View style={{ gap: 10 }}>
                  {ownerRooms.slice(0, 4).map((room) => (
                    <TouchableOpacity
                      key={String(room.id)}
                      style={styles.recentRow}
                      onPress={() => navigation.navigate("RoomDetails", { slug: room.slug || room.id, room })}
                    >
                      <Image source={{ uri: room.coverImage }} style={styles.recentImg} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.recentTitle} numberOfLines={1}>
                          {room.title}
                        </Text>
                        <Text style={styles.recentLoc} numberOfLines={1}>
                          {room.location}
                        </Text>
                      </View>
                      <Text style={styles.recentPrice}>{formatPrice(room.price)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.muted}>Your posted rooms will appear here after you publish a listing.</Text>
              )}
            </Panel>
            <Panel title="Owner actions">
              <View style={{ gap: 10 }}>
                <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate("MyListings")}>
                  <Text style={styles.primaryActionText}>Manage listings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryAction} onPress={() => navigation.navigate("ListRoom")}>
                  <Text style={styles.secondaryActionText}>Add room</Text>
                </TouchableOpacity>
              </View>
            </Panel>
          </View>
        )}

        {/* Wishlist + Aside */}
        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionH2}>Wishlist rooms</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Find")}>
                <Text style={styles.findMore}>Find more</Text>
              </TouchableOpacity>
            </View>
            {savedRooms.length ? (
              <View style={styles.wishlistGrid}>
                {savedRooms.map((room) => {
                  const img = room.coverImage || room.images?.[0] || "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80";
                  return (
                    <TouchableOpacity
                      key={String(room.id || room.slug || room._id)}
                      style={styles.wishCard}
                      onPress={() => navigation.navigate("RoomDetails", { slug: room.slug || room.id || room._id, room })}
                    >
                      <Image source={{ uri: img }} style={styles.wishImg} />
                      <View style={styles.wishBody}>
                        <Text style={styles.wishTitle} numberOfLines={1}>
                          {room.title}
                        </Text>
                        <Text style={styles.wishLoc} numberOfLines={1}>
                          {room.location || room.address || room.city}
                        </Text>
                        <Text style={styles.wishPrice}>{formatPrice(room.price)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                title="No saved rooms yet"
                body="Tap Wishlist on any listing to keep it here for quick comparison."
                cta="Browse rooms"
                onPress={() => navigation.navigate("Find")}
              />
            )}
          </View>

          <View style={styles.asideCol}>
            <Panel title="Contacted owners">
              {contactedRooms.length ? (
                <View style={{ gap: 10 }}>
                  {contactedRooms.map((room) => (
                    <TouchableOpacity
                      key={String(room.id || room.slug || room._id)}
                      style={styles.contactCard}
                      onPress={() => navigation.navigate("RoomDetails", { slug: room.slug || room.id, room })}
                    >
                      <Text style={styles.contactTitle} numberOfLines={1}>
                        {room.title}
                      </Text>
                      <Text style={styles.contactOwner} numberOfLines={1}>
                        {room.owner?.name || "Property Owner"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.muted}>Contacted owners will appear here after you message or call them.</Text>
              )}
            </Panel>

            <Panel title="Owner checklist">
              <View style={{ gap: 10 }}>
                {[
                  "Upload 3+ clear photos",
                  "Keep city, address, and landmark searchable",
                  "Keep availability updated",
                  "Verify identity for trust badge",
                ].map((item) => (
                  <View key={item} style={styles.checkRow}>
                    <View style={styles.checkDot}>
                      <Text style={{ color: COLORS.success, fontSize: 10, fontWeight: "900" }}>✓</Text>
                    </View>
                    <Text style={styles.checkText}>{item}</Text>
                  </View>
                ))}
              </View>
            </Panel>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 32, gap: 16 },
  headerRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, alignItems: "flex-end", justifyContent: "space-between" },
  badge: { alignSelf: "flex-start", backgroundColor: COLORS.brandSoft, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20 },
  badgeText: { color: COLORS.brand, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  h1: { color: COLORS.ink, fontSize: 22, fontWeight: "900", marginTop: 8, lineHeight: 26 },
  sub: { color: COLORS.muted, fontSize: 12, marginTop: 6, lineHeight: 18, maxWidth: 320 },
  myRoomsBtn: { backgroundColor: COLORS.ink, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, alignItems: "center" },
  myRoomsText: { color: COLORS.background, fontSize: 12, fontWeight: "900" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: { width: "47%", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14 },
  metricIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  metricValue: { color: COLORS.ink, fontSize: 20, fontWeight: "900" },
  metricLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "800", marginTop: 2, letterSpacing: 0.5 },
  ownerSection: { gap: 12 },
  panel: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14 },
  panelTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "900", marginBottom: 12 },
  recentRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 8, backgroundColor: COLORS.card },
  recentImg: { width: 48, height: 48, borderRadius: 8, backgroundColor: COLORS.mutedSoft },
  recentTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  recentLoc: { color: COLORS.muted, fontSize: 11, fontWeight: "700", marginTop: 2 },
  recentPrice: { color: COLORS.brand, fontSize: 12, fontWeight: "900" },
  primaryAction: { backgroundColor: COLORS.ink, paddingVertical: 12, borderRadius: 20, alignItems: "center" },
  primaryActionText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  secondaryAction: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, borderRadius: 20, alignItems: "center" },
  secondaryActionText: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  muted: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  twoCol: { gap: 16 },
  asideCol: { gap: 12 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionH2: { color: COLORS.ink, fontSize: 16, fontWeight: "900" },
  findMore: { color: COLORS.brand, fontSize: 12, fontWeight: "900" },
  wishlistGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  wishCard: { width: "47%", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, overflow: "hidden" },
  wishImg: { width: "100%", height: 110, backgroundColor: COLORS.mutedSoft },
  wishBody: { padding: 10 },
  wishTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  wishLoc: { color: COLORS.muted, fontSize: 11, fontWeight: "600", marginTop: 2 },
  wishPrice: { color: COLORS.brand, fontSize: 13, fontWeight: "900", marginTop: 4 },
  emptyBox: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 16, padding: 20, alignItems: "center" },
  emptyTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "900" },
  emptyBody: { color: COLORS.muted, fontSize: 12, textAlign: "center", marginTop: 6, lineHeight: 17, maxWidth: 280 },
  emptyBtn: { marginTop: 12, backgroundColor: COLORS.brand, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  emptyBtnText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  contactCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, backgroundColor: COLORS.card },
  contactTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900" },
  contactOwner: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.successSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#a7f3d0" },
  checkText: { color: "#475569", fontSize: 12, fontWeight: "700", flex: 1 },
});
