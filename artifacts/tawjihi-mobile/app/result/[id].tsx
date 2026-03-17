import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  questionImage?: string | null;
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
  bookmarkedQuestions?: string | null;
  unitId?: number;
  answers: AnswerDetail[];
}

const OPTION_LABELS: Record<string, string> = { A: "أ", B: "ب", C: "ج", D: "د" };
const OPTION_KEYS = ["A", "B", "C", "D"] as const;

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "سهل", emoji: "😊", color: "#059669", bg: "#ECFDF5" },
  { value: "medium", label: "متوسط", emoji: "😐", color: "#D97706", bg: "#FFFBEB" },
  { value: "hard", label: "صعب", emoji: "😤", color: "#DC2626", bg: "#FEF2F2" },
] as const;

function getGrade(pct: number) {
  if (pct >= 95) return { label: "متميز", color: "#7C3AED", bg: "#F5F3FF" };
  if (pct >= 85) return { label: "ممتاز", color: "#059669", bg: "#ECFDF5" };
  if (pct >= 75) return { label: "جيد جداً", color: "#2563EB", bg: "#EFF6FF" };
  if (pct >= 65) return { label: "جيد", color: "#D97706", bg: "#FFFBEB" };
  if (pct >= 50) return { label: "مقبول", color: "#EA580C", bg: "#FFF7ED" };
  return { label: "راسب", color: "#DC2626", bg: "#FEF2F2" };
}

