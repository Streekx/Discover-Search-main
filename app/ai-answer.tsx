import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Animated, ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import Colors from "@/constants/colors";
import { useSearch } from "@/context/SearchContext";

const BASE_URL = "https://discover-main-crawler-streekx.onrender.com";

function VoiceWaveOrb({ isActive }: { isActive: boolean }) {
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const wave4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      [wave1, wave2, wave3, wave4].forEach((wave, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 100),
            Animated.timing(wave, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(wave, { toValue: 0, duration: 800, useNativeDriver: true }),
          ])
        ).start();
      });
    } else {
      [wave1, wave2, wave3, wave4].forEach(w => {
        w.stopAnimation();
        w.setValue(0);
      });
    }
  }, [isActive]);

  const waves = [wave1, wave2, wave3, wave4];

  return (
    <View style={voiceStyles.container}>
      <View style={voiceStyles.orbCircle}>
        <LinearGradient
          colors={isActive ? ["#1E6FD9", "#0EA5E9"] : ["#E2E8F0", "#CBD5E1"]}
          style={voiceStyles.orbGrad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons
            name={isActive ? "creation" : "robot-excited-outline"}
            size={32}
            color={isActive ? "#FFF" : Colors.light.textSecondary}
          />
        </LinearGradient>
      </View>

      {isActive && (
        <View style={voiceStyles.wavesContainer}>
          {waves.map((wave, i) => (
            <Animated.View
              key={i}
              style={[
                voiceStyles.wave,
                {
                  opacity: wave,
                  transform: [{
                    scaleY: wave.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 1 + (i * 0.15)]
                    })
                  }]
                }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const voiceStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
  orbCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  orbGrad: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wavesContainer: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  wave: {
    width: 4,
    height: 40,
    backgroundColor: Colors.light.tint,
    borderRadius: 2,
  },
});

export default function AIAnswerScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q: string }>();
  const { settings } = useSearch();

  const [query, setQuery] = useState(params.q || "");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useSpeechRecognitionEvent("result", (event) => {
    const t = event.results[0]?.transcript || "";
    setVoiceTranscript(t);
    if (event.isFinal && t) {
      setIsListening(false);
      setQuery(t);
      fetchAnswer(t);
    }
  });
  useSpeechRecognitionEvent("end", () => setIsListening(false));
  useSpeechRecognitionEvent("error", () => setIsListening(false));

  useEffect(() => {
    if (query) fetchAnswer(query);
  }, []);

  async function startListening() {
    try {
      const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!p.granted) return;
      setVoiceTranscript("");
      setIsListening(true);
      setAnswer("");
      ExpoSpeechRecognitionModule.start({
        lang: settings.voiceLanguage || "en-IN",
        interimResults: true,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {
      setIsListening(false);
    }
  }

  function stopListening() {
    ExpoSpeechRecognitionModule.stop();
    setIsListening(false);
  }

  async function fetchAnswer(q: string) {
    if (!q.trim()) return;
    setIsLoading(true);
    setAnswer("");
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(
        `${BASE_URL}/search?q=${encodeURIComponent(q)}&filter=all`,
        {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        }
      );
      clearTimeout(id);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      let raw: any[] = Array.isArray(data) ? data : data.results || [];

      const withDesc = raw.filter(
        (i: any) =>
          i.description &&
          i.description !== "No description." &&
          i.description !== "N/A" &&
          i.description.length > 30
      );

      if (withDesc.length > 0) {
        const combined = withDesc
          .slice(0, 4)
          .map((i: any) => i.description)
          .join(" ");
        const sentences = combined.match(/[^.!?]+[.!?]+/g) || [];
        const ans = sentences.slice(0, 5).join(" ").trim() || combined.slice(0, 500);
        setAnswer(ans);

        if (settings.voiceLanguage) {
          setIsSpeaking(true);
          Speech.speak(ans, {
            language: settings.voiceLanguage || "en-IN",
            rate: 0.92,
            onDone: () => setIsSpeaking(false),
            onStopped: () => setIsSpeaking(false),
          });
        }
      } else {
        const fallback = `Based on search results for "${q}": ${raw.slice(0, 2).map((i: any) => i.title).join(". ")}.`;
        setAnswer(fallback);
      }
    } catch (_) {
      setAnswer("Unable to fetch answer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSpeak() {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else if (answer) {
      setIsSpeaking(true);
      Speech.speak(answer, {
        language: settings.voiceLanguage || "en-IN",
        rate: 0.92,
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const isActive = isListening || isLoading || isSpeaking;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient
        colors={["rgba(162,210,255,0.15)", "rgba(255,255,255,0)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSub}>Ask anything</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: botPad + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <VoiceWaveOrb isActive={isActive} />

        {isListening && voiceTranscript ? (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptText}>"{voiceTranscript}"</Text>
          </View>
        ) : null}

        {query && !isListening ? (
          <View style={styles.queryBox}>
            <Text style={styles.queryText}>{query}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>Searching and thinking...</Text>
          </View>
        ) : answer ? (
          <View style={styles.answerBox}>
            <View style={styles.answerHeader}>
              <View style={styles.aiIcon}>
                <MaterialCommunityIcons
                  name="creation"
                  size={16}
                  color={Colors.light.tint}
                />
              </View>
              <Text style={styles.answerLabel}>Answer</Text>
            </View>
            <Text style={styles.answerText}>{answer}</Text>

            <TouchableOpacity style={styles.speakBtn} onPress={handleSpeak}>
              <Ionicons
                name={isSpeaking ? "volume-high" : "volume-medium-outline"}
                size={18}
                color={Colors.light.tint}
              />
              <Text style={styles.speakText}>
                {isSpeaking ? "Speaking..." : "Listen to answer"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!isListening && !isLoading && (
          <TouchableOpacity
            style={styles.askBtn}
            onPress={isListening ? stopListening : startListening}
          >
            <Ionicons
              name={isListening ? "mic" : "mic-outline"}
              size={24}
              color="#FFF"
            />
            <Text style={styles.askBtnText}>
              {isListening ? "Listening..." : "Tap to ask"}
            </Text>
          </TouchableOpacity>
        )}

        {isListening && (
          <TouchableOpacity style={styles.stopBtn} onPress={stopListening}>
            <Text style={styles.stopBtnText}>Stop</Text>
          </TouchableOpacity>
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.light.text,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },

  content: { paddingHorizontal: 20, paddingTop: 40, alignItems: "center" },

  transcriptBox: {
    backgroundColor: "rgba(162,210,255,0.15)",
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    width: "100%",
  },
  transcriptText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.light.text,
    textAlign: "center",
    fontStyle: "italic",
  },

  queryBox: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  queryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.light.text,
    textAlign: "center",
    lineHeight: 26,
  },

  statusBox: {
    marginTop: 24,
    alignItems: "center",
  },
  statusText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.textSecondary,
  },

  answerBox: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 18,
    marginTop: 24,
    width: "100%",
    borderWidth: 1.5,
    borderColor: "rgba(162,210,255,0.5)",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  aiIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  answerLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.light.text,
  },
  answerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  speakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  speakText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.light.tint,
  },

  askBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.light.tint,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginTop: 32,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  askBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFF",
  },
  stopBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 26,
    paddingVertical: 13,
    paddingHorizontal: 40,
    marginTop: 16,
  },
  stopBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#EF4444",
  },
});
