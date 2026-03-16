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
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/api";
import Colors from "@/constants/colors";

type AuthResponse = { token: string; user: { id: number; name: string; email?: string | null; role: string } };

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [mode, setMode] = useState<"guest" | "login" | "register">("guest");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGuest = async () => {
    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await apiRequest<AuthResponse>("/api/auth/guest", { method: "POST" });
      await login(res.token, res.user);
      router.replace("/(main)");
    } catch (e: any) {
      setError(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setError("أدخل البريد وكلمة المرور"); return; }
    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await apiRequest<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      await login(res.token, res.user);
      router.replace("/(main)");
    } catch (e: any) {
      setError(e.message || "بيانات خاطئة");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) { setError("أكمل جميع الحقول"); return; }
    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await apiRequest<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      await login(res.token, res.user);
      router.replace("/(main)");
    } catch (e: any) {
      setError(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.container, { backgroundColor: C.background, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.logoBox, { backgroundColor: C.primary }]}>
            <Feather name="book-open" size={32} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>Tawjihi-Exams</Text>
          <Text style={[styles.tagline, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>By S&S — امتحانات التوجيهي</Text>
        </View>

        {mode === "guest" && (
          <View style={styles.guestSection}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleGuest}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={[styles.primaryBtnText, { fontFamily: "Tajawal_700Bold" }]}>دخول كضيف</Text>
              )}
            </Pressable>

            <View style={styles.divider}>
              <View style={[styles.divLine, { backgroundColor: C.border }]} />
              <Text style={[styles.divText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>أو</Text>
              <View style={[styles.divLine, { backgroundColor: C.border }]} />
            </View>

            <Pressable
              style={({ pressed }) => [styles.outlineBtn, { borderColor: C.primary, opacity: pressed ? 0.75 : 1 }]}
              onPress={() => setMode("login")}
            >
              <Text style={[styles.outlineBtnText, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>تسجيل الدخول بالبريد الإلكتروني</Text>
            </Pressable>

            <Pressable onPress={() => setMode("register")} style={styles.linkRow}>
              <Text style={[styles.linkText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
                ليس لديك حساب؟ <Text style={{ color: C.primary, fontFamily: "Tajawal_700Bold" }}>سجّل الآن</Text>
              </Text>
            </Pressable>
          </View>
        )}

        {(mode === "login" || mode === "register") && (
          <View style={styles.formSection}>
            <Pressable onPress={() => setMode("guest")} style={styles.backRow}>
              <Feather name="arrow-left" size={18} color={C.primary} />
              <Text style={[styles.backText, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>رجوع</Text>
            </Pressable>

            <Text style={[styles.formTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>
              {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب جديد"}
            </Text>

            {mode === "register" && (
              <TextInput
                style={[inputStyle, { fontFamily: "Tajawal_400Regular" }]}
                placeholder="الاسم الكامل"
                placeholderTextColor={C.textMuted}
                value={name}
                onChangeText={setName}
                textAlign="right"
                writingDirection="rtl"
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={inputStyle}
              placeholder="البريد الإلكتروني"
              placeholderTextColor={C.textMuted}
              value={email}
              onChangeText={setEmail}
              textAlign="right"
              writingDirection="rtl"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.passRow}>
              <TextInput
                style={[inputStyle, { flex: 1 }]}
                placeholder="كلمة المرور"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                textAlign="right"
                writingDirection="rtl"
              />
              <Pressable onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Feather name={showPass ? "eye-off" : "eye"} size={20} color={C.textMuted} />
              </Pressable>
            </View>

            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: `${Colors.light.error}18` }]}>
                <Text style={[styles.errorText, { color: C.error, fontFamily: "Tajawal_400Regular" }]}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1, marginTop: 8 }]}
              onPress={mode === "login" ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={[styles.primaryBtnText, { fontFamily: "Tajawal_700Bold" }]}>
                  {mode === "login" ? "دخول" : "إنشاء الحساب"}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")} style={styles.linkRow}>
              <Text style={[styles.linkText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
                {mode === "login" ? "ليس لديك حساب؟ " : "لديك حساب؟ "}
                <Text style={{ color: C.primary, fontFamily: "Tajawal_700Bold" }}>
                  {mode === "login" ? "سجّل الآن" : "سجّل دخولك"}
                </Text>
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, alignItems: "center" },
  header: { alignItems: "center", marginBottom: 48 },
  logoBox: { width: 80, height: 80, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  appName: { fontSize: 28, letterSpacing: -0.5, marginBottom: 4 },
  tagline: { fontSize: 15 },
  guestSection: { width: "100%", gap: 12 },
  formSection: { width: "100%", gap: 12 },
  primaryBtn: { height: 54, borderRadius: 14, justifyContent: "center", alignItems: "center", shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6 },
  primaryBtnText: { color: "#fff", fontSize: 17 },
  outlineBtn: { height: 54, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 1.5 },
  outlineBtnText: { fontSize: 16 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 14 },
  linkRow: { alignItems: "center", paddingVertical: 8 },
  linkText: { fontSize: 14 },
  backRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingVertical: 4, alignSelf: "flex-end" },
  backText: { fontSize: 15 },
  formTitle: { fontSize: 22, marginBottom: 8, textAlign: "right", alignSelf: "stretch" },
  input: { height: 52, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, fontSize: 15 },
  passRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  eyeBtn: { padding: 14 },
  errorBox: { padding: 12, borderRadius: 10 },
  errorText: { fontSize: 14, textAlign: "right" },
});
