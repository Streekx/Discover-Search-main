import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Platform, Linking, Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSearch } from "@/context/SearchContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REGIONS = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "ta", label: "Tamil" },
  { code: "mr", label: "Marathi" },
  { code: "bn", label: "Bengali" },
  { code: "es", label: "Spanish" },
];

const VOICE_LANGS = [
  { code: "en-IN", label: "English (India)" },
  { code: "en-US", label: "English (US)" },
  { code: "hi-IN", label: "Hindi (India)" },
  { code: "te-IN", label: "Telugu (India)" },
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
    Alert.alert(
      "Clear All Data",
      "This will delete all history and saved items. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All", style: "destructive",
          onPress: async () => {
            clearHistory();
            await AsyncStorage.multiRemove(["streekx_history", "streekx_saved", "streekx_settings"]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 84 }]} showsVerticalScrollIndicator={false}>

        <SectionGroup title="Privacy">
          <SettingRow
            icon="glasses-outline"
            iconColor="#6366F1"
            label="Incognito Mode"
            sublabel="Don't save searches or history"
            right={<Switch value={settings.incognitoMode} onValueChange={() => toggle("incognitoMode")} trackColor={{ true: Colors.light.tint }} />}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            iconColor="#059669"
            label="Safe Search"
            sublabel="Filter explicit content"
            right={<Switch value={settings.safeSearch} onValueChange={() => toggle("safeSearch")} trackColor={{ true: Colors.light.tint }} />}
          />
          <SettingRow
            icon="globe-outline"
            iconColor="#0EA5E9"
            label="Open links in app"
            sublabel="Use built-in browser"
            right={<Switch value={settings.openLinksInApp} onValueChange={() => toggle("openLinksInApp")} trackColor={{ true: Colors.light.tint }} />}
          />
        </SectionGroup>

        <SectionGroup title="Search Preferences">
          <TouchableOpacity onPress={() => setShowRegions(!showRegions)}>
            <SettingRow
              icon="flag-outline"
              iconColor="#F59E0B"
              label="Search Region"
              sublabel={REGIONS.find(r => r.code === settings.region)?.label || settings.region}
              right={<Ionicons name={showRegions ? "chevron-up" : "chevron-down"} size={18} color={Colors.light.textMuted} />}
            />
          </TouchableOpacity>
          {showRegions && (
            <View style={styles.picker}>
              {REGIONS.map(r => (
                <TouchableOpacity
                  key={r.code}
                  style={styles.pickerItem}
                  onPress={() => { updateSettings({ region: r.code }); setShowRegions(false); }}
                >
                  <Text style={[styles.pickerText, settings.region === r.code && styles.pickerTextActive]}>
                    {r.label}
                  </Text>
                  {settings.region === r.code && <Ionicons name="checkmark" size={16} color={Colors.light.tint} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={() => setShowLanguages(!showLanguages)}>
            <SettingRow
              icon="language-outline"
              iconColor="#8B5CF6"
              label="Language"
              sublabel={LANGUAGES.find(l => l.code === settings.language)?.label || settings.language}
              right={<Ionicons name={showLanguages ? "chevron-up" : "chevron-down"} size={18} color={Colors.light.textMuted} />}
            />
          </TouchableOpacity>
          {showLanguages && (
            <View style={styles.picker}>
              {LANGUAGES.map(l => (
                <TouchableOpacity
                  key={l.code}
                  style={styles.pickerItem}
                  onPress={() => { updateSettings({ language: l.code }); setShowLanguages(false); }}
                >
                  <Text style={[styles.pickerText, settings.language === l.code && styles.pickerTextActive]}>
                    {l.label}
                  </Text>
                  {settings.language === l.code && <Ionicons name="checkmark" size={16} color={Colors.light.tint} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity onPress={() => setShowVoiceLangs(!showVoiceLangs)}>
            <SettingRow
              icon="mic-outline"
              iconColor="#EC4899"
              label="Voice Language"
              sublabel={VOICE_LANGS.find(v => v.code === settings.voiceLanguage)?.label || settings.voiceLanguage}
              right={<Ionicons name={showVoiceLangs ? "chevron-up" : "chevron-down"} size={18} color={Colors.light.textMuted} />}
            />
          </TouchableOpacity>
          {showVoiceLangs && (
            <View style={styles.picker}>
              {VOICE_LANGS.map(v => (
                <TouchableOpacity
                  key={v.code}
                  style={styles.pickerItem}
                  onPress={() => { updateSettings({ voiceLanguage: v.code }); setShowVoiceLangs(false); }}
                >
                  <Text style={[styles.pickerText, settings.voiceLanguage === v.code && styles.pickerTextActive]}>
                    {v.label}
                  </Text>
                  {settings.voiceLanguage === v.code && <Ionicons name="checkmark" size={16} color={Colors.light.tint} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </SectionGroup>

        <SectionGroup title="Data">
          <SettingRow
            icon="analytics-outline"
            iconColor="#0EA5E9"
            label="Search History"
            sublabel="Saved locally on device"
            right={null}
          />
          <SettingRow
            icon="bookmark-outline"
            iconColor="#F59E0B"
            label="Saved Items"
            sublabel={`${savedItems.length} bookmarks saved`}
            right={null}
          />
          <TouchableOpacity onPress={handleClearAll}>
            <SettingRow
              icon="trash-outline"
              iconColor="#EF4444"
              label="Clear All Data"
              sublabel="Delete history, saved items & settings"
              right={<Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />}
            />
          </TouchableOpacity>
        </SectionGroup>

        <SectionGroup title="About">
          <SettingRow
            icon="information-circle-outline"
            iconColor={Colors.light.tint}
            label="StreekX Search"
            sublabel="Version 1.0.0"
            right={null}
          />
          <SettingRow
            icon="server-outline"
            iconColor="#10B981"
            label="Search Engine"
            sublabel="streekxkk-streekx.hf.space"
            right={null}
          />
          <TouchableOpacity onPress={() => Linking.openURL("https://streekxkk-streekx.hf.space")}>
            <SettingRow
              icon="open-outline"
              iconColor="#6366F1"
              label="Backend Status"
              sublabel="Check API health"
              right={<Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />}
            />
          </TouchableOpacity>
        </SectionGroup>

        <View style={styles.brandRow}>
          <Text style={styles.brandText}>streekx</Text>
          <View style={styles.brandDot} />
          <Text style={styles.brandTagline}>Independent Search Engine</Text>
        </View>
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

function SettingRow({
  icon, iconColor, label, sublabel, right
}: {
  icon: string; iconColor: string; label: string; sublabel?: string; right: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.iconBox, { backgroundColor: iconColor + "20" }]}>
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
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.light.text,
  },
  content: { paddingHorizontal: 16 },
  sectionGroup: { marginBottom: 24 },
  groupTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingInfo: { flex: 1 },
  settingLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: Colors.light.text,
  },
  settingSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  picker: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  pickerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
  },
  pickerTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  brandText: {
    fontFamily: "Caveat_700Bold",
    fontSize: 22,
    color: Colors.light.tint,
  },
  brandDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  brandTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
