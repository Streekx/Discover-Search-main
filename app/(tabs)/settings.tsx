import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Platform, Linking, Alert, StatusBar
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSearch } from "@/context/SearchContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GalaxyBackground from "@/components/GalaxyBackground";

const REGIONS = [
  { code: "IN", label: "India" }, { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" }, { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" }, { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
];
const LANGUAGES = [
  { code: "en", label: "English" }, { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" }, { code: "ta", label: "Tamil" },
  { code: "mr", label: "Marathi" }, { code: "bn", label: "Bengali" },
  { code: "es", label: "Spanish" },
];
const VOICE_LANGS = [
  { code: "en-IN", label: "English (India)" }, { code: "en-US", label: "English (US)" },
  { code: "hi-IN", label: "Hindi (India)" }, { code: "te-IN", label: "Telugu (India)" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, clearHistory, savedItems } = useSearch();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [showRegions, setShowRegions] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [showVoiceLangs, setShowVoiceLangs] = useState(false);

  function toggle(key: keyof typeof settings) {
    const val = settings[key] as boolean;
    updateSettings({ [key]: !val });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleClearAll() {
    Alert.alert("Clear All Data", "This will delete all history and saved items. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All", style: "destructive",
        onPress: async () => {
          clearHistory();
          await AsyncStorage.multiRemove(["streekx_history", "streekx_saved", "streekx_settings"]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <GalaxyBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 84 }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionGroup title="Privacy">
          <SettingRow icon="glasses-outline" iconColor="#6366F1" label="Incognito Mode"
            sublabel="Don't save searches or history"
            right={<Switch value={settings.incognitoMode} onValueChange={() => toggle("incognitoMode")}
              trackColor={{ false: "rgba(255,255,255,0.15)", true: "#6366F1" }} thumbColor="#fff" />} />
          <SettingRow icon="shield-checkmark-outline" iconColor="#059669" label="Safe Search"
            sublabel="Filter explicit content"
            right={<Switch value={settings.safeSearch} onValueChange={() => toggle("safeSearch")}
              trackColor={{ false: "rgba(255,255,255,0.15)", true: "#059669" }} thumbColor="#fff" />} />
          <SettingRow icon="globe-outline" iconColor="#0EA5E9" label="Open links in app"
            sublabel="Use built-in browser"
            right={<Switch value={settings.openLinksInApp} onValueChange={() => toggle("openLinksInApp")}
              trackColor={{ false: "rgba(255,255,255,0.15)", true: "#0EA5E9" }} thumbColor="#fff" />} />
        </SectionGroup>

        <SectionGroup title="Search Preferences">
          <TouchableOpacity onPress={() => setShowRegions(!showRegions)}>
            <SettingRow icon="flag-outline" iconColor="#F59E0B" label="Search Region"
              sublabel={REGIONS.find(r => r.code === settings.region)?.label || settings.region}
              right={<Ionicons name={showRegions ? "chevron-up" : "chevron-down"} size={18} color="rgba(255,255,255,0.40)" />} />
          </TouchableOpacity>
          {showRegions && (
            <View style={styles.picker}>
              {REGIONS.map(r => (
                <TouchableOpacity key={r.code} style={styles.pickerItem}
                  onPress={() => { updateSettings({ region: r.code }); setShowRegions(false); }}>
                  <Text style={[styles.pickerText, settings.region === r.code && styles.pickerTextActive]}>{r.label}</Text>
                  {settings.region === r.code && <Ionicons name="checkmark" size={16} color="#6EB4FF" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={() => setShowLanguages(!showLanguages)}>
            <SettingRow icon="language-outline" iconColor="#8B5CF6" label="Language"
              sublabel={LANGUAGES.find(l => l.code === settings.language)?.label || settings.language}
              right={<Ionicons name={showLanguages ? "chevron-up" : "chevron-down"} size={18} color="rgba(255,255,255,0.40)" />} />
          </TouchableOpacity>
          {showLanguages && (
            <View style={styles.picker}>
              {LANGUAGES.map(l => (
                <TouchableOpacity key={l.code} style={styles.pickerItem}
                  onPress={() => { updateSettings({ language: l.code }); setShowLanguages(false); }}>
                  <Text style={[styles.pickerText, settings.language === l.code && styles.pickerTextActive]}>{l.label}</Text>
                  {settings.language === l.code && <Ionicons name="checkmark" size={16} color="#6EB4FF" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={() => setShowVoiceLangs(!showVoiceLangs)}>
            <SettingRow icon="mic-outline" iconColor="#EC4899" label="Voice Language"
              sublabel={VOICE_LANGS.find(v => v.code === (settings as any).voiceLang)?.label || "English (India)"}
              right={<Ionicons name={showVoiceLangs ? "chevron-up" : "chevron-down"} size={18} color="rgba(255,255,255,0.40)" />} />
          </TouchableOpacity>
          {showVoiceLangs && (
            <View style={styles.picker}>
              {VOICE_LANGS.map(v => (
                <TouchableOpacity key={v.code} style={styles.pickerItem}
                  onPress={() => { updateSettings({ voiceLang: v.code } as any); setShowVoiceLangs(false); }}>
                  <Text style={[styles.pickerText, (settings as any).voiceLang === v.code && styles.pickerTextActive]}>{v.label}</Text>
                  {(settings as any).voiceLang === v.code && <Ionicons name="checkmark" size={16} color="#6EB4FF" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </SectionGroup>

        <SectionGroup title="Appearance">
          <SettingRow icon="notifications-outline" iconColor="#F97316" label="Search Suggestions"
            sublabel="Show trending and recent"
            right={<Switch value={(settings as any).showSuggestions ?? true}
              onValueChange={() => toggle("showSuggestions" as any)}
              trackColor={{ false: "rgba(255,255,255,0.15)", true: "#F97316" }} thumbColor="#fff" />} />
        </SectionGroup>

        <SectionGroup title="Data & Storage">
          <SettingRow icon="time-outline" iconColor="#10B981" label="History"
            sublabel={`${savedItems.length} saved items`}
            right={
              <TouchableOpacity onPress={handleClearAll} style={styles.dangerBtn}>
                <Text style={styles.dangerBtnText}>Clear All</Text>
              </TouchableOpacity>
            } />
        </SectionGroup>

        <SectionGroup title="About">
          <SettingRow icon="information-circle-outline" iconColor="#6EB4FF" label="Version"
            sublabel="StreekX 1.0.0" right={<View />} />
          <TouchableOpacity onPress={() => Linking.openURL("https://streekx.app/privacy")}>
            <SettingRow icon="document-text-outline" iconColor="#A78BFA" label="Privacy Policy"
              sublabel="View our privacy policy"
              right={<Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.35)" />} />
          </TouchableOpacity>
        </SectionGroup>

        <View style={styles.brandRow}>
          <Text style={styles.brandText}>STREEKX</Text>
          <View style={styles.brandDot} />
        </View>
        <Text style={styles.brandTagline}>Search beyond the stars</Text>
      </ScrollView>
    </View>
  );
}

function SectionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionGroup}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

function SettingRow({ icon, iconColor, label, sublabel, right }: {
  icon: string; iconColor: string; label: string; sublabel?: string; right: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.iconBox, { backgroundColor: iconColor + "25" }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sublabel ? <Text style={styles.settingSub}>{sublabel}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05050A" },
  header: {
    paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold", fontSize: 28, color: "#FFFFFF",
  },
  content: { paddingHorizontal: 16 },
  sectionGroup: { marginBottom: 24 },
  groupTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    textTransform: "uppercase", letterSpacing: 0.8,
    marginBottom: 8, marginLeft: 4,
  },
  groupCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 13, paddingHorizontal: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  settingInfo: { flex: 1 },
  settingLabel: {
    fontFamily: "Inter_500Medium", fontSize: 15, color: "#FFFFFF",
  },
  settingSub: {
    fontFamily: "Inter_400Regular", fontSize: 12,
    color: "rgba(255,255,255,0.50)", marginTop: 1,
  },
  picker: {
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14, paddingVertical: 4,
  },
  pickerItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  pickerText: {
    fontFamily: "Inter_400Regular", fontSize: 15, color: "rgba(255,255,255,0.70)",
  },
  pickerTextActive: {
    fontFamily: "Inter_600SemiBold", color: "#6EB4FF",
  },
  dangerBtn: {
    backgroundColor: "rgba(255,107,107,0.15)",
    borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12,
  },
  dangerBtnText: {
    fontFamily: "Inter_500Medium", fontSize: 13, color: "#FF6B6B",
  },
  brandRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, marginBottom: 6, marginTop: 8,
  },
  brandText: {
    fontFamily: "Caveat_700Bold", fontSize: 22, color: "#6EB4FF",
  },
  brandDot: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: "#F59E0B",
  },
  brandTagline: {
    fontFamily: "Inter_400Regular", fontSize: 13,
    color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 20,
  },
});
