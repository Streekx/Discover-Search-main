import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
  Platform, RefreshControl, ActivityIndicator, Dimensions, Animated
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSearch, SearchResult } from "@/context/SearchContext";

const { width } = Dimensions.get("window");
const BASE_URL = process.env.EXPO_PUBLIC_CRAWLER_URL || "https://streekxkk-streekx.hf.space";

const CATEGORIES = [
  { key: "all", label: "All", icon: "star-outline" },
  { key: "images", label: "Images", icon: "image-outline" },
  { key: "videos", label: "Videos", icon: "play-circle-outline" },
  { key: "shopping", label: "Shopping", icon: "bag-outline" },
  { key: "news", label: "News", icon: "newspaper-outline" },
  { key: "maps", label: "Maps", icon: "map-outline" },
];

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

function getFavicon(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=64`;
}

function timeAgo(ts?: number): string {
  if (!ts) return "Just now";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function DiscoverCard({ item, onPress }: { item: SearchResult; onPress: () => void }) {
  const haMedia = item.media && item.media.startsWith("http");
  const [imageFailed, setImageFailed] = React.useState(false);
  const [faviconFailed, setFaviconFailed] = React.useState(false);
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {haMedia && !imageFailed ? (
        <Image source={{ uri: item.media }} style={styles.cardImage} resizeMode="cover" onError={() => setImageFailed(true)} />
      ) : (
        <LinearGradient
          colors={["rgba(162,210,255,0.4)", "rgba(30,111,217,0.15)"]}
          style={[styles.cardImage, styles.cardImageFallback]}
        >
          <Ionicons name="globe-outline" size={32} color={Colors.light.tint} />
        </LinearGradient>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardMeta}>
          {!faviconFailed ? (
            <Image source={{ uri: getFavicon(item.url) }} style={styles.cardFav} onError={() => setFaviconFailed(true)} />
          ) : (
            <Ionicons name="globe-outline" size={14} color={Colors.light.tint} />
          )}
          <Text style={styles.cardDomain} numberOfLines={1}>{getDomain(item.url)}</Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Ionicons name="time-outline" size={12} color={Colors.light.textMuted} />
          <Text style={styles.cardTime}>Just now</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FeaturedCard({ item, onPress }: { item: SearchResult; onPress: () => void }) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const [faviconFailed, setFaviconFailed] = React.useState(false);
  
  return (
    <TouchableOpacity style={styles.featCard} onPress={onPress} activeOpacity={0.88}>
      {item.media && !imageFailed ? (
        <Image source={{ uri: item.media }} style={styles.featImage} resizeMode="cover" onError={() => setImageFailed(true)} />
      ) : (
        <LinearGradient
          colors={["#1E6FD9", "#0EA5E9"]}
          style={[styles.featImage]}
        >
          <Ionicons name="newspaper-outline" size={48} color="rgba(255,255,255,0.6)" />
        </LinearGradient>
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.75)"]}
        style={styles.featGradient}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      >
        <View style={styles.featMeta}>
          {!faviconFailed ? (
            <Image source={{ uri: getFavicon(item.url) }} style={styles.featFav} onError={() => setFaviconFailed(true)} />
          ) : (
            <Ionicons name="globe-outline" size={14} color="rgba(255,255,255,0.8)" />
          )}
          <Text style={styles.featDomain}>{getDomain(item.url)}</Text>
        </View>
        <Text style={styles.featTitle} numberOfLines={2}>{item.title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { search, settings } = useSearch();
  const [activeCategory, setActiveCategory] = useState("all");
  const [items, setItems] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => { fetchDiscover(activeCategory); }, [activeCategory]);

  async function fetchDiscover(cat: string) {
    setLoading(true);
    try {
      let url: string;
      if (cat === "all") {
        url = "https://discover-main-crawler-streekx.onrender.com/discover";
      } else {
        url = `${BASE_URL}/search?q=trending&type=${cat}&region=${settings.region}`;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(url, { 
        signal: controller.signal, 
        headers: { Accept: "application/json" } 
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        let raw: any[] = [];
        if (Array.isArray(data)) raw = data;
        else if (data.results) raw = data.results;
        else if (data.data) raw = data.data;

        const mapped: SearchResult[] = raw
          .filter((i: any) => i.title && i.url)
          .map((i: any, idx: number) => ({
            id: `d-${idx}-${Date.now()}`,
            title: i.title,
            url: i.url || i.link || "",
            description: (i.description !== "No description." && i.description !== "N/A") ? (i.description || "") : "",
            media: i.image_url || i.media || i.image || i.thumbnail || i.icon || undefined,
            source: i.source || "",
            published: i.published || i.date || undefined,
            category: i.category || cat,
          }));
        setItems(mapped);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function openItem(item: SearchResult) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (settings.openLinksInApp !== false) {
      router.push({ pathname: "/browser", params: { url: item.url } });
    } else {
      const { Linking } = require("react-native");
      Linking.openURL(item.url);
    }
  }

  const featured = items.slice(0, 1);
  const rest = items.slice(1);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSub}>What's happening now</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => { setRefreshing(true); fetchDiscover(activeCategory); }}
        >
          <Ionicons name="refresh-outline" size={22} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={c => c.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
        style={styles.catList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, activeCategory === item.key && styles.catChipOn]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveCategory(item.key); }}
          >
            <Ionicons name={item.icon as any} size={14} color={activeCategory === item.key ? "#FFF" : Colors.light.textSecondary} />
            <Text style={[styles.catLabel, activeCategory === item.key && styles.catLabelOn]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Fetching latest stories...</Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={rest}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 24 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchDiscover(activeCategory); }}
                tintColor={Colors.light.tint}
              />
            }
            ListHeaderComponent={
              featured.length > 0 ? (
                <FeaturedCard item={featured[0]} onPress={() => openItem(featured[0])} />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="newspaper-outline" size={52} color={Colors.light.textMuted} />
                <Text style={styles.emptyText}>No stories found</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDiscover(activeCategory)}>
                  <Text style={styles.retryText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <DiscoverCard item={item} onPress={() => openItem(item)} />
            )}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.light.text,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  refreshBtn: {
    marginLeft: "auto",
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center", justifyContent: "center",
  },

  catList: { maxHeight: 52 },
  catRow: { paddingHorizontal: 16, gap: 8, alignItems: "center", paddingVertical: 8 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 7, paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: Colors.light.filterInactive,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  catChipOn: { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint },
  catLabel: {
    fontFamily: "Inter_500Medium", fontSize: 13,
    color: Colors.light.textSecondary,
  },
  catLabelOn: { color: "#FFF" },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: {
    fontFamily: "Inter_400Regular", fontSize: 14,
    color: Colors.light.textSecondary,
  },

  listContent: { paddingHorizontal: 14, paddingTop: 10 },

  featCard: {
    borderRadius: 18,
    overflow: "hidden",
    height: 220,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  featImage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  featGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 16,
  },
  featMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  featFav: { width: 18, height: 18, borderRadius: 4 },
  featDomain: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.8)" },
  featTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#FFF", lineHeight: 24 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardImage: { width: "100%", height: 160 },
  cardImageFallback: { alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 12 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  cardFav: { width: 16, height: 16, borderRadius: 3 },
  cardDomain: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text, lineHeight: 21, marginBottom: 5 },
  cardDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textMuted },

  emptyWrap: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 16 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.light.textSecondary },
  retryBtn: {
    backgroundColor: Colors.light.tint, borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 28,
  },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFF" },
});
