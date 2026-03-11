import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
  Platform, RefreshControl, ActivityIndicator, Dimensions, Animated,
  Share, Alert, ActionSheetIOS, Modal, Pressable, Linking
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSearch } from "@/context/SearchContext";

const { width } = Dimensions.get("window");
const PLACEHOLDER = require("@/assets/images/icon.png");
const BASE_URL = "https://discover-main-crawler-streekx.onrender.com";

const CATEGORIES = [
  { key: "all",           label: "For You",       icon: "star-outline",           query: "trending news today 2025" },
  { key: "news",          label: "News",           icon: "newspaper-outline",      query: "breaking news today 2025" },
  { key: "tech",          label: "Tech",           icon: "hardware-chip-outline",  query: "technology artificial intelligence 2025" },
  { key: "sports",        label: "Sports",         icon: "football-outline",       query: "sports cricket football 2025" },
  { key: "entertainment", label: "Entertainment",  icon: "film-outline",           query: "bollywood hollywood entertainment 2025" },
  { key: "science",       label: "Science",        icon: "planet-outline",         query: "science discovery space 2025" },
  { key: "business",      label: "Business",       icon: "briefcase-outline",      query: "business economy finance 2025" },
  { key: "health",        label: "Health",         icon: "heart-outline",          query: "health medicine wellness 2025" },
];

interface Article {
  id: string;
  title: string;
  url: string;
  description: string;
  image?: string;
  icon?: string;
  source: string;
  published?: string;
  category: string;
  video?: string;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

function getFaviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=64`;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return "Just now"; }
}

function isValidUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try { new URL(url); return true; } catch { return false; }
}

function mapRawItem(item: any, idx: number, cat: string): Article {
  return {
    id: `${cat}-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    title: item.title || "Untitled",
    url: item.url || item.link || "",
    description: (item.description && item.description !== "No description." && item.description !== "N/A")
      ? item.description.trim() : "",
    image: item.image_url || item.image || item.thumbnail || item.media || undefined,
    icon: item.icon || undefined,
    source: item.source || getDomain(item.url || item.link || "") || "Source",
    published: item.published || item.date || undefined,
    category: cat,
    video: item.video || undefined,
  };
}

