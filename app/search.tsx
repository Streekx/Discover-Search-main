import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList,
  StatusBar, Platform, ActivityIndicator, Image, Linking,
  Dimensions, Animated, Modal, ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
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

const FILTERS: { key: SearchFilter; label: string; icon: string }[] = [
  { key: "ai", label: "AI Mode", icon: "robot-outline" },
  { key: "all", label: "All", icon: "earth-outline" },
  { key: "images", label: "Images", icon: "image-outline" },
  { key: "videos", label: "Videos", icon: "play-circle-outline" },
  { key: "news", label: "News", icon: "newspaper-outline" },
  { key: "shopping", label: "Shopping", icon: "cart-outline" },
  { key: "books", label: "Books", icon: "book-outline" },
  { key: "maps", label: "Maps", icon: "map-outline" },
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.slice(0, 30);
  }
}

function getFavicon(url: string): string {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
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
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const micPulse = useRef(new Animated.Value(1)).current;

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript || "";
    setVoiceTranscript(transcript);
    if (event.isFinal && transcript) {
      setIsListening(false);
      setVoiceModal(false);
      setInputValue(transcript);
      search(transcript, activeFilter);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("error", () => {
    setIsListening(false);
  });

  useEffect(() => {
    const q = params.q?.trim();
    const f = (params.filter || "all") as SearchFilter;
    if (q) {
      search(q, f);
    }
    if (params.voiceMode === "1") {
      setTimeout(() => startVoiceSearch(), 500);
    }
  }, []);

  function startPulseAnim() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(micPulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }

  async function startVoiceSearch() {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        return;
      }
      setVoiceTranscript("");
      setVoiceModal(true);
      setIsListening(true);
      startPulseAnim();
      ExpoSpeechRecognitionModule.start({
        lang: settings.voiceLanguage || "en-IN",
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch (err) {
      setIsListening(false);
      setVoiceModal(true);
    }
  }

  function stopVoiceSearch() {
    ExpoSpeechRecognitionModule.stop();
    micPulse.stopAnimation();
    setIsListening(false);
  }

  function handleSearch() {
    const q = inputValue.trim();
    if (!q) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    search(q, activeFilter);
  }

  function handleFilterPress(f: SearchFilter) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(f);
    const q = inputValue.trim();
    if (q) search(q, f);
  }

  function openLink(url: string) {
    if (!url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (settings.openLinksInApp) {
      router.push({ pathname: "/browser", params: { url } });
    } else {
      Linking.openURL(url);
    }
  }

  function toggleSave(item: SearchResult) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isSaved(item.url)) {
      unsaveItem(item.url);
    } else {
      saveItem(item);
    }
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function renderAiOverview() {
    if (!aiOverview && !aiLoading) return null;
    return (
      <View style={styles.aiCard}>
        <View style={styles.aiCardHeader}>
          <MaterialCommunityIcons name="robot-excited-outline" size={18} color={Colors.light.tint} />
          <Text style={styles.aiCardTitle}>AI Overview</Text>
          {aiLoading && <ActivityIndicator size="small" color={Colors.light.tint} style={{ marginLeft: 8 }} />}
        </View>
        {aiOverview ? (
          <Text style={styles.aiCardText}>{aiOverview}</Text>
        ) : (
          <View style={styles.aiSkeletonLines}>
            <View style={[styles.aiSkeleton, { width: "95%" }]} />
            <View style={[styles.aiSkeleton, { width: "80%" }]} />
            <View style={[styles.aiSkeleton, { width: "70%" }]} />
          </View>
        )}
        {aiOverview && (
          <TouchableOpacity onPress={() => Speech.speak(aiOverview, { language: "en-IN" })} style={styles.aiSpeakBtn}>
            <Ionicons name="volume-medium-outline" size={16} color={Colors.light.tint} />
            <Text style={styles.aiSpeakText}>Listen</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderRelated() {
    if (!relatedSearches.length) return null;
    return (
      <View style={styles.relatedSection}>
        <Text style={styles.relatedTitle}>Related searches</Text>
        <View style={styles.relatedGrid}>
          {relatedSearches.map((term, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.relatedChip}
              onPress={() => { setInputValue(term); search(term, activeFilter); }}
            >
              <Ionicons name="search-outline" size={12} color={Colors.light.textSecondary} />
              <Text style={styles.relatedText}>{term}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  function renderImageResult({ item }: { item: SearchResult }) {
    const imageUri = item.media || item.url;
    return (
      <TouchableOpacity style={styles.imageCard} onPress={() => openLink(item.url)} activeOpacity={0.85}>
        <Image source={{ uri: imageUri }} style={styles.imageThumb} resizeMode="cover" />
        <Text style={styles.imageDomain} numberOfLines={1}>{getDomain(item.url)}</Text>
      </TouchableOpacity>
    );
  }

  function renderResultCard({ item }: { item: SearchResult }) {
    if (activeFilter === "images") return renderImageResult({ item });

    const saved = isSaved(item.url);
    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => openLink(item.url)}
        activeOpacity={0.85}
      >
        <View style={styles.resultHeader}>
          <Image source={{ uri: getFavicon(item.url) }} style={styles.favicon} />
          <View style={styles.resultMeta}>
            <Text style={styles.resultDomain} numberOfLines={1}>{getDomain(item.url)}</Text>
            {item.source && <Text style={styles.resultSource} numberOfLines={1}>{item.source}</Text>}
          </View>
          <TouchableOpacity onPress={() => toggleSave(item)} style={styles.saveBtn}>
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={18}
              color={saved ? Colors.light.tint : Colors.light.textMuted}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.resultDesc} numberOfLines={3}>{item.description}</Text>
        ) : null}

        {activeFilter === "shopping" && item.price ? (
          <View style={styles.priceTag}>
            <Ionicons name="pricetag-outline" size={13} color={Colors.light.tint} />
            <Text style={styles.priceText}>{item.price}</Text>
          </View>
        ) : null}
        {activeFilter === "news" && item.published ? (
          <Text style={styles.publishedText}>{item.published}</Text>
        ) : null}

        {item.media ? (
          <Image
            source={{ uri: item.media }}
            style={styles.resultMedia}
            resizeMode="cover"
          />
        ) : null}
      </TouchableOpacity>
    );
  }

  function renderEmpty() {
    if (isLoading) return null;
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.light.textMuted} />
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleSearch}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (inputValue && results.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={Colors.light.textMuted} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>Try different keywords</Text>
        </View>
      );
    }
    if (!inputValue) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="magnify" size={48} color={Colors.light.textMuted} />
          <Text style={styles.emptyTitle}>Search anything</Text>
          <Text style={styles.emptyText}>Enter a query to get started</Text>
        </View>
      );
    }
    return null;
  }

  const numColumns = activeFilter === "images" ? 2 : 1;
  const filterBarHeight = 56;
  const searchBarHeight = 72;
  const bottomBarTotal = filterBarHeight + searchBarHeight + bottomPad;

  return (
    <View style={[styles.container, { backgroundColor: Colors.light.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <View style={[styles.statusPad, { height: topPad }]} />

        {isLoading ? (
          <View style={styles.loadingBar}>
            <ActivityIndicator size="small" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResultCard}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomBarTotal + 16 },
          ]}
          ListHeaderComponent={() => (
            <>
              {renderAiOverview()}
              {renderRelated()}
              {results.length > 0 && (
                <Text style={styles.resultCount}>{results.length}+ results</Text>
              )}
            </>
          )}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.bottomBar, { paddingBottom: bottomPad }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            style={styles.filterBar}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
                onPress={() => handleFilterPress(f.key)}
              >
                <MaterialCommunityIcons
                  name={f.icon as any}
                  size={14}
                  color={activeFilter === f.key ? "#FFF" : Colors.light.textSecondary}
                />
                <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.searchBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
            <View style={styles.searchInputWrap}>
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={handleSearch}
                placeholder="Search StreekX..."
                placeholderTextColor={Colors.light.textMuted}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {inputValue.length > 0 && (
                <TouchableOpacity onPress={() => setInputValue("")} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={16} color={Colors.light.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push("/ai-assistant")}>
              <MaterialCommunityIcons name="robot-outline" size={20} color={Colors.light.tint} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={startVoiceSearch}>
              <Ionicons name={isListening ? "mic" : "mic-outline"} size={20} color={isListening ? "#EF4444" : Colors.light.tint} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={voiceModal} transparent animationType="slide">
        <View style={styles.voiceOverlay}>
          <View style={styles.voiceCard}>
            <TouchableOpacity onPress={() => { stopVoiceSearch(); setVoiceModal(false); }} style={styles.voiceClose}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={styles.voiceTitle}>
              {isListening ? "Listening..." : "Voice Search"}
            </Text>
            <Animated.View style={[styles.micCircle, { transform: [{ scale: micPulse }] }]}>
              <Ionicons name="mic" size={40} color="#FFF" />
            </Animated.View>
            {voiceTranscript ? (
              <Text style={styles.voiceTranscript}>"{voiceTranscript}"</Text>
            ) : (
              <Text style={styles.voiceHint}>Speak now to search</Text>
            )}
            {!isListening && (
              <TouchableOpacity style={styles.voiceStartBtn} onPress={startVoiceSearch}>
                <Text style={styles.voiceStartText}>Tap to speak</Text>
              </TouchableOpacity>
            )}
            {isListening && (
              <TouchableOpacity style={styles.voiceStopBtn} onPress={stopVoiceSearch}>
                <Text style={styles.voiceStopText}>Stop</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusPad: { backgroundColor: Colors.light.background },
  loadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
    backgroundColor: Colors.light.accentLight,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.tint,
  },
  listContent: { paddingHorizontal: 12, paddingTop: 8 },
  aiCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  aiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  aiCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.tint,
  },
  aiCardText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 22,
  },
  aiSkeletonLines: { gap: 8 },
  aiSkeleton: {
    height: 14,
    backgroundColor: Colors.light.accentLight,
    borderRadius: 4,
  },
  aiSpeakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  aiSpeakText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.tint,
  },
  relatedSection: { marginBottom: 12 },
  relatedTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 10,
  },
  relatedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relatedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.filterInactive,
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  relatedText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.text,
  },
  resultCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textMuted,
    marginBottom: 10,
    marginLeft: 4,
  },
  resultCard: {
    backgroundColor: Colors.light.backgroundCard,
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
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  favicon: { width: 18, height: 18, borderRadius: 4 },
  resultMeta: { flex: 1 },
  resultDomain: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  resultSource: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  saveBtn: { padding: 4 },
  resultTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.tint,
    lineHeight: 22,
    marginBottom: 6,
  },
  resultDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  resultMedia: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginTop: 10,
  },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
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
    maxWidth: (width - 32) / 2,
  },
  imageThumb: { width: "100%", aspectRatio: 1 },
  imageDomain: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textSecondary,
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
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
    paddingHorizontal: 40,
  },
  retryBtn: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFF",
  },
  bottomBar: {
    backgroundColor: Colors.light.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  filterBar: { maxHeight: 56 },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
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
  filterChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  filterText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  filterTextActive: { color: "#FFF" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
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
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    height: "100%",
  },
  clearBtn: { padding: 2 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  voiceCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 32,
    alignItems: "center",
    gap: 20,
  },
  voiceClose: { position: "absolute", right: 20, top: 20 },
  voiceTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.light.text,
    marginTop: 16,
  },
  micCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
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
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  voiceStartBtn: {
    backgroundColor: Colors.light.tint,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  voiceStartText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFF",
  },
  voiceStopBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  voiceStopText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#EF4444",
  },
});
