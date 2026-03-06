import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Share, Linking, Modal, TextInput, ActivityIndicator, ScrollView
} from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSearch } from "@/context/SearchContext";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export default function BrowserScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ url: string }>();
  const { saveItem } = useSearch();

  const [currentUrl, setCurrentUrl] = useState(params.url || "https://google.com");
  const [inputUrl, setInputUrl] = useState(params.url || "");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [desktopMode, setDesktopMode] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [urlBarFocused, setUrlBarFocused] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState(params.url || "");

  const webViewRef = useRef<WebView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  function getDomain(url: string): string {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url.slice(0, 30);
    }
  }

  function normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return currentUrl;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    if (trimmed.includes(".") && !trimmed.includes(" ")) return `https://${trimmed}`;
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }

  const handleNavigationChange = useCallback((nav: WebViewNavigation) => {
    setCurrentUrl(nav.url);
    setUrlInputValue(nav.url);
    setCanGoBack(nav.canGoBack);
    setCanGoForward(nav.canGoForward);
    setTitle(nav.title || getDomain(nav.url));
  }, []);

  async function handleShare() {
    setMenuVisible(false);
    try {
      await Share.share({ message: currentUrl, url: currentUrl });
    } catch (_) {}
  }

  async function handleCopyLink() {
    setMenuVisible(false);
    await Clipboard.setStringAsync(currentUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleDesktopToggle() {
    setMenuVisible(false);
    setDesktopMode(prev => !prev);
    webViewRef.current?.reload();
  }

  function handleTranslate() {
    setMenuVisible(false);
    const translateUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(currentUrl)}`;
    setCurrentUrl(translateUrl);
    setUrlInputValue(translateUrl);
  }

  function handleOpenInBrowser() {
    setMenuVisible(false);
    Linking.openURL(currentUrl);
  }

  function handleSavePage() {
    setMenuVisible(false);
    saveItem({
      id: Date.now().toString(),
      title: title || getDomain(currentUrl),
      url: currentUrl,
      description: `Saved from browser - ${getDomain(currentUrl)}`,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleUrlSubmit() {
    const url = normalizeUrl(urlInputValue);
    setCurrentUrl(url);
    setUrlInputValue(url);
    setUrlBarFocused(false);
  }

  const translateJs = `
    (function() {
      var script = document.createElement('script');
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(script);
    })();
  `;

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <View style={[styles.topBar, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
          <Ionicons name="close" size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={styles.titleText} numberOfLines={1}>
            {loading ? "Loading..." : getDomain(currentUrl)}
          </Text>
          {loading && <ActivityIndicator size="small" color={Colors.light.tint} style={{ marginLeft: 6 }} />}
        </View>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuVisible(true); }} style={styles.navBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>
      )}

      {Platform.OS === "web" ? (
        <View style={styles.webFallback}>
          <MaterialCommunityIcons name="web" size={48} color={Colors.light.textMuted} />
          <Text style={styles.webFallbackText}>WebView not available on web</Text>
          <TouchableOpacity
            style={styles.openInBrowserBtn}
            onPress={() => Linking.openURL(currentUrl)}
          >
            <Text style={styles.openInBrowserText}>Open in Browser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
          onNavigationStateChange={handleNavigationChange}
          userAgent={desktopMode ? DESKTOP_UA : MOBILE_UA}
          javaScriptEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures
          sharedCookiesEnabled
        />
      )}

      <View style={[styles.bottomBar, { paddingBottom: botPad }]}>
        <View style={styles.navButtons}>
          <TouchableOpacity
            onPress={() => webViewRef.current?.goBack()}
            style={[styles.navBtn, !canGoBack && styles.navBtnDisabled]}
            disabled={!canGoBack}
          >
            <Ionicons name="chevron-back" size={22} color={canGoBack ? Colors.light.text : Colors.light.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => webViewRef.current?.goForward()}
            style={[styles.navBtn, !canGoForward && styles.navBtnDisabled]}
            disabled={!canGoForward}
          >
            <Ionicons name="chevron-forward" size={22} color={canGoForward ? Colors.light.text : Colors.light.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.urlBar}
          onPress={() => setUrlBarFocused(true)}
          activeOpacity={0.85}
        >
          {urlBarFocused ? (
            <TextInput
              style={styles.urlInput}
              value={urlInputValue}
              onChangeText={setUrlInputValue}
              onSubmitEditing={handleUrlSubmit}
              onBlur={() => setUrlBarFocused(false)}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              selectTextOnFocus
            />
          ) : (
            <>
              <Ionicons name="lock-closed" size={12} color={Colors.light.textMuted} />
              <Text style={styles.urlText} numberOfLines={1}>
                {getDomain(currentUrl)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => webViewRef.current?.reload()} style={styles.navBtn}>
          <Ionicons name={loading ? "close-circle-outline" : "refresh-outline"} size={22} color={Colors.light.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMenuVisible(true); }}
          style={styles.navBtn}
        >
          <Ionicons name="share-outline" size={22} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <Modal visible={menuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuSheet, { paddingBottom: botPad + 16 }]}>
            <View style={styles.menuHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { icon: "share-social-outline", label: "Share", action: handleShare },
                { icon: "copy-outline", label: "Copy Link", action: handleCopyLink },
                { icon: "bookmark-outline", label: "Save Page", action: handleSavePage },
                { icon: desktopMode ? "phone-portrait-outline" : "desktop-outline", label: desktopMode ? "Mobile Site" : "Desktop Site", action: handleDesktopToggle },
                { icon: "language-outline", label: "Translate Page", action: handleTranslate },
                { icon: "open-outline", label: "Open in Browser", action: handleOpenInBrowser },
                { icon: "close-outline", label: "Close", action: () => { setMenuVisible(false); router.back(); } },
              ].map((item, idx) => (
                <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.action}>
                  <Ionicons name={item.icon as any} size={22} color={Colors.light.text} />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  titleArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  titleText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.text,
    maxWidth: "80%",
  },
  progressBarContainer: { height: 2, backgroundColor: Colors.light.filterInactive },
  progressBar: {
    height: "100%",
    backgroundColor: Colors.light.tint,
    borderRadius: 1,
  },
  webview: { flex: 1 },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: Colors.light.background,
  },
  webFallbackText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  openInBrowserBtn: {
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  openInBrowserText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFF",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 10,
    backgroundColor: Colors.light.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 4,
  },
  navButtons: { flexDirection: "row", gap: 2 },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: { opacity: 0.4 },
  urlBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.filterInactive,
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 36,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  urlText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.text,
    flex: 1,
  },
  urlInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.text,
    height: "100%",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.border,
    alignSelf: "center",
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  menuItemText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.light.text,
  },
});
