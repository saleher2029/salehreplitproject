import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/api";

type AuthResponse = {
  token: string;
  user: { id: number; name: string; email?: string | null; role: string };
};
type Mode = "home" | "login" | "register";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>("home");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slideAnim = useRef(new Animated.Value(0)).current;

  const switchMode = (m: Mode) => {
    setError("");
    Animated.spring(slideAnim, { toValue: m === "home" ? 0 : 1, useNativeDriver: true, tension: 80, friction: 12 }).start();
    setMode(m);
  };

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
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (mode === "register" && !name.trim()) { setError("أدخل اسمك"); return; }
    if (!email.trim()) { setError("أدخل البريد الإلكتروني"); return; }
    if (!password.trim()) { setError("أدخل كلمة المرور"); return; }
    setError("");
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: email.trim(), password }
        : { name: name.trim(), email: email.trim(), password };
      const res = await apiRequest<AuthResponse>(endpoint, { method: "POST", body: JSON.stringify(body) });
      await login(res.token, res.user);
      router.replace("/(main)");
    } catch (e: any) {
      setError(e.message || "حدث خطأ");
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <LinearGradient
        colors={isDark ? ["#07061A", "#130F3A", "#07061A"] : ["#2D1B8E", "#6C63FF", "#B15EFF"]}
        style={[styles.bg, { paddingTop: topPad }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.logoRing}>
            <LinearGradient colors={["#6C63FF", "#B15EFF"]} style={styles.logoGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Feather name="book-open" size={34} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={[styles.appName, { fontFamily: "Tajawal_700Bold" }]}>Tawjihi-Exams</Text>
          <Text style={[styles.appSub, { fontFamily: "Tajawal_400Regular" }]}>By S&S • منصة امتحانات التوجيهي</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: isDark ? "#100F2C" : "#FFFFFF" }]}>
          {mode === "home" && (
            <View style={styles.homeForm}>
              <Text style={[styles.cardTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>ابدأ رحلتك التعليمية</Text>
              <Text style={[styles.cardSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
                سجّل دخولك أو تابع كضيف
              </Text>

              <GradientButton label="دخول كضيف" icon="user" onPress={handleGuest} loading={loading} />

              <View style={[styles.orRow, { marginVertical: 4 }]}>
                <View style={[styles.orLine, { backgroundColor: C.border }]} />
                <Text style={[styles.orText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>أو</Text>
                <View style={[styles.orLine, { backgroundColor: C.border }]} />
              </View>

              <Pressable
                style={({ pressed }) => [styles.outBtn, { borderColor: C.primary, opacity: pressed ? 0.75 : 1 }]}
                onPress={() => switchMode("login")}
              >
                <Feather name="log-in" size={18} color={C.primary} />
                <Text style={[styles.outBtnText, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>تسجيل الدخول</Text>
              </Pressable>

              <Pressable onPress={() => switchMode("register")} style={{ alignSelf: "center", marginTop: 8 }}>
                <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 14 }]}>
                  ليس لديك حساب؟{" "}
                  <Text style={{ color: C.primary, fontFamily: "Tajawal_700Bold" }}>سجّل الآن</Text>
                </Text>
              </Pressable>
            </View>
          )}

          {(mode === "login" || mode === "register") && (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Pressable onPress={() => switchMode("home")} style={[styles.backRow]}>
                <Feather name="arrow-right" size={20} color={C.primary} />
                <Text style={[styles.backText, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>رجوع</Text>
              </Pressable>

              <Text style={[styles.cardTitle, { color: C.text, fontFamily: "Tajawal_700Bold", marginBottom: 4 }]}>
                {mode === "login" ? "أهلاً بعودتك" : "حساب جديد"}
              </Text>

              {mode === "register" && (
                <View style={[styles.field, { borderColor: C.border, backgroundColor: C.cardSecondary }]}>
                  <Feather name="user" size={18} color={C.textMuted} />
                  <TextInput
                    style={[styles.fieldInput, { color: C.text, fontFamily: "Tajawal_400Regular" }]}
                    placeholder="الاسم الكامل"
                    placeholderTextColor={C.textMuted}
                    value={name}
                    onChangeText={setName}
                    textAlign="right"
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={[styles.field, { borderColor: C.border, backgroundColor: C.cardSecondary }]}>
                <Feather name="mail" size={18} color={C.textMuted} />
                <TextInput
                  style={[styles.fieldInput, { color: C.text, fontFamily: "Tajawal_400Regular" }]}
                  placeholder="البريد الإلكتروني"
                  placeholderTextColor={C.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  textAlign="right"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={[styles.field, { borderColor: C.border, backgroundColor: C.cardSecondary }]}>
                <Feather name="lock" size={18} color={C.textMuted} />
                <TextInput
                  style={[styles.fieldInput, { color: C.text, fontFamily: "Tajawal_400Regular" }]}
                  placeholder="كلمة المرور"
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

              {!!error && (
                <View style={[styles.errBox, { backgroundColor: "#FF475718" }]}>
                  <Feather name="alert-circle" size={14} color="#FF4757" />
                  <Text style={[styles.errText, { color: "#FF4757", fontFamily: "Tajawal_400Regular" }]}>{error}</Text>
                </View>
              )}

              <GradientButton
                label={mode === "login" ? "دخول" : "إنشاء الحساب"}
                icon={mode === "login" ? "log-in" : "user-plus"}
                onPress={handleSubmit}
                loading={loading}
              />

              <Pressable onPress={() => switchMode(mode === "login" ? "register" : "login")} style={{ alignSelf: "center", marginTop: 12 }}>
                <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 14 }]}>
                  {mode === "login" ? "ليس لديك حساب؟ " : "لديك حساب؟ "}
                  <Text style={{ color: C.primary, fontFamily: "Tajawal_700Bold" }}>
                    {mode === "login" ? "سجّل الآن" : "سجّل دخولك"}
                  </Text>
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function GradientButton({ label, icon, onPress, loading }: { label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <LinearGradient colors={["#6C63FF", "#B15EFF"]} style={styles.gradBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Feather name={icon} size={18} color="#fff" />
            <Text style={[styles.gradBtnText, { fontFamily: "Tajawal_700Bold" }]}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  heroSection: { alignItems: "center", paddingVertical: 32, gap: 10 },
  logoRing: { width: 88, height: 88, borderRadius: 26, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", overflow: "hidden", marginBottom: 4 },
  logoGrad: { flex: 1, justifyContent: "center", alignItems: "center" },
  appName: { fontSize: 30, color: "#fff", letterSpacing: -0.5 },
  appSub: { fontSize: 14, color: "rgba(255,255,255,0.65)" },
  card: { marginHorizontal: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, flex: 1, padding: 28, paddingTop: 32 },
  homeForm: { gap: 12 },
  cardTitle: { fontSize: 24, textAlign: "right", marginBottom: 2 },
  cardSub: { fontSize: 14, textAlign: "right", marginBottom: 8 },
  gradBtn: { height: 54, borderRadius: 16, flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 10 },
  gradBtnText: { color: "#fff", fontSize: 17 },
  outBtn: { height: 54, borderRadius: 16, borderWidth: 2, flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 10 },
  outBtnText: { fontSize: 16 },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13 },
  backRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 16 },
  backText: { fontSize: 15 },
  field: { flexDirection: "row-reverse", alignItems: "center", borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, height: 52, gap: 10, marginBottom: 10 },
  fieldInput: { flex: 1, fontSize: 15, height: 52 },
  errBox: { flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, marginBottom: 8 },
  errText: { flex: 1, fontSize: 13, textAlign: "right" },
});
