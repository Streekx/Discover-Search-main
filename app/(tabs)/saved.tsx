import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, Platform, Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSearch, SavedItem } from "@/context/SearchContext";

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url.slice(0, 30); }
}
function getFavicon(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=32`;
}

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { savedItems, unsaveItem } = useSearch();
  const [search, setSearch] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered = search
    ? savedItems.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || i.url.includes(search))
    : savedItems;

  function handleRemove(item: SavedItem) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove bookmark?", item.title, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => unsaveItem(item.url) },
    ]);
  }

  function handleOpen(url: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/browser", params: { url } });
  }

  function renderItem({ item }: { item: SavedItem }) {
    const ago = formatAgo(item.savedAt);
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleOpen(item.url)} activeOpacity={0.85}>
        <View style={styles.cardLeft}>
          <Image source={{ uri: getFavicon(item.url) }} style={styles.favicon} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardDomain} numberOfLines={1}>{getDomain(item.url)}</Text>
            {item.description ? (
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <Text style={styles.cardTime}>{ago}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn}>
          <Ionicons name="bookmark" size={22} color={Colors.light.tint} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  function formatAgo(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
        <Text style={styles.headerCount}>{savedItems.length} items</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.url + item.savedAt}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={56} color={Colors.light.textMuted} />
            <Text style={styles.emptyTitle}>No saved items</Text>
            <Text style={styles.emptyText}>
              Bookmark search results to find them here
            </Text>
          </View>
        }
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
  headerCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: { flex: 1, flexDirection: "row", gap: 10 },
  favicon: { width: 20, height: 20, borderRadius: 4, marginTop: 2 },
  cardContent: { flex: 1, gap: 3 },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.tint,
    lineHeight: 21,
  },
  cardDomain: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  cardTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  removeBtn: { padding: 4, marginLeft: 8 },
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
