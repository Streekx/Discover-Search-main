import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Share, Linking, Modal, TextInput, ActivityIndicator, ScrollView, Dimensions
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSearch } from "@/context/SearchContext";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

const { width } = Dimensions.get("window");

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url.slice(0, 40); }
}

export default function BrowserScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ url: string }>();
  const { saveItem } = useSearch();

  const [currentUrl, setCurrentUrl] = useState(params.url || "https://google.com");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [desktopMode, setDesktopMode] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [urlFocused, setUrlFocused] = useState(false);
  const [urlDraft, setUrlDraft] = useState(params.url || "");
  const [pageTitle, setPageTitle] = useState("");

  const webViewRef = useRef<WebView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const onNavigationChange = useCallback((nav: WebViewNavigation) => {
    setCurrentUrl(nav.url);
    setUrlDraft(nav.url);
    setCanGoBack(nav.canGoBack);
    setCanGoForward(nav.canGoForward);
    setPageTitle(nav.title || getDomain(nav.url));
  }, []);

  function normalizeUrl(raw: string): string {
    const t = raw.trim();
    if (!t) return currentUrl;
    if (t.startsWith("http://") || t.startsWith("https://")) return t;
    if (t.includes(".") && !t.includes(" ")) return `https://${t}`;
    return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
  }

  function submitUrl() {
    const url = normalizeUrl(urlDraft);
    setCurrentUrl(url);
    setUrlDraft(url);
    setUrlFocused(false);
  }

  async function handleShare() {
    setMenuVisible(false);
    try { await Share.share({ message: currentUrl, url: currentUrl }); } catch (_) {}
  }

  async function handleCopy() {
    setMenuVisible(false);
    await Clipboard.setStringAsync(currentUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleSave() {
    setMenuVisible(false);
    saveItem({
      id: Date.now().toString(),
      title: pageTitle || getDomain(currentUrl),
      url: currentUrl,
      description: `Saved from ${getDomain(currentUrl)}`,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleDesktop() {
    setMenuVisible(false);
    setDesktopMode(d => !d);
    setTimeout(() => webViewRef.current?.reload(), 100);
  }

  function handleTranslate() {
    setMenuVisible(false);
    const url = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(currentUrl)}`;
    setCurrentUrl(url);
    setUrlDraft(url);
  }

  function handleOpenBrowser() {
    setMenuVisible(false);
    Linking.openURL(currentUrl);
  }

  const menuOptions = [
    { icon: "arrow-undo-outline", label: "Back to Search", action: () => { setMenuVisible(false); router.back(); } },
    { icon: "share-social-outline", label: "Share", action: handleShare },
    { icon: "copy-outline", label: "Copy Link", action: handleCopy },
    { icon: "bookmark-outline", label: "Save Page", action: handleSave },
    { icon: desktopMode ? "phone-portrait-outline" : "desktop-outline", label: desktopMode ? "Mobile Site" : "Desktop Site", action: handleDesktop },
    { icon: "language-outline", label: "Translate Page", action: handleTranslate },
    { icon: "open-outline", label: "Open in Browser", action: handleOpenBrowser },
  ];

  return (
    <View style={styles.container}>
      <View style={{ height: topPad, backgroundColor: "rgba(5,4,15,0.96)" }} />

      {loading && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}

      {Platform.OS === "web" ? (
        <View style={styles.webFallback}>
          <Ionicons name="globe-outline" size={52} color={Colors.light.textMuted} />
          <Text style={styles.webFallbackTitle}>Can't show this page here</Text>
          <TouchableOpacity style={styles.openBtn} onPress={() => Linking.openURL(currentUrl)}>
            <Text style={styles.openBtnText}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          style={styles.webview}
          onLoadStart={() => { setLoading(true); setProgress(0); }}
          onLoadEnd={() => setLoading(false)}
          onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
          onNavigationStateChange={onNavigationChange}
          userAgent={desktopMode ? DESKTOP_UA : MOBILE_UA}
          javaScriptEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures
          sharedCookiesEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onError={() => setLoading(false)}
        />
      )}

      <View style={[styles.bottomBar, { paddingBottom: botPad + 6 }]}>
        <TouchableOpacity
          onPress={() => { if (canGoBack) webViewRef.current?.goBack(); else router.back(); }}
          style={styles.navBtn}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={canGoBack ? "rgba(255,255,255,0.85)" : "#6EB4FF"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { if (canGoForward) webViewRef.current?.goForward(); }}
          style={[styles.navBtn, !canGoForward && styles.navBtnDim]}
          disabled={!canGoForward}
        >
          <Ionicons name="chevron-forward" size={22} color={canGoForward ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.30)"} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.urlBar} onPress={() => setUrlFocused(true)} activeOpacity={0.85}>
          {urlFocused ? (
            <TextInput
              style={styles.urlInput}
              value={urlDraft}
              onChangeText={setUrlDraft}
              onSubmitEditing={submitUrl}
              onBlur={() => setUrlFocused(false)}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              selectTextOnFocus
            />
          ) : (
            <View style={styles.urlDisplay}>
              {loading ? (
                <ActivityIndicator size="small" color={Colors.light.tint} style={{ marginRight: 6 }} />
              ) : (
                <Ionicons name="lock-closed" size={11} color="#22C55E" style={{ marginRight: 4 }} />
              )}
              <Text style={styles.urlText} numberOfLines={1}>{getDomain(currentUrl)}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { if (loading) webViewRef.current?.stopLoading(); else webViewRef.current?.reload(); }}
          style={styles.navBtn}
        >
          <Ionicons
            name={loading ? "close-circle-outline" : "refresh-outline"}
            size={20}
            color="rgba(255,255,255,0.75)"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuVisible(true); }}
          style={styles.navBtn}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>

      <Modal visible={menuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuSheet, { paddingBottom: botPad + 16 }]}>
            <View style={styles.handle} />
            <View style={styles.menuPageInfo}>
              <Ionicons name="globe-outline" size={18} color="rgba(255,255,255,0.50)" />
              <Text style={styles.menuPageTitle} numberOfLines={1}>
                {pageTitle || getDomain(currentUrl)}
              </Text>
            </View>
            <View style={styles.menuSeparator} />
            {menuOptions.map((opt, idx) => (
              <TouchableOpacity key={idx} style={styles.menuItem} onPress={opt.action} activeOpacity={0.7}>
                <View style={styles.menuIcon}>
                  <Ionicons name={opt.icon as any} size={20} color="#6EB4FF" />
                </View>
                <Text style={styles.menuLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05050A" },
  progressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.08)" },
  progressFill: { height: "100%", backgroundColor: "#6EB4FF", borderRadius: 1.5 },
  webview: { flex: 1 },
  webFallback: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: 16, backgroundColor: "#05050A",
  },
  webFallbackTitle: {
    fontFamily: "Inter_500Medium", fontSize: 17, color: "rgba(255,255,255,0.85)",
  },
  openBtn: {
    backgroundColor: "#1E6FD9", borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  openBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FFF" },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingTop: 10,
    backgroundColor: "rgba(5,4,15,0.96)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDim: { opacity: 0.4 },
  urlBar: {
    flex: 1,
    height: 38,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 20,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  urlDisplay: { flexDirection: "row", alignItems: "center" },
  urlText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.80)",
    flex: 1,
  },
  urlInput: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#FFFFFF",
    height: "100%",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#0D0B1E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignSelf: "center",
    marginBottom: 14,
  },
  menuPageInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  menuPageTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.80)",
    flex: 1,
  },
  menuSeparator: { height: 1, backgroundColor: "rgba(255,255,255,0.10)", marginHorizontal: 8, marginBottom: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(110,180,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
  },
});
