import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Platform, ActivityIndicator, Animated, Dimensions, Image
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSearch } from "@/context/SearchContext";

const { width } = Dimensions.get("window");
const BASE_URL = "https://streekxkk-streekx.hf.space";

interface Message {
  id: string;
  type: "user" | "assistant";
  text: string;
  sources?: { title: string; url: string; domain: string; favicon: string }[];
  timestamp: number;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}
function getFavicon(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=32`;
}

function OrbAnimation({ isActive }: { isActive: boolean }) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse1, { toValue: 1.25, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse1, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.delay(267),
        Animated.timing(pulse2, { toValue: 1.35, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse2, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.delay(534),
        Animated.timing(pulse3, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse3, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])).start();
      Animated.loop(
        Animated.timing(rotate, { toValue: 1, duration: 3000, useNativeDriver: true })
      ).start();
      Animated.loop(Animated.sequence([
        Animated.timing(glow, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])).start();
    } else {
      pulse1.stopAnimation(); pulse2.stopAnimation(); pulse3.stopAnimation();
      rotate.stopAnimation(); glow.stopAnimation();
      pulse1.setValue(1); pulse2.setValue(1); pulse3.setValue(1); glow.setValue(0.3);
    }
  }, [isActive]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={orbStyles.container}>
      <Animated.View style={[orbStyles.ring3, { transform: [{ scale: pulse3 }], opacity: glow }]} />
      <Animated.View style={[orbStyles.ring2, { transform: [{ scale: pulse2 }] }]} />
      <Animated.View style={[orbStyles.ring1, { transform: [{ scale: pulse1 }] }]}>
        <Animated.View style={{ transform: [{ rotate: spin }], borderRadius: 40, overflow: "hidden", width: "100%", height: "100%" }}>
          <LinearGradient
            colors={isActive ? ["#1E6FD9", "#0EA5E9", "#A2D2FF", "#1E6FD9"] : ["#E2E8F0", "#CBD5E1"]}
            style={orbStyles.grad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <MaterialCommunityIcons
          name={isActive ? "creation" : "robot-excited-outline"}
          size={28}
          color={isActive ? "#FFF" : Colors.light.textSecondary}
          style={orbStyles.icon}
        />
      </Animated.View>
    </View>
  );
}

const orbStyles = StyleSheet.create({
  container: { width: 100, height: 100, alignItems: "center", justifyContent: "center" },
  ring3: {
    position: "absolute",
    width: 100, height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(162,210,255,0.15)",
  },
  ring2: {
    position: "absolute",
    width: 82, height: 82,
    borderRadius: 41,
    backgroundColor: "rgba(162,210,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(162,210,255,0.4)",
  },
  ring1: {
    width: 68, height: 68,
    borderRadius: 34,
    overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  grad: { ...StyleSheet.absoluteFillObject },
  icon: { position: "absolute" },
});

export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useSearch();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      text: "Hi! I'm StreekX AI. Ask me anything — I'll search the web and give you a smart answer. Tap the mic to speak!",
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useSpeechRecognitionEvent("result", (event) => {
    const t = event.results[0]?.transcript || "";
    if (event.isFinal && t) {
      setIsListening(false);
      setInputText(t);
      sendMessage(t);
    }
  });
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("error", () => setIsListening(false));

  async function startListening() {
    try {
      const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!p.granted) return;
      setIsListening(true);
      ExpoSpeechRecognitionModule.start({ lang: settings.voiceLanguage || "en-IN", interimResults: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) { setIsListening(false); }
  }

  function stopListening() {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
  }

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText || inputText).trim();
    if (!text) return;

    setInputText("");
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      type: "user",
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(
        `${BASE_URL}/search?q=${encodeURIComponent(text)}&filter=all`,
        { signal: controller.signal, headers: { Accept: "application/json" } }
      );
      clearTimeout(id);
      const data = await res.json();
      let raw: any[] = Array.isArray(data) ? data : (data.results || []);

      const withDesc = raw.filter((i: any) =>
        i.description &&
        i.description !== "No description." &&
        i.description !== "N/A" &&
        i.description.length > 30
      );

      let answer = "";
      if (withDesc.length > 0) {
        const combined = withDesc.slice(0, 5).map((i: any) => i.description).join(" ");
        const sentences = combined.match(/[^.!?]+[.!?]+/g) || [];
        answer = sentences.slice(0, 4).join(" ").trim() || combined.slice(0, 400);
      } else if (raw.length > 0) {
        answer = `Based on search results, here are the top findings about "${text}": ${raw.slice(0, 3).map((i: any) => i.title).join(", ")}.`;
      } else {
        answer = `I couldn't find specific information about "${text}". Try rephrasing your question.`;
      }

      const sources = raw.slice(0, 3).map((i: any) => ({
        title: i.title || "",
        url: i.url || i.link || "",
        domain: getDomain(i.url || i.link || ""),
        favicon: getFavicon(i.url || i.link || ""),
      }));

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        text: answer,
        sources,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

      if (settings.voiceLanguage) {
        setIsSpeaking(true);
        Speech.speak(answer, {
          language: settings.voiceLanguage || "en-IN",
          rate: 0.92,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      }
    } catch (err: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        text: err.name === "AbortError"
          ? "The search timed out. Please try again."
          : "Sorry, I couldn't connect. Please check your internet connection.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [inputText, settings.voiceLanguage]);

  function toggleSpeak(text: string) {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(text, {
        language: settings.voiceLanguage || "en-IN",
        rate: 0.92,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function renderMessage({ item }: { item: Message }) {
    if (item.type === "user") {
      return (
        <View style={[styles.bubble, styles.userBubble]}>
          <Text style={styles.userText}>{item.text}</Text>
        </View>
      );
    }
    return (
      <View style={styles.assistantRow}>
        <View style={styles.aiBubble}>
          <Text style={styles.aiText}>{item.text}</Text>
          {item.sources && item.sources.length > 0 && (
            <View style={styles.sourcesWrap}>
              <Text style={styles.sourcesLabel}>Sources</Text>
              {item.sources.map((src, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.srcRow}
                  onPress={() => router.push({ pathname: "/browser", params: { url: src.url } })}
                >
                  <Image source={{ uri: src.favicon }} style={styles.srcFav} />
                  <Text style={styles.srcDomain} numberOfLines={1}>{src.domain}</Text>
                  <Ionicons name="chevron-forward" size={12} color={Colors.light.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity style={styles.speakBtn} onPress={() => toggleSpeak(item.text)}>
            <Ionicons name={isSpeaking ? "volume-high" : "volume-medium-outline"} size={14} color={Colors.light.tint} />
            <Text style={styles.speakBtnText}>{isSpeaking ? "Speaking..." : "Listen"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isActive = isLoading || isListening;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient
        colors={["rgba(162,210,255,0.15)", "rgba(255,255,255,0)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 0.6 }}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>StreekX AI</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={() => {
          Speech.stop();
          setIsSpeaking(false);
          setMessages([{
            id: "welcome",
            type: "assistant",
            text: "Hi! I'm StreekX AI. Ask me anything — I'll search the web and give you a smart answer.",
            timestamp: Date.now(),
          }]);
        }}>
          <Ionicons name="refresh-outline" size={20} color={Colors.light.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.orbSection}>
              <OrbAnimation isActive={isActive} />
              <Text style={styles.orbLabel}>
                {isListening ? "Listening..." : isLoading ? "Thinking..." : isSpeaking ? "Speaking..." : "StreekX AI"}
              </Text>
            </View>
          }
          renderItem={renderMessage}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingDots}>
                <View style={styles.aiBubble}>
                  <ActivityIndicator size="small" color={Colors.light.tint} />
                  <Text style={styles.aiText}>Searching and thinking...</Text>
                </View>
              </View>
            ) : null
          }
        />

        <View style={[styles.inputBar, { paddingBottom: botPad + 8 }]}>
          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => sendMessage()}
              placeholder="Ask anything..."
              placeholderTextColor={Colors.light.textMuted}
              returnKeyType="send"
              multiline
              maxLength={500}
            />
            {inputText.length > 0 && (
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => sendMessage()}
                disabled={isLoading}
              >
                <LinearGradient colors={["#1E6FD9", "#0EA5E9"]} style={styles.sendGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="send" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.micButton, isListening && styles.micButtonActive]}
            onPress={isListening ? stopListening : startListening}
          >
            <Ionicons name={isListening ? "mic" : "mic-outline"} size={24} color={isListening ? "#FFF" : Colors.light.tint} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.light.text },
  clearBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center", justifyContent: "center",
  },

  orbSection: { alignItems: "center", paddingVertical: 20, gap: 8 },
  orbLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.textSecondary,
  },

  listContent: { paddingHorizontal: 16, paddingTop: 8 },

  bubble: {
    maxWidth: "80%",
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: Colors.light.tint,
    borderBottomRightRadius: 6,
  },
  userText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#FFF",
    lineHeight: 22,
  },
  assistantRow: { alignSelf: "flex-start", maxWidth: "90%", marginBottom: 10 },
  aiBubble: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    borderTopLeftRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  aiText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 23,
    marginBottom: 10,
  },
  sourcesWrap: { marginTop: 4, marginBottom: 8 },
  sourcesLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  srcRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  srcFav: { width: 16, height: 16, borderRadius: 3 },
  srcDomain: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.tint,
    flex: 1,
  },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
  },
  speakBtnText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.tint,
  },

  loadingDots: { paddingHorizontal: 16, marginBottom: 10 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: Colors.light.filterInactive,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minHeight: 46,
    maxHeight: 120,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    maxHeight: 100,
    lineHeight: 22,
  },
  sendBtn: { borderRadius: 20, overflow: "hidden" },
  sendGrad: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  micButton: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
  },
  micButtonActive: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
});
