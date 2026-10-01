import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { toggleSaved, clearWishlist } from "../store/wishlistSlice";
import { Heart, MapPin, Star } from "lucide-react-native";
import { FONTS, COLORS } from "../theme";
import { formatPrice } from "../lib/format";


function RatingStars({ rating = 0, reviewCount = 0, size = "xs" }) {
  const ratingValue = Math.min(5, Math.max(0, Number(rating) || 0));
  const count = Number(reviewCount) || 0;
  const label = count === 0 ? "No reviews yet" : `${count} ${count === 1 ? "review" : "reviews"}`;
  const starSize = size === "xs" ? 10 : 12;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View style={{ flexDirection: "row", gap: 1 }}>
        {Array.from({ length: 5 }).map((_, idx) => {
          const filled = ratingValue > idx;
          return <Star key={idx} size={starSize} color={filled ? "#f59e0b" : "#fde68a"} fill={filled ? "#f59e0b" : "#fde68a"} />;
        })}
      </View>
      <Text style={{ fontSize: 10, fontWeight: "800", color: COLORS.muted, fontFamily: FONTS.bold }}>{ratingValue.toFixed(1)} · {label}</Text>
    </View>
  );
}

export default function WishlistScreen({ navigation }) {
  const dispatch = useDispatch();
  const savedIds = useSelector((state) => state.wishlist.savedIds);
  const allRooms = useSelector((state) => state.rooms.items);

  const savedRooms = allRooms.filter((r) =>
    savedIds.includes(String(r.slug || r.id || r._id))
  );

  function renderItem({ item: room }) {
    const id = String(room.slug || room.id || room._id);
    const hasPano = Array.isArray(room.panoramaUrls) && room.panoramaUrls.length > 0;
    const img =
      room.images?.[0] ||
      room.coverImage ||
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("RoomDetails", {
            slug: room.slug || room.id,
            room })
        }
      >
        <View style={styles.imageBox}>
          <Image source={{ uri: img }} style={styles.cardImg} />
          {hasPano && (
            <View style={styles.panoBadge}>
              <Text style={styles.panoBadgeText}>360° TOUR</Text>
            </View>
          )}
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.rowBetween}>
            <Text style={styles.typeText}>{room.type || "Room"}</Text>
            <TouchableOpacity onPress={() => dispatch(toggleSaved(id))}>
              <Heart size={16} color="#ef4444" fill="#ef4444" />
            </TouchableOpacity>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {room.title}
          </Text>
          <View style={{flexDirection:"row", alignItems:"center", gap:4}}><MapPin size={10} color="#94a3b8" /><Text style={styles.cardAddress} numberOfLines={1}>{room.address || room.locationLabel || "Bhopal, MP"}</Text></View>

          <RatingStars rating={room.owner?.rating} reviewCount={room.owner?.reviewCount} size="xs" />

          <Text style={styles.priceText}>
            {formatPrice(room.price)}/mo
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Wishlist</Text>
          <Text style={styles.headerSub}>{savedRooms.length} Saved Rooms</Text>
        </View>
        {savedRooms.length > 0 && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => dispatch(clearWishlist())}
          >
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={savedRooms}
        keyExtractor={(item) => String(item.slug || item.id || item._id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Heart size={48} color="#e2e8f0" />
            <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
            <Text style={styles.emptySub}>
              Tap the heart icon on any property card to save it here for quick access.
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.navigate("Home")}
            >
              <Text style={styles.exploreBtnText}>Explore Rooms</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  headerSub: {
    color: "#7c3aed",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2 },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10 },
  clearBtnText: {
    color: "#f87171",
    fontSize: 12,
    fontWeight: "700" },
  listContent: {
    padding: 16 },
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0" },
  imageBox: {
    width: 120,
    height: 110,
    backgroundColor: "#ffffff" },
  cardImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover" },
  panoBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(6, 78, 59, 0.9)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4 },
  panoBadgeText: {
    color: "#6ee7b7",
    fontSize: 8,
    fontWeight: "900" },
  cardInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center" },
  typeText: {
    color: "#38bdf8",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase" },
  cardTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "800",
    fontFamily: FONTS.bold },
  cardAddress: {
    color: "#94a3b8",
    fontSize: 11 },
  priceText: {
    color: "#7c3aed",
    fontSize: 15,
    fontWeight: "900" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80 },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12 },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: FONTS.bold },
  emptySub: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 260,
    lineHeight: 18 },
  exploreBtn: {
    backgroundColor: "#7c3aed",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 12,
    marginTop: 20 },
  exploreBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800" }
});
