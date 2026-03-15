import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, Platform, Alert, StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSearch, SavedItem } from "@/context/SearchContext";
import GalaxyBackground from "@/components/GalaxyBackground";

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url.slice(0, 30); }
}
function getFavicon(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=32`;
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

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { savedItems, unsaveItem } = useSearch();
  const [search, setSearch] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

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
            <Text style={styles.cardTime}>{formatAgo(item.savedAt)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn}>
          <Ionicons name="bookmark" size={22} color="#6EB4FF" />
        </TouchableOpacity>
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Saved</Text>
        <Text style={styles.headerCount}>{savedItems.length} items</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.url + item.savedAt}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 30 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmark-outline" size={56} color="rgba(255,255,255,0.30)" />
            <Text style={styles.emptyTitle}>No saved items</Text>
            <Text style={styles.emptyText}>Bookmark search results to find them here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05050A" },
  header: {
    paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold", fontSize: 26, color: "#FFFFFF", flex: 1,
  },
  headerCount: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.45)",
  },
  listContent: {
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: "row", alignItems: "flex-start",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  cardLeft: { flex: 1, flexDirection: "row", gap: 10 },
  favicon: { width: 20, height: 20, borderRadius: 4, marginTop: 2 },
  cardContent: { flex: 1, gap: 3 },
  cardTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 15,
    color: "#7DC3FF", lineHeight: 21,
  },
  cardDomain: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.45)",
  },
  cardDesc: {
    fontFamily: "Inter_400Regular", fontSize: 13,
    color: "rgba(255,255,255,0.60)", lineHeight: 18,
  },
  cardTime: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 2,
  },
  removeBtn: { padding: 4, marginLeft: 8 },
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
});
