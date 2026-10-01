import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useDispatch, useSelector } from "react-redux";
import Svg, { Path, Polygon, Circle } from "react-native-svg";
import {
  Search,
  ShieldCheck,
  MessageCircle,
  Settings,
  Sparkles,
  Zap,
  Clock,
  IndianRupee,
  Armchair,
  Lock,
  Ban,
  Building,
  Building2,
  GraduationCap,
  BriefcaseBusiness,
  Home as HomeIcon,
  MessageSquare,
  Tag,
  Quote,
  Star,
  ChevronDown,
  ArrowRight,
  SlidersHorizontal,
  MapPin,
} from "lucide-react-native";
import { fetchRooms, setFilter } from "../store/roomsSlice";
import { toggleSaved } from "../store/wishlistSlice";
import { SiteHeader } from "../components/SiteHeader";
import { RoomCard } from "../components/RoomCard";
import { CitySelector } from "../components/CitySelector";
import { CITY_STORAGE_KEY, saveCityToStorage } from "../lib/listingMeta";
import { normalizeRooms } from "../lib/roomAdapter";
import { formatPrice } from "../lib/format";
import { COLORS } from "../theme";

// Optional Inter font – loads if @expo-google-fonts/inter is installed
let useFontsHook = null;
let InterFonts = {};
try {
  const expoFont = require("expo-font");
  useFontsHook = expoFont.useFonts;
  InterFonts = require("@expo-google-fonts/inter");
} catch (_) {}

// Attempt to load Inter; if unavailable, fallback to system font gracefully
function useInterFonts() {
  try {
    if (useFontsHook && InterFonts.Inter_400Regular) {
      const [loaded] = useFontsHook({
        Inter_400Regular: InterFonts.Inter_400Regular,
        Inter_500Medium: InterFonts.Inter_500Medium || InterFonts.Inter_400Regular,
        Inter_700Bold: InterFonts.Inter_700Bold,
        Inter_900Black: InterFonts.Inter_900Black,
      });
      return loaded;
    }
  } catch (_) {}
  return true;
}

// Images – copied from website src/assets
const heroBg = require("../../assets/home/hero-bg.png");
const heroIllustration = require("../../assets/home/hero-illustration.png");
const smartChoicelistImg = require("../../assets/home/smart-choicelist.png");
const forOwnersBannerImg = require("../../assets/home/for-owners-banner.png");
const stepSearchImg = require("../../assets/home/step-search.png");
const stepVerifiedImg = require("../../assets/home/step-verified.png");
const stepConnectImg = require("../../assets/home/step-connect.png");
const fitStudentPgs = require("../../assets/home/fit-student-pgs.png");
const fitWorkingStays = require("../../assets/home/fit-working-stays.png");
const fitPrivateFlats = require("../../assets/home/fit-private-flats.png");
const fitVerifiedLeads = require("../../assets/home/fit-verified-leads.png");

const CITIES = ["Bhopal", "Indore", "Pune", "Bangalore", "Delhi NCR"];
const CATEGORIES = [
  { label: "All", type: "" },
  { label: "Single Room", type: "Single Room" },
  { label: "PG", type: "PG" },
  { label: "Flat", type: "Flat" },
  { label: "Hostel", type: "Hostel" },
  { label: "Shared Room", type: "Shared Room" },
];

const heroSignals = [
  "0% brokerage",
  "Verified rooms",
  "Direct in-app chat",
  "No map clutter",
  "Student friendly",
  "Owner direct",
];

const choicelistStats = [
  { icon: Zap, value: 3, suffix: "x", label: "faster shortlist" },
  { icon: ShieldCheck, value: 0, suffix: "%", label: "brokerage" },
  { icon: Clock, value: 24, suffix: "h", label: "lead window" },
];

