import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Platform, Alert, SectionList
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSearch, HistoryItem, SearchFilter } from "@/context/SearchContext";
import GalaxyBackground from "@/components/GalaxyBackground";

const FILTER_LABELS: Record<SearchFilter, string> = {
  all: "All", images: "Images", videos: "Videos", news: "News",
  shopping: "Shopping", books: "Books", maps: "Maps", ai: "AI Mode",
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { history, clearHistory, removeHistoryItem, search, settings } = useSearch();
  const [activeTab, setActiveTab] = useState<"search" | "threads">("search");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  function handleSearch(item: HistoryItem) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    search(item.query, item.filter as SearchFilter | undefined);
    router.push({ pathname: "/search", params: { q: item.query, filter: item.filter } });
  }

  function handleRemove(query: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeHistoryItem(query);
  }

  function handleClearAll() {
    Alert.alert("Clear History", "This will delete all your search history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All", style: "destructive",
        onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); clearHistory(); }
      },
    ]);
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isYesterday) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  const grouped = history.reduce((acc, item) => {
    const d = new Date(item.timestamp);
    const now = new Date();
    let group = "Older";
    if (d.toDateString() === now.toDateString()) group = "Today";
    else {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) group = "Yesterday";
      else if (Date.now() - item.timestamp < 7 * 86400000) group = "This Week";
    }
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, HistoryItem[]>);

  const sections = ["Today", "Yesterday", "This Week", "Older"]
    .filter(g => grouped[g]?.length)
    .map(g => ({ title: g, data: grouped[g] }));

  if (settings.incognitoMode) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <GalaxyBackground />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>History</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="glasses-outline" size={56} color="rgba(255,255,255,0.35)" />
          <Text style={styles.emptyTitle}>Incognito Mode</Text>
          <Text style={styles.emptyText}>History is not saved when incognito mode is on</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <GalaxyBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        {history.length > 0 && activeTab === "search" && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === "search" ? (
        <SectionList
          sections={sections}
          keyExtractor={(item, idx) => `${item.query}-${idx}`}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.historyItem}
              onPress={() => handleSearch(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.45)" />
              <View style={styles.historyContent}>
                <Text style={styles.historyQuery} numberOfLines={1}>{item.query}</Text>
                <View style={styles.historyMeta}>
                  <Text style={styles.historyFilter}>{FILTER_LABELS[item.filter as SearchFilter] ?? "All"}</Text>
                  <Text style={styles.historyTime}>{formatTime(item.timestamp)}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleRemove(item.query)} style={styles.deleteBtn}>
                <Ionicons name="close-outline" size={18} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 90 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={56} color="rgba(255,255,255,0.30)" />
              <Text style={styles.emptyTitle}>No search history</Text>
              <Text style={styles.emptyText}>Your searches will appear here</Text>
            </View>
          }
          stickySectionHeadersEnabled
        />
      ) : (
        <View style={[styles.empty, { paddingBottom: botPad + 80 }]}>
          <Ionicons name="chatbubbles-outline" size={56} color="rgba(255,255,255,0.30)" />
          <Text style={styles.emptyTitle}>No threads yet</Text>
          <Text style={styles.emptyText}>Your AI Mode conversations will appear here</Text>
        </View>
      )}

      <View style={[styles.tabBar, { paddingBottom: botPad + 8 }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "search" && styles.tabActive]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab("search"); }}
        >
          <Ionicons name="search-outline" size={20} color={activeTab === "search" ? "#6EB4FF" : "rgba(255,255,255,0.45)"} />
          <Text style={[styles.tabText, activeTab === "search" && styles.tabTextActive]}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "threads" && styles.tabActive]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab("threads"); }}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={activeTab === "threads" ? "#6EB4FF" : "rgba(255,255,255,0.45)"} />
          <Text style={[styles.tabText, activeTab === "threads" && styles.tabTextActive]}>Threads</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05050A" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    flex: 1,
  },
  clearBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,107,107,0.15)",
    borderRadius: 12, paddingVertical: 7, paddingHorizontal: 12,
  },
  clearText: {
    fontFamily: "Inter_500Medium", fontSize: 14, color: "#FF6B6B",
  },
  sectionHeader: {
    backgroundColor: "rgba(5,5,15,0.88)",
    paddingHorizontal: 16, paddingVertical: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 12,
    color: "rgba(255,255,255,0.40)",
    textTransform: "uppercase", letterSpacing: 0.7,
  },
  listContent: {},
  historyItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
    gap: 12,
  },
  historyContent: { flex: 1 },
  historyQuery: {
    fontFamily: "Inter_500Medium", fontSize: 15, color: "#FFFFFF",
  },
  historyMeta: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3,
  },
  historyFilter: {
    fontFamily: "Inter_400Regular", fontSize: 11,
    color: "#6EB4FF",
    backgroundColor: "rgba(110,180,255,0.14)",
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  historyTime: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.35)",
  },
  deleteBtn: { padding: 6 },
  empty: {
    alignItems: "center", justifyContent: "center",
    paddingTop: 100, gap: 12, paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 18, color: "rgba(255,255,255,0.85)",
  },
  emptyText: {
    fontFamily: "Inter_400Regular", fontSize: 14,
    color: "rgba(255,255,255,0.50)", textAlign: "center", lineHeight: 20,
  },
  tabBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row",
    backgroundColor: "rgba(5,4,15,0.92)",
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 8, paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 20,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 12,
  },
  tabActive: { backgroundColor: "rgba(255,255,255,0.10)" },
  tabText: {
    fontFamily: "Inter_500Medium", fontSize: 14, color: "rgba(255,255,255,0.45)",
  },
  tabTextActive: {
    fontFamily: "Inter_600SemiBold", color: "#6EB4FF",
  },
});
