import React, { useState, useEffect, useRef } from "react";
import {
  View, StyleSheet, TouchableOpacity, Image, Animated
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";

const PLACEHOLDER_IMAGE = require("@/assets/images/icon.png");

const FALLBACK_IMAGES = [
  "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1",
  "https://images.pexels.com/photos/87651/earth-blue-planet-globe-planet-87651.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1",
  "https://images.pexels.com/photos/3938022/pexels-photo-3938022.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1",
  "https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1",
  "https://images.pexels.com/photos/3951969/pexels-photo-3951969.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1",
];

function isValidUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try { new URL(url); return url.startsWith("http"); } catch { return false; }
}

const TILE_SIZE = 52;

export default function DynamicDiscoverTile() {
  const [images, setImages] = useState<string[]>(FALLBACK_IMAGES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgErr, setImgErr] = useState(false);
  const [backImgErr, setBackImgErr] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchRealImages();
  }, []);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setCurrentIndex(prev => (prev + 1) % images.length);
      setImgErr(false);
      setBackImgErr(false);
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [images.length]);

  async function fetchRealImages() {
    try {
      const res = await fetch("https://discover-main-crawler-streekx.onrender.com/discover", {
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        const raw: any[] = Array.isArray(data) ? data : (data.results || data.data || []);
        const urls = raw
          .map((i: any) => i.image_url || i.image || i.thumbnail || i.media)
          .filter(isValidUrl)
          .slice(0, 8);
        if (urls.length >= 2) {
          setImages(urls);
          setImgErr(false);
          setBackImgErr(false);
        }
      }
    } catch {
      // keep fallback images
    }
  }

  const frontImg = images[currentIndex];
  const backImg = images[(currentIndex + 1) % images.length];

  const frontSource = !imgErr && isValidUrl(frontImg) ? { uri: frontImg } : PLACEHOLDER_IMAGE;
  const backSource = !backImgErr && isValidUrl(backImg) ? { uri: backImg } : PLACEHOLDER_IMAGE;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/discover"); }}
      activeOpacity={0.85}
    >
      <View style={[styles.layeredSquare, styles.backLayer]}>
        <Image
          source={backSource}
          style={styles.img}
          resizeMode="cover"
          onError={() => setBackImgErr(true)}
        />
      </View>

      <Animated.View style={[styles.layeredSquare, styles.frontLayer, { opacity: fadeAnim }]}>
        <Image
          source={frontSource}
          style={styles.img}
          resizeMode="cover"
          onError={() => setImgErr(true)}
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.22)"]}
          style={styles.overlay}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: TILE_SIZE, height: TILE_SIZE,
    position: "relative",
  },
  layeredSquare: {
    width: TILE_SIZE, height: TILE_SIZE,
    borderRadius: 16, overflow: "hidden",
    position: "absolute",
  },
  backLayer: {
    bottom: -4, right: -4,
    backgroundColor: "rgba(162,210,255,0.25)",
    borderWidth: 1, borderColor: "rgba(162,210,255,0.15)",
    transform: [{ rotate: "4deg" }],
  },
  frontLayer: {
    top: 0, left: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6, elevation: 3,
  },
  img: { width: "100%", height: "100%" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
