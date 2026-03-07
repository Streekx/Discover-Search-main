import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList,
  StatusBar, Platform, ActivityIndicator, Image, Linking,
  Dimensions, Animated, Modal, ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import Colors from "@/constants/colors";
import { useSearch, SearchFilter, SearchResult } from "@/context/SearchContext";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

const { width } = Dimensions.get("window");
const LOGO_COLORS = ["#1E6FD9","#EF4444","#F59E0B","#1E6FD9","#22C55E","#EF4444","#8B5CF6"];
const LOGO_LETTERS = ["s","t","r","e","e","k","x"];

const FILTERS: { key: SearchFilter; label: string; icon: string }[] = [
  { key: "ai",       label: "AI Mode",  icon: "robot-outline" },
  { key: "all",      label: "All",      icon: "earth-outline" },
  { key: "images",   label: "Images",   icon: "image-outline" },
  { key: "videos",   label: "Videos",   icon: "play-circle-outline" },
  { key: "news",     label: "News",     icon: "newspaper-outline" },
  { key: "shopping", label: "Shopping", icon: "cart-outline" },
  { key: "books",    label: "Books",    icon: "book-outline" },
  { key: "maps",     label: "Maps",     icon: "map-outline" },
];

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url.slice(0, 30); }
}
function getFavicon(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=32`;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q: string; filter: string; voiceMode: string }>();
  const {
    query, search, results, isLoading, error,
    activeFilter, setActiveFilter,
    saveItem, unsaveItem, isSaved,
    aiOverview, aiLoading, relatedSearches,
    settings,
  } = useSearch();

  const [inputValue, setInputValue] = useState(params.q || query || "");
  const [isListening, setIsListening] = useState(false);
  const [voiceModal, setVoiceModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [aiExpanded, setAiExpanded] = useState(true);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const micPulse = useRef(new Animated.Value(1)).current;

  useSpeechRecognitionEvent("result", (event) => {
    const t = event.results[0]?.transcript || "";
    setVoiceTranscript(t);
    if (event.isFinal && t) {
      setIsListening(false); setVoiceModal(false);
      setInputValue(t); search(t, activeFilter);
    }
  });
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("error", () => setIsListening(false));

  useEffect(() => {
    const q = params.q?.trim();
    const f = (params.filter || "all") as SearchFilter;
    if (q) { setInputValue(q); search(q, f); }
    if (params.voiceMode === "1") setTimeout(startVoice, 600);
  }, []);

  function pulseMic() {
    Animated.loop(Animated.sequence([
      Animated.timing(micPulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
      Animated.timing(micPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
    ])).start();
  }

  async function startVoice() {
    try {
      const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!p.granted) return;
      setVoiceTranscript(""); setVoiceModal(true); setIsListening(true);
      pulseMic();
      ExpoSpeechRecognitionModule.start({ lang: settings.voiceLanguage || "en-IN", interimResults: true, maxAlternatives: 1 });
    } catch (_) { setIsListening(false); setVoiceModal(true); }
  }

  function stopVoice() {
    ExpoSpeechRecognitionModule.stop();
    micPulse.stopAnimation();
    setIsListening(false);
  }

  function handleSearch(overrideQuery?: string) {
    const q = (overrideQuery || inputValue).trim();
    if (!q) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    search(q, activeFilter);
  }

  function handleFilter(f: SearchFilter) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (f === "ai") {
      const q = inputValue.trim() || query;
      if (q) router.push({ pathname: "/ai-mode", params: { q } });
      return;
    }
    setActiveFilter(f);
    const q = inputValue.trim();
    if (q) search(q, f);
  }

  function openLink(url: string) {
    if (!url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (settings.openLinksInApp !== false) {
      router.push({ pathname: "/browser", params: { url } });
    } else {
      Linking.openURL(url);
    }
  }

  function toggleSave(item: SearchResult) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    isSaved(item.url) ? unsaveItem(item.url) : saveItem(item);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const filterH = 52;
  const searchBarH = 68;
  const totalBottom = filterH + searchBarH + botPad;

  function AiOverviewCard() {
    if (!aiOverview && !aiLoading) return null;
    const topSources = results.slice(0, 3);

    return (
      <View style={styles.aiCard}>
        <LinearGradient
          colors={["rgba(162,210,255,0.25)", "rgba(255,255,255,0.0)"]}
          style={styles.aiCardGradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <View style={styles.aiCardHeader}>
          <View style={styles.aiSparkleWrap}>
            <MaterialCommunityIcons name="creation" size={18} color={Colors.light.tint} />
          </View>
          <Text style={styles.aiCardTitle}>AI Overview</Text>
          <TouchableOpacity onPress={() => setAiExpanded(e => !e)} style={styles.aiExpandBtn}>
            <Ionicons name={aiExpanded ? "chevron-up" : "chevron-down"} size={18} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        {aiExpanded && (
          <>
            {aiLoading && !aiOverview ? (
              <View style={styles.aiSkeletonWrap}>
                {[95, 80, 65].map((w, i) => (
                  <View key={i} style={[styles.aiSkeletonLine, { width: `${w}%` }]} />
                ))}
              </View>
            ) : (
              <Text style={styles.aiText}>{aiOverview}</Text>
            )}

            {topSources.length > 0 && (
              <View style={styles.aiSources}>
                <Text style={styles.aiSourcesLabel}>Sources</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.aiSourcesScroll}>
                  {topSources.map((src, idx) => (
                    <TouchableOpacity key={idx} style={styles.aiSourceChip} onPress={() => openLink(src.url)}>
                      <Image source={{ uri: getFavicon(src.url) }} style={styles.aiSourceFav} />
                      <View>
                        <Text style={styles.aiSourceNum}>{idx + 1}</Text>
                        <Text style={styles.aiSourceDomain} numberOfLines={1}>{getDomain(src.url)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {aiOverview ? (
              <TouchableOpacity
                style={styles.aiListenBtn}
                onPress={() => Speech.speak(aiOverview, { language: "en-IN", rate: 0.92 })}
              >
                <Ionicons name="volume-medium-outline" size={15} color={Colors.light.tint} />
                <Text style={styles.aiListenText}>Listen to overview</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </View>
    );
  }

  function RelatedSearches() {
    if (!relatedSearches.length) return null;
    return (
      <View style={styles.relatedCard}>
        <Text style={styles.relatedTitle}>Related searches</Text>
        {relatedSearches.map((term, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.relatedRow}
            onPress={() => { setInputValue(term); search(term, activeFilter); }}
          >
            <Ionicons name="search-outline" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.relatedText}>{term}</Text>
            <Ionicons name="arrow-up-outline" size={14} color={Colors.light.textMuted} style={styles.relatedArrow} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function ImageResult({ item }: { item: SearchResult }) {
    const src = item.media || item.url;
    return (
      <TouchableOpacity style={styles.imageCard} onPress={() => openLink(item.url)} activeOpacity={0.82}>
        <Image source={{ uri: src }} style={styles.imageThumb} resizeMode="cover" />
        <View style={styles.imageFooter}>
          <Image source={{ uri: getFavicon(item.url) }} style={styles.imageFav} />
          <Text style={styles.imageDomain} numberOfLines={1}>{getDomain(item.url)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function ResultCard({ item }: { item: SearchResult }) {
    if (activeFilter === "images") return <ImageResult item={item} />;
    const saved = isSaved(item.url);
    return (
      <TouchableOpacity style={styles.resultCard} onPress={() => openLink(item.url)} activeOpacity={0.85}>
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaLeft}>
            <Image source={{ uri: getFavicon(item.url) }} style={styles.cardFav} />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardDomain} numberOfLines={1}>{getDomain(item.url)}</Text>
              {item.source ? <Text style={styles.cardSource} numberOfLines={1}>{item.source}</Text> : null}
            </View>
          </View>
          <TouchableOpacity onPress={() => toggleSave(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={19} color={saved ? Colors.light.tint : Colors.light.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.description ? <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text> : null}

        {item.media ? (
          <Image source={{ uri: item.media }} style={styles.cardMedia} resizeMode="cover" />
        ) : null}

        {activeFilter === "shopping" && item.price ? (
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>{item.price}</Text>
          </View>
        ) : null}

        {activeFilter === "news" && item.published ? (
          <Text style={styles.publishedText}>{item.published}</Text>
        ) : null}
      </TouchableOpacity>
    );
  }

  function ListHeader() {
    return (
      <>
        <AiOverviewCard />
        <RelatedSearches />
        {results.length > 0 && (
          <Text style={styles.resultCount}>About {results.length}+ results</Text>
        )}
      </>
    );
  }

  function EmptyState() {
    if (isLoading) return null;
    if (error) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="cloud-offline-outline" size={52} color={Colors.light.textMuted} />
          <Text style={styles.emptyTitle}>Connection error</Text>
          <Text style={styles.emptyMsg}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => handleSearch()}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (inputValue && !results.length) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={52} color={Colors.light.textMuted} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyMsg}>Try different keywords or check your connection</Text>
        </View>
      );
    }
    if (!inputValue) {
      return (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyLogoRow}>
            {LOGO_LETTERS.map((l, i) => (
              <Text key={i} style={[styles.emptyLogo, { color: LOGO_COLORS[i] }]}>{l}</Text>
            ))}
          </View>
          <Text style={styles.emptyMsg}>Enter a query to search</Text>
        </View>
      );
    }
    return null;
  }

  const numCols = activeFilter === "images" ? 2 : 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={{ height: topPad, backgroundColor: Colors.light.backgroundCard }} />

      {isLoading && (
        <View style={styles.loadStrip}>
          <LinearGradient
            colors={[Colors.light.tint, "#A2D2FF", Colors.light.tint]}
            style={styles.loadStripInner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          />
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ResultCard item={item} />}
          numColumns={numCols}
          key={numCols}
          contentContainerStyle={[styles.listPad, { paddingBottom: totalBottom + 20 }]}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.bottomBar, { paddingBottom: botPad + 4 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            style={styles.filterBar}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, activeFilter === f.key && styles.filterChipOn]}
                onPress={() => handleFilter(f.key)}
              >
                <MaterialCommunityIcons
                  name={f.icon as any}
                  size={13}
                  color={activeFilter === f.key ? "#FFF" : Colors.light.textSecondary}
                />
                <Text style={[styles.filterLabel, activeFilter === f.key && styles.filterLabelOn]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.searchRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>

            <View style={styles.searchInputWrap}>
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={() => handleSearch()}
                placeholder="Search StreekX..."
                placeholderTextColor={Colors.light.textMuted}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {inputValue.length > 0 && (
                <TouchableOpacity onPress={() => setInputValue("")} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={16} color={Colors.light.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/ai-assistant")}>
              <MaterialCommunityIcons name="robot-excited-outline" size={20} color={Colors.light.tint} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, isListening && styles.actionBtnLive]} onPress={startVoice}>
              <Ionicons name={isListening ? "mic" : "mic-outline"} size={20} color={isListening ? "#FFF" : Colors.light.tint} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={voiceModal} transparent animationType="slide">
        <View style={styles.voiceOverlay}>
          <View style={[styles.voiceCard, { paddingBottom: botPad + 32 }]}>
            <TouchableOpacity onPress={() => { stopVoice(); setVoiceModal(false); }} style={styles.voiceClose}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={styles.voiceTitle}>{isListening ? "Listening..." : "Voice Search"}</Text>
            <Animated.View style={[styles.micCircle, { transform: [{ scale: micPulse }] }]}>
              <LinearGradient colors={[Colors.light.tint, "#0EA5E9"]} style={styles.micCircleInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="mic" size={42} color="#FFF" />
              </LinearGradient>
            </Animated.View>
            {voiceTranscript ? (
              <Text style={styles.voiceTranscript}>"{voiceTranscript}"</Text>
            ) : (
              <Text style={styles.voiceHint}>
                {isListening ? "Speak now..." : "Tap to start speaking"}
              </Text>
            )}
            {isListening ? (
              <TouchableOpacity style={styles.voiceStopBtn} onPress={stopVoice}>
                <Text style={styles.voiceStopText}>Stop</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.voiceStartBtn} onPress={startVoice}>
                <Ionicons name="mic" size={18} color="#FFF" />
                <Text style={styles.voiceStartText}>Tap to speak</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  loadStrip: { height: 3, backgroundColor: Colors.light.filterInactive, overflow: "hidden" },
  loadStripInner: { flex: 1 },
  listPad: { paddingHorizontal: 12, paddingTop: 10 },

  aiCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(162,210,255,0.6)",
    backgroundColor: "#FAFEFF",
    padding: 16,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  aiCardGradient: { ...StyleSheet.absoluteFillObject },
  aiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  aiSparkleWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(162,210,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiCardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
  },
  aiExpandBtn: { padding: 4 },
  aiSkeletonWrap: { gap: 8, marginBottom: 14 },
  aiSkeletonLine: {
    height: 14,
    backgroundColor: "rgba(162,210,255,0.3)",
    borderRadius: 4,
  },
  aiText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    color: Colors.light.text,
    lineHeight: 23,
    marginBottom: 14,
  },
  aiSources: { marginBottom: 10 },
  aiSourcesLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  aiSourcesScroll: {},
  aiSourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minWidth: 120,
    maxWidth: 160,
  },
  aiSourceFav: { width: 20, height: 20, borderRadius: 4 },
  aiSourceNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: Colors.light.tint,
  },
  aiSourceDomain: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.text,
  },
  aiListenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  aiListenText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.tint,
  },

  relatedCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 14,
    marginBottom: 14,
  },
  relatedTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 8,
  },
  relatedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 10,
  },
  relatedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  },
  relatedArrow: { transform: [{ rotate: "45deg" }] },

  resultCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textMuted,
    marginBottom: 8,
    marginLeft: 2,
  },

  resultCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "space-between",
  },
  cardMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  cardFav: { width: 20, height: 20, borderRadius: 4 },
  cardDomain: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  cardSource: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#1A73E8",
    lineHeight: 22,
    marginBottom: 6,
  },
  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  cardMedia: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginTop: 10,
  },
  priceTag: {
    marginTop: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  priceText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#059669",
  },
  publishedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 6,
  },

  imageCard: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.light.filterInactive,
    maxWidth: (width - 28) / 2,
  },
  imageThumb: { width: "100%", aspectRatio: 1 },
  imageFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 7,
  },
  imageFav: { width: 14, height: 14, borderRadius: 3 },
  imageDomain: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textSecondary,
    flex: 1,
  },

  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyLogoRow: { flexDirection: "row" },
  emptyLogo: {
    fontFamily: "Caveat_700Bold",
    fontSize: 42,
    letterSpacing: 2,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.light.text,
  },
  emptyMsg: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: Colors.light.tint,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFF",
  },

  bottomBar: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 10,
  },
  filterBar: { maxHeight: 52 },
  filterScroll: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 7,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.light.filterInactive,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterChipOn: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  filterLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  filterLabelOn: { color: "#FFF" },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 7,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.filterInactive,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.filterInactive,
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 4,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.text,
    height: "100%",
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(162,210,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
  },
  actionBtnLive: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },

  voiceOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  voiceCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 20,
  },
  voiceClose: { position: "absolute", right: 20, top: 16 },
  voiceTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.light.text,
    marginTop: 20,
  },
  micCircle: { width: 100, height: 100, borderRadius: 50, overflow: "hidden" },
  micCircleInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  voiceTranscript: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.light.text,
    textAlign: "center",
    fontStyle: "italic",
  },
  voiceHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  voiceStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.light.tint,
    borderRadius: 26,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  voiceStartText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFF",
  },
  voiceStopBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 26,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  voiceStopText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#EF4444",
  },
});
