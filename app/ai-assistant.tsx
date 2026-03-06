import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Platform, ActivityIndicator, Animated
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

const BASE_URL = "https://streekxkk-streekx.hf.space";

interface Message {
  id: string;
  type: "user" | "assistant";
  text: string;
  sources?: { title: string; url: string }[];
  timestamp: number;
}

export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      text: "Hello! I'm StreekX AI. Ask me anything and I'll search the web and summarize it for you. You can also tap the mic to speak.",
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const listRef = useRef<FlatList>(null);
  const micPulse = useRef(new Animated.Value(1)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript || "";
    if (event.isFinal && transcript) {
      setIsListening(false);
      micPulse.stopAnimation();
      setInputText(transcript);
      sendMessage(transcript);
    }
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
    micPulse.stopAnimation();
  });

  function startMicPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(micPulse, { toValue: 1.25, duration: 500, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }

  async function startVoiceInput() {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) return;
      setIsListening(true);
      startMicPulse();
      ExpoSpeechRecognitionModule.start({ lang: "en-IN", interimResults: true, maxAlternatives: 1 });
    } catch (_) {
      setIsListening(false);
    }
  }

  function stopVoiceInput() {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
    micPulse.stopAnimation();
  }

  const sendMessage = useCallback(async (text?: string) => {
    const q = (text || inputText).trim();
    if (!q || isLoading) return;

    setInputText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      type: "user",
      text: q,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(q)}&filter=all`, {
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.results || []);

      const sources = items.slice(0, 3).map((item: any) => ({
        title: item.title || item.name || "Result",
        url: item.url || item.link || "",
      }));

      const descriptions = items
        .slice(0, 4)
        .filter((i: any) => i.description || i.snippet)
        .map((i: any) => (i.description || i.snippet || "").slice(0, 200))
        .filter(Boolean);

      let summary = "";
      if (descriptions.length > 0) {
        const combined = descriptions.join(" ");
        const sentences = combined.match(/[^.!?]+[.!?]+/g) || [];
        summary = sentences.slice(0, 4).join(" ").trim();
        if (!summary && combined) summary = combined.slice(0, 400);
      }

      if (!summary) {
        summary = items.length > 0
          ? `I found ${items.length} results for "${q}". The top results are from ${sources.map(s => {
              try { return new URL(s.url).hostname.replace("www.", ""); } catch { return s.url; }
            }).join(", ")}.`
          : `I couldn't find specific information about "${q}". Try rephrasing your query.`;
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        text: summary,
        sources,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMsg]);

      setIsSpeaking(true);
      Speech.speak(summary, {
        language: "en-IN",
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (err: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        text: `Sorry, I couldn't search for that right now. ${err.message === "TimeoutError" ? "The search timed out." : "Please check your internet connection and try again."}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading]);

  function stopSpeaking() {
    Speech.stop();
    setIsSpeaking(false);
  }

  function renderMessage({ item }: { item: Message }) {
    const isUser = item.type === "user";
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <MaterialCommunityIcons name="robot-excited-outline" size={16} color="#FFF" />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
            {item.text}
          </Text>
          {!isUser && item.sources && item.sources.length > 0 && (
            <View style={styles.sources}>
              <Text style={styles.sourcesLabel}>Sources:</Text>
              {item.sources.map((s, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => router.push({ pathname: "/browser", params: { url: s.url } })}
                >
                  <Text style={styles.sourceLink} numberOfLines={1}>
                    {idx + 1}. {s.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container]}>
      <LinearGradient
        colors={["rgba(162,210,255,0.2)", "rgba(255,255,255,0)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
      />
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="robot-excited-outline" size={22} color={Colors.light.tint} />
          <Text style={styles.headerTitle}>StreekX AI</Text>
        </View>
        {isSpeaking ? (
          <TouchableOpacity onPress={stopSpeaking} style={styles.speakBtn}>
            <Ionicons name="volume-mute-outline" size={22} color={Colors.light.danger} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messages, { paddingBottom: 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {isLoading && (
          <View style={styles.typingRow}>
            <View style={styles.aiAvatar}>
              <MaterialCommunityIcons name="robot-excited-outline" size={16} color="#FFF" />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={Colors.light.tint} />
              <Text style={styles.typingText}>Searching & summarizing...</Text>
            </View>
          </View>
        )}

        <View style={[styles.inputRow, { paddingBottom: botPad + 10 }]}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask anything..."
              placeholderTextColor={Colors.light.textMuted}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              multiline
              maxLength={500}
            />
          </View>
          <Animated.View style={{ transform: [{ scale: micPulse }] }}>
            <TouchableOpacity
              style={[styles.micBtn, isListening && styles.micBtnActive]}
              onPress={isListening ? stopVoiceInput : startVoiceInput}
            >
              <Ionicons name={isListening ? "mic" : "mic-outline"} size={20} color={isListening ? "#FFF" : Colors.light.tint} />
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons name="send" size={18} color="#FFF" />
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
    paddingBottom: 12,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.light.text,
  },
  speakBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  messages: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  messageRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  messageRowUser: { flexDirection: "row-reverse" },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 18,
    padding: 14,
  },
  bubbleUser: {
    backgroundColor: Colors.light.tint,
    borderBottomRightRadius: 6,
  },
  bubbleAI: {
    backgroundColor: Colors.light.backgroundCard,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: {
    fontFamily: "Inter_400Regular",
    color: "#FFF",
  },
  bubbleTextAI: {
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  sources: { marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.light.border, paddingTop: 8 },
  sourcesLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  sourceLink: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.tint,
    marginBottom: 3,
  },
  typingRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  typingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    backgroundColor: Colors.light.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: Colors.light.filterInactive,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minHeight: 44,
    maxHeight: 120,
  },
  textInput: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    maxHeight: 100,
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
  },
  micBtnActive: {
    backgroundColor: Colors.light.danger,
    borderColor: Colors.light.danger,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
});
