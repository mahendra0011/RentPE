import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Heart, MapPin, Share2, MessageCircle, Check, Star } from "lucide-react-native";
import { COLORS, FONTS } from "../theme";
import { formatPrice } from "../lib/format";

/**
 * Mirrors website src/components/RoomCard.jsx
 * grid-[1.32] 2 thumbs, tag pill, distance blue, 360 pulsing, heart, rating, share
 */

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
      <Text style={{ fontSize: 10, fontWeight: "800", color: COLORS.muted, fontFamily: FONTS.bold }}>{ratingValue.toFixed(1)} \u00b7 {label}</Text>
    </View>
  );
}

export function RoomCard({ room, onPress, onChat, onToggleSave, saved, onShare, shareState }) {
  const images = getCardImages(room);
  const hasPano = Array.isArray(room.panoramaUrls) && room.panoramaUrls.length > 0;

  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={onPress}>
      {/* Image grid */}
      <View style={styles.imageGrid}>
        <Image source={{ uri: images[0] }} style={styles.mainImage} />
        <View style={styles.thumbCol}>
          {images.slice(1, 3).map((img, i) => (
            <Image key={`${img}-${i}`} source={{ uri: img }} style={styles.thumb} />
          ))}
        </View>
        <View style={styles.tagPill}><Text style={styles.tagText}>{room.tag || room.type || "Room"}</Text></View>
        {room.distance && (
          <View style={styles.distancePill}>
            <MapPin size={12} color="#3b82f6" fill="rgba(59,130,246,0.2)" />
            <Text style={styles.distanceText}>{room.distance}</Text>
          </View>
        )}
        {hasPano && (
          <View style={styles.panoPill}>
            <View style={styles.pulseWrap}><View style={styles.pulseDot} /><View style={styles.pulseRing} /></View>
            <Text style={styles.panoText}>360° TOUR</Text>
          </View>
        )}
        <TouchableOpacity style={styles.heartBtn} onPress={onToggleSave}>
          <Heart size={16} color={saved ? "#ef4444" : "#ffffff"} fill={saved ? "#ef4444" : "transparent"} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{room.title}</Text>
        <Text style={styles.price}>{formatPrice(room.price)}<Text style={styles.perMonth}>/mo</Text></Text>
        <Text style={styles.address} numberOfLines={1}>{room.address || room.locationLabel || "Bhopal, MP"}</Text>
        <View style={{ marginTop: 6 }}><RatingStars rating={room.owner?.rating} reviewCount={room.owner?.reviewCount} size="xs" /></View>
        <View style={styles.row}>
          <TouchableOpacity style={styles.primaryBtn} onPress={onPress}>
            <Text style={styles.primaryText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatBtn} onPress={onChat}>
            <MessageCircle size={14} color={COLORS.brand} /><Text style={styles.chatText}> Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
            {shareState === "Copied" ? <Check size={14} color={COLORS.brand} /> : <Share2 size={14} color={COLORS.muted} />}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getCardImages(room) {
  const imgs = room.images || (room.coverImage ? [room.coverImage] : []);
  const fallback = "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80";
  const list = [...imgs];
  while (list.length < 3) list.push(fallback);
  return list.slice(0, 3);
}

// formatPrice unified via src/lib/format.js (handles null/0 same as original – returns — for falsy but 0)

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    marginBottom: 14,
  },
  imageGrid: {
    flexDirection: "row",
    height: 150,
    gap: 4,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
    position: "relative",
  },
  mainImage: { flex: 1, width: "100%", height: "100%" },
  thumbCol: { width: 86, gap: 4 },
  thumb: { flex: 1, width: "100%", borderRadius: 0 },
  tagPill: {
    position: "absolute", top: 8, left: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20,
  },
  tagText: { fontSize: 10, fontWeight: "900", color: COLORS.ink, textTransform: "uppercase" },
  distancePill: {
    position: "absolute", bottom: 8, right: 8,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(15,23,42,0.9)", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(59,130,246,0.3)",
  },
  distanceText: { fontSize: 11, fontWeight: "800", color: "#ffffff" },
  panoPill: {
    position: "absolute", bottom: 8, left: 8,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(15,23,42,0.85)", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(16,185,129,0.3)",
  },
  pulseWrap: { width: 8, height: 8, alignItems: "center", justifyContent: "center" },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981", position: "absolute" },
  pulseRing: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(16,185,129,0.35)" },
  panoText: { fontSize: 10, fontWeight: "900", color: "#6ee7b7" },
  heartBtn: {
    position: "absolute", top: 8, right: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.6)", alignItems: "center", justifyContent: "center",
  },
  body: { paddingTop: 10 },
  title: { fontSize: 15, fontWeight: "900", color: COLORS.ink, fontFamily: FONTS.bold },
  price: { fontSize: 15, fontWeight: "900", color: COLORS.brand, marginTop: 2, fontFamily: FONTS.bold },
  perMonth: { fontSize: 11, fontWeight: "600", color: COLORS.muted },
  address: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  primaryBtn: { flex: 1, backgroundColor: COLORS.brand, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  chatBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.brandSoft, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12,
  },
  chatText: { color: COLORS.brand, fontWeight: "900", fontSize: 13 },
  shareBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.mutedSoft, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },
});
