/**
 * StreekX — Advanced Galaxy Background
 * Applied to every screen in the app.
 *
 * Layers (top to bottom render order):
 *  1. Deep space multi-tone gradient base
 *  2. Milky Way arch (haze + bright core)
 *  3. Blue nebula cloud (left, animated pulse)
 *  4. Purple nebula cloud (right, animated pulse)
 *  5. Dense Milky Way star cluster with twinkling
 *  6. Outer field stars (cooler blue-white tones)
 *  7. Horizon mist
 *  8. Water reflection gradient
 *  9. Water reflection stars
 * 10. Bottom vignette
 * 11. Shooting stars (3 animated, staggered timing)
 * 12. Aurora ribbon at very top (animated subtle glow)
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: W, height: H } = Dimensions.get("window");

// ─── Star field data ──────────────────────────────────────────────────────

// Dense Milky Way arch (upper center)
const MW_STARS: [number, number, number, number, string][] = [
  [0.48,0.01,1.4,0.95,"#FFFFFF"],[0.55,0.02,1.0,0.85,"#E8EEFF"],[0.42,0.03,1.2,0.90,"#FFFFFF"],
  [0.62,0.03,0.9,0.75,"#FFFFFF"],[0.35,0.04,1.1,0.80,"#FFF8E8"],[0.70,0.04,1.3,0.85,"#E8F0FF"],
  [0.27,0.05,0.8,0.70,"#FFFFFF"],[0.78,0.05,1.0,0.80,"#FFFFFF"],[0.20,0.07,1.2,0.75,"#FFF0E8"],
  [0.83,0.07,0.9,0.70,"#E8F0FF"],[0.50,0.06,1.5,0.90,"#FFFFFF"],[0.57,0.08,1.1,0.85,"#FFFFFF"],
  [0.44,0.08,0.8,0.70,"#FFF8FF"],[0.65,0.09,1.2,0.80,"#E8EEFF"],[0.38,0.10,1.0,0.75,"#FFFFFF"],
  [0.73,0.11,0.9,0.80,"#FFFFFF"],[0.30,0.12,1.3,0.85,"#FFFFFF"],[0.85,0.10,1.1,0.70,"#E8F0FF"],
  [0.52,0.13,0.8,0.75,"#FFFFFF"],[0.60,0.12,1.2,0.80,"#FFF8E8"],[0.23,0.14,0.9,0.65,"#FFFFFF"],
  [0.79,0.14,1.0,0.75,"#E8EEFF"],[0.46,0.16,1.1,0.80,"#FFFFFF"],[0.67,0.15,0.8,0.70,"#FFFFFF"],
  [0.16,0.17,1.0,0.65,"#FFE8E8"],[0.88,0.13,0.9,0.65,"#E8F0FF"],[0.54,0.18,1.3,0.85,"#FFFFFF"],
  [0.40,0.19,0.8,0.70,"#FFFFFF"],[0.75,0.18,1.1,0.75,"#FFFFFF"],[0.32,0.21,0.9,0.70,"#FFF8FF"],
  [0.82,0.20,1.0,0.65,"#E8F0FF"],[0.48,0.22,0.8,0.70,"#FFFFFF"],[0.62,0.21,1.2,0.75,"#FFFFFF"],
  [0.25,0.24,1.0,0.65,"#FFFFFF"],[0.70,0.23,0.8,0.70,"#E8EEFF"],[0.57,0.26,0.9,0.65,"#FFFFFF"],
  [0.18,0.27,0.8,0.60,"#FFFFFF"],[0.85,0.24,1.1,0.65,"#E8F0FF"],[0.43,0.28,1.0,0.70,"#FFFFFF"],
  [0.76,0.27,0.8,0.60,"#FFF8E8"],[0.36,0.31,0.9,0.65,"#FFFFFF"],[0.64,0.30,0.8,0.60,"#FFFFFF"],
  [0.52,0.33,1.0,0.65,"#FFFFFF"],[0.28,0.34,0.7,0.55,"#E8EEFF"],[0.79,0.32,0.9,0.60,"#FFFFFF"],
  [0.45,0.36,0.8,0.55,"#FFFFFF"],[0.68,0.35,0.7,0.55,"#FFFFFF"],[0.22,0.38,0.9,0.55,"#FFF8FF"],
  [0.88,0.36,0.8,0.50,"#E8F0FF"],[0.55,0.39,0.7,0.55,"#FFFFFF"],[0.35,0.41,0.8,0.50,"#FFFFFF"],
  [0.72,0.40,0.7,0.50,"#FFFFFF"],[0.47,0.43,0.8,0.50,"#E8EEFF"],[0.60,0.44,0.7,0.45,"#FFFFFF"],
  [0.17,0.42,0.7,0.45,"#FFFFFF"],[0.84,0.43,0.7,0.45,"#FFF8E8"],[0.40,0.46,0.6,0.40,"#FFFFFF"],
  [0.66,0.47,0.7,0.45,"#FFFFFF"],[0.30,0.48,0.6,0.40,"#E8F0FF"],[0.77,0.48,0.6,0.40,"#FFFFFF"],
];

// Outer field stars — cooler, slightly blue-tinted
const OUTER_STARS: [number, number, number, number, string][] = [
  [0.05,0.03,2.0,0.90,"#D0E8FF"],[0.93,0.06,1.8,0.85,"#FFFFFF"],[0.10,0.15,2.2,0.90,"#E8F0FF"],
  [0.97,0.18,1.9,0.80,"#FFFFFF"],[0.02,0.28,1.7,0.75,"#D0E0FF"],[0.95,0.30,2.2,0.85,"#FFFFFF"],
  [0.07,0.38,1.8,0.70,"#FFFFFF"],[0.91,0.42,2.0,0.75,"#E8F0FF"],[0.04,0.50,1.7,0.65,"#FFFFFF"],
  [0.96,0.52,1.8,0.65,"#D0E8FF"],[0.11,0.56,1.6,0.60,"#FFFFFF"],[0.89,0.57,1.7,0.60,"#FFFFFF"],
  // Extra scattered bright stars
  [0.33,0.09,2.4,0.80,"#FFFFFF"],[0.67,0.06,2.0,0.75,"#FFE8D0"],[0.14,0.35,1.6,0.65,"#E0F0FF"],
  [0.86,0.33,1.9,0.70,"#FFFFFF"],[0.50,0.50,1.5,0.55,"#FFFFFF"],[0.25,0.55,1.7,0.60,"#E8F0FF"],
  [0.75,0.60,1.5,0.50,"#D0E8FF"],[0.10,0.65,1.4,0.45,"#FFFFFF"],[0.90,0.68,1.3,0.40,"#FFFFFF"],
];

// Water reflection — very faint
const WATER_STARS: [number, number, number, number][] = [
  [0.25,0.67,0.7,0.22],[0.55,0.70,0.6,0.18],[0.75,0.73,0.7,0.20],
  [0.40,0.76,0.6,0.16],[0.65,0.80,0.5,0.14],[0.20,0.84,0.5,0.18],
  [0.80,0.87,0.6,0.15],[0.50,0.91,0.5,0.12],[0.35,0.95,0.4,0.12],[0.70,0.93,0.5,0.12],
];

// Stars that twinkle (indices into MW_STARS)
const TWINKLE_INDICES = [0, 3, 7, 12, 18, 22, 27, 33, 40, 46, 51, 56];

// Shooting star definitions: [startX%, startY%, angle°, length, duration(ms), delay(ms)]
const SHOOTING_STARS: [number, number, number, number, number, number][] = [
  [0.08, 0.08, 32, 120, 700, 2500],
  [0.65, 0.04, 28, 90,  600, 5800],
  [0.20, 0.15, 35, 150, 800, 9200],
  [0.80, 0.10, 25, 100, 650, 13000],
];

// ─── ShootingStar ─────────────────────────────────────────────────────────
function ShootingStar({
  startX, startY, angle, length, duration, delay,
}: {
  startX: number; startY: number; angle: number;
  length: number; duration: number; delay: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = () => {
      progress.setValue(0);
      setTimeout(() => {
        Animated.timing(progress, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }).start(() => setTimeout(loop, 15000 + Math.random() * 8000));
      }, delay);
    };
    loop();
    return () => progress.stopAnimation();
  }, []);

  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) * length;
  const dy = Math.sin(rad) * length;

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  const opacity = progress.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.6, 0] });
  const scaleX  = progress.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0.3, 1, 0.3] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: startX * W,
        top: startY * H,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate: `${angle}deg` }, { scaleX }],
        width: length,
        height: 1.5,
        borderRadius: 1,
        backgroundColor: "transparent",
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={["transparent", "rgba(255,255,255,0.95)", "rgba(255,255,255,0.4)", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

// ─── Main GalaxyBackground component ─────────────────────────────────────
export default function GalaxyBackground() {
  // Twinkling animations
  const twinkleAnims = useRef(
    TWINKLE_INDICES.map(() => new Animated.Value(1))
  ).current;

  // Nebula pulse animations
  const blueNebula  = useRef(new Animated.Value(0.35)).current;
  const purpleNebula = useRef(new Animated.Value(0.28)).current;
  const auroraOpacity = useRef(new Animated.Value(0.04)).current;
  const auroraShift   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Twinkling stars
    const twinkleAnims2 = twinkleAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 420),
          Animated.timing(anim, { toValue: 0.25, duration: 800 + i * 100, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1,    duration: 800 + i * 100, useNativeDriver: true }),
        ])
      )
    );
    twinkleAnims2.forEach(a => a.start());

    // Blue nebula slow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(blueNebula,  { toValue: 0.50, duration: 4200, useNativeDriver: true }),
        Animated.timing(blueNebula,  { toValue: 0.28, duration: 4200, useNativeDriver: true }),
      ])
    ).start();

    // Purple nebula slow pulse (offset phase)
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(purpleNebula, { toValue: 0.45, duration: 5000, useNativeDriver: true }),
          Animated.timing(purpleNebula, { toValue: 0.22, duration: 5000, useNativeDriver: true }),
        ])
      ).start();
    }, 2100);

    // Aurora ribbon gentle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(auroraOpacity, { toValue: 0.12, duration: 3500, useNativeDriver: true }),
        Animated.timing(auroraOpacity, { toValue: 0.03, duration: 3500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(auroraShift, { toValue: 1, duration: 7000, useNativeDriver: true }),
        Animated.timing(auroraShift, { toValue: 0, duration: 7000, useNativeDriver: true }),
      ])
    ).start();

    return () => {
      twinkleAnims2.forEach(a => a.stop());
      blueNebula.stopAnimation();
      purpleNebula.stopAnimation();
      auroraOpacity.stopAnimation();
      auroraShift.stopAnimation();
    };
  }, []);

  const auroraTranslateX = auroraShift.interpolate({
    inputRange: [0, 1],
    outputRange: [-W * 0.1, W * 0.1],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">

      {/* ── Layer 1: Rich deep-space base gradient ── */}
      <LinearGradient
        colors={["#020208", "#03030D", "#040410", "#030309", "#020205"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* ── Layer 2: Milky Way outer haze (tilted) ── */}
      <View style={styles.mwHaze}>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(150,150,175,0.04)",
            "rgba(180,180,210,0.10)",
            "rgba(195,195,220,0.13)",
            "rgba(180,180,210,0.10)",
            "rgba(150,150,175,0.04)",
            "transparent",
          ]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      {/* ── Layer 3: Milky Way bright core ── */}
      <View style={styles.mwCore}>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(200,200,230,0.04)",
            "rgba(225,225,252,0.11)",
            "rgba(200,200,230,0.04)",
            "transparent",
          ]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      {/* ── Layer 4a: Animated Blue Nebula (left-center) ── */}
      <Animated.View
        style={[styles.blueNebula, { opacity: blueNebula }]}
      />

      {/* ── Layer 4b: Animated Purple Nebula (right) ── */}
      <Animated.View
        style={[styles.purpleNebula, { opacity: purpleNebula }]}
      />

      {/* ── Layer 4c: Faint green-gold nebula (bottom-left) ── */}
      <View style={styles.goldNebula} />

      {/* ── Layer 5: Milky Way dense star cluster ── */}
      {MW_STARS.map(([x, y, size, opacity, color], i) => {
        const twinkleIdx = TWINKLE_INDICES.indexOf(i);
        if (twinkleIdx >= 0) {
          return (
            <Animated.View
              key={`mw-${i}`}
              style={{
                position: "absolute",
                left: x * W - size / 2,
                top: y * H - size / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: Animated.multiply(
                  new Animated.Value(opacity),
                  twinkleAnims[twinkleIdx]
                ),
              }}
            />
          );
        }
        return (
          <View
            key={`mw-${i}`}
            style={{
              position: "absolute",
              left: x * W - size / 2,
              top: y * H - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              opacity,
            }}
          />
        );
      })}

      {/* ── Layer 6: Outer field stars (blue-tinted, cooler) ── */}
      {OUTER_STARS.map(([x, y, size, opacity, color], i) => (
        <View
          key={`out-${i}`}
          style={{
            position: "absolute",
            left: x * W - size / 2,
            top: y * H - size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color as string,
            opacity,
            shadowColor: color as string,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: size > 1.8 ? 0.9 : 0,
            shadowRadius: size > 1.8 ? 3 : 0,
          }}
        />
      ))}

      {/* ── Layer 7: Horizon mist ── */}
      <LinearGradient
        colors={["transparent", "rgba(155,155,188,0.05)", "rgba(135,135,168,0.03)", "transparent"]}
        style={styles.horizonMist}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* ── Layer 8: Water / lower dark gradient ── */}
      <LinearGradient
        colors={["transparent", "rgba(8,6,18,0.58)", "rgba(4,3,12,0.78)", "#030210"]}
        style={styles.waterGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* ── Layer 9: Water reflection stars ── */}
      {WATER_STARS.map(([x, y, size, opacity], i) => (
        <View
          key={`wat-${i}`}
          style={{
            position: "absolute",
            left: x * W - size / 2,
            top: y * H - size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: "#FFFFFF",
            opacity,
          }}
        />
      ))}

      {/* ── Layer 10: Bottom vignette ── */}
      <LinearGradient
        colors={["transparent", "rgba(1,0,5,0.72)", "#01010A"]}
        style={styles.bottomVignette}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* ── Layer 11: Shooting stars ── */}
      {SHOOTING_STARS.map(([startX, startY, angle, length, duration, delay], i) => (
        <ShootingStar
          key={`shoot-${i}`}
          startX={startX}
          startY={startY}
          angle={angle}
          length={length}
          duration={duration}
          delay={delay}
        />
      ))}

      {/* ── Layer 12: Aurora ribbon (animated, top) ── */}
      <Animated.View
        style={[
          styles.auroraContainer,
          { opacity: auroraOpacity, transform: [{ translateX: auroraTranslateX }] },
        ]}
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(100,220,160,0.25)",
            "rgba(80,180,240,0.30)",
            "rgba(140,100,240,0.20)",
            "rgba(80,180,240,0.15)",
            "transparent",
          ]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  mwHaze: {
    position: "absolute",
    width: W * 2.2,
    height: H * 0.55,
    top: -H * 0.12,
    left: -W * 0.6,
    transform: [{ rotate: "-32deg" }],
  },
  mwCore: {
    position: "absolute",
    width: W * 1.8,
    height: H * 0.28,
    top: H * 0.01,
    left: -W * 0.4,
    transform: [{ rotate: "-32deg" }],
  },
  blueNebula: {
    position: "absolute",
    width: W * 0.75,
    height: H * 0.35,
    top: H * 0.08,
    left: -W * 0.1,
    borderRadius: W * 0.5,
    backgroundColor: "#1A4AFF",
  },
  purpleNebula: {
    position: "absolute",
    width: W * 0.65,
    height: H * 0.32,
    top: H * 0.05,
    right: -W * 0.08,
    borderRadius: W * 0.5,
    backgroundColor: "#8B2FFF",
  },
  goldNebula: {
    position: "absolute",
    width: W * 0.5,
    height: H * 0.25,
    top: H * 0.55,
    left: -W * 0.05,
    borderRadius: W * 0.4,
    opacity: 0.05,
    backgroundColor: "#FF8C00",
  },
  horizonMist: {
    position: "absolute",
    left: 0, right: 0,
    top: H * 0.50,
    height: H * 0.14,
  },
  waterGrad: {
    position: "absolute",
    left: 0, right: 0,
    top: H * 0.54,
    bottom: 0,
  },
  bottomVignette: {
    position: "absolute",
    left: 0, right: 0,
    bottom: 0,
    height: H * 0.18,
  },
  auroraContainer: {
    position: "absolute",
    top: 0,
    left: -W * 0.2,
    right: -W * 0.2,
    height: H * 0.14,
  },
});
