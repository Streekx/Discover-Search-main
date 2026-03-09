import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  PanResponder, Platform, ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";
import { useSearch } from "@/context/SearchContext";

const { width, height } = Dimensions.get("window");
const BASE_URL = "https://streekxkk-streekx.hf.space";

interface Particle {
  id: string;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

function ParticleOrb({ isActive, onParticleScatter }: { isActive: boolean; onParticleScatter: (x: number, y: number) => void }) {
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
    <TouchableOpacity
      style={styles.orbContainer}
      activeOpacity={0.9}
      onPress={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        onParticleScatter(locationX, locationY);
      }}
    >
      <Animated.View style={[styles.ring3, { transform: [{ scale: pulse3 }], opacity: glow }]} />
      <Animated.View style={[styles.ring2, { transform: [{ scale: pulse2 }] }]} />
      <Animated.View style={[styles.ring1, { transform: [{ scale: pulse1 }] }]}>
        <Animated.View style={{ transform: [{ rotate: spin }], borderRadius: 80, overflow: "hidden", width: "100%", height: "100%" }}>
          <LinearGradient
            colors={isActive ? ["#1E6FD9", "#0EA5E9", "#A2D2FF", "#1E6FD9"] : ["#E2E8F0", "#CBD5E1"]}
            style={styles.grad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
        </Animated.View>
        <Ionicons
          name={isActive ? "volume-high" : "mic-outline"}
          size={48}
          color="#FFF"
          style={styles.orbIcon}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const orbStyles = StyleSheet.create({
  container: { width: 200, height: 200, alignItems: "center", justifyContent: "center" },
  ring3: {
    position: "absolute",
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(162,210,255,0.15)",
  },
  ring2: {
    position: "absolute",
    width: 164, height: 164,
    borderRadius: 82,
    backgroundColor: "rgba(162,210,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(162,210,255,0.4)",
  },
  ring1: {
    width: 136, height: 136,
    borderRadius: 68,
    overflow: "hidden",
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  grad: { ...StyleSheet.absoluteFillObject },
  icon: { position: "absolute", fontSize: 64 },
});

export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useSearch();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<string>("");
  const [particles, setParticles] = useState<Particle[]>([]);
  const panResponder = useRef<any>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useSpeechRecognitionEvent("result", (event) => {
    const t = event.results[0]?.transcript || "";
    if (event.isFinal && t) {
      setIsListening(false);
      processQuery(t);
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

  const processQuery = useCallback(async (query: string) => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 30000);
      const res = await fetch(
        `${BASE_URL}/search?q=${encodeURIComponent(query)}&filter=all`,
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
        answer = `Based on search results, here are the top findings about "${query}": ${raw.slice(0, 3).map((i: any) => i.title).join(", ")}.`;
      } else {
        answer = `I couldn't find specific information about "${query}". Try rephrasing your question.`;
      }

      setLastResponse(answer);

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
      const errMsg = "Sorry, I couldn't connect. Please check your internet connection.";
      setLastResponse(errMsg);
      if (settings.voiceLanguage) {
        setIsSpeaking(true);
        Speech.speak(errMsg, {
          language: settings.voiceLanguage || "en-IN",
          rate: 0.92,
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [settings.voiceLanguage]);

  const scatterParticles = useCallback((x: number, y: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newParticles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 80 + Math.random() * 40;
      const endX = x + Math.cos(angle) * distance;
      const endY = y + Math.sin(angle) * distance;

      const particle: Particle = {
        id: `${Date.now()}-${i}`,
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(1),
      };

      Animated.parallel([
        Animated.timing(particle.x, {
          toValue: endX - x,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: endY - y,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      newParticles.push(particle);
    }
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 700);
  }, []);

  const isActive = isLoading || isListening;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <LinearGradient
        colors={["rgba(162,210,255,0.15)", "rgba(255,255,255,0)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 0.6 }}
      />

      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color={Colors.light.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>StreekX AI</Text>

        <View style={styles.orbWrapper}>
          <ParticleOrb isActive={isActive} onParticleScatter={scatterParticles} />
          {particles.map(p => (
            <Animated.View
              key={p.id}
              style={[
                styles.particle,
                {
                  transform: [
                    { translateX: p.x },
                    { translateY: p.y },
                  ],
                  opacity: p.opacity,
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.status}>
          {isListening ? "Listening..." : isLoading ? "Thinking..." : isSpeaking ? "Speaking..." : "Say something..."}
        </Text>

        {lastResponse ? (
          <View style={styles.responseBox}>
            <Text style={styles.responseText}>{lastResponse}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        {!isListening && !isLoading && (
          <TouchableOpacity
            style={[styles.micBtn, { opacity: isSpeaking ? 0.6 : 1 }]}
            onPress={startListening}
            disabled={isSpeaking}
          >
            <LinearGradient colors={["#1E6FD9", "#0EA5E9"]} style={styles.micGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="mic-outline" size={28} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {isListening && (
          <TouchableOpacity style={[styles.micBtn, styles.micBtnActive]} onPress={stopListening}>
            <LinearGradient colors={["#EF4444", "#DC2626"]} style={styles.micGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="mic" size={28} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {isSpeaking && (
          <TouchableOpacity
            style={[styles.micBtn, styles.micBtnActive]}
            onPress={() => {
              Speech.stop();
              setIsSpeaking(false);
            }}
          >
            <LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.micGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="volume-high" size={28} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: "space-between",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.accentLight,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: "Inter_500Medium",
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 40,
  },
  orbWrapper: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  orbContainer: {
    width: 200,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  ring3: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(162,210,255,0.15)",
  },
  ring2: {
    position: "absolute",
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: "rgba(162,210,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(162,210,255,0.4)",
  },
  ring1: {
    width: 136,
    height: 136,
    borderRadius: 68,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  grad: { ...StyleSheet.absoluteFillObject },
  orbIcon: { position: "absolute" },
  particle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.tint,
  },
  status: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  responseBox: {
    maxWidth: "90%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  responseText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 22,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 30,
  },
  micBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: "hidden",
  },
  micBtnActive: {},
  micGrad: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
