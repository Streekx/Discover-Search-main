/**
 * StreekX — Production-Grade Splash Screen
 * Comparable to Comet Browser quality with physics-based animations
 *
 * Features:
 * - Galaxy background with subtle zoom-in effect
 * - 18 side stars on elliptical 65° tilted orbit (high-speed carnival ride)
 * - SVG-based logo assembly (molecule wheel + 5 node structure)
 * - Hero star curved entry with lock-in flash effect
 * - 60fps performance with useNativeDriver: true
 * - Seamless fade transition to main UI
 */

import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Animated, Dimensions, Easing,
  ImageBackground,
} from "react-native";
import Svg, { G, Circle, Path, Line } from "react-native-svg";

const GALAXY_BG = require("@/assets/images/galaxy_bg.jpg");

// ─── Timing Constants (milliseconds) ──────────────────────────────────────
const ORBIT_FAST_MS    = 2500;  // 18 stars orbiting fast (carnival ride effect)
const LOGO_IN_DELAY    = 2400;  // Logo structure appears slightly before orbit ends
const LOGO_IN_MS       = 600;
const HERO_DELAY       = 2600;  // Hero star begins curved entry
const HERO_ENTRY_MS    = 1200;  // Complex curved path
const HOLD_MS          = 1800;  // Logo held visible
const FADE_OUT_DELAY   = 6200;  // Begin fade to transparent
const FADE_OUT_MS      = 700;
const TOTAL_MS         = FADE_OUT_DELAY + FADE_OUT_MS;

// ─── Layout ──────────────────────────────────────────────────────────────
const { width: W, height: H } = Dimensions.get("window");
const CENTER_X = W * 0.5;
const CENTER_Y = H * 0.48;

// Elliptical orbit: 18 stars, tilted 65°
const ORBIT_TILT = 65; // degrees
const ORBIT_A = 100; // semi-major axis (width)
const ORBIT_B = 60;  // semi-minor axis (height)
const NUM_STARS = 18;

// Generate orbit star positions
function getOrbitStarPositions() {
  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < NUM_STARS; i++) {
    const t = (i / NUM_STARS) * 2 * Math.PI;
    // Ellipse parametric
    let x = ORBIT_A * Math.cos(t);
    let y = ORBIT_B * Math.sin(t);
    
    // Apply 65° tilt rotation
    const rad = (ORBIT_TILT * Math.PI) / 180;
    const x_rot = x * Math.cos(rad) - y * Math.sin(rad);
    const y_rot = x * Math.sin(rad) + y * Math.cos(rad);
    
    positions.push({ x: x_rot, y: y_rot });
  }
  return positions;
}

const ORBIT_POSITIONS = getOrbitStarPositions();

// ─── SVG Logo: Molecule Wheel Structure ──────────────────────────────────
function LogoSvg() {
  const size = 140;
  const centerNode = size / 2;
  const radius = size * 0.25; // distance from center to outer nodes
  
  // 5 nodes: 1 center + 4 outer (top, right, bottom, left)
  const nodes = [
    { x: centerNode, y: centerNode, r: 16 }, // center
    { x: centerNode, y: centerNode - radius, r: 12 }, // top
    { x: centerNode + radius, y: centerNode, r: 12 }, // right
    { x: centerNode, y: centerNode + radius, r: 12 }, // bottom
    { x: centerNode - radius, y: centerNode, r: 12 }, // left
  ];

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Connecting lines (white strokes) */}
      <Line x1={nodes[0].x} y1={nodes[0].y} x2={nodes[1].x} y2={nodes[1].y} stroke="#FFFFFF" strokeWidth={2.5} />
      <Line x1={nodes[0].x} y1={nodes[0].y} x2={nodes[2].x} y2={nodes[2].y} stroke="#FFFFFF" strokeWidth={2.5} />
      <Line x1={nodes[0].x} y1={nodes[0].y} x2={nodes[3].x} y2={nodes[3].y} stroke="#FFFFFF" strokeWidth={2.5} />
      <Line x1={nodes[0].x} y1={nodes[0].y} x2={nodes[4].x} y2={nodes[4].y} stroke="#FFFFFF" strokeWidth={2.5} />
      
      {/* Orbital ring connecting outer nodes */}
      <Circle cx={centerNode} cy={centerNode} r={radius} fill="none" stroke="#FFFFFF" strokeWidth={1.5} opacity="0.6" />
      
      {/* Node spheres with glow effect (white with shadow) */}
      {nodes.map((node, i) => (
        <Circle
          key={i}
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill="#FFFFFF"
          opacity="0.95"
        />
      ))}
    </Svg>
  );
}

// ─── Hero Star Component ──────────────────────────────────────────────────
function HeroStarSvg() {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32">
      {/* 5-pointed star */}
      <Path
        d="M16 2 L20 12 L31 12 L22 18 L26 28 L16 22 L6 28 L10 18 L1 12 L12 12 Z"
        fill="#FFFFFF"
        opacity="0.98"
      />
    </Svg>
  );
}

