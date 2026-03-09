import React, { useRef, useState, useEffect } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  StatusBar, Platform, Animated, Modal, Dimensions, ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSearch } from "@/context/SearchContext";
import DynamicDiscoverTile from "@/components/DynamicDiscoverTile";

const { width, height } = Dimensions.get("window");

const LOGO_COLORS = ["#1E6FD9","#EF4444","#F59E0B","#1E6FD9","#22C55E","#EF4444","#8B5CF6"];
const LOGO_LETTERS = ["s","t","r","e","e","k","x"];

const TRENDING = [
  "AI News", "Budget 2025", "IPL Score", "Gold Price",
  "Tech Today", "Space News", "Climate", "Cricket",
  "Bollywood", "Stock Market",
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { history, search, settings } = useSearch();
  const [inputValue, setInputValue] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const logoAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 10 }).start();
  }, []);

  function handleSearchBarTap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/search-input");
  }

  function handleTrending(term: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    search(term, "all");
    router.push({ pathname: "/search", params: { q: term, filter: "all" } });
  }

  function handleVoice() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/search-input", params: { voiceMode: "1" } });
  }

  function handleAi() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/ai-assistant");
  }

  function handleAiMode() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/ai-mode");
  }

  const navItems = [
    { label: "History", icon: "time-outline", path: "/(tabs)/history" },
    { label: "Saved", icon: "bookmark-outline", path: "/(tabs)/saved" },
    { label: "Settings", icon: "settings-outline", path: "/(tabs)/settings" },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={["rgba(162,210,255,0.22)", "rgba(240,248,255,0.06)", "rgba(255,255,255,0)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      />

      <View style={styles.topBar}>
        <DynamicDiscoverTile />

        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuVisible(true); }}
        >
          <Ionicons name="menu-outline" size={26} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[styles.logoSection, {
          opacity: logoAnim,
          transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        }]}
      >
        <View style={styles.logoRow}>
          {LOGO_LETTERS.map((letter, i) => (
            <Text key={i} style={[styles.logoLetter, { color: LOGO_COLORS[i] }]}>{letter}</Text>
          ))}
        </View>
        <Text style={styles.tagline}>
          {settings.incognitoMode ? "🕶 Incognito — not saving searches" : "Search anything, find everything"}
        </Text>
      </Animated.View>

      <TouchableOpacity style={styles.searchBar} onPress={handleSearchBarTap} activeOpacity={0.9}>
        <Ionicons name="search-outline" size={20} color={Colors.light.textSecondary} style={{ marginRight: 8 }} />
        <Text style={styles.searchPlaceholder}>Ask anything...</Text>
        <View style={styles.searchRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleVoice} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="mic-outline" size={21} color={Colors.light.tint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleAi} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="robot-outline" size={20} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <View style={styles.aiShortcuts}>
        <TouchableOpacity style={styles.aiShortcut} onPress={handleAiMode} activeOpacity={0.8}>
          <View style={styles.aiIconWrapper}>
            <MaterialCommunityIcons name="sparkles" size={18} color={Colors.light.tint} />
          </View>
          <Text style={styles.aiShortcutText}>AI Mode</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.aiShortcut} onPress={handleAi} activeOpacity={0.8}>
          <View style={styles.aiIconWrapper}>
            <MaterialCommunityIcons name="robot-outline" size={18} color={Colors.light.tint} />
          </View>
          <Text style={styles.aiShortcutText}>AI Assistant</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.trendingSection}>
        <Text style={styles.trendingLabel}>Trending</Text>
        <View style={styles.trendingList}>
          {TRENDING.slice(0, 8).map((term, idx) => (
            <TouchableOpacity key={idx} style={styles.trendPill} onPress={() => handleTrending(term)} activeOpacity={0.8}>
              <Text style={styles.trendPillText}>{term}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Modal visible={menuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuSheet, { paddingBottom: botPad + 20 }]}>
            <View style={styles.menuHandle} />
            <View style={styles.menuLogoRow}>
              {LOGO_LETTERS.map((letter, i) => (
                <Text key={i} style={[styles.menuLogo, { color: LOGO_COLORS[i] }]}>{letter}</Text>
              ))}
            </View>
            {navItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(item.path as any);
                }}
              >
                <View style={styles.menuItemIcon}>
                  <Ionicons name={item.icon as any} size={22} color={Colors.light.tint} />
                </View>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.light.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 36,
    marginTop: 12,
  },
  menuBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(162,210,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  logoSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  logoLetter: {
    fontFamily: "Caveat_700Bold",
    fontSize: 54,
    lineHeight: 62,
    letterSpacing: 2,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
    marginBottom: 28,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.light.textMuted,
  },
  searchRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  aiShortcuts: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  aiShortcut: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  aiIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  aiShortcutText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.text,
  },

  trendingSection: { marginBottom: 20 },
  trendingLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    marginBottom: 12,
  },
  trendingList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  trendPill: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  trendPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.text,
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  menuLogoRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  menuLogo: {
    fontFamily: "Caveat_700Bold",
    fontSize: 36,
    letterSpacing: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 14,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemLabel: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.light.text,
  },
});
