import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

interface Question {
  id: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  orderIndex: number;
}

interface ExamDetail {
  id: number;
  title: string;
  questionCount: number;
  questionLimit?: number | null;
  timeLimit?: number | null;
  questions: Question[];
}

type OptionKey = "A" | "B" | "C" | "D";

export default function TakeExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark, C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const { data: exam, isLoading, error } = useQuery<ExamDetail>({
    queryKey: ["exam", id],
    queryFn: () => apiRequest<ExamDetail>(`/api/exams/${id}`),
    enabled: !!id,
  });

  const questions = exam?.questions ?? [];

  useEffect(() => {
    if (exam?.timeLimit) {
      setTimeLeft(exam.timeLimit * 60);
    }
  }, [exam]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t !== null ? t - 1 : null));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft]);

  useEffect(() => {
    if (questions.length === 0) return;
    Animated.timing(progressAnim, {
      toValue: (currentIdx + 1) / questions.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIdx, questions.length]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleSelect = (questionId: number, option: OptionKey) => {
    Haptics.selectionAsync();
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const unanswered = questions.filter((q) => !answers[q.id]);
    if (!autoSubmit && unanswered.length > 0) {
      Alert.alert(
        "أسئلة غير مجاب عليها",
        `لم تجب على ${unanswered.length} سؤال. هل تريد التسليم الآن؟`,
        [
          { text: "مراجعة", style: "cancel" },
          { text: "تسليم", onPress: () => doSubmit() },
        ]
      );
      return;
    }
    doSubmit();
  }, [answers, questions]);

  const doSubmit = async () => {
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const payload = {
        examId: Number(id),
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedOption: answers[q.id] || "A",
        })),
      };
      const result = await apiRequest<{ id: number }>("/api/results", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });
      router.replace({ pathname: "/result/[id]", params: { id: result.id } });
    } catch (e: any) {
      Alert.alert("خطأ", e.message || "تعذّر تسليم الامتحان");
      setSubmitting(false);
    }
  };

  const optionLabel: Record<OptionKey, string> = { A: "أ", B: "ب", C: "ج", D: "د" };
  const optionKeys: OptionKey[] = ["A", "B", "C", "D"];

  const isTimeLow = timeLeft !== null && timeLeft <= 60;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={[{ color: C.textSecondary, marginTop: 12, fontFamily: "Tajawal_400Regular" }]}>جاري تحميل الامتحان...</Text>
      </View>
    );
  }

  if (error || !exam) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: "center", alignItems: "center", gap: 12 }]}>
        <Feather name="alert-circle" size={40} color={C.error} />
        <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>تعذّر تحميل الامتحان</Text>
        <Pressable onPress={() => router.back()} style={[styles.backPillBtn, { backgroundColor: C.primary }]}>
          <Text style={[{ color: "#fff", fontFamily: "Tajawal_500Medium" }]}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  const q = questions[currentIdx];
  const selectedOpt = q ? answers[q.id] : undefined;
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const answeredCount = Object.keys(answers).length;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 10, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Pressable onPress={() => {
          Alert.alert("إنهاء الامتحان", "هل تريد الخروج؟ ستفقد إجاباتك.", [
            { text: "تراجع", style: "cancel" },
            { text: "خروج", style: "destructive", onPress: () => router.back() },
          ]);
        }} style={styles.closeBtn}>
          <Feather name="x" size={22} color={C.textSecondary} />
        </Pressable>

        <View style={styles.topCenter}>
          <Text style={[styles.examTitleSmall, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={1}>{exam.title}</Text>
          <Text style={[styles.qCountText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
            {currentIdx + 1} / {questions.length}
          </Text>
        </View>

        {timeLeft !== null ? (
          <View style={[styles.timerBox, { backgroundColor: isTimeLow ? C.error + "18" : C.primary + "18" }]}>
            <Feather name="clock" size={14} color={isTimeLow ? C.error : C.primary} />
            <Text style={[styles.timerText, { color: isTimeLow ? C.error : C.primary, fontFamily: "Tajawal_700Bold" }]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBg, { backgroundColor: C.border }]}>
        <Animated.View
          style={[styles.progressFill, {
            backgroundColor: C.primary,
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
          }]}
        />
      </View>

      {/* Question */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {q && (
          <>
            <View style={[styles.qBox, { backgroundColor: C.card }]}>
              <Text style={[styles.qNum, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>
                السؤال {currentIdx + 1}
              </Text>
              <Text style={[styles.qText, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>{q.text}</Text>
            </View>

            <View style={styles.optionsContainer}>
              {optionKeys.map((key) => {
                const optText = key === "A" ? q.optionA : key === "B" ? q.optionB : key === "C" ? q.optionC : q.optionD;
                const isSelected = selectedOpt === key;
                return (
                  <Pressable
                    key={key}
                    style={({ pressed }) => [
                      styles.optionBtn,
                      {
                        backgroundColor: isSelected ? C.primary : C.card,
                        borderColor: isSelected ? C.primary : C.border,
                        opacity: pressed ? 0.85 : 1,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                    onPress={() => handleSelect(q.id, key)}
                  >
                    <View style={[styles.optLetter, { backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : C.primary + "18" }]}>
                      <Text style={[styles.optLetterText, { color: isSelected ? "#fff" : C.primary, fontFamily: "Tajawal_700Bold" }]}>
                        {optionLabel[key]}
                      </Text>
                    </View>
                    <Text style={[styles.optText, { color: isSelected ? "#fff" : C.text, fontFamily: "Tajawal_500Medium" }]}>
                      {optText}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom navigation */}
      <View style={[styles.bottomBar, { paddingBottom: bottomPad + 8, backgroundColor: C.card, borderTopColor: C.border }]}>
        <Pressable
          style={[styles.navBtn, { backgroundColor: C.cardSecondary, opacity: currentIdx === 0 ? 0.4 : 1 }]}
          onPress={() => currentIdx > 0 && setCurrentIdx(currentIdx - 1)}
          disabled={currentIdx === 0}
        >
          <Feather name="arrow-right" size={20} color={C.text} />
        </Pressable>

        <View style={styles.bottomCenter}>
          <Text style={[styles.answeredText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
            {answeredCount} من {questions.length} مجاب
          </Text>
          {currentIdx === questions.length - 1 && (
            <Pressable
              style={[styles.submitBtn, { backgroundColor: C.success }]}
              onPress={() => handleSubmit(false)}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={[styles.submitText, { fontFamily: "Tajawal_700Bold" }]}>تسليم الامتحان</Text>
              )}
            </Pressable>
          )}
        </View>

        <Pressable
          style={[styles.navBtn, { backgroundColor: C.cardSecondary, opacity: currentIdx === questions.length - 1 ? 0.4 : 1 }]}
          onPress={() => currentIdx < questions.length - 1 && setCurrentIdx(currentIdx + 1)}
          disabled={currentIdx === questions.length - 1}
        >
          <Feather name="arrow-left" size={20} color={C.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  closeBtn: { padding: 6, width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  topCenter: { flex: 1, alignItems: "center" },
  examTitleSmall: { fontSize: 15 },
  qCountText: { fontSize: 12, marginTop: 2 },
  timerBox: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, width: 80, justifyContent: "center" },
  timerText: { fontSize: 14 },
  progressBg: { height: 4 },
  progressFill: { height: 4 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  qBox: { borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  qNum: { fontSize: 13, textAlign: "right", marginBottom: 8 },
  qText: { fontSize: 18, textAlign: "right", lineHeight: 30 },
  optionsContainer: { gap: 10 },
  optionBtn: { flexDirection: "row-reverse", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1.5, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  optLetter: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  optLetterText: { fontSize: 15 },
  optText: { flex: 1, fontSize: 15, textAlign: "right", lineHeight: 22 },
  bottomBar: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  navBtn: { width: 46, height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  bottomCenter: { flex: 1, alignItems: "center", gap: 8 },
  answeredText: { fontSize: 13 },
  submitBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  submitText: { color: "#fff", fontSize: 15 },
  backPillBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});
