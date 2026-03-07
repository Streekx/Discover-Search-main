import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, ActivityIndicator, Image, Animated, Dimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSearch, SearchResult } from "@/context/SearchContext";

const { width } = Dimensions.get("window");
const BASE_URL = "https://streekxkk-streekx.hf.space";

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}
function getFavicon(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=32`;
}

export default function AIModeScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q: string }>();
  const { settings, saveItem, isSaved } = useSearch();

  const [query] = useState(params.q || "");
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<SearchResult[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const orbAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    startOrbAnim();
    if (query) fetchAiResults(query);
  }, []);

  function startOrbAnim() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(orbAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
    dotAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    });
  }

  async function fetchAiResults(q: string) {
    setLoading(true);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(
        `${BASE_URL}/search?q=${encodeURIComponent(q)}&filter=all`,
        { signal: controller.signal, headers: { Accept: "application/json" } }
      );
      clearTimeout(id);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      let raw: any[] = Array.isArray(data) ? data : (data.results || []);
      const mapped: SearchResult[] = raw
        .filter((i: any) => i.title && i.url)
        .map((i: any, idx: number) => ({
          id: `ai-${idx}`,
          title: i.title,
          url: i.url || i.link || "",
          description: (i.description && i.description !== "No description." && i.description !== "N/A") ? i.description : "",
          media: i.media || i.image || undefined,
          source: i.source || "",
          category: "ai",
        }));
      setSources(mapped);
      buildSummary(mapped, q);
    } catch (_) {
      setAiSummary("Unable to fetch AI results. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function buildSummary(results: SearchResult[], q: string) {
    const withDesc = results.filter(r => r.description && r.description.length > 30);
    if (withDesc.length === 0) {
      setAiSummary(`Here are the top search results for "${q}". Click any source below to read more.`);
      setRelatedQuestions([`What is ${q}?`, `${q} explained`, `${q} examples`, `${q} vs alternatives`]);
      return;
    }
    const raw = withDesc.slice(0, 5).map(r => r.description).join(" ");
    const sentences = raw.match(/[^.!?]+[.!?]+/g) || [];
    const summary = sentences.slice(0, 5).join(" ").trim() || raw.slice(0, 500);
    setAiSummary(summary);
    const base = q.toLowerCase().split(/\s+/)[0];
    setRelatedQuestions([
      `What is ${q}?`,
      `How does ${q} work?`,
      `Best ${q} examples`,
      `${q} vs alternatives`,
      `${q} latest news`,
    ]);
  }

  function handleSpeak() {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(aiSummary, {
        language: "en-IN",
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleRelated(q: string) {
    router.push({ pathname: "/ai-mode", params: { q } });
  }

  const orbScale = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient
        colors={["rgba(162,210,255,0.18)", "rgba(255,255,255,0)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 0.5 }}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerBadge}>
          <MaterialCommunityIcons name="creation" size={14} color={Colors.light.tint} />
          <Text style={styles.headerBadgeText}>AI Mode</Text>
        </View>
        <TouchableOpacity style={styles.speakBtn} onPress={handleSpeak}>
          <Ionicons name={isSpeaking ? "volume-high" : "volume-medium-outline"} size={20} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.queryText}>{query}</Text>

        {loading ? (
          <View style={styles.loadingCard}>
            <Animated.View style={[styles.orb, { transform: [{ scale: orbScale }] }]}>
              <LinearGradient
                colors={["#1E6FD9", "#0EA5E9", "#A2D2FF"]}
                style={styles.orbInner}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
            </Animated.View>
            <View style={styles.dotsRow}>
              {dotAnims.map((anim, i) => (
                <Animated.View
                  key={i}
                  style={[styles.dot, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] }) }] }]}
                />
              ))}
            </View>
            <Text style={styles.loadingText}>Searching the web and generating AI overview...</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <LinearGradient
                colors={["rgba(162,210,255,0.22)", "transparent"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <View style={styles.summaryHeader}>
                <View style={styles.aiIconWrap}>
                  <MaterialCommunityIcons name="creation" size={18} color={Colors.light.tint} />
                </View>
                <Text style={styles.summaryTitle}>AI Overview</Text>
                <TouchableOpacity onPress={handleSpeak}>
                  <Ionicons name={isSpeaking ? "pause-circle" : "play-circle-outline"} size={24} color={Colors.light.tint} />
                </TouchableOpacity>
              </View>
              <Text style={styles.summaryText}>{aiSummary}</Text>

              {sources.length > 0 && (
                <View style={styles.sourcesSection}>
                  <Text style={styles.sourcesLabel}>Sources</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {sources.slice(0, 5).map((src, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.sourceChip}
                        onPress={() => router.push({ pathname: "/browser", params: { url: src.url } })}
                      >
                        <View style={styles.sourceNum}><Text style={styles.sourceNumText}>{idx + 1}</Text></View>
                        <Image source={{ uri: getFavicon(src.url) }} style={styles.sourceFav} />
                        <Text style={styles.sourceDomain} numberOfLines={1}>{getDomain(src.url)}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {relatedQuestions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Related questions</Text>
                {relatedQuestions.map((q, idx) => (
                  <TouchableOpacity key={idx} style={styles.relatedRow} onPress={() => handleRelated(q)}>
                    <Ionicons name="help-circle-outline" size={18} color={Colors.light.tint} />
                    <Text style={styles.relatedText}>{q}</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.light.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {sources.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top results</Text>
                {sources.slice(0, 8).map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.resultRow}
                    onPress={() => router.push({ pathname: "/browser", params: { url: item.url } })}
                  >
                    <View style={styles.resultLeft}>
                      <Image source={{ uri: getFavicon(item.url) }} style={styles.resultFav} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultDomain}>{getDomain(item.url)}</Text>
                        <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
                        {item.description ? (
                          <Text style={styles.resultDesc} numberOfLines={2}>{item.description}</Text>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => isSaved(item.url) ? null : saveItem(item)}>
                      <Ionicons
                        name={isSaved(item.url) ? "bookmark" : "bookmark-outline"}
                        size={18}
                        color={isSaved(item.url) ? Colors.light.tint : Colors.light.textMuted}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  headerBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(162,210,255,0.25)",
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(162,210,255,0.5)",
  },
  headerBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.tint,
  },
  speakBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center", justifyContent: "center",
  },

  content: { paddingHorizontal: 16, paddingTop: 4 },
  queryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
    marginBottom: 20,
    lineHeight: 30,
  },

  loadingCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  orb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  orbInner: { flex: 1 },
  dotsRow: { flexDirection: "row", gap: 8 },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.light.tint,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },

  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "rgba(162,210,255,0.5)",
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  aiIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(162,210,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  summaryTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
  },
  summaryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  sourcesSection: { marginTop: 4 },
  sourcesLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.filterInactive,
    borderRadius: 12,
    padding: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minWidth: 110,
    maxWidth: 150,
  },
  sourceNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.light.tint,
    alignItems: "center", justifyContent: "center",
  },
  sourceNumText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#FFF" },
  sourceFav: { width: 16, height: 16, borderRadius: 3 },
  sourceDomain: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.text, flex: 1 },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.text,
    marginBottom: 10,
  },

  relatedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  relatedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },

  resultRow: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  resultLeft: { flex: 1, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  resultFav: { width: 22, height: 22, borderRadius: 4, marginTop: 2 },
  resultDomain: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginBottom: 3,
  },
  resultTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#1A73E8",
    lineHeight: 21,
    marginBottom: 4,
  },
  resultDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
});
