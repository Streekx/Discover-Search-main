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
import { useSearch, SearchFilter, SearchResult } from "@/context/SearchContext";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import GalaxyBackground from "@/components/GalaxyBackground";

const PLACEHOLDER_IMAGE = require("@/assets/images/icon.png");

const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== "string") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const { width } = Dimensions.get("window");

const FILTERS: { key: SearchFilter; label: string }[] = [
  { key: "all",      label: "Web" },
  { key: "images",   label: "Images" },
  { key: "news",     label: "News" },
  { key: "videos",   label: "Videos" },
  { key: "maps",     label: "Maps" },
  { key: "shopping", label: "Shopping" },
  { key: "books",    label: "More" },
];

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url.slice(0, 30); }
}
function getUrlBreadcrumb(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return u.hostname.replace("www.", "");
    return u.hostname.replace("www.", "") + " › " + parts.slice(0, 2).join(" › ");
  } catch { return url.slice(0, 40); }
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
  const [selectedImage, setSelectedImage] = useState<{ item: SearchResult; src: string } | null>(null);
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

  function KnowledgeCard() {
    if (!aiOverview && !aiLoading) return null;
    const topSrc = results[0];

    return (
      <View style={styles.knowledgeCard}>
        {aiLoading && !aiOverview ? (
          <View style={styles.knowledgeSkeleton}>
            {[70, 90, 80, 60].map((w, i) => (
              <View key={i} style={[styles.skeletonLine, { width: `${w}%` }]} />
            ))}
          </View>
        ) : (
          <>
            <Text style={styles.knowledgeTitle} numberOfLines={2}>
              {query ? query.charAt(0).toUpperCase() + query.slice(1) : ""}
            </Text>
            {topSrc && (
              <Text style={styles.knowledgeSubtitle} numberOfLines={1}>
                {getDomain(topSrc.url)}
              </Text>
            )}
            {topSrc && isValidImageUrl(topSrc.media) && (
              <Image
                source={{ uri: topSrc.media! }}
                style={styles.knowledgeImage}
                resizeMode="cover"
                onError={() => null}
              />
            )}
            <Text style={styles.knowledgeDesc}>{aiOverview}</Text>

            {topSrc && (
              <View style={styles.knowledgeSourceRow}>
                <TouchableOpacity
                  style={styles.wikiChip}
                  onPress={() => openLink(topSrc.url)}
                >
                  <View style={styles.wikiIconBox}>
                    <Text style={styles.wikiIconText}>W</Text>
                  </View>
                  <Text style={styles.wikiChipText}>{getDomain(topSrc.url)}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.knowledgeFooter}>
              <Text style={styles.knowledgeSource}>
                Source:{" "}
                {topSrc ? (
                  <Text style={styles.knowledgeSourceLink} onPress={() => topSrc && openLink(topSrc.url)}>
                    {getDomain(topSrc.url)}
                  </Text>
                ) : null}
              </Text>
              <View style={styles.feedbackBtns}>
                <TouchableOpacity style={styles.feedbackBtn}>
                  <Ionicons name="thumbs-up-outline" size={18} color="#5f6368" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.feedbackBtn}>
                  <Ionicons name="thumbs-down-outline" size={18} color="#5f6368" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    );
  }

  function RegionFilterRow() {
    return (
      <View style={styles.regionRow}>
        <TouchableOpacity style={styles.regionPill}>
          <Text style={styles.regionText}>
            Search region: {settings.region || "India"}
          </Text>
          <Ionicons name="chevron-down" size={13} color="#444" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.regionPill}>
          <Text style={styles.regionText}>Any time</Text>
          <Ionicons name="chevron-down" size={13} color="#444" />
        </TouchableOpacity>
      </View>
    );
  }

  function RelatedSearches() {
    if (!relatedSearches.length) return null;
    return (
      <View style={styles.relatedCard}>
        <Text style={styles.relatedTitle}>Searches related to {query}</Text>
        {relatedSearches.map((term, idx) => {
          const parts = term.split(new RegExp(`(${query})`, "gi"));
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.relatedRow, idx === relatedSearches.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => { setInputValue(term); search(term, activeFilter); }}
            >
              <Ionicons name="search-outline" size={16} color="#5f6368" style={{ marginRight: 12 }} />
              <Text style={styles.relatedText} numberOfLines={1}>
                {parts.map((p, pi) =>
                  p.toLowerCase() === query.toLowerCase()
                    ? <Text key={pi} style={styles.relatedTextNormal}>{p}</Text>
                    : <Text key={pi} style={styles.relatedTextBold}>{p}</Text>
                )}
              </Text>
              <Ionicons name="search-outline" size={15} color="#5f6368" style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  function NextPageButton() {
    return (
      <View style={styles.nextPageWrap}>
        <TouchableOpacity style={styles.nextPageBtn} onPress={() => handleSearch()}>
          <Text style={styles.nextPageText}>Next</Text>
          <Ionicons name="arrow-forward" size={16} color="#333" />
        </TouchableOpacity>
      </View>
    );
  }

  function ImageResult({ item }: { item: SearchResult }) {
    const src = item.media || item.url;
    const [err, setErr] = useState(false);
    return (
      <TouchableOpacity
        style={styles.imageCard}
        onPress={() => setSelectedImage({ item, src: isValidImageUrl(src) ? src! : "" })}
        activeOpacity={0.82}
      >
        <Image
          source={!err && isValidImageUrl(src) ? { uri: src } : PLACEHOLDER_IMAGE}
          style={styles.imageThumb}
          resizeMode="cover"
          onError={() => setErr(true)}
        />
        <View style={styles.imageFooter}>
          <Image source={{ uri: getFavicon(item.url) }} style={styles.imageFav} onError={() => null} />
          <Text style={styles.imageDomain} numberOfLines={1}>{getDomain(item.url)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function VideoResult({ item }: { item: SearchResult }) {
    const [err, setErr] = useState(false);
    const mediaSource = !err && isValidImageUrl(item.media) ? { uri: item.media! } : PLACEHOLDER_IMAGE;
    return (
      <TouchableOpacity style={styles.videoRow} onPress={() => openLink(item.url)} activeOpacity={0.85}>
        <View style={styles.videoThumbWrap}>
          <Image
            source={mediaSource}
            style={styles.videoThumb}
            resizeMode="cover"
            onError={() => setErr(true)}
          />
          <View style={styles.videoPlayOverlay}>
            <View style={styles.videoPlayCircle}>
              <Ionicons name="play" size={14} color="#fff" />
            </View>
          </View>
          {item.published && (
            <View style={styles.videoDuration}>
              <Text style={styles.videoDurationText}>{item.published.slice(0, 5)}</Text>
            </View>
          )}
        </View>
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.videoSource} numberOfLines={1}>{getDomain(item.url)}</Text>
          {item.published && <Text style={styles.videoDate} numberOfLines={1}>{item.published}</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  function ResultCard({ item, index }: { item: SearchResult; index: number }) {
    if (activeFilter === "images") return <ImageResult item={item} />;
    if (activeFilter === "videos") {
      return (
        <View>
          <VideoResult item={item} />
          <View style={styles.separator} />
        </View>
      );
    }
    const faviconSource = isValidImageUrl(getFavicon(item.url)) ? { uri: getFavicon(item.url) } : PLACEHOLDER_IMAGE;
    const mediaSource = isValidImageUrl(item.media) ? { uri: item.media } : PLACEHOLDER_IMAGE;

    return (
      <TouchableOpacity style={styles.resultCard} onPress={() => openLink(item.url)} activeOpacity={0.85}>
        <View style={styles.cardMeta}>
          <Image source={faviconSource} style={styles.cardFav} onError={() => null} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardSource} numberOfLines={1}>{getDomain(item.url)}</Text>
            <Text style={styles.cardBreadcrumb} numberOfLines={1}>{getUrlBreadcrumb(item.url)}</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-vertical" size={18} color="#5f6368" />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.description ? <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text> : null}
        {item.media && isValidImageUrl(item.media) ? (
          <View style={styles.cardMediaRow}>
            <Image source={mediaSource} style={styles.cardMedia} resizeMode="cover" onError={() => null} />
            <Text style={styles.cardMediaCaption} numberOfLines={3}>{item.description}</Text>
          </View>
        ) : null}
        {activeFilter === "shopping" && item.price ? (
          <Text style={styles.priceText}>{item.price}</Text>
        ) : null}
        {activeFilter === "news" && item.published ? (
          <Text style={styles.publishedText}>{getDomain(item.url)} · {item.published}</Text>
        ) : null}
        <View style={styles.separator} />
      </TouchableOpacity>
    );
  }

  function ListHeader() {
    const isFilteredView = activeFilter !== "all";
    if (activeFilter === "videos") {
      return (
        <>
          <RegionFilterRow />
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Videos</Text>
          </View>
        </>
      );
    }
    return (
      <>
        <RegionFilterRow />
        {!isFilteredView && <KnowledgeCard />}
        {!isFilteredView && results.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>Web Results</Text>
          </View>
        )}
      </>
    );
  }

  function ListFooter() {
    if (!results.length) return null;
    return (
      <>
        <RelatedSearches />
        <NextPageButton />
      </>
    );
  }

  function EmptyState() {
    if (isLoading) return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="small" color="#5f6368" />
      </View>
    );
    if (error) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color="#bbb" />
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
          <Ionicons name="search-outline" size={48} color="#bbb" />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyMsg}>Try different keywords or check your connection</Text>
        </View>
      );
    }
    if (!inputValue) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyBrand}>STREEKX</Text>
          <Text style={styles.emptyMsg}>Enter a query to search</Text>
        </View>
      );
    }
    return null;
  }

  const numCols = activeFilter === "images" ? 2 : 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <GalaxyBackground />
      <View style={{ height: topPad, backgroundColor: "transparent" }} />

      <View style={styles.header}>
        <Text style={styles.headerBrand}>STREEKX</Text>

        <View style={styles.headerRight}>
          <View style={styles.leafWrap}>
            <Text style={styles.leafEmoji}>🌿</Text>
            <Text style={styles.leafCount}>2</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push("/ai-assistant")}>
            <Ionicons name="person" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadStrip}>
          <View style={styles.loadStripInner} />
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <ResultCard item={item} index={index} />}
          numColumns={numCols}
          key={numCols}
          contentContainerStyle={[styles.listPad, { paddingBottom: 20 }]}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={results.length > 0 ? <ListFooter /> : null}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        <View style={[styles.bottomBar, { paddingBottom: botPad }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            style={styles.filterBar}
          >
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={styles.filterTab}
                  onPress={() => handleFilter(f.key)}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {f.label}
                  </Text>
                  {isActive && <View style={styles.filterTabUnderline} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.searchRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>

            <View style={styles.searchInputWrap}>
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={() => handleSearch()}
                placeholder="Search StreekX..."
                placeholderTextColor="rgba(255,255,255,0.38)"
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {inputValue.length > 0 && (
                <TouchableOpacity onPress={() => setInputValue("")} style={styles.clearBtn}>
                  <Ionicons name="close" size={18} color="#5f6368" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => inputValue.length > 0 ? handleSearch() : router.push("/ai-assistant")}
                style={styles.searchIconBtn}
              >
                {inputValue.length > 0 ? (
                  <Ionicons name="search" size={20} color="#5f6368" />
                ) : (
                  <MaterialCommunityIcons name="robot-excited-outline" size={20} color="#A2D2FF" />
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.micBtn, isListening && styles.micBtnActive]} onPress={startVoice}>
              <Ionicons name={isListening ? "mic" : "mic-outline"} size={20} color={isListening ? "#fff" : "#5f6368"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={voiceModal} transparent animationType="slide">
        <View style={styles.voiceOverlay}>
          <View style={[styles.voiceCard, { paddingBottom: botPad + 32 }]}>
            <TouchableOpacity onPress={() => { stopVoice(); setVoiceModal(false); }} style={styles.voiceClose}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <Text style={styles.voiceTitle}>{isListening ? "Listening..." : "Voice Search"}</Text>
            <Animated.View style={[styles.micCircle, { transform: [{ scale: micPulse }] }]}>
              <LinearGradient colors={["#A2D2FF", "#6ABAFF"]} style={styles.micCircleInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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

      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imgModalOverlay}>
          <TouchableOpacity style={styles.imgModalClose} onPress={() => setSelectedImage(null)}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <View style={styles.imgModalContent}>
              <Image
                source={isValidImageUrl(selectedImage.src) ? { uri: selectedImage.src } : PLACEHOLDER_IMAGE}
                style={styles.imgModalFull}
                resizeMode="contain"
              />
              <View style={styles.imgModalInfo}>
                <Image
                  source={{ uri: getFavicon(selectedImage.item.url) }}
                  style={styles.imgModalFav}
                  onError={() => null}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.imgModalTitle} numberOfLines={2}>{selectedImage.item.title}</Text>
                  <Text style={styles.imgModalDomain}>{getDomain(selectedImage.item.url)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.imgVisitBtn}
                onPress={() => { openLink(selectedImage.item.url); setSelectedImage(null); }}
              >
                <Ionicons name="open-outline" size={16} color="#FFF" />
                <Text style={styles.imgVisitText}>Visit Page</Text>
              </TouchableOpacity>
            </View>
          )}
          {results.filter(r => r.id !== selectedImage?.item.id && isValidImageUrl(r.media)).length > 0 && (
            <View style={styles.relatedImgsWrap}>
              <Text style={styles.relatedImgsTitle}>Related Images</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {results
                  .filter(r => r.id !== selectedImage?.item.id && isValidImageUrl(r.media))
                  .slice(0, 8)
                  .map(r => (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => setSelectedImage({ item: r, src: r.media! })}
                    >
                      <Image
                        source={{ uri: r.media }}
                        style={styles.relatedImg}
                        resizeMode="cover"
                        onError={() => null}
                      />
                    </TouchableOpacity>
                  ))
                }
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05050A" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
  },
  headerBrand: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_800Black",
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leafWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  leafEmoji: { fontSize: 18 },
  leafCount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  profileBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  loadStrip: { height: 2, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  loadStripInner: { flex: 1, backgroundColor: "#6EB4FF" },

  listPad: { paddingTop: 0 },

  regionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  regionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  regionText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.70)",
    fontFamily: "Inter_400Regular",
  },

  knowledgeCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.10)",
    marginBottom: 4,
  },
  knowledgeSkeleton: { gap: 10, paddingBottom: 20 },
  skeletonLine: {
    height: 13,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 3,
  },
  knowledgeTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  knowledgeSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  knowledgeImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  knowledgeDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginBottom: 14,
  },
  knowledgeSourceRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  wikiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  wikiIconBox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  wikiIconText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  wikiChipText: {
    fontSize: 13,
    color: "#7DC3FF",
    fontFamily: "Inter_400Regular",
  },
  knowledgeFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  knowledgeSource: {
    fontSize: 12,
    color: "rgba(255,255,255,0.50)",
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  knowledgeSourceLink: {
    color: "#7DC3FF",
    textDecorationLine: "underline",
  },
  feedbackBtns: {
    flexDirection: "row",
    gap: 4,
  },
  feedbackBtn: {
    padding: 6,
  },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_400Regular",
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 16,
  },

  resultCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  cardFav: { width: 18, height: 18, borderRadius: 9 },
  cardSource: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_400Regular",
  },
  cardBreadcrumb: {
    fontSize: 12,
    color: "rgba(255,255,255,0.42)",
    fontFamily: "Inter_400Regular",
  },
  moreBtn: { marginLeft: "auto", padding: 4 },
  cardTitle: {
    fontSize: 18,
    color: "#7DC3FF",
    fontFamily: "Inter_400Regular",
    lineHeight: 24,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    marginBottom: 10,
  },
  cardMediaRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  cardMedia: {
    width: 120,
    height: 80,
    borderRadius: 6,
  },
  cardMediaCaption: {
    flex: 1,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  priceText: {
    fontSize: 14,
    color: "#4CAF50",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  publishedText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.42)",
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },

  videoRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  videoThumbWrap: {
    width: 130,
    height: 88,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#000",
    flexShrink: 0,
  },
  videoThumb: { width: "100%", height: "100%" },
  videoPlayOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoDuration: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  videoDurationText: {
    fontSize: 11,
    color: "#fff",
    fontFamily: "Inter_400Regular",
  },
  videoInfo: { flex: 1 },
  videoTitle: {
    fontSize: 15,
    color: "#7DC3FF",
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginBottom: 4,
  },
  videoSource: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  videoDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.40)",
    fontFamily: "Inter_400Regular",
  },

  imageCard: {
    flex: 1,
    margin: 3,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    maxWidth: (width - 18) / 2,
  },
  imageThumb: { width: "100%", aspectRatio: 1 },
  imageFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 6,
    backgroundColor: "rgba(10,8,25,0.88)",
  },
  imageFav: { width: 14, height: 14, borderRadius: 7 },
  imageDomain: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    flex: 1,
  },

  relatedCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingTop: 14,
    paddingBottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.10)",
    marginTop: 8,
  },
  relatedTitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  relatedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  relatedText: {
    fontSize: 14,
    flex: 1,
    fontFamily: "Inter_400Regular",
  },
  relatedTextNormal: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
  },
  relatedTextBold: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },

  nextPageWrap: {
    alignItems: "center",
    paddingVertical: 28,
  },
  nextPageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  nextPageText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
  },

  loadingWrap: {
    paddingTop: 60,
    alignItems: "center",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 14,
    paddingHorizontal: 40,
  },
  emptyBrand: {
    fontFamily: "Inter_800Black",
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  emptyTitle: {
    fontSize: 17,
    color: "rgba(255,255,255,0.90)",
    fontFamily: "Inter_600SemiBold",
  },
  emptyMsg: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 28,
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
  },

  bottomBar: {
    backgroundColor: "rgba(4,3,14,0.94)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  filterBar: { maxHeight: 44 },
  filterScroll: {
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: "center",
    position: "relative",
  },
  filterTabText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.50)",
    fontFamily: "Inter_400Regular",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  filterTabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 6,
    right: 6,
    height: 2.5,
    backgroundColor: "#6EB4FF",
    borderRadius: 2,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 28,
    paddingHorizontal: 16,
    height: 46,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#FFFFFF",
    fontFamily: "Inter_400Regular",
    height: "100%",
  },
  clearBtn: {
    padding: 4,
    marginRight: 4,
  },
  searchIconBtn: {
    padding: 4,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnActive: {
    backgroundColor: "#ea4335",
  },

  voiceOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  voiceCard: {
    backgroundColor: "#0D0B1E",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingTop: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 20,
  },
  voiceClose: { position: "absolute", right: 20, top: 16 },
  voiceTitle: {
    fontSize: 17,
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    marginTop: 20,
  },
  micCircle: { width: 96, height: 96, borderRadius: 48, overflow: "hidden" },
  micCircleInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceTranscript: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    fontStyle: "italic",
  },
  voiceHint: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_400Regular",
  },
  voiceStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#6EB4FF",
    borderRadius: 26,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  voiceStartText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  voiceStopBtn: {
    backgroundColor: "rgba(234,67,53,0.20)",
    borderRadius: 26,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  voiceStopText: {
    fontSize: 15,
    color: "#ea4335",
    fontFamily: "Inter_600SemiBold",
  },

  imgModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.93)",
    justifyContent: "center",
  },
  imgModalClose: {
    position: "absolute",
    top: 52, right: 18,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
  },
  imgModalContent: {
    paddingHorizontal: 12,
    paddingTop: 60,
  },
  imgModalFull: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 14,
  },
  imgModalInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  imgModalFav: { width: 22, height: 22, borderRadius: 11 },
  imgModalTitle: {
    fontSize: 14,
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  imgModalDomain: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  imgVisitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#A2D2FF",
    borderRadius: 22,
    paddingVertical: 12,
    marginHorizontal: 4,
    marginBottom: 20,
  },
  imgVisitText: {
    fontSize: 15,
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
  },
  relatedImgsWrap: {
    paddingHorizontal: 14,
    paddingBottom: 32,
  },
  relatedImgsTitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  relatedImg: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
});
