import React, { useRef, useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Platform, Animated, Keyboard
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import Colors from "@/constants/colors";
import { useSearch } from "@/context/SearchContext";

const POPULAR = [
  "ChatGPT", "IPL 2025", "Elon Musk", "AI news",
  "India vs Australia", "Gold price today", "Viral video",
  "Weather today", "Stock market", "Cricket live score",
];

export default function SearchInputScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ voiceMode: string }>();
  const { history, search, settings, fetchSuggestions, suggestions } = useSearch();
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const inputRef = useRef<TextInput>(null);
  const micPulse = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useSpeechRecognitionEvent("result", (event) => {
    const t = event.results[0]?.transcript || "";
    setVoiceTranscript(t);
    setInputValue(t);
    if (event.isFinal && t) {
      setIsListening(false);
      micPulse.stopAnimation();
      doSearch(t);
    }
  });
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("error", () => setIsListening(false));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      if (params.voiceMode === "1") {
        startVoice();
      } else {
        inputRef.current?.focus();
      }
    }, 150);
  }, []);

  useEffect(() => {
    if (inputValue.length > 0) fetchSuggestions(inputValue);
  }, [inputValue]);

  function pulseMic() {
    Animated.loop(Animated.sequence([
      Animated.timing(micPulse, { toValue: 1.2, duration: 700, useNativeDriver: true }),
      Animated.timing(micPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
    ])).start();
  }

  async function startVoice() {
    try {
      const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!p.granted) { inputRef.current?.focus(); return; }
      setVoiceTranscript(""); setIsListening(true);
      pulseMic();
      ExpoSpeechRecognitionModule.start({ lang: settings.voiceLanguage || "en-IN", interimResults: true });
    } catch (_) {
      setIsListening(false);
      inputRef.current?.focus();
    }
  }

  function stopVoice() {
    ExpoSpeechRecognitionModule.stop();
    micPulse.stopAnimation();
    setIsListening(false);
    inputRef.current?.focus();
  }

  function doSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    search(trimmed, "all");
    router.replace({ pathname: "/search", params: { q: trimmed, filter: "all" } });
  }

  const displayList = inputValue.length > 0 ? suggestions : history.slice(0, 10);
  const isHistory = inputValue.length === 0;

  return (
    <Animated.View style={[styles.container, { paddingTop: topPad, opacity: fadeAnim }]}>
      <FlatList
        data={isHistory ? displayList as any : displayList}
        keyExtractor={(item, idx) => idx.toString()}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={[styles.listPad, { paddingBottom: botPad + 100 }]}
        ListHeaderComponent={
          POPULAR && inputValue.length === 0 ? (
            <View style={styles.popularSection}>
              <Text style={styles.sectionTitle}>Popular right now</Text>
              {POPULAR.map((term, idx) => (
                <TouchableOpacity key={idx} style={styles.popularRow} onPress={() => doSearch(term)}>
                  <View style={styles.fireIcon}>
                    <Ionicons name="trending-up-outline" size={16} color="#F59E0B" />
                  </View>
                  <Text style={styles.popularText}>{term}</Text>
                  <Ionicons name="arrow-up-outline" size={14} color={Colors.light.textMuted} style={{ transform: [{ rotate: "45deg" }] }} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const label = isHistory ? (item as any).query : (item as string);
          return (
            <TouchableOpacity style={styles.suggRow} onPress={() => doSearch(label)} activeOpacity={0.8}>
              <View style={styles.suggIcon}>
                <Ionicons
                  name={isHistory ? "time-outline" : "search-outline"}
                  size={16}
                  color={isHistory ? Colors.light.textSecondary : Colors.light.tint}
                />
              </View>
              <Text style={styles.suggText} numberOfLines={1}>{label}</Text>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setInputValue(label)}
              >
                <Ionicons name="arrow-up-outline" size={14} color={Colors.light.textMuted} style={{ transform: [{ rotate: "45deg" }] }} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          inputValue.length > 0 ? (
            <TouchableOpacity style={styles.directSearch} onPress={() => doSearch(inputValue)}>
              <Ionicons name="search" size={18} color={Colors.light.tint} />
              <Text style={styles.directText}>Search for "<Text style={{ color: Colors.light.tint }}>{inputValue}</Text>"</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <Animated.View style={[styles.bottomBar, { paddingBottom: botPad + 6, transform: [{ translateY: slideAnim }] }]}>
        {isListening ? (
          <View style={styles.listeningBar}>
            <Animated.View style={{ transform: [{ scale: micPulse }] }}>
              <Ionicons name="mic" size={24} color="#EF4444" />
            </Animated.View>
            <Text style={styles.listeningText}>
              {voiceTranscript || "Listening..."}
            </Text>
            <TouchableOpacity onPress={stopVoice} style={styles.stopBtn}>
              <Text style={styles.stopText}>Stop</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.searchRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={22} color={Colors.light.textSecondary} />
            </TouchableOpacity>

            <View style={styles.inputWrap}>
              <Ionicons name="search-outline" size={18} color={Colors.light.textSecondary} style={{ marginRight: 6 }} />
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={() => doSearch(inputValue)}
                placeholder="Search StreekX..."
                placeholderTextColor={Colors.light.textMuted}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>

            <TouchableOpacity
              style={[styles.micBtn, isListening && styles.micBtnActive]}
              onPress={isListening ? stopVoice : startVoice}
            >
              <Ionicons name={isListening ? "mic" : "mic-outline"} size={22} color={isListening ? "#FFF" : Colors.light.tint} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  listPad: { paddingHorizontal: 14, paddingTop: 10 },

  popularSection: { marginBottom: 8 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingHorizontal: 4,
  },
  popularRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 12,
  },
  fireIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(245,158,11,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  popularText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
  },

  suggRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 12,
  },
  suggIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center", justifyContent: "center",
  },
  suggText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
  },

  directSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  directText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },

  bottomBar: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 4,
    gap: 8,
  },
  cancelBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.light.filterInactive,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.filterInactive,
    borderRadius: 26,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.light.text,
    height: "100%",
  },
  micBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
  },
  micBtnActive: { backgroundColor: "#EF4444", borderColor: "#EF4444" },

  listeningBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 12,
    minHeight: 56,
  },
  listeningText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.light.text,
    fontStyle: "italic",
  },
  stopBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  stopText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#EF4444",
  },
});
