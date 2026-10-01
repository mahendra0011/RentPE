import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Linking,
  ActivityIndicator,
  Share,
  Alert,
  TextInput,
  PanResponder } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import { toggleSaved } from "../store/wishlistSlice";
import { ApiService } from "../services/api";
import { COLORS, FONTS } from "../theme";
import { CitySelector } from "../components/CitySelector";
import RoomMapView, { resolveMapCenter } from "../components/RoomMapView";
import { formatPrice } from "../lib/format";
import {
  Wifi,
  Snowflake,
  CarFront,
  Utensils,
  Camera,
  Flame,
  CookingPot,
  WashingMachine,
  BatteryFull,
  ArrowUpDown,
  Handshake,
  Mountain,
  Dumbbell,
  PawPrint,
  Tv,
  BookOpen,
  Bath,
  Box,
  Heart,
  Share2,
  MessageCircle,
  Phone,
  MapPin,
  Star,
  Compass,
  Eye,
  ShieldCheck,
  Check } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ---- helpers ---- (formatPrice unified via lib/format)
function formatPhoneDisplay(phone) {
  const p = String(phone || "919876543210");
  // expects 91 + 10 digits
  const without91 = p.startsWith("91") ? p.slice(2) : p;
  if (without91.length >= 10) return `+91 ${without91.slice(0, 5)} ${without91.slice(5, 10)}`;
  return `+91 ${p}`;
}
function getInitials(name) {
  if (!name) return "O";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

const amenityIconMap = {
  WiFi: Wifi,
  AC: Snowflake,
  Parking: CarFront,
  Mess: Utensils,
  "Mess Included": Utensils,
  CCTV: Camera,
  Geyser: Flame,
  "Hot Water": Flame,
  Kitchen: CookingPot,
  Laundry: WashingMachine,
  "Power Backup": BatteryFull,
  Lift: ArrowUpDown,
  "No Broker": Handshake,
  Balcony: Mountain,
  Gym: Dumbbell,
  "Pet Friendly": PawPrint,
  "Common TV": Tv,
  "Study Room": BookOpen,
  "Attached Bath": Bath };

// RatingStars mobile — mirrors website RatingStars.jsx using lucide Star
function RatingStars({ rating = 0, reviewCount = 0, size = "sm" }) {
  const ratingValue = clamp(Number(rating) || 0, 0, 5);
  const count = Number(reviewCount) || 0;
  const label = count === 0 ? "No reviews yet" : `${count} ${count === 1 ? "review" : "reviews"}`;
  const starSize = size === "xs" ? 12 : size === "md" ? 16 : 14;
  return (
    <View style={rnRatingStyles.wrap}>
      <View style={rnRatingStyles.starsRow}>
        {Array.from({ length: 5 }).map((_, idx) => {
          const pct = clamp((ratingValue - idx) * 100, 0, 100);
          const filled = pct >= 50;
          return (
            <View key={idx} style={[rnRatingStyles.starBox, { width: starSize, height: starSize }]}>
              <Star size={starSize} color="#fde68a" fill="#fde68a" />
              <View style={[rnRatingStyles.fillClip, { width: `${pct}%` }]}>
                <Star size={starSize} color="#f59e0b" fill="#f59e0b" />
              </View>
            </View>
          );
        })}
      </View>
      <Text style={rnRatingStyles.label}>{ratingValue.toFixed(1)} · {label}</Text>
    </View>
  );
}
const rnRatingStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fef3c7", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  starsRow: { flexDirection: "row", gap: 1 },
  starBox: { position: "relative", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  star: { fontWeight: "900", lineHeight: 14 },
  fillClip: { position: "absolute", top: 0, left: 0, bottom: 0, overflow: "hidden" },
  label: { fontSize: 11, fontWeight: "800", color: COLORS.muted, marginLeft: 2, fontFamily: FONTS.bold } });