async function fetchCategory(cat: string, query: string, region: string): Promise<Article[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    if (cat === "all") {
      const res = await fetch(`${BASE_URL}/discover`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        let raw: any[] = Array.isArray(data) ? data : (data.results || data.data || []);
        if (raw.length > 0) {
          return raw.filter((i: any) => i.title && i.url).map((i: any, idx: number) => mapRawItem(i, idx, cat));
        }
      }
    }

    const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(query)}&filter=news&region=${region}`;
    const res2 = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);

    if (!res2.ok) return [];
    const data2 = await res2.json();
    const raw2: any[] = Array.isArray(data2) ? data2 : (data2.results || data2.data || []);
    return raw2.filter((i: any) => i.title && i.url).map((i: any, idx: number) => mapRawItem(i, idx, cat));
  } catch {
    clearTimeout(timer);
    return [];
  }
}

function ArticleCard({ item, onPress, onShare, onMore }: {
  item: Article;
  onPress: () => void;
  onShare: () => void;
  onMore: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const [favErr, setFavErr] = useState(false);
  const hasImage = isValidUrl(item.image) && !imgErr;
  const faviconSrc = !favErr && (isValidUrl(item.icon) ? { uri: item.icon } : { uri: getFaviconUrl(item.url) });

  return (
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        {hasImage ? (
          <Image
            source={{ uri: item.image }}
            style={styles.cardImg}
            resizeMode="cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <LinearGradient
            colors={["rgba(162,210,255,0.45)", "rgba(30,111,217,0.18)"]}
            style={[styles.cardImg, styles.cardImgFallback]}
          >
            <Ionicons name="globe-outline" size={36} color={Colors.light.tint} />
          </LinearGradient>
        )}

        <View style={styles.cardBody}>
          <View style={styles.cardSourceRow}>
            {faviconSrc ? (
              <Image source={faviconSrc} style={styles.favicon} onError={() => setFavErr(true)} />
            ) : (
              <View style={[styles.favicon, styles.faviconPlaceholder]}>
                <Ionicons name="globe-outline" size={10} color={Colors.light.textSecondary} />
              </View>
            )}
            <Text style={styles.sourceName} numberOfLines={1}>{item.source || getDomain(item.url)}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.timeText}>{timeAgo(item.published)}</Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={3}>{item.title}</Text>

          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <View style={styles.cardActionsLeft}>
          {item.video ? (
            <View style={styles.videoBadge}>
              <Ionicons name="play-circle" size={13} color={Colors.light.tint} />
              <Text style={styles.videoBadgeText}>Video</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardActionsRight}>
          <TouchableOpacity style={styles.actionBtn} onPress={onShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="share-outline" size={19} color={Colors.light.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onMore} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-vertical" size={19} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function FeaturedCard({ item, onPress }: { item: Article; onPress: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const [favErr, setFavErr] = useState(false);
  const hasImage = isValidUrl(item.image) && !imgErr;
  const faviconSrc = !favErr && (isValidUrl(item.icon) ? { uri: item.icon } : { uri: getFaviconUrl(item.url) });

  return (
    <TouchableOpacity style={styles.featCard} onPress={onPress} activeOpacity={0.9}>
      {hasImage ? (
        <Image
          source={{ uri: item.image }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={() => setImgErr(true)}
        />
      ) : (
        <LinearGradient
          colors={[Colors.light.tint, "#0EA5E9"]}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.82)"]}
        style={styles.featGradient}
        start={{ x: 0, y: 0.3 }} end={{ x: 0, y: 1 }}
      >
        <View style={styles.featSourceRow}>
          {faviconSrc ? (
            <Image source={faviconSrc} style={styles.featFav} onError={() => setFavErr(true)} />
          ) : null}
          <Text style={styles.featSource}>{item.source || getDomain(item.url)}</Text>
          <Text style={styles.featTime}>{timeAgo(item.published)}</Text>
        </View>
        <Text style={styles.featTitle} numberOfLines={3}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.featDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function MoreMenuModal({ visible, item, onClose, onSave, onOpen }: {
  visible: boolean;
  item: Article | null;
  onClose: () => void;
  onSave: () => void;
  onOpen: () => void;
}) {
  if (!item) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.moreMenu}>
          <View style={styles.moreHandle} />
          <Text style={styles.moreTitle} numberOfLines={2}>{item.title}</Text>
          <TouchableOpacity style={styles.moreRow} onPress={onOpen}>
            <Ionicons name="open-outline" size={20} color={Colors.light.text} />
            <Text style={styles.moreRowText}>Open in browser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreRow} onPress={onSave}>
            <Ionicons name="bookmark-outline" size={20} color={Colors.light.text} />
            <Text style={styles.moreRowText}>Save article</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreRow} onPress={onClose}>
            <Ionicons name="eye-off-outline" size={20} color={Colors.light.text} />
            <Text style={styles.moreRowText}>Not interested</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.moreRow, styles.moreRowLast]} onPress={onClose}>
            <Ionicons name="close-outline" size={20} color={Colors.light.textSecondary} />
            <Text style={[styles.moreRowText, { color: Colors.light.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { settings, saveItem } = useSearch();
  const [activeCategory, setActiveCategory] = useState("all");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moreItem, setMoreItem] = useState<Article | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => { loadArticles(activeCategory); }, [activeCategory]);

  const loadArticles = useCallback(async (cat: string, isRefresh = false) => {
    if (!isRefresh) { setLoading(true); fadeAnim.setValue(0); }
    setError(null);

    const catInfo = CATEGORIES.find(c => c.key === cat) || CATEGORIES[0];
    const items = await fetchCategory(cat, catInfo.query, settings.region || "IN");

    if (items.length === 0) {
      setError("Could not load articles. Pull down to retry.");
    } else {
      setArticles(items);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
    setLoading(false);
    setRefreshing(false);
  }, [settings.region, fadeAnim]);

  function openItem(item: Article) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (settings.openLinksInApp !== false) {
      router.push({ pathname: "/browser", params: { url: item.url } });
    } else {
      Linking.openURL(item.url);
    }
  }

  async function shareItem(item: Article) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({ title: item.title, message: `${item.title}\n${item.url}`, url: item.url });
    } catch (_) {}
  }

  function onMorePress(item: Article) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Open in Browser", "Save Article", "Not Interested"], cancelButtonIndex: 0 },
        (idx) => {
          if (idx === 1) openItem(item);
          if (idx === 2) { saveItem({ ...item, id: item.id, media: item.image }); }
        }
      );
    } else {
      setMoreItem(item);
    }
  }

  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSub}>What's happening now</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => { setRefreshing(true); loadArticles(activeCategory, true); }}
        >
          <Animated.View style={{ transform: [{ rotate: refreshing ? "360deg" : "0deg" }] }}>
            <Ionicons name="refresh-outline" size={22} color={Colors.light.tint} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={c => c.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
        style={styles.catList}
        renderItem={({ item: cat }) => (
          <TouchableOpacity
            style={[styles.catChip, activeCategory === cat.key && styles.catChipOn]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveCategory(cat.key);
            }}
          >
            <Ionicons
              name={cat.icon as any}
              size={13}
              color={activeCategory === cat.key ? "#FFF" : Colors.light.textSecondary}
            />
            <Text style={[styles.catLabel, activeCategory === cat.key && styles.catLabelOn]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Fetching latest stories...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.light.textMuted} />
          <Text style={styles.errorTitle}>No stories loaded</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadArticles(activeCategory)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={rest}
            keyExtractor={item => item.id}
            contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 28 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadArticles(activeCategory, true); }}
                tintColor={Colors.light.tint}
              />
            }
            ListHeaderComponent={
              featured ? (
                <FeaturedCard item={featured} onPress={() => openItem(featured)} />
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="newspaper-outline" size={52} color={Colors.light.textMuted} />
                <Text style={styles.emptyText}>No articles found</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => loadArticles(activeCategory)}>
                  <Text style={styles.retryText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <ArticleCard
                item={item}
                onPress={() => openItem(item)}
                onShare={() => shareItem(item)}
                onMore={() => onMorePress(item)}
              />
            )}
          />
        </Animated.View>
      )}

      <MoreMenuModal
        visible={!!moreItem}
        item={moreItem}
        onClose={() => setMoreItem(null)}
        onSave={() => {
          if (moreItem) saveItem({ ...moreItem, id: moreItem.id, media: moreItem.image });
          setMoreItem(null);
        }}
        onOpen={() => {
          if (moreItem) openItem(moreItem);
          setMoreItem(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.light.text },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textSecondary },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center", justifyContent: "center",
  },

  catList: { maxHeight: 50 },
  catRow: { paddingHorizontal: 14, gap: 8, alignItems: "center", paddingVertical: 6 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 7, paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: Colors.light.filterInactive,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  catChipOn: { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint },
  catLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  catLabelOn: { color: "#FFF" },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary },

  errorWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  errorTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.light.text },
  errorMsg: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center" },

  listContent: { paddingHorizontal: 14, paddingTop: 12 },

  featCard: {
    borderRadius: 20, overflow: "hidden",
    height: 240, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
  },
  featGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end", padding: 16,
  },
  featSourceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  featFav: { width: 16, height: 16, borderRadius: 3 },
  featSource: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.85)" },
  featTime: { fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.6)", marginLeft: "auto" },
  featTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#FFF", lineHeight: 25, marginBottom: 6 },
  featDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 18 },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 16, marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1, borderColor: Colors.light.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  cardImg: { width: "100%", height: 180 },
  cardImgFallback: { alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 12 },
  cardSourceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 7 },
  favicon: { width: 16, height: 16, borderRadius: 3 },
  faviconPlaceholder: { backgroundColor: Colors.light.accentLight, alignItems: "center", justifyContent: "center" },
  sourceName: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.light.textSecondary, flex: 1 },
  dot: { color: Colors.light.textMuted, fontSize: 12 },
  timeText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.textMuted },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text, lineHeight: 22, marginBottom: 5 },
  cardDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, lineHeight: 19 },

  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  cardActionsLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardActionsRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtn: { padding: 6 },
  videoBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(30,111,217,0.08)",
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8,
  },
  videoBadgeText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.light.tint },

  emptyWrap: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 16 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 16, color: Colors.light.textSecondary },
  retryBtn: {
    backgroundColor: Colors.light.tint, borderRadius: 14,
    paddingVertical: 11, paddingHorizontal: 28,
  },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFF" },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  moreMenu: {
    backgroundColor: "#FFF", borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12,
  },
  moreHandle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: Colors.light.border,
    alignSelf: "center", marginBottom: 16,
  },
  moreTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text,
    marginBottom: 16, paddingHorizontal: 4,
  },
  moreRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.light.border,
  },
  moreRowLast: { borderBottomWidth: 0 },
  moreRowText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.light.text },
});
