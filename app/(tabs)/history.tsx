import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Platform, Alert, SectionList
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSearch, HistoryItem, SearchFilter } from "@/context/SearchContext";

const FILTER_LABELS: Record<SearchFilter, string> = {
  all: "All",
  images: "Images",
  videos: "Videos",
  news: "News",
  shopping: "Shopping",
  books: "Books",
  maps: "Maps",
  ai: "AI Mode",
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { history, clearHistory, removeHistoryItem, search, settings } = useSearch();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function handleSearch(item: HistoryItem) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    search(item.query, item.filter);
    router.push({ pathname: "/search", params: { q: item.query, filter: item.filter } });
  }

  function handleRemove(query: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeHistoryItem(query);
  }

  function handleClearAll() {
    Alert.alert(
      "Clear History",
      "This will delete all your search history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); clearHistory(); }
        },
      ]
    );
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (sameDay) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>History</Text>
        </View>
        <View style={styles.empty}>
          <Ionicons name="glasses-outline" size={56} color={Colors.light.textMuted} />
          <Text style={styles.emptyTitle}>Incognito Mode</Text>
          <Text style={styles.emptyText}>
            History is not saved when incognito mode is on
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={20} color={Colors.light.danger} />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

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
            <Ionicons name="search-outline" size={18} color={Colors.light.textSecondary} />
            <View style={styles.historyContent}>
              <Text style={styles.historyQuery} numberOfLines={1}>{item.query}</Text>
              <View style={styles.historyMeta}>
                <Text style={styles.historyFilter}>{FILTER_LABELS[item.filter] || "All"}</Text>
                <Text style={styles.historyTime}>{formatTime(item.timestamp)}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleRemove(item.query)} style={styles.deleteBtn}>
              <Ionicons name="close-outline" size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={56} color={Colors.light.textMuted} />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Your searches will appear here</Text>
          </View>
        }
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.light.text,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  clearText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.danger,
  },
  sectionHeader: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  listContent: { paddingBottom: 100 },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 12,
  },
  historyContent: { flex: 1 },
  historyQuery: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.light.text,
  },
  historyMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  historyFilter: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.tint,
    backgroundColor: Colors.light.accentLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  historyTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  deleteBtn: { padding: 6 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.light.text,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
