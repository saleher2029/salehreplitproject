import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/api";

interface SiteSettings {
  whatsappNumber: string;
  telegramUsername: string;
  subscriptionInfo: string;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: () => apiRequest<SiteSettings>("/api/settings"),
  });

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج", style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const roleLabel = (role: string) => {
    if (role === "admin") return "مدير";
    if (role === "supervisor") return "مشرف";
    if (role === "student") return "طالب";
    return "ضيف";
  };

  const MenuItem = ({
    icon, label, onPress, destructive = false,
  }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; destructive?: boolean }) => (
    <Pressable
      style={({ pressed }) => [styles.menuItem, { backgroundColor: C.card, opacity: pressed ? 0.8 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: (destructive ? C.error : C.primary) + "18" }]}>
        <Feather name={icon} size={18} color={destructive ? C.error : C.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: destructive ? C.error : C.text, fontFamily: "Tajawal_500Medium" }]}>
        {label}
      </Text>
      {!destructive && <Feather name="chevron-left" size={16} color={C.textMuted} />}
    </Pressable>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={{ paddingBottom: bottomPad + 100 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: topPad + 20, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={[styles.avatarBig, { backgroundColor: C.primary }]}>
          <Text style={[styles.avatarLetter, { fontFamily: "Tajawal_700Bold" }]}>
            {(user?.name || "T")[0].toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.userName, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>{user?.name || "مستخدم"}</Text>
        {user?.email && <Text style={[styles.userEmail, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>{user.email}</Text>}
        <View style={[styles.roleBadge, { backgroundColor: C.primary + "18" }]}>
          <Text style={[styles.roleText, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>{roleLabel(user?.role || "guest")}</Text>
        </View>
      </View>

      {settings && (settings.subscriptionInfo || settings.whatsappNumber || settings.telegramUsername) && (
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>الاشتراك والتواصل</Text>

          {settings.subscriptionInfo ? (
            <View style={[styles.infoBox, { backgroundColor: C.card, borderColor: C.primary + "40" }]}>
              <Text style={[styles.infoText, { color: C.text, fontFamily: "Tajawal_400Regular" }]}>{settings.subscriptionInfo}</Text>
            </View>
          ) : null}

          <View style={styles.menuGroup}>
            {settings.whatsappNumber ? (
              <MenuItem icon="message-circle" label={`واتساب: ${settings.whatsappNumber}`} onPress={() => {}} />
            ) : null}
            {settings.telegramUsername ? (
              <MenuItem icon="send" label={`تيليغرام: @${settings.telegramUsername}`} onPress={() => {}} />
            ) : null}
          </View>
        </View>
      )}

      <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
        <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>الحساب</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="clock" label="سجل الامتحانات" onPress={() => router.push("/(main)/history")} />
          <MenuItem icon="log-out" label="تسجيل الخروج" onPress={handleLogout} destructive />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>Tawjihi-Exams • By S&S</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 24, borderBottomWidth: 1, gap: 8 },
  avatarBig: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  avatarLetter: { fontSize: 34, color: "#fff" },
  userName: { fontSize: 22, textAlign: "center" },
  userEmail: { fontSize: 14, textAlign: "center" },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20 },
  roleText: { fontSize: 13 },
  sectionLabel: { fontSize: 12, textAlign: "right", marginBottom: 8, marginRight: 4 },
  menuGroup: { gap: 8 },
  menuItem: { flexDirection: "row-reverse", alignItems: "center", padding: 16, borderRadius: 14, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuLabel: { flex: 1, fontSize: 15, textAlign: "right" },
  infoBox: { padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  infoText: { fontSize: 14, textAlign: "right", lineHeight: 22 },
  footer: { alignItems: "center", paddingTop: 40 },
  footerText: { fontSize: 12 },
});
