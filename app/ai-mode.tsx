import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Platform, ActivityIndicator, Animated, Image, Pressable
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
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSearch } from "@/context/SearchContext";
import GalaxyBackground from "@/components/GalaxyBackground";

const { width } = Dimensions.get("window");
const BASE_URL = "https://discover-main-crawler-streekx.onrender.com";

import { Dimensions } from "react-native";

interface ChatMessage {
  id: string;
  type: "user" | "assistant";
  text: string;
  timestamp: number;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

function getFavicon(url: string): string {
  return `https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=32`;
}

export default function AIModeScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useSearch();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      type: "assistant",
      text: "Hi! I'm StreekX AI Chat. Ask me anything and I'll search the web and give you smart answers. You can also use voice search and file attachments.",
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedModel, setSelectedModel] = useState("standard");
  const [showModelMenu, setShowModelMenu] = useState(false);
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

    const userMsg: ChatMessage = {
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

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        text: answer,
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
      const errMsg: ChatMessage = {
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

  function renderMessage({ item }: { item: ChatMessage }) {
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
        </View>
      </View>
    );
  }

  const hasText = inputText.trim().length > 0;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <GalaxyBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>StreekX AI Chat</Text>
        <TouchableOpacity
          style={styles.modelBtn}
          onPress={() => setShowModelMenu(!showModelMenu)}
        >
          <MaterialCommunityIcons name="brain" size={18} color="#6EB4FF" />
          <Text style={styles.modelBtnText}>{selectedModel}</Text>
          <Ionicons name={showModelMenu ? "chevron-up" : "chevron-down"} size={14} color="rgba(255,255,255,0.50)" />
        </TouchableOpacity>
      </View>

      {showModelMenu && (
        <View style={styles.modelMenu}>
          {["standard", "advanced", "creative"].map((model) => (
            <TouchableOpacity
              key={model}
              style={[styles.modelOption, selectedModel === model && styles.modelOptionActive]}
              onPress={() => {
                setSelectedModel(model);
                setShowModelMenu(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.modelOptionText, selectedModel === model && styles.modelOptionTextActive]}>
                {model.charAt(0).toUpperCase() + model.slice(1)}
              </Text>
              {selectedModel === model && (
                <Ionicons name="checkmark" size={16} color="#6EB4FF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
          renderItem={renderMessage}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingDots}>
                <View style={styles.aiBubble}>
                  <ActivityIndicator size="small" color={Colors.light.tint} />
                  <Text style={styles.aiText}>Thinking...</Text>
                </View>
              </View>
            ) : null
          }
        />

        <View style={[styles.inputBar, { paddingBottom: botPad + 8 }]}>
          <View style={styles.inputWrap}>
            <TouchableOpacity style={styles.attachBtn} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={22} color={Colors.light.tint} />
            </TouchableOpacity>

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

            {!hasText && !isListening && (
              <TouchableOpacity
                style={styles.voiceBtn}
                onPress={startListening}
                activeOpacity={0.7}
              >
                <Ionicons name="mic-outline" size={20} color={Colors.light.tint} />
              </TouchableOpacity>
            )}

            {isListening && (
              <TouchableOpacity
                style={[styles.voiceBtn, styles.voiceBtnActive]}
                onPress={stopListening}
              >
                <Ionicons name="mic" size={20} color="#FFF" />
              </TouchableOpacity>
            )}

            {hasText && !isListening && (
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => sendMessage()}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <LinearGradient colors={["#1E6FD9", "#0EA5E9"]} style={styles.sendGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="send" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05050A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 18, color: "#FFFFFF" },
  modelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(110,180,255,0.12)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(110,180,255,0.25)",
  },
  modelBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "#6EB4FF",
    textTransform: "capitalize",
  },

  modelMenu: {
    backgroundColor: "rgba(15,12,30,0.95)",
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    marginBottom: 8,
  },
  modelOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    justifyContent: "space-between",
  },
  modelOptionActive: {
    backgroundColor: "rgba(110,180,255,0.10)",
    borderBottomColor: "rgba(110,180,255,0.30)",
  },
  modelOptionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  modelOptionTextActive: {
    color: "#6EB4FF",
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
    backgroundColor: "#1E6FD9",
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
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    borderTopLeftRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  aiText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 23,
  },

  loadingDots: { paddingHorizontal: 16, marginBottom: 10 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 10,
    backgroundColor: "rgba(4,3,14,0.94)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    minHeight: 46,
    maxHeight: 120,
    gap: 6,
  },
  attachBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#FFFFFF",
    maxHeight: 100,
    lineHeight: 22,
  },
  voiceBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceBtnActive: {
    backgroundColor: "#EF4444",
    borderRadius: 14,
  },
  sendBtn: { borderRadius: 14, overflow: "hidden" },
  sendGrad: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
});