export default function RoomDetailsScreen({ route, navigation }) {
  const { slug, room: initialRoom } = route.params || {};
  const [room, setRoom] = useState(initialRoom || null);
  const [loading, setLoading] = useState(!initialRoom);
  const [active, setActive] = useState(0);
  const [show360Modal, setShow360Modal] = useState(false);
  const [activePanoIndex, setActivePanoIndex] = useState(0);
  const [reported, setReported] = useState(false);
  const [shareState, setShareState] = useState("");
  const [chatError, setChatError] = useState("");
  const [error, setError] = useState("");
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [overrideCity, setOverrideCity] = useState("");

  // panorama viewer controls
  const [yaw, setYaw] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setAutoRotate(false),
      onPanResponderMove: (_, gesture) => {
        // horizontal drag -> yaw, vertical -> subtle pitch not needed for 2D
        setYaw((prev) => (prev - gesture.dx * 0.25) % 360);
      } })
  ).current;

  // reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // similar rooms + local
  const [similarRooms, setSimilarRooms] = useState([]);
  const [selectedMapRoomId, setSelectedMapRoomId] = useState("");

  const dispatch = useDispatch();
  const savedIds = useSelector((state) => state.wishlist.savedIds);
  const roomId = String(room?.slug || room?.id || room?._id || slug || "");
  const isSaved = savedIds.includes(roomId);

  const images = room?.images?.length ? room.images : [room?.coverImage || "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80"];
  const panoramas = Array.isArray(room?.panoramaUrls) ? room.panoramaUrls : [];
  const has360 = panoramas.length > 0;

  // keep active in bounds
  useEffect(() => {
    if (active >= images.length) setActive(0);
  }, [active, images.length]);

  // load room details
  useEffect(() => {
    async function loadDetails() {
      if (!slug) return;
      try {
        const data = await ApiService.getRoomDetails(slug);
        if (data) setRoom(data);
      } catch (err) {
        setError(err.message || "Failed to load details");
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [slug]);

  // fetch reviews by roomSlug
  useEffect(() => {
    const roomSlug = room?.slug || slug;
    if (!roomSlug) return;
    let cancelled = false;
    async function loadReviews() {
      setReviewsLoading(true);
      try {
        const data = await ApiService.getReviews(roomSlug);
        if (!cancelled) setReviews(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    }
    loadReviews();
    return () => { cancelled = true; };
  }, [room?.slug, slug]);

  // fetch similar rooms (used for map selectable list + Similar 3)
  useEffect(() => {
    let cancelled = false;
    async function loadSimilar() {
      try {
        const data = await ApiService.getRooms(room?.city ? { city: room.city, limit: 10 } : { limit: 10 });
        const list = Array.isArray(data?.rooms) ? data.rooms : Array.isArray(data) ? data : [];
        const filtered = list.filter((r) => String(r.slug || r.id) !== String(room?.slug || room?.id)).slice(0, 8);
        if (!cancelled) setSimilarRooms(filtered);
      } catch {
        if (!cancelled) setSimilarRooms([]);
      }
    }
    if (room) loadSimilar();
    return () => { cancelled = true; };
  }, [room?.slug, room?.city, room?.id]);

  useEffect(() => {
    const key = String(room?.slug || room?.id || "");
    if (key) setSelectedMapRoomId(key);
  }, [room?.slug, room?.id]);

  useEffect(() => {
    if (room?.city) setOverrideCity((prev) => prev || "");
  }, [room?.city]);

  // auto-rotate yaw when modal open
  useEffect(() => {
    if (!show360Modal || !autoRotate) return;
    const id = setInterval(() => setYaw((p) => (p + 0.6) % 360), 50);
    return () => clearInterval(id);
  }, [show360Modal, autoRotate]);

  // normalized yaw 0-360
  const yawDisplay = Math.round(((yaw % 360) + 360) % 360);

  async function handleShare() {
    const shareUrl = `https://roomsfind.com/#/rooms/${encodeURIComponent(room?.slug || roomId)}`;
    try {
      const result = await Share.share({
        message: `${room?.title} on RoomsFind — ${shareUrl}`,
        url: shareUrl,
        title: room?.title });
      if (result.action === Share.sharedAction) {
        setShareState("Shared");
      } else if (result.action === Share.dismissedAction) {
        setShareState("");
      }
      setTimeout(() => setShareState(""), 1600);
    } catch {
      setShareState("Try again");
      setTimeout(() => setShareState(""), 1600);
    }
  }

  function handleCallOwner() {
    const phone = room?.owner?.phone || "919876543210";
    Linking.openURL(`tel:+${phone.replace(/^\+/, "")}`);
  }

  async function handleStartChat() {
    setChatError("");
    try {
      const conv = await ApiService.startConversation(
        room.slug || room.id,
        `Hi, I am interested in your room "${room.title}" on RoomsFind.`
      );
      navigation.navigate("Chat", {
        conversationId: conv?.conversation?._id || conv?._id,
        roomTitle: room.title,
        ownerName: room.owner?.name || "Property Owner" });
    } catch (err) {
      setChatError(err.message || "Failed to start conversation.");
      // fallback navigate with roomId
      navigation.navigate("Chat", {
        roomId: room.slug || room.id,
        roomTitle: room.title,
        ownerName: room.owner?.name || "Property Owner" });
    }
  }

  async function handleReport() {
    if (reported) return;
    try {
      await ApiService.reportRoom(room.slug || room.id);
      setReported(true);
    } catch (e) {
      Alert.alert("Report failed", e.message || "Try again later");
    }
  }

  async function handleSubmitReview() {
    if (!reviewForm.comment.trim()) {
      setReviewError("Please write a comment.");
      return;
    }
    setReviewSubmitting(true);
    setReviewError("");
    try {
      const created = await ApiService.addReview(room.slug || room.id, {
        rating: reviewForm.rating,
        comment: reviewForm.comment.trim() });
      setReviews((prev) => [created, ...prev]);
      setReviewForm({ rating: 5, comment: "" });
      setShowReviewForm(false);
    } catch (e) {
      setReviewError(e.response?.data?.message || e.message || "Failed to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  function handleToggleSave() {
    dispatch(toggleSaved(roomId));
  }

  if (loading || !room) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.loadingText}>Loading property details...</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </SafeAreaView>
    );
  }

  const localEssentials = room.localEssentials?.length
    ? room.localEssentials
    : [
        { name: "College / Office", type: "landmark", distance: "Area detail" },
        { name: "Bus stop", type: "transit", distance: "Walkable" },
        { name: "Market", type: "daily needs", distance: "Area detail" },
      ];

  const houseRules = room.rules || [];
  const amenities = room.amenities?.length ? room.amenities : ["WiFi", "Water Supply", "CCTV", "Power Backup"];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style={isFullscreen ? "light" : "dark"} />

      {/* Floating top nav - not absolute inside SafeArea to avoid overlap with notch */}
      <View style={styles.navBarWrap}>
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.navBtnText}>←</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.navBtn} onPress={handleShare}>
              <Share2 size={16} color={COLORS.ink} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={handleToggleSave}>
              <Heart size={18} color={isSaved ? "#ef4444" : COLORS.muted} fill={isSaved ? "#ef4444" : "transparent"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Gallery */}
        <View style={styles.gallerySection}>
          <View style={styles.mainImageWrap}>
            <Image source={{ uri: images[active] }} style={styles.mainImage} />
            {/* tag pill */}
            <View style={styles.tagPill}>
              <Text style={styles.tagPillText}>{room.tag || room.type || "Room"}</Text>
            </View>
            {/* share + heart overlay (also duplicated in navBar but matches website absolute)) */}
            <View style={styles.topRightActions}>
              <TouchableOpacity style={styles.roundIconBtn} onPress={handleShare}>
                <Share2 size={14} color={COLORS.ink} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.roundIconBtn} onPress={handleToggleSave}>
                <Heart size={14} color={isSaved ? "#ef4444" : "#fff"} fill={isSaved ? "#ef4444" : "transparent"} />
              </TouchableOpacity>
            </View>
            {/* Explore 360 emerald pill */}
            {has360 && (
              <TouchableOpacity style={styles.explorePill} onPress={() => setShow360Modal(true)}>
                <View style={styles.pulseDotWrap}>
                  <View style={styles.pulseDot} />
                </View>
                <Text style={styles.explorePillText}>Explore 360° ({panoramas.length} {panoramas.length === 1 ? "angle" : "angles"})</Text>
              </TouchableOpacity>
            )}
            {/* index pill */}
            <View style={styles.indexPill}>
              <Text style={styles.indexPillText}>{active + 1} / {images.length}</Text>
            </View>
          </View>

          {/* 4 thumbs + 360 thumb */}
          <View style={styles.thumbsGrid}>
            {images.slice(0, 4).map((imgUri, idx) => (
              <TouchableOpacity
                key={`${imgUri}-${idx}`}
                onPress={() => setActive(idx)}
                style={[styles.thumbBtn, active === idx && styles.thumbBtnActive]}
              >
                <Image source={{ uri: imgUri }} style={styles.thumbImg} />
              </TouchableOpacity>
            ))}
            {/* fill remaining thumbs if less than 4 with placeholders */}
            {Array.from({ length: Math.max(0, 4 - images.length) }).map((_, i) => (
              <View key={`empty-${i}`} style={[styles.thumbBtn, { backgroundColor: COLORS.mutedSoft }]} />
            ))}
            {has360 && (
              <TouchableOpacity style={styles.thumb360} onPress={() => setShow360Modal(true)}>
                <View style={styles.thumb360Icon}>
                  <Camera size={18} color="#059669" />
                </View>
                <Text style={styles.thumb360Label}>360° View</Text>
                <Text style={styles.thumb360Sub}>Interactive</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Title + Rating row */}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{room.title}</Text>
              <View style={styles.addressRow}>
                <MapPin size={14} color={COLORS.muted} />
                <Text style={styles.addressText} numberOfLines={2}>{room.address || room.locationLabel || room.location || "Bhopal, MP"}</Text>
              </View>
              {room.distance ? (
                <View style={styles.distanceChip}>
                  <View style={{flexDirection:"row", alignItems:"center", gap:4}}><MapPin size={11} color={COLORS.brand} /><Text style={styles.distanceChipText}>{room.distance}</Text></View>
                </View>
              ) : null}
            </View>
          </View>
          <View style={{ marginTop: 10, alignSelf: "flex-start" }}>
            <RatingStars rating={room.owner?.rating} reviewCount={room.owner?.reviewCount} size="sm" />
          </View>

          {/* 4-spec grid: Distance / Type / Tenant / Furnished */}
          <View style={styles.specsGrid}>
            {[
              { label: "Distance", value: room.distance || "Nearby" },
              { label: "Type", value: room.type || "Single" },
              { label: "Tenant", value: room.gender || "Any" },
              { label: "Furnished", value: room.furnished ? "Yes" : "No" },
            ].map((item) => (
              <View key={item.label} style={styles.specBox}>
                <Text style={styles.specLabel}>{item.label.toUpperCase()}</Text>
                <Text style={styles.specVal}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* About */}
          {room.description ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeader}>About this place</Text>
              <Text style={styles.descriptionText}>{room.description}</Text>
            </View>
          ) : null}

          {/* House rules */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>House rules</Text>
            {houseRules.length > 0 ? (
              <View style={styles.rulesGrid}>
                {houseRules.map((rule, idx) => (
                  <View key={`${rule}-${idx}`} style={styles.ruleRow}>
                    <View style={styles.ruleCheck}>
                      <Check size={12} color={COLORS.success} strokeWidth={3} />
                    </View>
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyDashed}>
                <Text style={styles.emptyDashedText}>Owner has not added house rules yet.</Text>
              </View>
            )}
          </View>

          {/* What this place offers */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>What this place offers</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.map((am) => {
                const Icon = amenityIconMap[am] || Box;
                return (
                  <View key={am} style={styles.amenityRow}>
                    <Icon size={16} color={COLORS.brand} />
                    <Text style={styles.amenityText}>{am}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ReviewsSection */}
          <View style={styles.sectionBlock}>
            <View style={styles.reviewsHeader}>
              <View>
                <Text style={styles.sectionHeader}>Reviews</Text>
                {reviews.length > 0 && (
                  <Text style={styles.reviewsSubtitle}>
                    {(() => {
                      const avg = reviews.reduce((a, r) => a + (Number(r.rating) || 0), 0) / reviews.length;
                      return `${avg.toFixed(1)} · ${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}`;
                    })()}
                  </Text>
                )}
              </View>
              <TouchableOpacity style={styles.writeReviewBtn} onPress={() => setShowReviewForm((v) => !v)}>
                <Text style={styles.writeReviewText}>{showReviewForm ? "Cancel" : "Write a review"}</Text>
              </TouchableOpacity>
            </View>

            {showReviewForm && (
              <View style={styles.reviewForm}>
                <Text style={styles.reviewFormTitle}>Share your experience</Text>
                <Text style={styles.inputLabel}>Rating</Text>
                <View style={styles.starsInputRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setReviewForm((p) => ({ ...p, rating: s }))}>
                      <Star size={24} color={s <= reviewForm.rating ? "#f59e0b" : "#fde68a"} fill={s <= reviewForm.rating ? "#f59e0b" : "#fde68a"} />
                    </TouchableOpacity>
                  ))}
                  <Text style={{ marginLeft: 8, color: COLORS.muted, fontWeight: "700" }}>{reviewForm.rating}/5</Text>
                </View>
                <Text style={styles.inputLabel}>Your review</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Tell others about your experience staying here..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  value={reviewForm.comment}
                  onChangeText={(t) => setReviewForm((p) => ({ ...p, comment: t }))}
                />
                <Text style={styles.charCount}>{reviewForm.comment.length}/1000</Text>
                {reviewError ? <Text style={styles.formError}>{reviewError}</Text> : null}
                <TouchableOpacity style={styles.submitReviewBtn} onPress={handleSubmitReview} disabled={reviewSubmitting}>
                  {reviewSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitReviewText}>Submit review</Text>}
                </TouchableOpacity>
              </View>
            )}

            {reviewsLoading ? (
              <ActivityIndicator color={COLORS.brand} style={{ marginTop: 16 }} />
            ) : reviews.length > 0 ? (
              <View style={{ gap: 12, marginTop: 12 }}>
                {reviews.map((rv) => (
                  <View key={rv._id || rv.id || rv.createdAt} style={styles.reviewCard}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <View style={styles.reviewAvatar}>
                        <Text style={styles.reviewAvatarText}>{getInitials(rv.userName || "Anonymous")}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={styles.reviewName}>{rv.userName || "Anonymous"}</Text>
                          <Text style={styles.reviewDate}>{formatReviewDate(rv.createdAt)}</Text>
                        </View>
                        <View style={{ flexDirection: "row", marginTop: 4 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={13} color={i < (Number(rv.rating) || 0) ? "#f59e0b" : "#fde68a"} fill={i < (Number(rv.rating) || 0) ? "#f59e0b" : "#fde68a"} />
                          ))}
                        </View>
                        <Text style={styles.reviewComment}>{rv.comment}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyReviews}>
                <Text>👤</Text>
                <Text style={styles.emptyReviewsTitle}>No reviews yet</Text>
                <Text style={styles.emptyReviewsSub}>Be the first to share your experience!</Text>
              </View>
            )}
          </View>

          {/* Sticky aside equivalent: price + owner verified + Chat/Call + Wishlist/Share + Report scam */}
          <View style={styles.asideCard}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
              <Text style={styles.asidePrice}>{formatPrice(room.price)}</Text>
              <Text style={styles.asidePerMonth}>/month</Text>
            </View>
            <Text style={styles.asideIncludes}>Includes electricity and maintenance estimates</Text>

            <View style={styles.ownerRow}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>{getInitials(room.owner?.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ownerName} numberOfLines={1}>{room.owner?.name || "Verified Owner"}</Text>
                <Text style={styles.ownerSince}>Owner since {room.owner?.since || "2021"}</Text>
              </View>
              {room.owner?.verified && (
                <View style={styles.verifiedPill}>
                  <View style={{flexDirection:"row", alignItems:"center", gap:4}}><ShieldCheck size={12} color={COLORS.success} /><Text style={styles.verifiedText}>Verified</Text></View>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.chatOwnerBtn} onPress={handleStartChat}>
              <View style={{flexDirection:"row", alignItems:"center", gap:6, justifyContent:"center"}}><MessageCircle size={16} color="#fff" /><Text style={styles.chatOwnerText}>Chat with Owner</Text></View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.callBtn} onPress={handleCallOwner}>
              <View style={{flexDirection:"row", alignItems:"center", gap:6, justifyContent:"center"}}><Phone size={16} color={COLORS.ink} /><Text style={styles.callBtnText}>Call {formatPhoneDisplay(room.owner?.phone)}</Text></View>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.wishlistBtn, isSaved && styles.wishlistBtnSaved]}
                onPress={handleToggleSave}
              >
                <View style={{flexDirection:"row", alignItems:"center", gap:4, justifyContent:"center"}}><Heart size={14} color={isSaved ? COLORS.brand : COLORS.ink} fill={isSaved ? COLORS.brand : "transparent"} /><Text style={[styles.wishlistText, isSaved && { color: COLORS.brand }]}>{isSaved ? "Saved" : "Wishlist"}</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <View style={{flexDirection:"row", alignItems:"center", gap:4, justifyContent:"center"}}><Share2 size={14} color={COLORS.ink} /><Text style={styles.shareBtnText}>{shareState || "Share"}</Text></View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.reportBtn, reported && { opacity: 0.7 }]} onPress={handleReport} disabled={reported}>
              <Text style={styles.reportText}>{reported ? "Report received" : "Report scam listing"}</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 16, gap: 8 }}>
              {["No brokerage fee", "Direct owner contact", "Visit before payment"].map((item) => (
                <View key={item} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Check size={14} color={COLORS.success} strokeWidth={3} />
                  <Text style={{ fontSize: 12, color: COLORS.muted, fontWeight: "600" }}>{item}</Text>
                </View>
              ))}
            </View>
            {(error || chatError) ? (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{chatError || error}</Text>
              </View>
            ) : null}
          </View>

          {/* Location – parity with website RoomLocationMap + selectable list */}
          <View style={styles.sectionBlock}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={styles.sectionHeader}>Location</Text>
              <TouchableOpacity onPress={() => setShowCitySelector(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.brandSoft, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: "#ddd6fe" }}>
                <MapPin size={10} color={COLORS.brand} />
                <Text style={{ fontSize: 11, fontWeight: "900", color: COLORS.brand }}>{overrideCity || room.city || "Select city"}{room.state ? `, ${room.state}` : ""}</Text>
                <Text style={{ color: COLORS.brand, fontSize: 10 }}>▼</Text>
              </TouchableOpacity>
            </View>

            {(() => {
              const allMapRooms = [room, ...similarRooms];
              const dedup = [];
              const seen = new Set();
              for (const r of allMapRooms) {
                const k = String(r.slug || r.id || r._id);
                if (!seen.has(k)) { seen.add(k); dedup.push(r); }
              }
              const mapRooms = dedup.slice(0, 8);
              const activeKey = selectedMapRoomId || String(room.slug || room.id);
              const activeRoomForMap = mapRooms.find((r) => String(r.slug || r.id) === activeKey) || room;
              return (
                <>
                  <RoomMapView
                    room={overrideCity ? { ...activeRoomForMap, city: overrideCity } : activeRoomForMap}
                    onOpenInMaps={() => {
                      const c = resolveMapCenter(overrideCity ? { ...activeRoomForMap, city: overrideCity } : activeRoomForMap);
                      if (c) Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`);
                      else {
                        const q = encodeURIComponent(activeRoomForMap.address || activeRoomForMap.locationLabel || activeRoomForMap.city || "");
                        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
                      }
                    }}
                  />

                  {/* Selectable room list – mirrors website right rail MapRoomSelectCard */}
                  {mapRooms.length > 1 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={{ fontSize: 10, fontWeight: "900", color: COLORS.muted, letterSpacing: 0.6, marginBottom: 8 }}>{mapRooms.length} rooms in this area · tap to switch pin</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
                        {mapRooms.map((mr) => {
                          const k = String(mr.slug || mr.id);
                          const sel = k === activeKey;
                          return (
                            <TouchableOpacity
                              key={k}
                              onPress={() => setSelectedMapRoomId(k)}
                              style={[styles.mapSelectCard, sel && styles.mapSelectCardActive]}
                            >
                              <Image source={{ uri: mr.coverImage || mr.images?.[0] || images[0] }} style={styles.mapSelectImage} />
                              <View style={{ flex: 1, gap: 2 }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                  <View style={[styles.mapSelectTag, sel && { backgroundColor: COLORS.ink }]}>
                                    <Text style={[styles.mapSelectTagText, sel && { color: "#fff" }]}>{sel ? "Selected" : (mr.type || mr.tag || "Room")}</Text>
                                  </View>
                                  <View style={{flexDirection:"row", alignItems:"center", gap:3}}><Star size={10} color="#f59e0b" fill="#f59e0b" /><Text style={{ fontSize: 10, fontWeight: "900", color: "#f59e0b" }}>{Number(mr.owner?.rating || 4.5).toFixed(1)}</Text></View>
                                </View>
                                <Text style={styles.mapSelectTitle} numberOfLines={1}>{mr.title}</Text>
                                <Text style={styles.mapSelectLoc} numberOfLines={1}>{mr.location || mr.address || mr.city}</Text>
                                <Text style={styles.mapSelectPrice}>{formatPrice(mr.price)}<Text style={{ fontSize: 10, color: COLORS.muted }}> /mo</Text></Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </>
              );
            })()}

            <View style={styles.areaGrid}>
              <View style={styles.areaCard}>
                <Text style={styles.areaLabel}>Area</Text>
                <Text style={styles.areaValue}>{room.location || room.city || "Bhopal"}</Text>
              </View>
              <View style={styles.areaCard}>
                <Text style={styles.areaLabel}>Full address</Text>
                <Text style={styles.areaAddress}>{room.address || room.locationLabel || "—"}</Text>
              </View>
            </View>

            <CitySelector
              visible={showCitySelector}
              onClose={() => setShowCitySelector(false)}
              selectedCity={overrideCity || room.city}
              onSelect={(city) => {
                setShowCitySelector(false);
                if (city === "__locate__") {
                  setOverrideCity("");
                } else {
                  setOverrideCity(city);
                }
              }}
            />
          </View>

          {/* Local essentials */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>Local essentials</Text>
            <View style={styles.essentialsGrid}>
              {localEssentials.map((item) => (
                <View key={`${item.name}-${item.type}`} style={styles.essentialCard}>
                  <Text style={styles.essentialType}>{String(item.type).toUpperCase()}</Text>
                  <Text style={styles.essentialName}>{item.name}</Text>
                  <Text style={styles.essentialDist}>{item.distance}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Similar rooms */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeader}>Similar rooms</Text>
            {similarRooms.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
                {similarRooms.slice(0, 3).map((sr) => (
                  <TouchableOpacity
                    key={String(sr.slug || sr.id)}
                    style={styles.similarCard}
                    onPress={() => navigation.push("RoomDetails", { slug: sr.slug || sr.id, room: sr })}
                  >
                    <Image source={{ uri: sr.coverImage || sr.images?.[0] || images[0] }} style={styles.similarImage} />
                    <View style={styles.similarBody}>
                      <Text style={styles.similarType}>{sr.type || sr.tag || "Room"}</Text>
                      <Text style={styles.similarTitle} numberOfLines={1}>{sr.title}</Text>
                      <Text style={styles.similarLocation} numberOfLines={1}>{sr.location || sr.address}</Text>
                      <Text style={styles.similarPrice}>{formatPrice(sr.price)}<Text style={styles.similarPerMonth}> /mo</Text></Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyDashed}>
                <Text style={styles.emptyDashedText}>No similar rooms found right now.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom sticky bar - keep Chat/Call for thumb reach */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomChatBtn} onPress={handleStartChat}>
          <View style={{flexDirection:"row", alignItems:"center", gap:6, justifyContent:"center"}}><MessageCircle size={14} color="#fff" /><Text style={styles.bottomChatText}>In-App Chat</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomCallBtn} onPress={handleCallOwner}>
          <View style={{flexDirection:"row", alignItems:"center", gap:6, justifyContent:"center"}}><Phone size={14} color={COLORS.ink} /><Text style={styles.bottomCallText}>Call Owner</Text></View>
        </TouchableOpacity>
      </View>

      {/* 360 Panorama Viewer Modal — mimics website's yaw compass + fullscreen */}
      <Modal visible={show360Modal} animationType="slide" onRequestClose={() => setShow360Modal(false)} statusBarTranslucent>
        <View style={[styles.modalContainer, isFullscreen && { backgroundColor: "#000" }]}>
          <SafeAreaView style={styles.modalHeader} edges={["top"]}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShow360Modal(false)}>
              <Text style={styles.modalCloseText}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>{room.title} — 360° Tour</Text>
            <TouchableOpacity style={styles.modalFullscreenBtn} onPress={() => setIsFullscreen((v) => !v)}>
              <Text style={styles.modalFullscreenText}>{isFullscreen ? "⤓ Minimize" : "⤢ Fullscreen"}</Text>
            </TouchableOpacity>
          </SafeAreaView>

          {/* Top bar: compass + auto rotate */}
          <View style={styles.panoTopBar}>
            <View style={styles.compassPill}>
              <View style={[styles.compassNeedle, { transform: [{ rotate: `${yawDisplay}deg` }] }]}>
                <Compass size={12} color={COLORS.brand} />
              </View>
              <Text style={styles.compassText}>{yawDisplay}°</Text>
              <Text style={styles.compassSub}>yaw</Text>
            </View>
            <TouchableOpacity style={[styles.autoRotateBtn, autoRotate && { backgroundColor: COLORS.brand }]} onPress={() => setAutoRotate((v) => !v)}>
              <Text style={[styles.autoRotateText, autoRotate && { color: "#fff" }]}>{autoRotate ? "⏸ Pause" : "▶ Auto"}</Text>
            </TouchableOpacity>
          </View>

          {/* Pano viewport */}
          <View style={styles.panoViewport} {...panResponder.panHandlers}>
            <Image
              source={{ uri: panoramas[activePanoIndex] || panoramas[0] }}
              style={[styles.panoImage, { transform: [{ scale: zoom }] }]}
              resizeMode="cover"
            />
            <View style={styles.panoOverlay}>
              <View style={styles.panoHintPill}>
                <Text style={styles.panoHintText}>Drag to look around · Pinch concept via zoom buttons</Text>
              </View>
            </View>
            {/* Right zoom controls */}
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoom((z) => clamp(z + 0.15, 1, 2.2))}>
                <Text style={styles.zoomBtnText}>＋</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => setZoom((z) => clamp(z - 0.15, 1, 2.2))}>
                <Text style={styles.zoomBtnText}>－</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => { setYaw(0); setZoom(1); setAutoRotate(true); }}>
                <Text style={styles.zoomBtnText}>↺</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Angle switcher */}
          {panoramas.length > 1 && (
            <View style={styles.angleSwitcher}>
              <Text style={styles.angleTitle}>Switch Room Views:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {panoramas.map((_, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.anglePill, activePanoIndex === idx && styles.anglePillActive]}
                    onPress={() => { setActivePanoIndex(idx); setYaw(0); }}
                  >
                    <Text style={[styles.angleText, activePanoIndex === idx && styles.angleTextActive]}>View {idx + 1}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={styles.panoFooterHint}>
            <Text style={styles.panoFooterText}>Website uses Three.js sphere · Mobile shows equirectangular Image with yaw compass + zoom + auto-rotate</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatReviewDate(dateStr) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  } catch { return ""; }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { color: COLORS.muted, fontSize: 13, marginTop: 10, fontWeight: "600" },
  errorText: { color: "#dc2626", fontSize: 12, marginTop: 8, textAlign: "center" },
  navBarWrap: { backgroundColor: COLORS.background, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  navBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  navBtnText: { color: COLORS.ink, fontSize: 18, fontWeight: "900" },
  navBtnIcon: { color: COLORS.ink, fontSize: 16, fontWeight: "900" },

  gallerySection: { paddingHorizontal: 16, paddingTop: 4 },
  mainImageWrap: { height: 300, borderRadius: 20, overflow: "hidden", backgroundColor: COLORS.mutedSoft, position: "relative" },
  mainImage: { width: "100%", height: "100%", resizeMode: "cover" },
  tagPill: { position: "absolute", top: 12, left: 12, backgroundColor: "rgba(255,255,255,0.92)", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  tagPillText: { color: COLORS.ink, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  topRightActions: { position: "absolute", top: 12, right: 12, flexDirection: "row", gap: 8 },
  roundIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  roundIconText: { fontSize: 14, fontWeight: "900", color: COLORS.ink },
  explorePill: { position: "absolute", bottom: 14, left: 12, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(6,78,59,0.95)", borderWidth: 1, borderColor: "rgba(110,231,183,0.35)", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  pulseDotWrap: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(16,185,129,0.35)", alignItems: "center", justifyContent: "center" },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" },
  explorePillText: { color: "#6ee7b7", fontSize: 11, fontWeight: "900" },
  indexPill: { position: "absolute", bottom: 14, right: 12, backgroundColor: "rgba(255,255,255,0.95)", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  indexPillText: { color: COLORS.ink, fontSize: 11, fontWeight: "800" },

  thumbsGrid: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  thumbBtn: { width: (SCREEN_WIDTH - 32 - 24) / 4, aspectRatio: 4 / 3, borderRadius: 12, overflow: "hidden", borderWidth: 2, borderColor: "transparent", backgroundColor: COLORS.card },
  thumbBtnActive: { borderColor: COLORS.brand },
  thumbImg: { width: "100%", height: "100%", resizeMode: "cover" },
  thumb360: { width: (SCREEN_WIDTH - 32 - 24) / 4, aspectRatio: 4 / 3, borderRadius: 12, borderWidth: 2, borderColor: "rgba(16,185,129,0.5)", borderStyle: "dashed", backgroundColor: "rgba(236,253,245,0.9)", alignItems: "center", justifyContent: "center", padding: 6 },
  thumb360Icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(16,185,129,0.15)", alignItems: "center", justifyContent: "center" },
  thumb360Label: { fontSize: 10, fontWeight: "900", color: "#059669", marginTop: 4 },
  thumb360Sub: { fontSize: 9, fontWeight: "700", color: "rgba(5,150,105,0.7)" },

  body: { padding: 16, gap: 0 },
  titleRow: { flexDirection: "row", gap: 12 },
  title: { color: COLORS.ink, fontSize: 22, fontWeight: "900", lineHeight: 28, fontFamily: FONTS.black },
  addressRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 8 },
  addressIcon: { fontSize: 14, marginTop: 1 },
  addressText: { flex: 1, color: COLORS.muted, fontSize: 13, fontWeight: "500", lineHeight: 18 },
  distanceChip: { alignSelf: "flex-start", marginTop: 8, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  distanceChipText: { color: COLORS.brand, fontSize: 11, fontWeight: "900" },

  specsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16, marginBottom: 8 },
  specBox: { width: (SCREEN_WIDTH - 32 - 10) / 2, backgroundColor: COLORS.card, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  specLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  specVal: { color: COLORS.ink, fontSize: 14, fontWeight: "900", marginTop: 4 },

  sectionBlock: { marginTop: 20, borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 20 },
  sectionHeader: { color: COLORS.ink, fontSize: 16, fontWeight: "900", marginBottom: 10, fontFamily: FONTS.bold },
  descriptionText: { color: "#475569", fontSize: 13, lineHeight: 22, fontWeight: "500" },

  rulesGrid: { gap: 10 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  ruleCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.successSoft, alignItems: "center", justifyContent: "center", marginTop: 1 },
  ruleText: { flex: 1, color: COLORS.ink, fontSize: 13, fontWeight: "600", lineHeight: 18 },
  emptyDashed: { borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 14, padding: 14, backgroundColor: COLORS.card },
  emptyDashedText: { color: COLORS.muted, fontSize: 13, fontWeight: "700", textAlign: "center" },

  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  amenityRow: { width: (SCREEN_WIDTH - 32 - 12) / 2, flexDirection: "row", alignItems: "center", gap: 8 },
  amenityText: { color: COLORS.ink, fontSize: 13, fontWeight: "700" },

  reviewsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  reviewsSubtitle: { color: COLORS.muted, fontSize: 12, fontWeight: "600", marginTop: 2 },
  writeReviewBtn: { backgroundColor: COLORS.ink, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  writeReviewText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  reviewForm: { marginTop: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14 },
  reviewFormTitle: { fontSize: 13, fontWeight: "900", color: COLORS.ink, marginBottom: 8 },
  inputLabel: { fontSize: 11, fontWeight: "800", color: COLORS.muted, marginTop: 8, marginBottom: 6 },
  starsInputRow: { flexDirection: "row", alignItems: "center" },
  reviewInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, fontSize: 13, color: COLORS.ink, minHeight: 90, textAlignVertical: "top", backgroundColor: COLORS.background },
  charCount: { textAlign: "right", fontSize: 10, color: COLORS.muted, marginTop: 4, fontWeight: "700" },
  formError: { color: "#dc2626", fontSize: 11, fontWeight: "700", marginTop: 6 },
  submitReviewBtn: { marginTop: 12, backgroundColor: COLORS.brand, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  submitReviewText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  reviewCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.brandSoft, alignItems: "center", justifyContent: "center" },
  reviewAvatarText: { color: COLORS.brand, fontWeight: "900", fontSize: 12 },
  reviewName: { color: COLORS.ink, fontWeight: "900", fontSize: 13 },
  reviewDate: { color: COLORS.muted, fontSize: 11, fontWeight: "600" },
  reviewComment: { color: "#475569", fontSize: 13, lineHeight: 19, marginTop: 6 },
  emptyReviews: { marginTop: 12, borderWidth: 1, borderStyle: "dashed", borderColor: COLORS.border, borderRadius: 16, padding: 20, alignItems: "center", backgroundColor: COLORS.card },
  emptyReviewsTitle: { color: COLORS.muted, fontWeight: "800", marginTop: 6 },
  emptyReviewsSub: { color: "#94a3b8", fontSize: 11, marginTop: 2 },

  asideCard: { marginTop: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 16, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  asidePrice: { color: COLORS.brand, fontSize: 26, fontWeight: "900", fontFamily: FONTS.black },
  asidePerMonth: { color: COLORS.muted, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  asideIncludes: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.mutedSoft, padding: 10, borderRadius: 14, marginTop: 14 },
  ownerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  ownerAvatarText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  ownerName: { color: COLORS.ink, fontWeight: "900", fontSize: 13 },
  ownerSince: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  verifiedPill: { backgroundColor: COLORS.successSoft, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20, borderWidth: 1, borderColor: "rgba(5,150,105,0.2)" },
  verifiedText: { color: COLORS.success, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  chatOwnerBtn: { marginTop: 14, backgroundColor: COLORS.brand, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  chatOwnerText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  callBtn: { marginTop: 10, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  callBtnText: { color: COLORS.ink, fontWeight: "900", fontSize: 14 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  wishlistBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: COLORS.card },
  wishlistBtnSaved: { backgroundColor: COLORS.brandSoft, borderColor: COLORS.brand },
  wishlistText: { color: COLORS.ink, fontWeight: "900", fontSize: 13 },
  shareBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: COLORS.card },
  shareBtnText: { color: COLORS.ink, fontWeight: "900", fontSize: 13 },
  reportBtn: { marginTop: 10, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  reportText: { color: "#b91c1c", fontWeight: "900", fontSize: 13 },
  inlineError: { marginTop: 10, backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", padding: 10, borderRadius: 12 },
  inlineErrorText: { color: "#92400e", fontSize: 11, fontWeight: "700" },

  mapPlaceholder: { backgroundColor: "#e0f2fe", borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, overflow: "hidden", height: 220 },
  mapPlaceholderInner: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  mapMock: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: COLORS.brand, position: "relative" },
  mapDot: { position: "absolute", bottom: 12, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.brand, borderWidth: 2, borderColor: "#fff" },
  mapPlaceholderTitle: { color: COLORS.ink, fontWeight: "900", fontSize: 14, marginTop: 10 },
  mapPlaceholderAddr: { color: COLORS.muted, fontSize: 12, fontWeight: "600", marginTop: 6, textAlign: "center" },
  mapPinRow: { marginTop: 8, backgroundColor: COLORS.card, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  mapPinText: { color: COLORS.brand, fontSize: 11, fontWeight: "800" },
  mapOverlayHint: { backgroundColor: COLORS.ink, paddingVertical: 8, alignItems: "center" },
  mapOverlayText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  // selectable map list (parity with website MapRoomSelectCard)
  mapSelectCard: { width: 210, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 10, flexDirection: "row", gap: 10, alignItems: "center" },
  mapSelectCardActive: { borderColor: COLORS.ink, borderWidth: 1.5, shadowColor: "#0f172a", shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  mapSelectImage: { width: 58, height: 58, borderRadius: 10, backgroundColor: COLORS.mutedSoft },
  mapSelectTag: { backgroundColor: COLORS.brandSoft, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 10 },
  mapSelectTagText: { fontSize: 9, fontWeight: "900", color: COLORS.brand, textTransform: "uppercase" },
  mapSelectTitle: { fontSize: 11, fontWeight: "900", color: COLORS.ink },
  mapSelectLoc: { fontSize: 10, color: COLORS.muted, fontWeight: "600" },
  mapSelectPrice: { fontSize: 11, fontWeight: "900", color: COLORS.brand, marginTop: 2 },
  openMapsBtn: { marginTop: 10, backgroundColor: COLORS.ink, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  openMapsText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  areaGrid: { flexDirection: "row", gap: 10, marginTop: 12 },
  areaCard: { flex: 1, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14 },
  areaLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  areaValue: { color: COLORS.ink, fontWeight: "900", marginTop: 6, fontSize: 13 },
  areaAddress: { color: "#475569", fontWeight: "700", marginTop: 6, fontSize: 12, lineHeight: 18 },

  essentialsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  essentialCard: { width: (SCREEN_WIDTH - 32 - 10) / 2, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14 },
  essentialType: { color: COLORS.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  essentialName: { color: COLORS.ink, fontWeight: "900", marginTop: 6, fontSize: 13 },
  essentialDist: { color: COLORS.muted, fontSize: 11, marginTop: 4 },

  similarCard: { width: 220, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, overflow: "hidden" },
  similarImage: { width: "100%", height: 120, resizeMode: "cover", backgroundColor: COLORS.mutedSoft },
  similarBody: { padding: 10 },
  similarType: { fontSize: 10, fontWeight: "900", color: COLORS.brand, textTransform: "uppercase" },
  similarTitle: { fontSize: 13, fontWeight: "900", color: COLORS.ink, marginTop: 2 },
  similarLocation: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  similarPrice: { fontSize: 13, fontWeight: "900", color: COLORS.brand, marginTop: 4 },
  similarPerMonth: { fontSize: 10, color: COLORS.muted },

  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: COLORS.card, flexDirection: "row", padding: 12, gap: 10, borderTopWidth: 1, borderColor: COLORS.border },
  bottomChatBtn: { flex: 1, backgroundColor: "#7c3aed", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  bottomChatText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  bottomCallBtn: { flex: 1, backgroundColor: COLORS.brand, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  bottomCallText: { color: "#fff", fontWeight: "900", fontSize: 13 },

  // modal
  modalContainer: { flex: 1, backgroundColor: "#000" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "rgba(15,23,42,0.9)" },
  modalCloseBtn: { backgroundColor: COLORS.card, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14 },
  modalCloseText: { color: COLORS.ink, fontSize: 12, fontWeight: "800" },
  modalTitle: { color: "#fff", fontSize: 12, fontWeight: "800", flex: 1, textAlign: "center", marginHorizontal: 8 },
  modalFullscreenBtn: { backgroundColor: COLORS.brand, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14 },
  modalFullscreenText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  panoTopBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "rgba(0,0,0,0.35)" },
  compassPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(15,23,42,0.85)", borderWidth: 1, borderColor: "rgba(124,58,237,0.4)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  compassNeedle: { width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  compassText: { color: "#a78bfa", fontSize: 12, fontWeight: "900" },
  compassSub: { color: "#64748b", fontSize: 10, fontWeight: "700" },
  autoRotateBtn: { backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  autoRotateText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  panoViewport: { flex: 1, backgroundColor: "#000", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  panoImage: { width: "100%", height: "100%" },
  panoOverlay: { position: "absolute", bottom: 20, left: 16, right: 16, alignItems: "center" },
  panoHintPill: { backgroundColor: "rgba(0,0,0,0.75)", borderWidth: 1, borderColor: "rgba(124,58,237,0.3)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  panoHintText: { color: "#cbd5e1", fontSize: 11, fontWeight: "600" },
  zoomControls: { position: "absolute", right: 12, top: 12, gap: 8 },
  zoomBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(15,23,42,0.85)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  zoomBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  angleSwitcher: { padding: 12, backgroundColor: COLORS.card, borderTopWidth: 1, borderColor: COLORS.border },
  angleTitle: { color: COLORS.muted, fontSize: 11, fontWeight: "800", marginBottom: 8 },
  anglePill: { backgroundColor: COLORS.mutedSoft, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  anglePillActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  angleText: { color: COLORS.muted, fontSize: 11, fontWeight: "700" },
  angleTextActive: { color: "#fff", fontWeight: "900" },
  panoFooterHint: { backgroundColor: "#0f172a", paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" },
  panoFooterText: { color: "#64748b", fontSize: 10, textAlign: "center" } });