function getProgressColor(pct: number) {
  if (pct >= 95) return "#7C3AED";
  if (pct >= 85) return "#059669";
  if (pct >= 75) return "#2563EB";
  if (pct >= 65) return "#D97706";
  if (pct >= 50) return "#EA580C";
  return "#DC2626";
}

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [notes, setNotes] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

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

  const handleFeedback = async () => {
    if (!selectedDifficulty && !notes.trim()) return;
    setFeedbackLoading(true);
    try {
      await apiRequest(`/api/results/${id}/feedback`, {
        method: "PUT",
        token,
        body: JSON.stringify({
          difficulty: selectedDifficulty || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      setFeedbackSent(true);
    } catch {}
    setFeedbackLoading(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={{ color: C.textSecondary, marginTop: 12, fontFamily: "Tajawal_400Regular" }}>جاري تحميل النتيجة...</Text>
      </View>
    );
  }

  if (error || !result) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.background }]}>
        <Feather name="alert-circle" size={40} color={C.error} />
        <Text style={{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", marginTop: 8 }}>النتيجة غير موجودة</Text>
        <Pressable onPress={() => router.replace("/(main)")} style={[styles.pillBtn, { backgroundColor: C.primary }]}>
          <Text style={{ color: "#fff", fontFamily: "Tajawal_700Bold" }}>الرئيسية</Text>
        </Pressable>
      </View>
    );
  }

  const grade = getGrade(result.percentage);
  const wrongAnswers = result.answers.filter(a => !a.isCorrect);

  let bookmarkedIds: number[] = [];
  try { if (result.bookmarkedQuestions) bookmarkedIds = JSON.parse(result.bookmarkedQuestions); } catch {}
  const bookmarkedAnswers = bookmarkedIds.length > 0
    ? result.answers.filter(a => bookmarkedIds.includes(a.questionId))
    : [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ paddingTop: topPad + 16, paddingHorizontal: 16, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 20, fontFamily: "Tajawal_700Bold", color: C.text }}>النتيجة والتصحيح</Text>
        <Pressable onPress={() => router.replace("/(main)")} style={[styles.outlineBtn, { borderColor: C.border }]}>
          <Text style={{ fontSize: 13, fontFamily: "Tajawal_700Bold", color: C.text }}>امتحاناتي</Text>
        </Pressable>
      </View>

      {/* Score card */}
      <Animated.View style={{ paddingHorizontal: 16, paddingTop: 16, opacity: fadeAnim }}>
        <View style={[styles.scoreCard, { backgroundColor: grade.bg, borderColor: grade.color + "55" }]}>
          <Animated.View style={[styles.trophyCircle, { backgroundColor: grade.bg, borderColor: grade.color, transform: [{ scale: scaleAnim }] }]}>
            <Feather name="award" size={36} color={grade.color} />
          </Animated.View>
          <Text style={[styles.examTitleResult, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>{result.examTitle}</Text>
          <Text style={{ color: C.textMuted, fontFamily: "Tajawal_400Regular", fontSize: 12 }}>
            {new Date(result.completedAt).toLocaleString("ar-EG")}
          </Text>

          <View style={styles.scoreRow}>
            <View style={styles.scoreItem}>
              <Text style={{ fontSize: 11, fontFamily: "Tajawal_700Bold", color: C.textMuted }}>الدرجة</Text>
              <Text style={{ fontSize: 30, fontFamily: "Tajawal_700Bold", color: grade.color }}>
                {result.score} <Text style={{ fontSize: 18, color: C.textMuted }}>/ {result.totalQuestions}</Text>
              </Text>
            </View>
            <View style={{ width: 1, height: 40, backgroundColor: C.border }} />
            <View style={styles.scoreItem}>
              <Text style={{ fontSize: 11, fontFamily: "Tajawal_700Bold", color: C.textMuted }}>النسبة المئوية</Text>
              <Text style={{ fontSize: 30, fontFamily: "Tajawal_700Bold", color: grade.color }}>{result.percentage}%</Text>
            </View>
            <View style={{ width: 1, height: 40, backgroundColor: C.border }} />
            <View style={styles.scoreItem}>
              <Text style={{ fontSize: 11, fontFamily: "Tajawal_700Bold", color: C.textMuted }}>التقدير</Text>
              <View style={[styles.gradeBadge, { backgroundColor: grade.color }]}>
                <Feather name="star" size={14} color="#fff" />
                <Text style={{ fontSize: 15, fontFamily: "Tajawal_700Bold", color: "#fff" }}>{grade.label}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.progressBarBg, { backgroundColor: C.border + "44" }]}>
            <View style={[styles.progressBarFill, { backgroundColor: getProgressColor(result.percentage), width: `${result.percentage}%` }]} />
          </View>
        </View>
      </Animated.View>

      {/* Stats bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={[styles.statsBar, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.statCell}>
            <Text style={{ fontSize: 22, fontFamily: "Tajawal_700Bold", color: C.text }}>{result.totalQuestions}</Text>
            <Text style={{ fontSize: 11, fontFamily: "Tajawal_400Regular", color: C.textMuted }}>إجمالي الأسئلة</Text>
          </View>
          <View style={{ width: 1, height: 36, backgroundColor: C.border }} />
          <View style={styles.statCell}>
            <Text style={{ fontSize: 22, fontFamily: "Tajawal_700Bold", color: Colors.light.success }}>{result.score}</Text>
            <Text style={{ fontSize: 11, fontFamily: "Tajawal_400Regular", color: C.textMuted }}>إجابات صحيحة</Text>
          </View>
          <View style={{ width: 1, height: 36, backgroundColor: C.border }} />
          <View style={styles.statCell}>
            <Text style={{ fontSize: 22, fontFamily: "Tajawal_700Bold", color: Colors.light.error }}>{wrongAnswers.length}</Text>
            <Text style={{ fontSize: 11, fontFamily: "Tajawal_400Regular", color: C.textMuted }}>إجابات خاطئة</Text>
          </View>
        </View>
      </View>

      {/* Feedback section */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        {!feedbackSent ? (
          <View style={[styles.feedbackCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
              <Feather name="thumbs-up" size={18} color={C.primary} />
              <Text style={{ fontSize: 16, fontFamily: "Tajawal_700Bold", color: C.text }}>تقييم الاختبار وملاحظاتك</Text>
            </View>

            <Text style={{ fontSize: 13, fontFamily: "Tajawal_700Bold", color: C.textMuted, textAlign: "right" }}>ما مستوى صعوبة هذا الاختبار؟</Text>
            <View style={styles.difficultyRow}>
              {DIFFICULTY_OPTIONS.map(opt => (
                <Pressable
                  key={opt.value}
                  onPress={() => setSelectedDifficulty(v => v === opt.value ? "" : opt.value)}
                  style={[styles.difficultyBtn, {
                    backgroundColor: selectedDifficulty === opt.value ? opt.bg : C.cardSecondary,
                    borderColor: selectedDifficulty === opt.value ? opt.color : C.border,
                  }]}
                >
                  <Text style={{ fontSize: 22 }}>{opt.emoji}</Text>
                  <Text style={{ fontSize: 13, fontFamily: "Tajawal_700Bold", color: selectedDifficulty === opt.value ? opt.color : C.textMuted }}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
              <Feather name="message-square" size={14} color={C.textMuted} />
              <Text style={{ fontSize: 13, fontFamily: "Tajawal_700Bold", color: C.textMuted }}>ملاحظاتك (اختياري)</Text>
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="اكتب ملاحظاتك عن هذا الاختبار..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              maxLength={2000}
              textAlignVertical="top"
              style={[styles.notesInput, { color: C.text, borderColor: C.border, backgroundColor: C.cardSecondary, fontFamily: "Tajawal_400Regular" }]}
              textAlign="right"
            />
            <Text style={{ fontSize: 11, color: C.textMuted, textAlign: "left" }}>{notes.length}/2000</Text>

            <Pressable
              onPress={handleFeedback}
              disabled={feedbackLoading || (!selectedDifficulty && !notes.trim())}
              style={[styles.feedbackSubmitBtn, {
                backgroundColor: C.primary,
                opacity: feedbackLoading || (!selectedDifficulty && !notes.trim()) ? 0.5 : 1,
              }]}
            >
              <Text style={{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 15 }}>
                {feedbackLoading ? "جاري الإرسال..." : "إرسال التقييم"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.feedbackDone, { borderColor: Colors.light.success + "55", backgroundColor: "#ECFDF5" }]}>
            <Feather name="check-circle" size={22} color={Colors.light.success} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Tajawal_700Bold", fontSize: 14, color: "#065F46" }}>شكراً على تقييمك!</Text>
              <Text style={{ fontFamily: "Tajawal_400Regular", fontSize: 12, color: "#065F46", opacity: 0.8 }}>ملاحظاتك تساعدنا على تحسين المنصة.</Text>
            </View>
          </View>
        )}
      </View>

      {/* Bookmarked questions */}
      {bookmarkedAnswers.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <View style={styles.sectionHeader}>
            <Feather name="star" size={18} color="#FB923C" />
            <Text style={{ fontSize: 18, fontFamily: "Tajawal_700Bold", color: C.text }}>
              الأسئلة المهمة التي حددتها ({bookmarkedAnswers.length})
            </Text>
          </View>
          {bookmarkedAnswers.map((ans, idx) => (
            <AnswerCard key={ans.questionId} ans={ans} idx={idx} C={C} isBookmark onZoomImage={setZoomedImage} />
          ))}
        </View>
      )}

      {/* Wrong answers */}
      {wrongAnswers.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
          <View style={styles.sectionHeader}>
            <Feather name="x-circle" size={18} color={Colors.light.error} />
            <Text style={{ fontSize: 18, fontFamily: "Tajawal_700Bold", color: C.text }}>
              الإجابات الخاطئة والتصحيح ({wrongAnswers.length})
            </Text>
          </View>
          {wrongAnswers.map((ans, idx) => (
            <AnswerCard key={ans.questionId} ans={ans} idx={idx} C={C} onZoomImage={setZoomedImage} />
          ))}
        </View>
      )}

      {wrongAnswers.length === 0 && (
        <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
          <Feather name="check-circle" size={44} color={C.primary} />
          <Text style={{ fontSize: 16, fontFamily: "Tajawal_700Bold", color: C.primary }}>أجبت على جميع الأسئلة بشكل صحيح!</Text>
          <Text style={{ fontSize: 13, fontFamily: "Tajawal_400Regular", color: C.textMuted }}>إنجاز رائع، استمر في التفوق</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.bottomActions}>
        <Pressable
          onPress={() => router.push({ pathname: "/exam/[id]", params: { id: result.examId } })}
          style={[styles.actionBtn, { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, flex: 1 }]}
        >
          <Text style={{ color: C.text, fontFamily: "Tajawal_700Bold", fontSize: 14 }}>إعادة الامتحان</Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace("/(main)")}
          style={[styles.actionBtn, { backgroundColor: C.primary, flex: 1 }]}
        >
          <Text style={{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 14 }}>الرئيسية</Text>
        </Pressable>
      </View>

      <Modal visible={!!zoomedImage} transparent animationType="fade" onRequestClose={() => setZoomedImage(null)}>
        <Pressable style={styles.zoomOverlay} onPress={() => setZoomedImage(null)}>
          <View style={styles.zoomContainer}>
            {zoomedImage && (
              <Image source={{ uri: zoomedImage }} style={styles.zoomImg} resizeMode="contain" />
            )}
            <Pressable style={styles.zoomClose} onPress={() => setZoomedImage(null)}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function AnswerCard({ ans, idx, C, isBookmark, onZoomImage }: { ans: any; idx: number; C: typeof Colors.light; isBookmark?: boolean; onZoomImage?: (url: string) => void }) {
  const borderColor = isBookmark ? "#FB923C55" : Colors.light.error + "44";
  const bgColor = isBookmark ? "#FFF7ED" : Colors.light.error + "08";

  return (
    <View style={[styles.answerCard, { backgroundColor: C.card, borderColor }]}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {isBookmark ? (
          <Feather name="bookmark" size={18} color="#FB923C" />
        ) : (
          <Feather name="x-circle" size={18} color={Colors.light.error} />
        )}
        <View style={{ flex: 1 }}>
          {ans.questionText?.trim() !== "" && (
            <Text style={{ fontSize: 14, fontFamily: "Tajawal_700Bold", color: C.text, textAlign: "right" }}>
              {idx + 1}. {ans.questionText}
            </Text>
          )}
          {ans.questionImage && (
            <Pressable onPress={() => onZoomImage?.(ans.questionImage!)}>
              <Image source={{ uri: ans.questionImage }} style={styles.resultQImage} resizeMode="contain" />
            </Pressable>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: ans.isCorrect ? Colors.light.success + "18" : Colors.light.error + "18" }]}>
          <Text style={{ fontSize: 11, fontFamily: "Tajawal_700Bold", color: ans.isCorrect ? Colors.light.success : Colors.light.error }}>
            {ans.isCorrect ? "✓ صحيح" : "✗ خطأ"}
          </Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        {OPTION_KEYS.map((opt, oi) => {
          const text = ans[`option${opt}`];
          const isSelected = ans.selectedOption === opt;
          const isCorrect = ans.correctOption === opt;
          let optBg = C.cardSecondary;
          let optBorder = C.border;
          let optTextColor = C.text;
          let lineThrough = false;
          if (isCorrect) { optBg = Colors.light.success + "15"; optBorder = Colors.light.success; optTextColor = Colors.light.success; }
          else if (isSelected && !isCorrect) { optBg = Colors.light.error + "12"; optBorder = Colors.light.error; optTextColor = Colors.light.error; lineThrough = true; }

          return (
            <View key={opt} style={[styles.optionResult, { backgroundColor: optBg, borderColor: optBorder }]}>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, flex: 1 }}>
                <View style={[styles.optLetterResult, { borderColor: optBorder }]}>
                  <Text style={{ fontSize: 11, fontFamily: "Tajawal_700Bold", color: optTextColor }}>{OPTION_LABELS[opt]}</Text>
                </View>
                <Text style={{
                  fontSize: 13, fontFamily: "Tajawal_400Regular", color: optTextColor, flex: 1, textAlign: "right",
                  textDecorationLine: lineThrough ? "line-through" : "none",
                }}>{text}</Text>
              </View>
              {isCorrect && <Feather name="check-circle" size={16} color={Colors.light.success} />}
              {isSelected && !isCorrect && <Feather name="x-circle" size={16} color={Colors.light.error} />}
            </View>
          );
        })}
      </View>

      {!ans.isCorrect && (
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: 6 }}>
          <Feather name="check-circle" size={12} color={Colors.light.success} />
          <Text style={{ fontSize: 11, fontFamily: "Tajawal_700Bold", color: Colors.light.success }}>
            الإجابة الصحيحة: الخيار {OPTION_LABELS[ans.correctOption]}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  pillBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  outlineBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  scoreCard: { borderRadius: 20, padding: 20, borderWidth: 1.5, alignItems: "center", gap: 8 },
  trophyCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  examTitleResult: { fontSize: 20, textAlign: "center" },
  scoreRow: { flexDirection: "row-reverse", justifyContent: "center", alignItems: "center", gap: 16, paddingVertical: 12 },
  scoreItem: { alignItems: "center" },
  gradeBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  progressBarBg: { width: "100%", height: 10, borderRadius: 5, overflow: "hidden" },
  progressBarFill: { height: 10, borderRadius: 5 },
  statsBar: { flexDirection: "row-reverse", borderRadius: 20, borderWidth: 1, paddingVertical: 14, overflow: "hidden" },
  statCell: { flex: 1, alignItems: "center", gap: 2 },
  feedbackCard: { borderRadius: 20, padding: 18, borderWidth: 1.5, gap: 12 },
  difficultyRow: { flexDirection: "row-reverse", gap: 10 },
  difficultyBtn: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 13, minHeight: 72 },
  feedbackSubmitBtn: { height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  feedbackDone: { flexDirection: "row-reverse", alignItems: "center", gap: 10, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 12, marginBottom: 12 },
  answerCard: { padding: 14, borderRadius: 14, borderWidth: 1.5, marginBottom: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  optionResult: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 10, borderRadius: 12, borderWidth: 1.5 },
  optLetterResult: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  bottomActions: { flexDirection: "row-reverse", gap: 10, paddingHorizontal: 16, paddingTop: 20 },
  actionBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", height: 48, borderRadius: 14 },
  resultQImage: { width: "100%", height: 160, borderRadius: 10, marginTop: 8, backgroundColor: "#f0f0f0" },
  zoomOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  zoomContainer: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  zoomImg: { width: "90%", height: "80%" },
  zoomClose: { position: "absolute", top: 60, right: 20, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, padding: 8 },
});
