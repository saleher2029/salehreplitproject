import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/api";

interface SiteSettings {
  whatsappNumber: string;
  telegramUsername: string;
  subscriptionInfo: string;
}

export default function ProfileScreen() {
  const { isDark, C } = useAppTheme();
  const { preference, setPreference } = useTheme();
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
  const roleColor = (role: string) => {
    if (role === "admin") return { bg: C.error + "1A", text: C.error };
    if (role === "student") return { bg: C.primary + "1A", text: C.primary };
    return { bg: C.muted, text: C.textMuted };
  };

  const themeOptions: { value: ThemePreference; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { value: "light", label: "فاتح", icon: "sun" },
    { value: "dark", label: "داكن", icon: "moon" },
    { value: "system", label: "تلقائي", icon: "smartphone" },
  ];

  return (
    <View style={[styles.wrap, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomPad + 100 }} showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: topPad + 20, backgroundColor: C.card, borderBottomColor: C.border }]}>
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: C.primary + "18", borderColor: C.primary + "30" }]}>
              <Text style={[styles.avatarLetter, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>
                {(user?.name || "T")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>{user?.name || "مستخدم"}</Text>
              {user?.email ? (
                <Text style={[styles.userEmail, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>{user.email}</Text>
              ) : null}
              <View style={[styles.roleBadge, { backgroundColor: roleColor(user?.role || "guest").bg }]}>
                <Text style={[styles.roleText, { color: roleColor(user?.role || "guest").text, fontFamily: "Tajawal_700Bold" }]}>
                  {roleLabel(user?.role || "guest")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Theme Toggle ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: "Tajawal_500Medium" }]}>مظهر التطبيق</Text>
          <View style={[styles.themeCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.themeIconWrap, { backgroundColor: C.primary + "18" }]}>
              <Feather name={isDark ? "moon" : "sun"} size={18} color={C.primary} />
            </View>
            <View style={styles.themeInfo}>
              <Text style={[styles.themeTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>الوضع</Text>
              <Text style={[styles.themeSub, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>
                {preference === "system" ? "يتبع النظام" : preference === "dark" ? "الوضع الداكن مفعّل" : "الوضع الفاتح مفعّل"}
              </Text>
            </View>
            <View style={[styles.themeSegment, { backgroundColor: C.background, borderColor: C.border }]}>
              {themeOptions.map((opt) => {
                const active = preference === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPreference(opt.value);
                    }}
                    style={[
                      styles.themeSegBtn,
                      active && { backgroundColor: C.primary },
                    ]}
                  >
                    <Feather
                      name={opt.icon}
                      size={14}
                      color={active ? "#fff" : C.textMuted}
                    />
                    <Text style={[
                      styles.themeSegLabel,
                      { color: active ? "#fff" : C.textMuted, fontFamily: "Tajawal_700Bold" },
                    ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Subscription Info ── */}
        {settings?.subscriptionInfo ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: "Tajawal_500Medium" }]}>معلومات الاشتراك</Text>
            <View style={[styles.infoCard, { backgroundColor: C.card, borderColor: C.primary + "30" }]}>
              <View style={[styles.infoIconWrap, { backgroundColor: C.primary + "18" }]}>
                <Feather name="info" size={16} color={C.primary} />
              </View>
              <Text style={[styles.infoText, { color: C.text, fontFamily: "Tajawal_400Regular" }]}>
                {settings.subscriptionInfo}
              </Text>
            </View>
          </View>
        ) : null}

        {/* ── Contact ── */}
        {(settings?.whatsappNumber || settings?.telegramUsername) ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: "Tajawal_500Medium" }]}>تواصل معنا</Text>
            <View style={styles.menuGroup}>
              {settings?.whatsappNumber ? (
                <MenuItem
                  icon="message-circle"
                  label="واتساب"
                  sublabel={settings.whatsappNumber}
                  iconBg="#25D36618"
                  iconColor="#25D366"
                  onPress={() => Linking.openURL(`https://wa.me/${settings!.whatsappNumber.replace(/\D/g, "")}`)}
                  C={C}
                />
              ) : null}
              {settings?.telegramUsername ? (
                <MenuItem
                  icon="send"
                  label="تيليغرام"
                  sublabel={"@" + settings.telegramUsername}
                  iconBg="#229ED918"
                  iconColor="#229ED9"
                  onPress={() => Linking.openURL(`https://t.me/${settings!.telegramUsername}`)}
                  C={C}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {/* ── Account ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <Text style={[styles.sectionLabel, { color: C.textMuted, fontFamily: "Tajawal_500Medium" }]}>الحساب</Text>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="award"
              label="امتحاناتي"
              sublabel="عرض جميع نتائجك"
              iconBg={C.primary + "18"}
              iconColor={C.primary}
              onPress={() => router.push("/(main)/history")}
              C={C}
            />
            {(user?.role === "admin" || user?.role === "supervisor") && (
              <MenuItem
                icon="settings"
                label="لوحة التحكم"
                sublabel="إدارة المحتوى"
                iconBg={C.secondary + "18"}
                iconColor={C.secondary}
                onPress={() => {}}
                C={C}
              />
            )}
            <MenuItem
              icon="log-out"
              label="تسجيل الخروج"
              sublabel="مغادرة الحساب"
              iconBg={C.error + "12"}
              iconColor={C.error}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowLogoutModal(true);
              }}
              C={C}
              destructive
            />
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>
            Tawjihi-Exams v1.0 • By S&S
          </Text>
        </View>
      </ScrollView>

      {/* ── Logout Modal ── */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowLogoutModal(false)}>
          <Pressable style={[styles.modal, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => {}}>
            <View style={[styles.modalIcon, { backgroundColor: C.error + "12" }]}>
              <Feather name="log-out" size={26} color={C.error} />
            </View>
            <Text style={[styles.modalTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>تسجيل الخروج</Text>
            <Text style={[styles.modalBody, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
              هل تريد مغادرة حسابك؟
            </Text>
            <View style={styles.modalBtns}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, { borderColor: C.border, backgroundColor: pressed ? C.muted : "transparent" }]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={[styles.cancelText, { color: C.textSecondary, fontFamily: "Tajawal_700Bold" }]}>إلغاء</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.confirmBtn, { backgroundColor: C.error, opacity: pressed ? 0.85 : 1 }]}
                onPress={confirmLogout}
                disabled={loggingOut}
              >
                {loggingOut
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={[styles.confirmText, { fontFamily: "Tajawal_700Bold" }]}>خروج</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MenuItem({
  icon, label, sublabel, iconBg, iconColor, onPress, C, destructive = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string; sublabel?: string;
  iconBg: string; iconColor: string;
  onPress: () => void;
  C: typeof Colors.light;
  destructive?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, { backgroundColor: C.card, borderColor: C.border, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, { color: destructive ? C.error : C.text, fontFamily: "Tajawal_700Bold" }]}>{label}</Text>
        {sublabel ? <Text style={[styles.menuSub, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>{sublabel}</Text> : null}
      </View>
      {!destructive && <Feather name="chevron-left" size={16} color={C.textMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1 },
  userRow: { flexDirection: "row-reverse", alignItems: "center", gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  avatarLetter: { fontSize: 28 },
  userInfo: { flex: 1, alignItems: "flex-end", gap: 4 },
  userName: { fontSize: 20 },
  userEmail: { fontSize: 13 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-end" },
  roleText: { fontSize: 12 },
  sectionLabel: { fontSize: 12, textAlign: "right", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  menuGroup: { gap: 8 },
  menuItem: { flexDirection: "row-reverse", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  menuText: { flex: 1, alignItems: "flex-end", gap: 1 },
  menuLabel: { fontSize: 15 },
  menuSub: { fontSize: 12 },
  infoCard: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  infoIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  infoText: { flex: 1, fontSize: 13, textAlign: "right", lineHeight: 22 },
  footer: { alignItems: "center", paddingTop: 40 },
  footerText: { fontSize: 12 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 24 },
  modal: { width: "100%", maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  modalIcon: { width: 60, height: 60, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20, textAlign: "center" },
  modalBody: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  modalBtns: { flexDirection: "row-reverse", gap: 10, marginTop: 8, width: "100%" },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 1.5 },
  cancelText: { fontSize: 14 },
  confirmBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  confirmText: { color: "#fff", fontSize: 14 },
  themeCard: { flexDirection: "row-reverse", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12, flexWrap: "wrap" },
  themeIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  themeInfo: { flex: 1, alignItems: "flex-end", gap: 2, minWidth: 80 },
  themeTitle: { fontSize: 15 },
  themeSub: { fontSize: 12 },
  themeSegment: { flexDirection: "row-reverse", borderRadius: 10, borderWidth: 1, padding: 3, gap: 3 },
  themeSegBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  themeSegLabel: { fontSize: 12 },
});
