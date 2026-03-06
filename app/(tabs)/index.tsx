import React, { useRef, useState, useEffect } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Platform, Animated, Dimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import Colors from "@/constants/colors";
import { useSearch } from "@/context/SearchContext";

const { width } = Dimensions.get("window");

const TRENDING = [
  "AI News 2025", "Budget India", "IPL 2025", "Cricket Score",
  "Stock Market", "Gold Price", "Bollywood", "Tech Startups",
  "Climate Change", "Space Mission", "FIFA 2026", "Olympics"
];

const WEATHER_ICONS: Record<number, string> = {
  0: "sunny", 1: "partly-sunny", 2: "cloudy", 3: "cloudy",
  45: "rainy", 48: "rainy", 51: "rainy", 53: "rainy", 55: "rainy",
  61: "rainy", 63: "rainy", 65: "rainy", 80: "rainy", 81: "rainy",
  95: "thunderstorm", 96: "thunderstorm", 99: "thunderstorm",
};

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { history, search, settings } = useSearch();
  const [inputValue, setInputValue] = useState("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [greeting, setGreeting] = useState("Namaste!");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good Morning!");
    else if (h < 17) setGreeting("Good Afternoon!");
    else setGreeting("Good Evening!");

    Animated.spring(logoAnim, {
      toValue: 1, useNativeDriver: true,
      tension: 100, friction: 8,
    }).start();

    fetchWeather();
    startPulse();
  }, []);

  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }

  async function fetchWeather() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 28.6139, lon = 77.2090;
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        const cw = data.current_weather;
        const wmoCode = cw.weathercode as number;
        setWeather({
          temp: Math.round(cw.temperature),
          condition: getConditionText(wmoCode),
          icon: WEATHER_ICONS[wmoCode] || "partly-sunny",
        });
      }
    } catch (_) {}
  }

  function getConditionText(code: number): string {
    if (code === 0) return "Clear sky";
    if (code <= 3) return "Partly cloudy";
    if (code <= 67) return "Rainy";
    if (code <= 77) return "Snowy";
    if (code <= 82) return "Showers";
    return "Thunderstorm";
  }

  function handleSearch() {
    const q = inputValue.trim();
    if (!q) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    search(q, "all");
    router.push({ pathname: "/search", params: { q, filter: "all" } });
    setInputValue("");
  }

  function handleTrendingPress(term: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    search(term, "all");
    router.push({ pathname: "/search", params: { q: term, filter: "all" } });
  }

  function handleMicPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/search", params: { q: "", filter: "all", voiceMode: "1" } });
  }

  function handleAiPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/ai-assistant");
  }

  const recentHistory = history.slice(0, 5);
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={["rgba(162,210,255,0.18)", "rgba(240,248,255,0.05)", "rgba(255,255,255,0)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 8, paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoAnim }] }]}>
            <Text style={styles.logoText}>streekx</Text>
            <View style={styles.logoDot} />
          </Animated.View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push("/(tabs)/settings")}>
            <Ionicons name="person-circle-outline" size={30} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <Animated.Text style={[styles.greetingText, { transform: [{ scale: pulseAnim }] }]}>
            {greeting}
          </Animated.Text>
          {weather ? (
            <View style={styles.weatherRow}>
              <Ionicons name={weather.icon as any} size={16} color="#F59E0B" />
              <Text style={styles.weatherText}>
                {weather.condition}, feels like {weather.temp}°
              </Text>
            </View>
          ) : (
            <View style={styles.weatherRow}>
              <Ionicons name="partly-sunny-outline" size={16} color="#F59E0B" />
              <Text style={styles.weatherText}>Getting weather...</Text>
            </View>
          )}
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color={Colors.light.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Find anything"
              placeholderTextColor={Colors.light.textMuted}
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.searchActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={handleAiPress}>
                <MaterialCommunityIcons name="robot-outline" size={20} color={Colors.light.tint} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={handleMicPress}>
                <Ionicons name="mic-outline" size={20} color={Colors.light.tint} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {recentHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
              {recentHistory.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.recentChip}
                  onPress={() => handleTrendingPress(item.query)}
                >
                  <Ionicons name="time-outline" size={13} color={Colors.light.textSecondary} />
                  <Text style={styles.recentChipText} numberOfLines={1}>{item.query}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending now</Text>
          <View style={styles.trendingGrid}>
            {TRENDING.map((term, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.trendingChip}
                onPress={() => handleTrendingPress(term)}
                activeOpacity={0.7}
              >
                <Text style={styles.trendingText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.discoverSection}>
          <View style={styles.discoverIconRow}>
            <View style={styles.discoverSquare}>
              <MaterialCommunityIcons name="compass-outline" size={28} color="#FFF" />
            </View>
            <View style={styles.discoverInfo}>
              <Text style={styles.discoverTitle}>Discover</Text>
              <Text style={styles.discoverSub}>Explore the web independently</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    fontFamily: "Caveat_700Bold",
    fontSize: 30,
    color: Colors.light.tint,
    letterSpacing: 1,
  },
  logoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
    marginLeft: 2,
    marginBottom: 6,
  },
  profileBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: { alignItems: "center", marginBottom: 32 },
  greetingText: {
    fontFamily: "Caveat_700Bold",
    fontSize: 48,
    color: Colors.light.text,
    textAlign: "center",
    lineHeight: 58,
  },
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  weatherText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  searchContainer: { marginBottom: 24 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.searchBg,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
    paddingHorizontal: 14,
    height: 54,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.light.text,
    height: "100%",
  },
  searchActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  section: { marginBottom: 28 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 14,
    textAlign: "center",
  },
  recentScroll: { marginHorizontal: -4 },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.accentLight,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    maxWidth: 160,
  },
  recentChipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.text,
  },
  trendingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  trendingChip: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  trendingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.text,
  },
  discoverSection: { marginTop: 8, marginBottom: 12 },
  discoverIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  discoverSquare: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  discoverInfo: { flex: 1 },
  discoverTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
  },
  discoverSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
});
