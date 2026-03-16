import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/api";

interface AnswerDetail {
  questionId: number;
  questionText: string;
  selectedOption: string;
  correctOption: string;
  isCorrect: boolean;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

interface ResultDetail {
  id: number;
  examId: number;
  examTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  answers: AnswerDetail[];
}

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [showAnswers, setShowAnswers] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { data: result, isLoading, error } = useQuery<ResultDetail>({
    queryKey: ["result", id],
    queryFn: () => apiRequest<ResultDetail>(`/api/results/${id}`, { token }),
    enabled: !!id && !!token,
  });

  useEffect(() => {
    if (result) {
      Haptics.notificationAsync(
        result.percentage >= 50
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [result]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const getGradeInfo = (pct: number) => {
    if (pct >= 90) return { label: "ممتاز", color: "#059669", icon: "award" as const };
    if (pct >= 80) return { label: "جيد جداً", color: "#2563EB", icon: "star" as const };
    if (pct >= 70) return { label: "جيد", color: "#7C3AED", icon: "thumbs-up" as const };
    if (pct >= 50) return { label: "مقبول", color: "#D97706", icon: "check-circle" as const };
    return { label: "راسب", color: "#DC2626", icon: "alert-circle" as const };
  };

  const optionLabel: Record<string, string> = { A: "أ", B: "ب", C: "ج", D: "د" };
  const getOptionText = (a: AnswerDetail, opt: string) => {
    if (opt === "A") return a.optionA;
    if (opt === "B") return a.optionB;
    if (opt === "C") return a.optionC;
    return a.optionD;
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[{ color: C.textSecondary, marginTop: 12, fontFamily: "Tajawal_400Regular" }]}>جاري تحميل النتيجة...</Text>
      </View>
    );
  }

  if (error || !result) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.background }]}>
        <Feather name="alert-circle" size={40} color={C.error} />
        <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", marginTop: 8 }]}>تعذّر تحميل النتيجة</Text>
        <Pressable onPress={() => router.replace("/(main)")} style={[styles.actionBtn, { backgroundColor: C.primary }]}>
          <Text style={[styles.actionBtnText, { fontFamily: "Tajawal_700Bold" }]}>الرئيسية</Text>
        </Pressable>
      </View>
    );
  }

  const grade = getGradeInfo(result.percentage);
  const pct = Math.round(result.percentage);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <Animated.View
        style={[styles.heroSection, { backgroundColor: grade.color + "12", paddingTop: topPad + 24, opacity: fadeAnim }]}
      >
        <Animated.View style={[styles.scoreCircle, { borderColor: grade.color, transform: [{ scale: scaleAnim }] }]}>
          <Text style={[styles.scoreNum, { color: grade.color, fontFamily: "Tajawal_700Bold" }]}>{pct}%</Text>
          <Text style={[styles.scoreLabel, { color: grade.color, fontFamily: "Tajawal_400Regular" }]}>النتيجة</Text>
        </Animated.View>

        <Animated.View style={{ alignItems: "center", gap: 6, opacity: fadeAnim }}>
          <View style={[styles.gradeBadge, { backgroundColor: grade.color }]}>
            <Feather name={grade.icon} size={16} color="#fff" />
            <Text style={[styles.gradeLabel, { fontFamily: "Tajawal_700Bold" }]}>{grade.label}</Text>
          </View>
          <Text style={[styles.examTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>{result.examTitle}</Text>
        </Animated.View>
      </Animated.View>

      {/* Stats */}
      <View style={[styles.statsRow, { paddingHorizontal: 20 }]}>
        <StatCard label="الإجابات الصحيحة" value={String(result.score)} color={Colors.light.success} C={C} />
        <StatCard label="الأسئلة الكلية" value={String(result.totalQuestions)} color={C.primary} C={C} />
        <StatCard label="الأخطاء" value={String(result.totalQuestions - result.score)} color={Colors.light.error} C={C} />
      </View>

      {/* Actions */}
      <View style={[styles.actionsRow, { paddingHorizontal: 20 }]}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: C.primary, flex: 1, opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.replace("/(main)")}
        >
          <Feather name="home" size={18} color="#fff" />
          <Text style={[styles.actionBtnText, { fontFamily: "Tajawal_700Bold" }]}>الرئيسية</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: C.card, flex: 1, opacity: pressed ? 0.85 : 1, borderWidth: 1.5, borderColor: C.border }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAnswers(!showAnswers); }}
        >
          <Feather name={showAnswers ? "eye-off" : "eye"} size={18} color={C.text} />
          <Text style={[styles.actionBtnText, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>
            {showAnswers ? "إخفاء الإجابات" : "مراجعة الإجابات"}
          </Text>
        </Pressable>
      </View>

      {/* Answers Review */}
      {showAnswers && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={[styles.reviewTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>مراجعة الإجابات</Text>
          {result.answers.map((a, i) => (
            <View key={a.questionId} style={[styles.answerCard, { backgroundColor: C.card, borderColor: a.isCorrect ? Colors.light.success + "40" : Colors.light.error + "40", borderWidth: 1.5 }]}>
              <View style={styles.answerHeader}>
                <View style={[styles.answerStatus, { backgroundColor: a.isCorrect ? Colors.light.success + "18" : Colors.light.error + "18" }]}>
                  <Feather name={a.isCorrect ? "check" : "x"} size={14} color={a.isCorrect ? Colors.light.success : Colors.light.error} />
                </View>
                <Text style={[styles.answerQNum, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>سؤال {i + 1}</Text>
              </View>
              <Text style={[styles.answerQText, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>{a.questionText}</Text>

              {!a.isCorrect && (
                <View style={[styles.optRow, { backgroundColor: Colors.light.error + "12" }]}>
                  <View style={[styles.optDot, { backgroundColor: Colors.light.error }]} />
                  <Text style={[styles.optRowText, { color: C.text, fontFamily: "Tajawal_400Regular" }]}>
                    <Text style={{ fontFamily: "Tajawal_500Medium" }}>إجابتك ({optionLabel[a.selectedOption]}): </Text>
                    {getOptionText(a, a.selectedOption)}
                  </Text>
                </View>
              )}
              <View style={[styles.optRow, { backgroundColor: Colors.light.success + "12" }]}>
                <View style={[styles.optDot, { backgroundColor: Colors.light.success }]} />
                <Text style={[styles.optRowText, { color: C.text, fontFamily: "Tajawal_400Regular" }]}>
                  <Text style={{ fontFamily: "Tajawal_500Medium" }}>الصحيحة ({optionLabel[a.correctOption]}): </Text>
                  {getOptionText(a, a.correctOption)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, color, C }: { label: string; value: string; color: string; C: typeof Colors.light }) {
  return (
    <View style={[statStyles.card, { backgroundColor: C.card }]}>
      <Text style={[statStyles.value, { color, fontFamily: "Tajawal_700Bold" }]}>{value}</Text>
      <Text style={[statStyles.label, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: { flex: 1, alignItems: "center", padding: 14, borderRadius: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  value: { fontSize: 26 },
  label: { fontSize: 11, textAlign: "center", marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  heroSection: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 28, gap: 16 },
  scoreCircle: { width: 130, height: 130, borderRadius: 65, borderWidth: 4, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  scoreNum: { fontSize: 38 },
  scoreLabel: { fontSize: 14 },
  gradeBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24 },
  gradeLabel: { color: "#fff", fontSize: 16 },
  examTitle: { fontSize: 18, textAlign: "center" },
  statsRow: { flexDirection: "row-reverse", gap: 10, paddingVertical: 16 },
  actionsRow: { flexDirection: "row-reverse", gap: 10, paddingBottom: 16 },
  actionBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  actionBtnText: { color: "#fff", fontSize: 15 },
  reviewTitle: { fontSize: 20, textAlign: "right", marginBottom: 12 },
  answerCard: { padding: 14, borderRadius: 14, marginBottom: 10, gap: 8 },
  answerHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  answerStatus: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  answerQNum: { fontSize: 12 },
  answerQText: { fontSize: 15, textAlign: "right", lineHeight: 24 },
  optRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10 },
  optDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  optRowText: { flex: 1, fontSize: 14, textAlign: "right", lineHeight: 22 },
});