const choicelistFeatures = [
  { icon: IndianRupee, title: "Budget fit", body: "Rooms that fit your budget", bg: "#ecfdf5", border: "#a7f3d0", color: "#059669" },
  { icon: ShieldCheck, title: "Verified owner", body: "Only identity-verified owners", bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb" },
  { icon: MessageCircle, title: "Direct in-app chat", body: "Chat or connect directly with owners", bg: "#faf5ff", border: "#e9d5ff", color: "#7c3aed" },
  { icon: Armchair, title: "Amenities match", body: "Find rooms with must-have amenities", bg: "#fffbeb", border: "#fde68a", color: "#d97706" },
  { icon: Lock, title: "Privacy choice", body: "Choose what to share, stay in control", bg: "#f0fdfa", border: "#99f6e4", color: "#0d9488" },
  { icon: Ban, title: "No brokerage", body: "Deal directly. Save extra charges", bg: "#fff1f2", border: "#fecdd3", color: "#e11d48" },
];

const discoveryCards = [
  { icon: GraduationCap, img: fitStudentPgs, title: "Student PGs", body: "Budget rooms near colleges, coaching hubs, and libraries.", meta: "Girls, boys, and co-ed options", iconBg: "#ecfdf5", iconColor: "#059669" },
  { icon: BriefcaseBusiness, img: fitWorkingStays, title: "Working stays", body: "Quiet rooms near offices with commute-friendly locations.", meta: "WiFi, parking, and furnished filters", iconBg: "#eff6ff", iconColor: "#2563eb" },
  { icon: Building2, img: fitPrivateFlats, title: "Private flats", body: "Independent rooms and 1BHK flats for more privacy.", meta: "Direct owner contact", iconBg: "#ede9fe", iconColor: COLORS.brand },
  { icon: ShieldCheck, img: fitVerifiedLeads, title: "Verified leads", body: "Cleaner listings with report controls and owner checks.", meta: "No brokerage pressure", iconBg: "#fffbeb", iconColor: "#d97706" },
];

const testimonials = [
  {
    name: "Ananya Sharma",
    role: "Student, IIIT Bhopal",
    avatar: "AS",
    rating: 5,
    text: "I was nervous moving to a new city for college. RoomsFind made finding a PG near campus super easy — no brokers, no fake listings. I moved in within 3 days of landing.",
    tag: "Tenant",
  },
  {
    name: "Vikram Mehta",
    role: "Software Engineer, Pune",
    avatar: "VM",
    rating: 5,
    text: "Switched jobs and needed a flat in Pune fast. The instant in-app chat feature is a lifesaver — directly spoke to owners, saw the place, and closed the deal in one weekend.",
    tag: "Tenant",
  },
  {
    name: "Priya Patel",
    role: "Owner, Bhopal",
    avatar: "PP",
    rating: 5,
    text: "Listed my two PGs and got genuine leads within hours. No more dealing with time-wasting brokers. The tenants I got were all verified professionals. Highly recommend!",
    tag: "Owner",
  },
  {
    name: "Rohit Singh",
    role: "Designer, Remote",
    avatar: "RS",
    rating: 5,
    text: "RoomsFind is the first platform that actually understood what migrants need. The filters are spot-on, listings are genuine, and the whole experience feels built for us.",
    tag: "Tenant",
  },
];

const faqs = [
  { q: "Is RoomsFind free for tenants?", a: "Yes, completely free. Tenants can browse, shortlist, and connect with owners without paying anything. No hidden charges, no subscription fees — ever." },
  { q: "How do I list my property?", a: 'Click the "List Property" button on our home page or sign up as an owner. Fill in details about your property — location, rent, photos, amenities — and publish it in under 2 minutes. Our team reviews it within a few hours.' },
  { q: "Can I switch from tenant to owner?", a: "Absolutely. One account works for both roles. Just head to your dashboard and you can list a property right away — no need to create a separate account." },
  { q: "What cities does RoomsFind cover?", a: "We currently operate across almost every city in India including Bhopal, Pune, Bangalore, Hyderabad, Delhi-NCR, Indore, Mumbai, Chennai, and more. New cities are added every month." },
  { q: "How do I contact the owner?", a: "Once you find a listing you like, use the direct in-app chat. You'll be connected directly with the property owner to discuss details, schedule a visit, or close the deal." },
  { q: "Can I schedule a visit before paying?", a: "Yes. You can request a visit directly from the listing page. The owner gets notified and can confirm a time. No payment is needed to visit a property." },
  { q: "Is my personal information safe?", a: "We take privacy seriously. Your contact details are never shared publicly. Conversations happen through our platform, and you control what information you share with owners." },
  { q: "What documents do I need to rent?", a: "Most owners ask for basic ID proof (Aadhaar, PAN, or Passport), along with a rental agreement. Some may request a security deposit equivalent to 1–2 months of rent." },
];

// AnimatedCounter – RN equivalent of website AnimatedCounter.jsx (900ms easeOutCubic)
function AnimatedCounter({ value, suffix = "", style }) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef(null);
  useEffect(() => {
    let frameId;
    const startedAt = Date.now();
    const duration = 900;
    function tick() {
      const progress = Math.min((Date.now() - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value]);
  return <Text style={style}>{display.toLocaleString("en-IN")}{suffix}</Text>;
}

// ShinyText – RN approximation: brand color with pulsing opacity shimmer
function ShinyText({ text, style }) {
  const opacity = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.7, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.Text style={[style, { opacity, color: COLORS.brand }]}>{text}</Animated.Text>
  );
}

const budgetOptions = [
  { label: "Any Budget", value: "" },
  { label: "Under ₹5,000", value: "5000" },
  { label: "₹5k - ₹10k", value: "10000" },
  { label: "₹10k - ₹20k", value: "20000" },
];

export default function HomeScreen({ navigation }) {
  const fontsLoaded = useInterFonts();
  const dispatch = useDispatch();
  const { items: rooms, loading, filters } = useSelector((state) => state.rooms);
  const savedIds = useSelector((state) => state.wishlist.savedIds);

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [budget, setBudget] = useState("");
  const [budgetModal, setBudgetModal] = useState(false);
  const [citySelectorVisible, setCitySelectorVisible] = useState(false);
  const [openedFaq, setOpenedFaq] = useState(null);

  const selectedCity = filters.city || "Bhopal";
  const selectedCityLabel = selectedCity || "any city";
  const listingsTitle = selectedCity ? `Rooms in ${selectedCity}` : "Rooms matching your move";
  const listingsSubtitle = selectedCity ? `Showing rooms around ${selectedCity}` : "Search by city, area, landmark, title, or owner-posted address";
  const normalizedRooms = useMemo(() => normalizeRooms(rooms || []), [rooms]);
  const previewRooms = normalizedRooms.slice(0, 3);

  useEffect(() => {
    dispatch(fetchRooms(filters));
  }, [dispatch, filters]);

  // Persist city to storage whenever it changes (unified via lib/listingMeta)
  useEffect(() => {
    if (selectedCity) saveCityToStorage(selectedCity);
  }, [selectedCity]);

  function onRefresh() {
    setRefreshing(true);
    dispatch(fetchRooms(filters)).finally(() => setRefreshing(false));
  }

  function handleCitySelect(city) {
    dispatch(setFilter({ city }));
  }

  function handleCategorySelect(type) {
    dispatch(setFilter({ roomType: type }));
  }

  function handleSearchSubmit() {
    const params = {};
    if (searchQuery.trim()) params.query = searchQuery.trim();
    if (budget) params.priceMax = budget;
    dispatch(setFilter(params));
    navigation.navigate("Find");
  }

  const featuredPanoRooms = normalizedRooms.filter((r) => Array.isArray(r.panoramaUrls) && r.panoramaUrls.length > 0);

  // font family helper
  const fontFamily = (weight) => {
    if (!fontsLoaded) return undefined;
    try {
      if (weight === "900" && InterFonts.Inter_900Black) return "Inter_900Black";
      if (weight === "700" && InterFonts.Inter_700Bold) return "Inter_700Bold";
      if (weight === "500" && InterFonts.Inter_500Medium) return "Inter_500Medium";
      return "Inter_400Regular";
    } catch (_) { return undefined; }
  };

  if (fontsLoaded === false) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator color={COLORS.brand} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <SiteHeader
        city={selectedCity}
        onCityPress={() => setCitySelectorVisible(true)}
        onProfilePress={() => navigation.navigate("Profile")}
      />
      <CitySelector
        visible={citySelectorVisible}
        selectedCity={selectedCity}
        onClose={() => setCitySelectorVisible(false)}
        onSelect={(city) => {
          setCitySelectorVisible(false);
          if (city === "__locate__") {
            handleCitySelect("Bhopal");
          } else {
            handleCitySelect(city);
          }
        }}
      />

      {/* Budget picker modal */}
      <Modal visible={budgetModal} transparent animationType="fade" onRequestClose={() => setBudgetModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBudgetModal(false)}>
          <View style={styles.budgetModal}>
            {budgetOptions.map((opt) => (
              <TouchableOpacity key={opt.label} style={[styles.budgetOption, budget === opt.value && styles.budgetOptionActive]} onPress={() => { setBudget(opt.value); setBudgetModal(false); }}>
                <Text style={[styles.budgetOptionText, budget === opt.value && styles.budgetOptionTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
      >
        {/* ── HERO SECTION ── */}
        <View style={styles.heroSection}>
          {/* hero bg ambient */}
          <Image source={heroBg} style={styles.heroBg} resizeMode="cover" />
          <View style={styles.heroFade} />
          <View style={styles.heroContent}>
            {/* Badge */}
            <View style={styles.heroBadge}>
              <View style={styles.heroBadgeDot} />
              <Text style={styles.heroBadgeText}>Verified Student & Working Professional Stays</Text>
            </View>

            {/* Title with ShinyText */}
            <Text style={[styles.heroTitle, { fontFamily: fontFamily("900") }]}>
              Your perfect room in{" "}
              <ShinyText text={`${selectedCityLabel}.`} style={[styles.heroTitleShiny, { fontFamily: fontFamily("900") }]} />
            </Text>

            <Text style={styles.heroSubtitle}>
              The smartest way for students and migrants to find PGs, flats, and private rooms near colleges or offices. Zero brokerage, direct owner contact.
            </Text>

            {/* Pill search bar – matches website rounded-full with input + budget + Search */}
            <View style={styles.heroSearchPill}>
              <View style={styles.heroSearchInputRow}>
                <Search size={16} color="#94a3b8" />
                <TextInput
                  style={styles.heroSearchInput}
                  placeholder="Search PG, hostel, flat, WiFi"
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
                />
              </View>
              <View style={styles.heroDivider} />
              <TouchableOpacity style={styles.heroBudgetBtn} onPress={() => setBudgetModal(true)}>
                <Text style={styles.heroBudgetText}>{budgetOptions.find((o) => o.value === budget)?.label || "Any Budget"}</Text>
                <ChevronDown size={14} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroSearchBtn} onPress={handleSearchSubmit}>
                <Search size={14} color="#fff" />
                <Text style={styles.heroSearchBtnText}>Search</Text>
              </TouchableOpacity>
            </View>

            {/* heroSignals pills */}
            <View style={styles.signalRow}>
              {heroSignals.map((signal) => (
                <View key={signal} style={styles.signalPill}>
                  <View style={styles.signalDot} />
                  <Text style={styles.signalText}>{signal}</Text>
                </View>
              ))}
            </View>

            {/* Hero illustration card with floating badges */}
            <View style={styles.heroIllustrationCard}>
              <Image source={heroIllustration} style={styles.heroIllustrationImg} resizeMode="cover" />
              {/* Top-right 100% Verified */}
              <View style={styles.floatingBadgeTop}>
                <ShieldCheck size={14} color="#059669" />
                <Text style={styles.floatingBadgeTopText}>100% Verified</Text>
              </View>
              {/* Bottom-left Direct Owner Chat */}
              <View style={styles.floatingBadgeBottom}>
                <View style={styles.floatingBadgeBottomIcon}>
                  <MessageCircle size={14} color="#fff" />
                </View>
                <View>
                  <Text style={styles.floatingBadgeBottomTitle}>Direct Owner Chat</Text>
                  <Text style={styles.floatingBadgeBottomSub}>Zero Broker Fee</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── City Filter Pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityRow}
        >
          {CITIES.map((city) => {
            const isSelected = selectedCity.toLowerCase() === city.toLowerCase();
            return (
              <TouchableOpacity
                key={city}
                style={[styles.cityPill, isSelected && styles.cityPillActive]}
                onPress={() => handleCitySelect(city)}
              >
                <View style={{flexDirection:"row", alignItems:"center", gap:4}}>
                  <MapPin size={10} color={isSelected ? "#fff" : "#475569"} />
                  <Text style={[styles.cityPillText, isSelected && styles.cityPillTextActive]}>{city}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── 360 Virtual Tour Banner / Featured Carousel ── */}
        {featuredPanoRooms.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.rowAlign}>
                <View style={styles.pulseDot} />
                <Text style={[styles.sectionTitle, { fontFamily: fontFamily("700") }]}>360° Virtual Tours</Text>
              </View>
              <Text style={styles.sectionSub}>Full-sphere walkthroughs</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {featuredPanoRooms.map((room) => (
                <TouchableOpacity
                  key={String(room.slug || room.id || room._id)}
                  style={styles.featuredCard}
                  onPress={() =>
                    navigation.navigate("RoomDetails", {
                      slug: room.slug || room.id,
                      room })
                  }
                >
                  <Image
                    source={{ uri: room.images?.[0] || room.coverImage || "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80" }}
                    style={styles.featuredImage}
                  />
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>360° TOUR</Text>
                  </View>
                  <View style={styles.featuredOverlay}>
                    <Text style={styles.featuredTitle} numberOfLines={1}>
                      {room.title}
                    </Text>
                    <Text style={styles.featuredPrice}>
                      {formatPrice(room.price)}/mo
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Categories Grid ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: fontFamily("900") }]}>Browse by Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const isActive = (filters.roomType || "") === cat.type;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[styles.categoryCard, isActive && styles.categoryCardActive]}
                  onPress={() => handleCategorySelect(cat.type)}
                >
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Listings Feed – preview 3 like website ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { fontFamily: fontFamily("900") }]}>{listingsTitle}</Text>
              <Text style={styles.sectionSubSmall}>{listingsSubtitle}</Text>
            </View>
          </View>
          <View style={styles.linkRow}>
            <TouchableOpacity style={styles.filterBtn} onPress={() => navigation.navigate("Find")}>
              <SlidersHorizontal size={14} color={COLORS.ink} />
              <Text style={styles.filterBtnText}>Filter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.seeAllBtn} onPress={() => navigation.navigate("Find")}>
              <Text style={styles.seeAllBtnText}>See all</Text>
              <ArrowRight size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading && rooms.length === 0 ? (
            <ActivityIndicator size="large" color={COLORS.brand} style={{ marginTop: 24 }} />
          ) : (
            (previewRooms.length ? previewRooms : rooms.slice(0,3)).map((room) => {
              const id = String(room.slug || room.id || room._id);
              const isSaved = savedIds.includes(id);
              return (
                <RoomCard
                  key={id}
                  room={room}
                  saved={isSaved}
                  onPress={() => navigation.navigate("RoomDetails", { slug: room.slug || room.id, room })}
                  onToggleSave={() => dispatch(toggleSaved(id))}
                  onChat={() => navigation.navigate("Chat", { roomId: room.slug || room.id })}
                  onShare={() => {}}
                />
              );
            })
          )}
          {previewRooms.length === 0 && rooms.length === 0 && !loading && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{selectedCity ? `No rooms available in ${selectedCity} yet` : "No rooms available yet"}</Text>
            </View>
          )}
        </View>

        {/* ── How it Works ── */}
        <View style={styles.sectionLarge}>
          <View style={styles.centerHeader}>
            <View style={styles.badgeOutline}>
              <Settings size={12} color={COLORS.brand} />
              <Text style={styles.badgeOutlineText}>How it Works</Text>
            </View>
            <Text style={[styles.howTitle, { fontFamily: fontFamily("900") }]}>
              Find or list a room in <Text style={{ color: COLORS.brand }}>three simple steps.</Text>
            </Text>
            <Text style={styles.howSubtitle}>
              Search by keyword, compare verified listings, and connect directly with owners. <Text style={{ fontWeight: "900", color: COLORS.ink }}>No brokers. No spam.</Text>
            </Text>
          </View>

          <View style={styles.stepsGrid}>
            {[
              { num: 1, img: stepSearchImg, title: "Search by keyword", body: "Type any city, area, college, office, or landmark keyword and compare matching rooms." },
              { num: 2, img: stepVerifiedImg, title: "Verified listings", body: "Every owner is identity-verified. Filter by gender, budget, amenities and room type." },
              { num: 3, img: stepConnectImg, title: "Connect directly", body: "Chat directly in-app or call. Visit, finalize and move in with no middleman." },
            ].map((card) => (
              <View key={card.title} style={styles.stepCard}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{card.num}</Text></View>
                <View style={styles.stepImgWrap}>
                  <Image source={card.img} style={styles.stepImg} resizeMode="cover" />
                </View>
                <View style={styles.stepBody}>
                  <Text style={[styles.stepTitle, { fontFamily: fontFamily("900") }]}>{card.title}</Text>
                  <Text style={styles.stepText}>{card.body}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.primaryCta} onPress={() => navigation.navigate("Find")}>
              <Search size={14} color="#fff" />
              <Text style={styles.primaryCtaText}>Browse rooms</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryCta} onPress={() => navigation.navigate("Find")}>
              <HomeIcon size={14} color={COLORS.brand} />
              <Text style={styles.secondaryCtaText}>List your room</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Find your fit ── */}
        <View style={styles.sectionLarge}>
          <View style={styles.centerHeader}>
            <View style={styles.badgeOutline}>
              <Settings size={12} color={COLORS.brand} />
              <Text style={styles.badgeOutlineText}>Find your fit</Text>
            </View>
            <Text style={[styles.howTitle, { fontFamily: fontFamily("900") }]}>
              Start with the stay type that <Text style={{ color: COLORS.brand }}>matches your move.</Text>
            </Text>
            <Text style={styles.howSubtitle}>
              Whether you're joining college, starting a job, or shifting cities — <Text style={{ color: COLORS.brand, fontWeight: "900" }}>RoomsFind</Text> keeps the first decision simple.
            </Text>
          </View>

          <View style={styles.fitGrid}>
            {discoveryCards.map((card) => (
              <View key={card.title} style={styles.fitCard}>
                <View style={styles.fitImgWrap}>
                  <Image source={card.img} style={styles.fitImg} resizeMode="cover" />
                </View>
                <View style={{ padding: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <View style={[styles.fitIcon, { backgroundColor: card.iconBg }]}>
                      <card.icon size={16} color={card.iconColor} />
                    </View>
                    <Text style={[styles.fitTitle, { fontFamily: fontFamily("900") }]}>{card.title}</Text>
                  </View>
                  <Text style={styles.fitBody}>{card.body}</Text>
                  <View style={styles.fitDivider} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[styles.checkCircle, { backgroundColor: card.iconBg }]}><Text style={{ fontSize: 9, color: card.iconColor }}>✓</Text></View>
                    <Text style={styles.fitMeta}>{card.meta}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Smart Choicelist ── */}
        <View style={styles.sectionLarge}>
          <View style={styles.centerHeader}>
            <View style={[styles.badgeOutline, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
              <Sparkles size={12} color="#2563eb" />
              <Text style={[styles.badgeOutlineText, { color: "#2563eb" }]}>Smart Choicelist</Text>
            </View>
            <Text style={[styles.howTitle, { fontFamily: fontFamily("900") }]}>
              Choose rooms with <Text style={{ color: "#2563eb" }}>cleaner match signals.</Text>
            </Text>
            <Text style={styles.howSubtitle}>Compare rent, trust, amenities, and owner contact in one calm flow before you spend time calling or visiting.</Text>
          </View>

          {/* Illustration + 3 stats */}
          <View style={styles.choiceTopRow}>
            <View style={styles.choiceImgCard}>
              <Image source={smartChoicelistImg} style={styles.choiceImg} resizeMode="cover" />
            </View>
            <View style={styles.choiceStatsCol}>
              {choicelistStats.map((stat) => (
                <View key={stat.label} style={styles.choiceStatCard}>
                  <View style={styles.choiceStatIcon}>
                    <stat.icon size={18} color="#2563eb" />
                  </View>
                  <View>
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} style={styles.choiceStatValue} />
                    <Text style={styles.choiceStatLabel}>{stat.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* 6 feature pills in white container */}
          <View style={styles.choicePillsBox}>
            <View style={styles.choicePillsGrid}>
              {choicelistFeatures.map((feat) => (
                <View key={feat.title} style={styles.choicePillItem}>
                  <View style={[styles.choicePillIcon, { backgroundColor: feat.bg, borderColor: feat.border }]}>
                    <feat.icon size={18} color={feat.color} />
                  </View>
                  <Text style={[styles.choicePillTitle, { fontFamily: fontFamily("700") }]}>{feat.title}</Text>
                  <Text style={styles.choicePillBody}>{feat.body}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── For Owners ── */}
        <View style={styles.forOwnersOuter}>
          <View style={styles.forOwnersCard}>
            {/* dot grid decoration */}
            <View style={styles.dotGrid}>
              {Array.from({ length: 24 }).map((_, i) => (
                <View key={i} style={styles.dot} />
              ))}
            </View>
            {/* ambient circle */}
            <View style={styles.forOwnersAmbient} />

            <View>
              <View style={styles.forOwnersBadge}>
                <HomeIcon size={12} color="#2563eb" />
                <Text style={styles.forOwnersBadgeText}>For Owners</Text>
              </View>
              <Text style={[styles.forOwnersTitle, { fontFamily: fontFamily("900") }]}>
                Empty room?{"\n"}Earn upto <Text style={{ color: "#2563eb" }}>₹15,000/mo.</Text>
              </Text>
              <Text style={styles.forOwnersSub}>List your PG, flat or single room in 2 minutes. Get verified leads from real tenants and working professionals.</Text>

              <View style={{ gap: 12, marginTop: 16 }}>
                {[
                  { icon: ShieldCheck, text: "Verified tenants only" },
                  { icon: MessageSquare, text: "Direct in-app chat" },
                  { icon: Tag, text: "Free listing — zero cost" },
                ].map((item) => (
                  <View key={item.text} style={styles.forOwnersFeature}>
                    <View style={styles.forOwnersFeatureIcon}>
                      <item.icon size={16} color="#2563eb" />
                    </View>
                    <Text style={styles.forOwnersFeatureText}>{item.text}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.forOwnersCta} onPress={() => navigation.navigate("Find")}>
                <Text style={styles.forOwnersCtaText}>List Property — It's Free</Text>
                <View style={styles.forOwnersCtaArrow}><ArrowRight size={14} color="#2563eb" /></View>
              </TouchableOpacity>
            </View>

            {/* Bedroom image with dotted arc + floating badge */}
            <View style={styles.forOwnersImageWrap}>
              {/* dotted arc SVG */}
              <Svg width={120} height={100} viewBox="0 0 160 160" style={styles.forOwnersArc}>
                <Path d="M 28 130 A 62 62 0 1 1 126 44" stroke="#2563eb" strokeWidth={2.2} strokeDasharray="5 5" fill="none" />
                <Polygon points="120,50 136,40 124,28" fill="#2563eb" />
              </Svg>
              {/* floating badge */}
              <View style={styles.forOwnersFloatBadge}>
                <View style={styles.forOwnersFloatIcon}>
                  <HomeIcon size={16} color="#fff" />
                </View>
                <View>
                  <Text style={styles.forOwnersFloatTitle}>List in 2 Minutes</Text>
                  <Text style={styles.forOwnersFloatSub}>Reach thousands of verified tenants</Text>
                </View>
              </View>
              <Image source={forOwnersBannerImg} style={styles.forOwnersImg} resizeMode="contain" />
            </View>

            {/* Bottom stats & quote */}
            <View style={styles.forOwnersBottom}>
              <View style={styles.forOwnersStat}>
                <View style={styles.forOwnersStatIcon}><Building size={18} color="#2563eb" /></View>
                <View>
                  <Text style={styles.forOwnersStatValue}>15k+</Text>
                  <Text style={styles.forOwnersStatLabel}>Verified rooms across{"\n"}24 Indian cities</Text>
                </View>
              </View>
              <View style={styles.forOwnersDivider} />
              <View style={styles.forOwnersStat}>
                <View style={styles.forOwnersStatIcon}><ShieldCheck size={18} color="#2563eb" /></View>
                <View>
                  <Text style={styles.forOwnersStatValue}>0%</Text>
                  <Text style={styles.forOwnersStatLabel}>Brokerage.{"\n"}Forever.</Text>
                </View>
              </View>
              <View style={styles.forOwnersDivider} />
              <View style={styles.forOwnersQuote}>
                <Quote size={18} color="#2563eb" fill="rgba(37,99,235,0.15)" style={{ transform: [{ rotate: "180deg" }] }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.forOwnersQuoteText}>“Listed my room on RoomsFind and got 3 genuine leads in 24 hours.”</Text>
                  <Text style={styles.forOwnersQuoteAuthor}>— Rajesh, Bhopal</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Testimonials ── */}
        <View style={styles.sectionLarge}>
          <View style={styles.testiHeader}>
            <View>
              <View style={[styles.badgeOutline, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
                <View style={styles.blueDotSmall} />
                <Text style={[styles.badgeOutlineText, { color: "#2563eb" }]}>Real Stories</Text>
              </View>
              <Text style={[styles.testiTitle, { fontFamily: fontFamily("900") }]}>
                Loved by <Text style={{ color: "#2563eb" }}>tenants & owners</Text>
              </Text>
            </View>
            <Text style={styles.testiSubtitle}>Real experiences from people who found their perfect stay on RoomsFind.</Text>
          </View>

          <View style={{ gap: 12 }}>
            {testimonials.map((review) => (
              <View key={review.name} style={styles.testiCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={styles.testiAvatar}><Text style={styles.testiAvatarText}>{review.avatar}</Text></View>
                    <View>
                      <Text style={[styles.testiName, { fontFamily: fontFamily("700") }]}>{review.name}</Text>
                      <Text style={styles.testiRole}>{review.role}</Text>
                    </View>
                  </View>
                  <View style={styles.testiTag}><Text style={styles.testiTagText}>{review.tag}</Text></View>
                </View>
                <View style={{ flexDirection: "row", gap: 2, marginBottom: 8 }}>
                  {Array.from({ length: review.rating }).map((_, s) => (
                    <Star key={s} size={12} color="#f59e0b" fill="#f59e0b" />
                  ))}
                </View>
                <Text style={styles.testiText}>"{review.text}"</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── FAQ Accordion ── */}
        <View style={styles.sectionLarge}>
          <View style={styles.centerHeader}>
            <View style={[styles.badgeOutline, { backgroundColor: "#ede9fe", borderColor: "rgba(124,58,237,0.2)" }]}>
              <View style={[styles.blueDotSmall, { backgroundColor: COLORS.brand }]} />
              <Text style={[styles.badgeOutlineText, { color: COLORS.brand }]}>Got questions?</Text>
            </View>
            <Text style={[styles.howTitle, { fontFamily: fontFamily("900") }]}>
              Frequently asked <Text style={{ color: COLORS.brand }}>questions</Text>
            </Text>
            <Text style={styles.howSubtitle}>Everything you need to know about renting with RoomsFind.</Text>
          </View>

          <View style={{ gap: 10 }}>
            {faqs.map((faq, i) => {
              const open = openedFaq === i;
              return (
                <View key={faq.q} style={styles.faqCard}>
                  <TouchableOpacity style={styles.faqHeader} onPress={() => setOpenedFaq(open ? null : i)}>
                    <Text style={[styles.faqQuestion, { fontFamily: fontFamily("700") }]}>{faq.q}</Text>
                    <View style={[styles.faqChevron, open && styles.faqChevronOpen]}>
                      <ChevronDown size={14} color={open ? COLORS.brand : "#64748b"} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
                    </View>
                  </TouchableOpacity>
                  {open && (
                    <View style={styles.faqAnswerWrap}>
                      <Text style={styles.faqAnswer}>{faq.a}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Pre-Footer CTA Banner ── */}
        <View style={styles.ctaBannerOuter}>
          <View style={styles.ctaBanner}>
            <View style={styles.ctaBannerGlow1} />
            <View style={styles.ctaBannerGlow2} />
            <View style={styles.ctaBannerBadge}>
              <Sparkles size={12} color="#bfdbfe" />
              <Text style={styles.ctaBannerBadgeText}>Start Your Search Today</Text>
            </View>
            <Text style={[styles.ctaBannerTitle, { fontFamily: fontFamily("900") }]}>Find your next stay without paying brokerage fees.</Text>
            <Text style={styles.ctaBannerSub}>Browse verified rooms across 24 Indian cities or list your empty room in just 2 minutes.</Text>
            <View style={styles.ctaBannerBtns}>
              <TouchableOpacity style={styles.ctaBannerPrimary} onPress={() => navigation.navigate("Find")}>
                <Search size={14} color="#2563eb" />
                <Text style={styles.ctaBannerPrimaryText}>Explore Rooms</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctaBannerSecondary} onPress={() => navigation.navigate("Find")}>
                <HomeIcon size={14} color="#fff" />
                <Text style={styles.ctaBannerSecondaryText}>List Property Free</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Mini Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerBrandRow}>
            <View style={styles.footerLogo}>
              <MapPin size={16} color="#fff" />
            </View>
            <Text style={styles.footerBrand}>RoomsFind</Text>
          </View>
          <Text style={styles.footerDesc}>India's dedicated room and PG discovery platform. Direct tenant-to-owner connections, verified profiles, zero brokerage, and direct in-app chat.</Text>
          <Text style={styles.footerCopy}>© 2026 RoomsFind India Pvt. Ltd. All rights reserved.</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  // Hero
  heroSection: { position: "relative", overflow: "hidden", backgroundColor: "#ffffff", paddingBottom: 20 },
  heroBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", opacity: 0.9 },
  heroFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 80, backgroundColor: "rgba(248,250,252,0.95)" },
  heroContent: { paddingHorizontal: 16, paddingTop: 20 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(124,58,237,0.2)", backgroundColor: "rgba(237,233,254,0.9)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.brand },
  heroBadgeText: { fontSize: 11, fontWeight: "800", color: COLORS.brand },
  heroTitle: { marginTop: 14, fontSize: 30, fontWeight: "900", color: COLORS.ink, lineHeight: 34, letterSpacing: -0.5 },
  heroTitleShiny: { fontSize: 30, fontWeight: "900" },
  heroSubtitle: { marginTop: 10, fontSize: 14, fontWeight: "500", color: "#475569", lineHeight: 22 },
  heroSearchPill: { marginTop: 18, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 28, padding: 6, shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4 },
  heroSearchInputRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10 },
  heroSearchInput: { flex: 1, fontSize: 13, fontWeight: "800", color: COLORS.ink, paddingVertical: 6 },
  heroDivider: { width: 1, height: 22, backgroundColor: "#e2e8f0", marginHorizontal: 4 },
  heroBudgetBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  heroBudgetText: { fontSize: 11, fontWeight: "800", color: "#475569" },
  heroSearchBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.brand, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  heroSearchBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  signalRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  signalPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  signalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.brand },
  signalText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  heroIllustrationCard: { marginTop: 20, borderRadius: 28, overflow: "hidden", borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff", position: "relative", height: 220 },
  heroIllustrationImg: { width: "100%", height: "100%" },
  floatingBadgeTop: { position: "absolute", top: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: "#e2e8f0", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  floatingBadgeTopText: { fontSize: 11, fontWeight: "900", color: COLORS.ink },
  floatingBadgeBottom: { position: "absolute", bottom: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: "#e2e8f0", padding: 8, paddingRight: 14, borderRadius: 16 },
  floatingBadgeBottomIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  floatingBadgeBottomTitle: { fontSize: 11, fontWeight: "900", color: COLORS.ink },
  floatingBadgeBottomSub: { fontSize: 10, fontWeight: "700", color: "#64748b" },

  cityRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  cityPill: { backgroundColor: "#f1f5f9", paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  cityPillActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  cityPillText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  cityPillTextActive: { color: "#ffffff", fontWeight: "900" },

  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionLarge: { marginTop: 28, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  rowAlign: { flexDirection: "row", alignItems: "center", gap: 6 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.brand },
  sectionTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "900" },
  sectionSub: { color: COLORS.brand, fontSize: 11, fontWeight: "700" },
  sectionSubSmall: { color: "#64748b", fontSize: 12, fontWeight: "500", marginTop: 2 },
  linkRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  filterBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  filterBtnText: { fontSize: 12, fontWeight: "900", color: COLORS.ink },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.ink, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  seeAllBtnText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  emptyBox: { borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" },
  emptyText: { fontWeight: "900", color: COLORS.ink },

  featuredRow: { gap: 12, paddingBottom: 4 },
  featuredCard: { width: 240, height: 140, borderRadius: 16, overflow: "hidden", position: "relative", borderWidth: 1, borderColor: COLORS.border },
  featuredImage: { width: "100%", height: "100%", resizeMode: "cover" },
  featuredBadge: { position: "absolute", top: 10, left: 10, backgroundColor: "#ede9fe", borderWidth: 1, borderColor: COLORS.brand, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  featuredBadgeText: { color: COLORS.brand, fontSize: 9, fontWeight: "900" },
  featuredOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.65)", padding: 10 },
  featuredTitle: { color: "#ffffff", fontSize: 13, fontWeight: "800" },
  featuredPrice: { color: "#38bdf8", fontSize: 12, fontWeight: "800", marginTop: 2 },

  categoryRow: { gap: 8, marginTop: 10 },
  categoryCard: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
  categoryCardActive: { borderColor: COLORS.brand, backgroundColor: "#ede9fe" },
  categoryText: { color: "#94a3b8", fontSize: 12, fontWeight: "700" },
  categoryTextActive: { color: COLORS.brand, fontWeight: "900" },

  centerHeader: { alignItems: "center", marginBottom: 18 },
  badgeOutline: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "rgba(124,58,237,0.2)", backgroundColor: "rgba(237,233,254,0.6)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  badgeOutlineText: { fontSize: 11, fontWeight: "900", color: COLORS.brand, textTransform: "uppercase", letterSpacing: 0.5 },
  howTitle: { marginTop: 12, fontSize: 22, fontWeight: "900", color: COLORS.ink, textAlign: "center", lineHeight: 28 },
  howSubtitle: { marginTop: 8, fontSize: 13, fontWeight: "500", color: "#64748b", textAlign: "center", lineHeight: 20, maxWidth: 340 },

  stepsGrid: { gap: 16 },
  stepCard: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden", paddingBottom: 16, position: "relative" },
  stepBadge: { position: "absolute", top: 8, left: "50%", marginLeft: -16, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center", zIndex: 1 },
  stepBadgeText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  stepImgWrap: { height: 150, backgroundColor: "#f8fafc" },
  stepImg: { width: "100%", height: "100%" },
  stepBody: { paddingHorizontal: 16, paddingTop: 14, alignItems: "center" },
  stepTitle: { fontSize: 14, fontWeight: "900", color: COLORS.ink, textAlign: "center" },
  stepText: { marginTop: 6, fontSize: 12, fontWeight: "500", color: "#64748b", textAlign: "center", lineHeight: 18 },

  ctaRow: { flexDirection: "row", gap: 10, marginTop: 18, justifyContent: "center" },
  primaryCta: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.brand, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24 },
  primaryCtaText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  secondaryCta: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(124,58,237,0.2)", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24 },
  secondaryCtaText: { color: COLORS.brand, fontWeight: "900", fontSize: 13 },

  fitGrid: { gap: 12 },
  fitCard: { backgroundColor: "#fff", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  fitImgWrap: { height: 130, backgroundColor: "#f8fafc" },
  fitImg: { width: "100%", height: "100%" },
  fitIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  fitTitle: { fontSize: 14, fontWeight: "900", color: COLORS.ink },
  fitBody: { fontSize: 12, fontWeight: "500", color: "#64748b", lineHeight: 18 },
  fitDivider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 10 },
  checkCircle: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  fitMeta: { fontSize: 11, fontWeight: "700", color: "#64748b" },

  choiceTopRow: { gap: 12 },
  choiceImgCard: { borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "#bfdbfe", backgroundColor: "#eff6ff", height: 200 },
  choiceImg: { width: "100%", height: "100%" },
  choiceStatsCol: { gap: 10 },
  choiceStatCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 14 },
  choiceStatIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", alignItems: "center", justifyContent: "center" },
  choiceStatValue: { fontSize: 22, fontWeight: "900", color: "#2563eb" },
  choiceStatLabel: { fontSize: 11, fontWeight: "700", color: "#64748b", marginTop: 2 },
  choicePillsBox: { marginTop: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 20, padding: 16 },
  choicePillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "space-between" },
  choicePillItem: { width: "30%", alignItems: "center", minWidth: 90 },
  choicePillIcon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  choicePillTitle: { fontSize: 11, fontWeight: "900", color: COLORS.ink, textAlign: "center" },
  choicePillBody: { fontSize: 10, fontWeight: "500", color: "#64748b", textAlign: "center", marginTop: 2, lineHeight: 14 },

  forOwnersOuter: { paddingHorizontal: 16, marginTop: 28 },
  forOwnersCard: { backgroundColor: "#f1f6fd", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 28, padding: 16, overflow: "hidden", position: "relative" },
  dotGrid: { position: "absolute", top: 12, right: 12, flexDirection: "row", flexWrap: "wrap", width: 90, gap: 6, opacity: 0.35 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#2563eb" },
  forOwnersAmbient: { position: "absolute", top: -40, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: "#dbeafe", opacity: 0.6 },
  forOwnersBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "#fff", borderWidth: 1, borderColor: "#bfdbfe", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  forOwnersBadgeText: { fontSize: 11, fontWeight: "800", color: "#2563eb" },
  forOwnersTitle: { marginTop: 12, fontSize: 24, fontWeight: "900", color: COLORS.ink, lineHeight: 28 },
  forOwnersSub: { marginTop: 8, fontSize: 12, fontWeight: "500", color: "#64748b", lineHeight: 18 },
  forOwnersFeature: { flexDirection: "row", alignItems: "center", gap: 10 },
  forOwnersFeatureIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", alignItems: "center", justifyContent: "center" },
  forOwnersFeatureText: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  forOwnersCta: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#2563eb", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 24, alignSelf: "flex-start" },
  forOwnersCtaText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  forOwnersCtaArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  forOwnersImageWrap: { marginTop: 16, position: "relative", alignItems: "center" },
  forOwnersArc: { position: "absolute", left: 0, top: 0, zIndex: 2 },
  forOwnersFloatBadge: { position: "absolute", top: 6, right: 6, zIndex: 3, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: "#e2e8f0", padding: 8, borderRadius: 14 },
  forOwnersFloatIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" },
  forOwnersFloatTitle: { fontSize: 11, fontWeight: "900", color: COLORS.ink },
  forOwnersFloatSub: { fontSize: 9, fontWeight: "600", color: "#64748b" },
  forOwnersImg: { width: "100%", height: 180, marginTop: 10 },
  forOwnersBottom: { marginTop: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e7ff", borderRadius: 16, padding: 14, gap: 12 },
  forOwnersStat: { flexDirection: "row", alignItems: "center", gap: 12 },
  forOwnersStatIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", alignItems: "center", justifyContent: "center" },
  forOwnersStatValue: { fontSize: 20, fontWeight: "900", color: "#2563eb" },
  forOwnersStatLabel: { fontSize: 11, fontWeight: "600", color: "#64748b", lineHeight: 14 },
  forOwnersDivider: { height: 1, backgroundColor: "#f1f5f9" },
  forOwnersQuote: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  forOwnersQuoteText: { fontSize: 12, fontWeight: "600", color: "#334155", lineHeight: 16 },
  forOwnersQuoteAuthor: { fontSize: 11, fontWeight: "900", color: "#2563eb", marginTop: 4 },

  testiHeader: { gap: 10, marginBottom: 14 },
  blueDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#2563eb" },
  testiTitle: { marginTop: 8, fontSize: 20, fontWeight: "900", color: COLORS.ink },
  testiSubtitle: { fontSize: 12, fontWeight: "500", color: "#64748b", lineHeight: 18, marginTop: 6 },
  testiCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14 },
  testiAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  testiAvatarText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  testiName: { fontSize: 13, fontWeight: "900", color: COLORS.ink },
  testiRole: { fontSize: 10, fontWeight: "700", color: "#94a3b8", marginTop: 1 },
  testiTag: { backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 20 },
  testiTagText: { fontSize: 9, fontWeight: "900", color: "#2563eb", textTransform: "uppercase" },
  testiText: { fontSize: 12, fontWeight: "500", color: "#475569", lineHeight: 18 },

  faqCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, overflow: "hidden" },
  faqHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, gap: 12 },
  faqQuestion: { flex: 1, fontSize: 13, fontWeight: "800", color: COLORS.ink },
  faqChevron: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  faqChevronOpen: { backgroundColor: "#ede9fe" },
  faqAnswerWrap: { borderTopWidth: 1, borderColor: "#f1f5f9", padding: 14, paddingTop: 10 },
  faqAnswer: { fontSize: 12, fontWeight: "500", color: "#64748b", lineHeight: 18 },

  ctaBannerOuter: { paddingHorizontal: 16, marginTop: 28 },
  ctaBanner: { backgroundColor: "#2563eb", borderRadius: 24, padding: 20, overflow: "hidden", position: "relative" },
  ctaBannerGlow1: { position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.12)" },
  ctaBannerGlow2: { position: "absolute", bottom: -30, left: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(99,102,241,0.25)" },
  ctaBannerBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.15)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20 },
  ctaBannerBadgeText: { fontSize: 10, fontWeight: "900", color: "#dbeafe", textTransform: "uppercase" },
  ctaBannerTitle: { marginTop: 12, fontSize: 18, fontWeight: "900", color: "#fff", lineHeight: 22 },
  ctaBannerSub: { marginTop: 8, fontSize: 12, fontWeight: "500", color: "#dbeafe", lineHeight: 18 },
  ctaBannerBtns: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  ctaBannerPrimary: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  ctaBannerPrimaryText: { color: "#2563eb", fontWeight: "900", fontSize: 12 },
  ctaBannerSecondary: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.12)", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  ctaBannerSecondaryText: { color: "#fff", fontWeight: "900", fontSize: 12 },

  footer: { marginTop: 28, backgroundColor: "#0f172a", padding: 20, paddingTop: 24 },
  footerBrandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerLogo: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  footerBrand: { fontSize: 16, fontWeight: "900", color: "#fff" },
  footerDesc: { marginTop: 10, fontSize: 11, fontWeight: "500", color: "#94a3b8", lineHeight: 18 },
  footerCopy: { marginTop: 14, fontSize: 10, fontWeight: "600", color: "#64748b" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "center", padding: 24 },
  budgetModal: { backgroundColor: "#fff", borderRadius: 16, padding: 8, borderWidth: 1, borderColor: COLORS.border },
  budgetOption: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10 },
  budgetOptionActive: { backgroundColor: "#ede9fe" },
  budgetOptionText: { fontSize: 13, fontWeight: "700", color: COLORS.ink },
  budgetOptionTextActive: { color: COLORS.brand, fontWeight: "900" },
});