// ─── Main Splash Screen ───────────────────────────────────────────────────
export default function AnimatedSplashScreen({ onFinish }: { onFinish: () => void }) {
  // Screen overlay
  const screenOpacity = useRef(new Animated.Value(1)).current;
  
  // Background zoom
  const bgZoom = useRef(new Animated.Value(1)).current;
  
  // Orbit rotation
  const orbitRotation = useRef(new Animated.Value(0)).current;
  const orbitOpacity = useRef(new Animated.Value(1)).current;
  
  // Logo assembly
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  
  // Hero star
  const heroScale = useRef(new Animated.Value(0)).current;
  const heroX = useRef(new Animated.Value(W * 0.5)).current;
  const heroY = useRef(new Animated.Value(H * 0.2)).current;
  const heroGlow = useRef(new Animated.Value(0)).current;
  
  const EO = Easing.bezier(0.33, 1, 0.68, 1);   // ease-out
  const EI = Easing.bezier(0.32, 0, 0.67, 0);   // ease-in
  const EIO = Easing.bezier(0.45, 0, 0.55, 1);  // ease-in-out

  useEffect(() => {
    // ─── Phase 1: Background zoom-in (subtle, continuous) ───────────────
    Animated.timing(bgZoom, {
      toValue: 1.08,
      duration: TOTAL_MS - 800,
      easing: EIO,
      useNativeDriver: true,
    }).start();

    // ─── Phase 2: Orbit stars spin fast (carnival ride) ─────────────────
    Animated.timing(orbitRotation, {
      toValue: 2, // 2 full rotations
      duration: ORBIT_FAST_MS,
      easing: EIO,
      useNativeDriver: true,
    }).start();

    // Fade out orbit stars as logo appears
    Animated.sequence([
      Animated.delay(LOGO_IN_DELAY - 250),
      Animated.timing(orbitOpacity, {
        toValue: 0,
        duration: 250,
        easing: EI,
        useNativeDriver: true,
      }),
    ]).start();

    // ─── Phase 3: Logo assembly (molecule structure) ────────────────────
    Animated.sequence([
      Animated.delay(LOGO_IN_DELAY),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: LOGO_IN_MS,
          easing: EO,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // ─── Phase 4: Hero star curved entry ───────────────────────────────
    // Hero star follows complex curved trajectory
    const heroPath = {
      startX: W * 0.7,
      startY: H * 0.15,
      endX: CENTER_X + 55,
      endY: CENTER_Y - 65,
    };

    Animated.sequence([
      Animated.delay(HERO_DELAY),
      Animated.parallel([
        // X motion: quadratic ease
        Animated.timing(heroX, {
          toValue: heroPath.endX,
          duration: HERO_ENTRY_MS,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        // Y motion: cubic ease with arc curve
        Animated.timing(heroY, {
          toValue: heroPath.endY,
          duration: HERO_ENTRY_MS,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          useNativeDriver: true,
        }),
        // Scale hero star in
        Animated.timing(heroScale, {
          toValue: 1,
          duration: HERO_ENTRY_MS * 0.8,
          easing: EO,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Hero star flash/shimmer at lock-in
    Animated.sequence([
      Animated.delay(HERO_DELAY + HERO_ENTRY_MS),
      Animated.parallel([
        Animated.timing(heroGlow, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(heroGlow, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          delay: 150,
        }),
      ]),
    ]).start();

    // ─── Phase 5: Fade out entire screen ───────────────────────────────
    Animated.sequence([
      Animated.delay(FADE_OUT_DELAY),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: EI,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onFinish();
    });
  }, []);

  const orbitRotationInterp = orbitRotation.interpolate({
    inputRange: [0, 2],
    outputRange: ["0deg", "720deg"],
  });

  const bgTransform = bgZoom.interpolate({
    inputRange: [1, 1.08],
    outputRange: [1, 1.08],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: screenOpacity }]}>
      {/* Galaxy Background with subtle zoom */}
      <Animated.View style={{ flex: 1, transform: [{ scale: bgTransform }] }}>
        <ImageBackground
          source={GALAXY_BG}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Dark overlay for brand cohesion */}
      <View style={[StyleSheet.absoluteFill, styles.darkOverlay]} />

      {/* 18 Orbiting Stars on Elliptical Path */}
      <Animated.View
        style={[
          styles.orbitContainer,
          {
            opacity: orbitOpacity,
            transform: [{ rotate: orbitRotationInterp }],
          },
        ]}
      >
        {ORBIT_POSITIONS.map((pos, i) => (
          <View
            key={i}
            style={[
              styles.orbitStar,
              {
                left: pos.x - 5,
                top: pos.y - 5,
                opacity: 0.9 - (i / NUM_STARS) * 0.3,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Logo Assembly (SVG Molecule Wheel) */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.logoSvgWrapper}>
          <LogoSvg />
        </View>
        
        {/* Branding text below logo */}
        <Text style={styles.streekxText}>STREEKX</Text>
        <Text style={styles.tagline}>Search Engine</Text>
      </Animated.View>

      {/* Hero Star with Complex Curved Entry */}
      <Animated.View
        style={[
          styles.heroStarContainer,
          {
            transform: [
              { translateX: heroX },
              { translateY: heroY },
              { scale: heroScale },
            ],
            opacity: Animated.add(heroScale, heroGlow),
          },
        ]}
      >
        <HeroStarSvg />
      </Animated.View>

      {/* Flash effect on hero star lock-in */}
      <Animated.View
        style={[
          styles.heroFlash,
          {
            opacity: heroGlow,
          },
        ]}
      />
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  darkOverlay: {
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  orbitContainer: {
    position: "absolute",
    top: CENTER_Y,
    left: CENTER_X,
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  orbitStar: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 12,
  },
  logoContainer: {
    position: "absolute",
    top: CENTER_Y - 90,
    alignItems: "center",
    zIndex: 100,
  },
  logoSvgWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  streekxText: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
    letterSpacing: 2,
    marginTop: 12,
    textShadowColor: "rgba(255,255,255,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  heroStarContainer: {
    position: "absolute",
    zIndex: 110,
  },
  heroFlash: {
    position: "absolute",
    top: CENTER_Y - 65,
    left: CENTER_X + 55 - 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.6)",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
});
