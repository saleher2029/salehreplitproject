import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
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

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: () => apiRequest<SiteSettings>("/api/settings"),
  });

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    await logout();
    setShowLogoutModal(false);
    setLoggingOut(false);
    router.replace("/login");
  };

  const roleLabel = (role: string) => {
    if (role === "admin") return "مدير";
    if (role === "supervisor") return "مشرف";
    if (role === "student") return "طالب مشترك";
    return "ضيف";
  };

  const roleGradient: [string, string] = user?.role === "admin"
    ? ["#F59E0B", "#EF4444"]
    : user?.role === "student"
    ? ["#6C63FF", "#B15EFF"]
    : ["#6B7280", "#9CA3AF"];

  return (
    <View style={[styles.wrap, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={isDark ? ["#130F3A", "#07061A"] : ["#6C63FF", "#B15EFF"]}
          style={[styles.hero, { paddingTop: topPad + 24 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatarContainer}>
            <LinearGradient colors={roleGradient} style={styles.avatarGrad}>
              <Text style={[styles.avatarLetter, { fontFamily: "Tajawal_700Bold" }]}>
                {(user?.name || "T")[0].toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={[styles.avatarRing, { borderColor: "rgba(255,255,255,0.3)" }]} />
          </View>

          <Text style={[styles.heroName, { fontFamily: "Tajawal_700Bold" }]}>{user?.name || "مستخدم"}</Text>
          {user?.email ? (
            <Text style={[styles.heroEmail, { fontFamily: "Tajawal_400Regular" }]}>{user.email}</Text>
          ) : null}

          <LinearGradient colors={roleGradient} style={styles.rolePill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={[styles.roleText, { fontFamily: "Tajawal_700Bold" }]}>{roleLabel(user?.role || "guest")}</Text>
          </LinearGradient>
        </LinearGradient>

        {/* Subscription Info */}
        {settings?.subscriptionInfo ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <SectionLabel label="معلومات الاشتراك" color={C.textMuted} />
            <View style={[styles.infoCard, { backgroundColor: C.card, borderColor: C.primary + "30" }]}>
              <LinearGradient colors={[C.primary + "22", C.primary + "08"]} style={styles.infoGrad}>
                <Feather name="info" size={18} color={C.primary} />
                <Text style={[styles.infoText, { color: C.text, fontFamily: "Tajawal_400Regular" }]}>
                  {settings.subscriptionInfo}
                </Text>
              </LinearGradient>
            </View>
          </View>
        ) : null}

        {/* Contact */}
        {(settings?.whatsappNumber || settings?.telegramUsername) ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <SectionLabel label="تواصل معنا" color={C.textMuted} />
            <View style={styles.menuGroup}>
              {settings?.whatsappNumber ? (
                <MenuItem
                  icon="message-circle"
                  label="واتساب"
                  sublabel={settings.whatsappNumber}
                  gradColors={["#25D366", "#128C7E"]}
                  onPress={() => Linking.openURL(`https://wa.me/${settings!.whatsappNumber}`)}
                  C={C}
                />
              ) : null}
              {settings?.telegramUsername ? (
                <MenuItem
                  icon="send"
                  label="تيليغرام"
                  sublabel={"@" + settings.telegramUsername}
                  gradColors={["#229ED9", "#007AB8"]}
                  onPress={() => Linking.openURL(`https://t.me/${settings!.telegramUsername}`)}
                  C={C}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Account */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <SectionLabel label="الحساب" color={C.textMuted} />
          <View style={styles.menuGroup}>
            <MenuItem
              icon="clock"
              label="سجل الامتحانات"
              sublabel="عرض جميع نتائجك"
              gradColors={["#6C63FF", "#B15EFF"]}
              onPress={() => router.push("/(main)/history")}
              C={C}
            />
            <MenuItem
              icon="log-out"
              label="تسجيل الخروج"
              sublabel="مغادرة الحساب"
              gradColors={["#FF4757", "#FF6B81"]}
              onPress={handleLogout}
              C={C}
              destructive
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>
            Tawjihi-Exams v1.0 • By S&S
          </Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLogoutModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: isDark ? "#161830" : "#FFFFFF" }]} onPress={() => {}}>
            <View style={[styles.modalIconWrap, { backgroundColor: "#FF475720" }]}>
              <Feather name="log-out" size={28} color="#FF4757" />
            </View>
            <Text style={[styles.modalTitle, { color: isDark ? "#F0EEFF" : "#1A1033", fontFamily: "Tajawal_700Bold" }]}>
              تسجيل الخروج
            </Text>
            <Text style={[styles.modalBody, { color: isDark ? "#8C89AB" : "#5A5375", fontFamily: "Tajawal_400Regular" }]}>
              هل تريد الخروج من حسابك؟
            </Text>
            <View style={styles.modalBtns}>
              <Pressable
                style={[styles.modalCancelBtn, { borderColor: isDark ? "rgba(255,255,255,0.12)" : "#E5E1F8" }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: isDark ? "#8C89AB" : "#5A5375", fontFamily: "Tajawal_700Bold" }]}>
                  إلغاء
                </Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={confirmLogout} disabled={loggingOut}>
                <LinearGradient colors={["#FF4757", "#FF6B81"]} style={styles.modalConfirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loggingOut ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.modalConfirmText, { fontFamily: "Tajawal_700Bold" }]}>خروج</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text style={[styles.sectionLabel, { color, fontFamily: "Tajawal_500Medium" }]}>{label}</Text>
  );
}

function MenuItem({
  icon, label, sublabel, gradColors, onPress, C, destructive = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  gradColors: [string, string];
  onPress: () => void;
  C: typeof Colors.light;
  destructive?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: C.card, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
      onPress={onPress}
    >
      <View style={styles.menuLeft}>
        {!destructive && <Feather name="chevron-left" size={16} color={C.textMuted} />}
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, { color: destructive ? "#FF4757" : C.text, fontFamily: "Tajawal_700Bold" }]}>{label}</Text>
        {sublabel ? <Text style={[styles.menuSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>{sublabel}</Text> : null}
      </View>
      <LinearGradient colors={gradColors} style={styles.menuIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Feather name={icon} size={17} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  hero: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 32, gap: 8 },
  avatarContainer: { position: "relative", marginBottom: 6 },
  avatarGrad: { width: 86, height: 86, borderRadius: 26, justifyContent: "center", alignItems: "center" },
  avatarRing: { position: "absolute", inset: -4, borderRadius: 30, borderWidth: 2, pointerEvents: "none" },
  avatarLetter: { fontSize: 36, color: "#fff" },
  heroName: { fontSize: 24, color: "#fff", textAlign: "center" },
  heroEmail: { fontSize: 13, color: "rgba(255,255,255,0.65)", textAlign: "center" },
  rolePill: { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20 },
  roleText: { color: "#fff", fontSize: 13 },
  sectionLabel: { fontSize: 12, textAlign: "right", marginBottom: 10, marginRight: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  menuGroup: { gap: 10 },
  menuItem: { flexDirection: "row-reverse", alignItems: "center", padding: 14, borderRadius: 16, gap: 12 },
  menuIcon: { width: 42, height: 42, borderRadius: 13, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  menuText: { flex: 1, alignItems: "flex-end", gap: 1 },
  menuLabel: { fontSize: 15 },
  menuSub: { fontSize: 12 },
  menuLeft: { width: 24, alignItems: "center" },
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  infoGrad: { flexDirection: "row-reverse", gap: 12, padding: 14, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 14, lineHeight: 22, textAlign: "right" },
  footer: { alignItems: "center", paddingTop: 40 },
  footerText: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 360, borderRadius: 24, padding: 28, alignItems: "center", gap: 10 },
  modalIconWrap: { width: 64, height: 64, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20, textAlign: "center" },
  modalBody: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  modalBtns: { flexDirection: "row-reverse", gap: 12, marginTop: 6, width: "100%" },
  modalCancelBtn: { flex: 1, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 1.5 },
  modalCancelText: { fontSize: 15 },
  modalConfirmBtn: { flex: 1, borderRadius: 14, overflow: "hidden" },
  modalConfirmGrad: { height: 50, justifyContent: "center", alignItems: "center" },
  modalConfirmText: { color: "#fff", fontSize: 15 },
});
