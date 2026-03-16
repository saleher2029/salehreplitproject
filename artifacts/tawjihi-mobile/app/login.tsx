import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/api";

type AuthResponse = {
  token: string;
  user: { id: number; name: string; email?: string | null; role: string };
};
type Mode = "main" | "login" | "register" | "admin";

export default function LoginScreen() {
  const { isDark, C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>("main");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleGuest = async () => {
    setError(""); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await apiRequest<AuthResponse>("/api/auth/guest", { method: "POST" });
      await login(res.token, res.user);
      router.replace("/(main)");
    } catch (e: any) { setError(e.message || "حدث خطأ"); setLoading(false); }
  };

  const handleSubmit = async () => {
    if (mode === "register" && !name.trim()) { setError("أدخل اسمك"); return; }
    if (!email.trim()) { setError("أدخل البريد الإلكتروني"); return; }
    if (password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    setError(""); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: email.trim(), password }
        : { name: name.trim(), email: email.trim(), password };
      const res = await apiRequest<AuthResponse>(endpoint, { method: "POST", body: JSON.stringify(body) });
      await login(res.token, res.user);
      router.replace("/(main)");
    } catch (e: any) { setError(e.message || "حدث خطأ"); setLoading(false); }
  };

  const handleAdminLogin = async () => {
    if (!adminUser.trim()) { setError("أدخل اسم المستخدم"); return; }
    if (!adminPass) { setError("أدخل كلمة المرور"); return; }
    setError(""); setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await apiRequest<AuthResponse>("/api/auth/admin", {
        method: "POST",
        body: JSON.stringify({ username: adminUser.trim(), password: adminPass }),
      });
      await login(res.token, res.user);
      router.replace("/(main)");
    } catch (e: any) { setError(e.message || "اسم المستخدم أو كلمة المرور غير صحيحة"); setLoading(false); }
  };

  const goBack = () => { setMode("main"); setError(""); };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 24, paddingBottom: bottomPad + 24, backgroundColor: C.background }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo & Title ── */}
        <View style={styles.logoSection}>
          <View style={[styles.logoBox, { backgroundColor: C.primary }]}>
            <Feather name="book-open" size={36} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>Tawjihi-Exams</Text>
          <Text style={[styles.byText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>By S&S</Text>
          <Text style={[styles.tagline, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
            منصتك الأولى للاستعداد لامتحانات الثانوية العامة
          </Text>
        </View>

        {/* ── Card ── */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {/* ─── Main Mode ─── */}
          {mode === "main" && (
            <View style={styles.formGap}>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleGuest}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Text style={[styles.primaryBtnText, { fontFamily: "Tajawal_700Bold" }]}>الدخول كضيف</Text>
                    <Feather name="user" size={18} color="#fff" />
                  </>
                )}
              </Pressable>

              <View style={styles.orRow}>
                <View style={[styles.orLine, { backgroundColor: C.border }]} />
                <Text style={[styles.orText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>أو بحساب</Text>
                <View style={[styles.orLine, { backgroundColor: C.border }]} />
              </View>

              <Pressable
                style={({ pressed }) => [styles.outlineBtn, { borderColor: C.border, backgroundColor: pressed ? C.muted : "transparent" }]}
                onPress={() => { setError(""); setMode("login"); }}
              >
                <Text style={[styles.outlineBtnText, { color: C.text, fontFamily: "Tajawal_500Medium" }]}>
                  تسجيل الدخول بالبريد الإلكتروني
                </Text>
                <Feather name="mail" size={18} color={C.textSecondary} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.outlineBtn, { borderColor: C.border, backgroundColor: pressed ? C.muted : "transparent" }]}
                onPress={() => { setError(""); setMode("register"); }}
              >
                <Text style={[styles.outlineBtnText, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>
                  إنشاء حساب جديد
                </Text>
                <Feather name="user-plus" size={18} color={C.primary} />
              </Pressable>

              <View style={[styles.orLine, { backgroundColor: C.border, marginTop: 4 }]} />

              {/* Admin — now properly connected */}
              <Pressable
                style={({ pressed }) => [styles.adminBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={() => { setError(""); setAdminUser(""); setAdminPass(""); setMode("admin"); }}
              >
                <Text style={[styles.adminText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>دخول الإدارة</Text>
                <Feather name="shield" size={14} color={C.textMuted} />
              </Pressable>
            </View>
          )}

          {/* ─── Email / Register Mode ─── */}
          {(mode === "login" || mode === "register") && (
            <View style={styles.formGap}>
              <Pressable onPress={goBack} style={styles.backRow}>
                <Text style={[styles.backText, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>رجوع</Text>
                <Feather name="arrow-right" size={18} color={C.primary} />
              </Pressable>

              <Text style={[styles.formTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>
                {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
              </Text>

              {mode === "register" && (
                <View style={[styles.inputWrap, { borderColor: C.input, backgroundColor: C.cardSecondary }]}>
                  <TextInput
                    style={[styles.input, { color: C.text, fontFamily: "Tajawal_400Regular" }]}
                    placeholder="الاسم الكامل"
                    placeholderTextColor={C.textMuted}
                    value={name}
                    onChangeText={setName}
                    textAlign="right"
                    autoCapitalize="words"
                  />
                  <Feather name="user" size={18} color={C.textMuted} />
                </View>
              )}

              <View style={[styles.inputWrap, { borderColor: C.input, backgroundColor: C.cardSecondary }]}>
                <TextInput
                  style={[styles.input, { color: C.text, fontFamily: "Tajawal_400Regular" }]}
                  placeholder="البريد الإلكتروني"
                  placeholderTextColor={C.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  textAlign="right"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Feather name="mail" size={18} color={C.textMuted} />
              </View>

              <View style={[styles.inputWrap, { borderColor: C.input, backgroundColor: C.cardSecondary }]}>
                <TextInput
                  style={[styles.input, { color: C.text, fontFamily: "Tajawal_400Regular" }]}
                  placeholder="كلمة المرور (6 أحرف على الأقل)"
                  placeholderTextColor={C.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  textAlign="right"
                />
                <Pressable onPress={() => setShowPass(!showPass)} hitSlop={12}>
                  <Feather name={showPass ? "eye-off" : "eye"} size={18} color={C.textMuted} />
                </Pressable>
              </View>

              {!!error && <ErrorBox error={error} C={C} />}

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Text style={[styles.primaryBtnText, { fontFamily: "Tajawal_700Bold" }]}>
                      {mode === "login" ? "دخول" : "إنشاء الحساب"}
                    </Text>
                    <Feather name={mode === "login" ? "log-in" : "user-plus"} size={18} color="#fff" />
                  </>
                )}
              </Pressable>

              <Pressable onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} style={{ alignSelf: "center" }}>
                <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 13 }]}>
                  {mode === "login" ? "ليس لديك حساب؟ " : "لديك حساب؟ "}
                  <Text style={{ color: C.primary, fontFamily: "Tajawal_700Bold" }}>
                    {mode === "login" ? "سجّل الآن" : "سجّل دخولك"}
                  </Text>
                </Text>
              </Pressable>
            </View>
          )}

          {/* ─── Admin Mode ─── */}
          {mode === "admin" && (
            <View style={styles.formGap}>
              <Pressable onPress={goBack} style={styles.backRow}>
                <Text style={[styles.backText, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>رجوع</Text>
                <Feather name="arrow-right" size={18} color={C.primary} />
              </Pressable>

              {/* Admin Header */}
              <View style={styles.adminHeader}>
                <View style={[styles.adminIconWrap, { backgroundColor: C.secondary + "1A" }]}>
                  <Feather name="shield" size={22} color={C.secondary} />
                </View>
                <Text style={[styles.formTitle, { color: C.text, fontFamily: "Tajawal_700Bold", marginBottom: 0 }]}>
                  دخول الإدارة
                </Text>
                <Text style={[{ color: C.textMuted, fontFamily: "Tajawal_400Regular", fontSize: 13, textAlign: "center" }]}>
                  للمشرفين والمدراء فقط
                </Text>
              </View>

              {/* Username */}
              <View style={[styles.inputWrap, { borderColor: C.input, backgroundColor: C.cardSecondary }]}>
                <TextInput
                  style={[styles.input, { color: C.text, fontFamily: "Tajawal_400Regular" }]}
                  placeholder="اسم المستخدم"
                  placeholderTextColor={C.textMuted}
                  value={adminUser}
                  onChangeText={setAdminUser}
                  textAlign="right"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Feather name="user" size={18} color={C.textMuted} />
              </View>

              {/* Password */}
              <View style={[styles.inputWrap, { borderColor: C.input, backgroundColor: C.cardSecondary }]}>
                <TextInput
                  style={[styles.input, { color: C.text, fontFamily: "Tajawal_400Regular" }]}
                  placeholder="كلمة المرور"
                  placeholderTextColor={C.textMuted}
                  value={adminPass}
                  onChangeText={setAdminPass}
                  secureTextEntry={!showAdminPass}
                  textAlign="right"
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowAdminPass(!showAdminPass)} hitSlop={12}>
                  <Feather name={showAdminPass ? "eye-off" : "eye"} size={18} color={C.textMuted} />
                </Pressable>
              </View>

              {!!error && <ErrorBox error={error} C={C} />}

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: C.secondary, opacity: pressed ? 0.85 : 1 }]}
                onPress={handleAdminLogin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Text style={[styles.primaryBtnText, { fontFamily: "Tajawal_700Bold" }]}>دخول كمدير</Text>
                    <Feather name="shield" size={18} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ErrorBox({ error, C }: { error: string; C: typeof Colors.light }) {
  return (
    <View style={[styles.errBox, { backgroundColor: C.errorGlow }]}>
      <Text style={[styles.errText, { color: C.error, fontFamily: "Tajawal_400Regular" }]}>{error}</Text>
      <Feather name="alert-circle" size={14} color={C.error} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, alignItems: "center", paddingHorizontal: 20, gap: 0 },
  logoSection: { alignItems: "center", gap: 8, marginBottom: 28 },
  logoBox: { width: 88, height: 88, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  appName: { fontSize: 30 },
  byText: { fontSize: 13, marginTop: -4 },
  tagline: { fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  card: { width: "100%", maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: 24 },
  formGap: { gap: 12 },
  primaryBtn: { height: 52, borderRadius: 14, flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 10 },
  primaryBtnText: { color: "#fff", fontSize: 16 },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13 },
  outlineBtn: { height: 52, borderRadius: 14, borderWidth: 1, flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 10, borderColor: "transparent" },
  outlineBtnText: { fontSize: 15 },
  adminBtn: { alignSelf: "center", paddingVertical: 4, flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  adminText: { fontSize: 13 },
  backRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  backText: { fontSize: 14 },
  formTitle: { fontSize: 22, textAlign: "right", marginBottom: 4 },
  adminHeader: { alignItems: "center", gap: 8, marginBottom: 4 },
  adminIconWrap: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  inputWrap: { flexDirection: "row-reverse", alignItems: "center", borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 50, gap: 10 },
  input: { flex: 1, fontSize: 14, height: 50 },
  errBox: { flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 12, borderRadius: 10 },
  errText: { flex: 1, fontSize: 13, textAlign: "right" },
});
