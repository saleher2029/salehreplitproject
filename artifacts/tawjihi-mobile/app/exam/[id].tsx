import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
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

import { useAppTheme } from "@/hooks/useAppTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/api";

interface Question {
  id: number;
  text: string;
  imageUrl?: string | null;
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

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const OPTION_LABELS: Record<OptionKey, string> = { A: "أ", B: "ب", C: "ج", D: "د" };
const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

export default function TakeExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [phase, setPhase] = useState<"confirm" | "exam" | "submitting">("confirm");
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const { data: exam, isLoading, error } = useQuery<ExamDetail>({
    queryKey: ["exam", id],
    queryFn: () => apiRequest<ExamDetail>(`/api/exams/${id}`),
    enabled: !!id,
  });

  const questions = useMemo(() => {
    const all = exam?.questions ?? [];
    const limit = exam?.questionLimit;
    if (limit && limit > 0 && limit < all.length) {
      return shuffleArray(all).slice(0, limit);
    }
    return all;
  }, [exam?.id]);

  useEffect(() => {
    if (phase === "exam" && exam?.timeLimit) {
      setTimeLeft(exam.timeLimit * 60);
    }
  }, [phase, exam?.timeLimit]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(true); return; }
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

  const handleSelect = (questionId: number, option: OptionKey) => {
    Haptics.selectionAsync();
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const toggleFlag = (qId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId); else next.add(qId);
      return next;
    });
  };

  const toggleBookmark = (qId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBookmarked(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId); else next.add(qId);
      return next;
    });
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
    setPhase("submitting");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const payload = {
        examId: Number(id),
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedOption: answers[q.id] || "A",
        })),
        bookmarkedQuestionIds: [...bookmarked],
      };
      const result = await apiRequest<{ id: number }>("/api/results", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });
      router.replace({ pathname: "/result/[id]", params: { id: result.id } });
    } catch (e: any) {
      Alert.alert("خطأ", e.message || "تعذّر تسليم الامتحان");
      setPhase("exam");
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={{ color: C.textSecondary, marginTop: 12, fontFamily: "Tajawal_400Regular" }}>جاري تجهيز الامتحان...</Text>
      </View>
    );
  }

  if (error || !exam) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: "center", alignItems: "center", gap: 12 }]}>
        <Feather name="alert-circle" size={40} color={C.error} />
        <Text style={{ color: C.textSecondary, fontFamily: "Tajawal_400Regular" }}>الامتحان غير موجود</Text>
        <Pressable onPress={() => router.back()} style={[styles.pillBtn, { backgroundColor: C.primary }]}>
          <Text style={{ color: "#fff", fontFamily: "Tajawal_500Medium" }}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  const totalCount = questions.length;
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === totalCount;
  const isTimeLow = timeLeft !== null && timeLeft <= 60;
  const currentQ = questions[currentIdx];

  if (phase === "confirm") {
    const displayCount = exam.questionLimit && exam.questionLimit < exam.questionCount
      ? exam.questionLimit : exam.questionCount;
    return (
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, paddingTop: topPad }}>
          <View style={[styles.confirmCard, { backgroundColor: C.card }]}>
            <View style={[styles.confirmIcon, { backgroundColor: C.primary + "18" }]}>
              <Feather name="book-open" size={32} color={C.primary} />
            </View>
            <Text style={[styles.confirmTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>{exam.title}</Text>
            <Text style={{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 14 }}>تأكد من استعدادك قبل البدء</Text>

            <View style={styles.confirmStats}>
              <View style={styles.confirmStatItem}>
                <Feather name="book-open" size={18} color={C.primary} />
                <Text style={[styles.confirmStatNum, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>{displayCount}</Text>
                <Text style={{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 12 }}>سؤال</Text>
                {exam.questionLimit && exam.questionLimit < exam.questionCount && (
                  <Text style={{ color: C.secondary, fontFamily: "Tajawal_500Medium", fontSize: 11 }}>عشوائي من {exam.questionCount}</Text>
                )}
              </View>
              {exam.timeLimit && (
                <View style={styles.confirmStatItem}>
                  <Feather name="clock" size={18} color={C.secondary} />
                  <Text style={[styles.confirmStatNum, { color: C.secondary, fontFamily: "Tajawal_700Bold" }]}>{exam.timeLimit}</Text>
                  <Text style={{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 12 }}>دقيقة</Text>
                </View>
              )}
            </View>

            <View style={styles.confirmActions}>
              <Pressable onPress={() => router.back()} style={[styles.confirmBtn, { backgroundColor: C.cardSecondary, borderWidth: 1.5, borderColor: C.border, flex: 1 }]}>
                <Feather name="arrow-right" size={16} color={C.text} />
                <Text style={{ color: C.text, fontFamily: "Tajawal_700Bold", fontSize: 15 }}>العودة</Text>
              </Pressable>
              <Pressable onPress={() => { setPhase("exam"); setCurrentIdx(0); }} style={[styles.confirmBtn, { backgroundColor: C.primary, flex: 1 }]}>
                <Text style={{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 15 }}>دخول الامتحان</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Sticky top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={styles.topRow}>
          <Text style={[styles.examTitle, { color: C.primary, fontFamily: "Tajawal_700Bold" }]} numberOfLines={1}>{exam.title}</Text>
          <View style={styles.topRight}>
            <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Tajawal_400Regular" }}>{answeredCount}/{totalCount} مجاب</Text>
            {timeLeft !== null && (
              <View style={[styles.timerBox, { backgroundColor: isTimeLow ? C.error + "18" : C.secondary + "18" }]}>
                <Feather name="clock" size={13} color={isTimeLow ? C.error : C.secondary} />
                <Text style={[styles.timerText, { color: isTimeLow ? C.error : C.secondary, fontFamily: "Tajawal_700Bold" }]}>
                  {formatTime(timeLeft)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Question navigation grid */}
        <View style={styles.qGrid}>
          {questions.map((q, i) => {
            const isAnswered = !!answers[q.id];
            const isFlagged = flagged.has(q.id);
            const isBookmarkedQ = bookmarked.has(q.id);
            const isCurrent = i === currentIdx;
            const bg = isCurrent ? C.primary
              : isFlagged ? "#FBBF24"
              : isAnswered ? C.primary + "22"
              : C.cardSecondary;
            const textColor = isCurrent ? "#fff"
              : isFlagged ? "#92400E"
              : isAnswered ? C.primary
              : C.textMuted;
            const borderColor = isCurrent ? C.primary
              : isFlagged ? "#FBBF24"
              : isAnswered ? C.primary + "55"
              : C.border;
            return (
              <Pressable
                key={q.id}
                onPress={() => setCurrentIdx(i)}
                style={[styles.qGridBtn, {
                  backgroundColor: bg,
                  borderColor,
                  transform: [{ scale: isCurrent ? 1.1 : 1 }],
                }]}
              >
                <Text style={{ fontSize: 12, fontFamily: "Tajawal_700Bold", color: textColor }}>{i + 1}</Text>
                {isBookmarkedQ && <View style={styles.bookmarkDot} />}
              </Pressable>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: C.primary + "22", borderColor: C.primary + "55" }]} />
            <Text style={[styles.legendText, { color: C.textMuted }]}>مجاب</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: "#FBBF24", borderColor: "#FBBF24" }]} />
            <Text style={[styles.legendText, { color: C.textMuted }]}>للمراجعة</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#FB923C" }]} />
            <Text style={[styles.legendText, { color: C.textMuted }]}>مهم</Text>
          </View>
        </View>
      </View>

      {/* Current question */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {currentQ && (
          <>
            <View style={[styles.qCard, {
              backgroundColor: C.card,
              borderColor: answers[currentQ.id] ? C.primary + "44" : C.border,
            }]}>
              {/* Question header with actions */}
              <View style={styles.qHeader}>
                <View style={{ flex: 1, flexDirection: "row-reverse", alignItems: "flex-start", gap: 10 }}>
                  <View style={[styles.qNumCircle, {
                    backgroundColor: answers[currentQ.id] ? C.primary : C.cardSecondary,
                  }]}>
                    <Text style={{
                      fontSize: 13, fontFamily: "Tajawal_700Bold",
                      color: answers[currentQ.id] ? "#fff" : C.textMuted,
                    }}>{currentIdx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    {currentQ.text?.trim() !== "" && (
                      <Text style={[styles.qText, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>{currentQ.text}</Text>
                    )}
                    {currentQ.imageUrl && (
                      <Pressable onPress={() => setZoomedImage(currentQ.imageUrl!)}>
                        <Image
                          source={{ uri: currentQ.imageUrl }}
                          style={styles.qImage}
                          resizeMode="contain"
                        />
                        <View style={styles.zoomBadge}>
                          <Feather name="zoom-in" size={14} color="#fff" />
                        </View>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Action buttons */}
                <View style={{ gap: 6 }}>
                  <Pressable
                    onPress={() => toggleFlag(currentQ.id)}
                    style={[styles.actionTag, {
                      borderColor: flagged.has(currentQ.id) ? "#FBBF24" : C.border,
                      backgroundColor: flagged.has(currentQ.id) ? "#FEF3C7" : "transparent",
                    }]}
                  >
                    <Feather name="flag" size={13} color={flagged.has(currentQ.id) ? "#92400E" : C.textMuted} />
                    <Text style={{
                      fontSize: 11, fontFamily: "Tajawal_700Bold",
                      color: flagged.has(currentQ.id) ? "#92400E" : C.textMuted,
                    }}>مراجعة</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => toggleBookmark(currentQ.id)}
                    style={[styles.actionTag, {
                      borderColor: bookmarked.has(currentQ.id) ? "#FB923C" : C.border,
                      backgroundColor: bookmarked.has(currentQ.id) ? "#FFF7ED" : "transparent",
                    }]}
                  >
                    <Feather name="star" size={13} color={bookmarked.has(currentQ.id) ? "#EA580C" : C.textMuted} />
                    <Text style={{
                      fontSize: 11, fontFamily: "Tajawal_700Bold",
                      color: bookmarked.has(currentQ.id) ? "#EA580C" : C.textMuted,
                    }}>مهم</Text>
                  </Pressable>
                </View>
              </View>

              {/* Options */}
              <View style={styles.optionsContainer}>
                {OPTION_KEYS.map((key) => {
                  const optText = currentQ[`option${key}` as keyof Question] as string;
                  const isSelected = answers[currentQ.id] === key;
                  return (
                    <Pressable
                      key={key}
                      style={[styles.optionBtn, {
                        backgroundColor: isSelected ? C.card : C.card,
                        borderColor: isSelected ? C.primary : C.border,
                        borderWidth: isSelected ? 2 : 1.5,
                      }]}
                      onPress={() => handleSelect(currentQ.id, key)}
                    >
                      <View style={[styles.optLetter, {
                        backgroundColor: isSelected ? C.primary : C.cardSecondary,
                        borderColor: isSelected ? C.primary : C.textMuted + "44",
                      }]}>
                        <Text style={{
                          fontSize: 14, fontFamily: "Tajawal_700Bold",
                          color: isSelected ? "#fff" : C.textMuted,
                        }}>{OPTION_LABELS[key]}</Text>
                      </View>
                      <Text style={[styles.optText, {
                        color: C.text,
                        fontFamily: isSelected ? "Tajawal_700Bold" : "Tajawal_500Medium",
                      }]}>{optText}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom navigation */}
      <View style={[styles.bottomBar, { paddingBottom: bottomPad + 8, backgroundColor: C.card, borderTopColor: C.border }]}>
        <Pressable
          style={[styles.navBtn, { backgroundColor: C.cardSecondary }]}
          onPress={() => {
            if (currentIdx === 0) {
              Alert.alert("إنهاء الامتحان", "هل تريد الخروج؟ ستفقد إجاباتك.", [
                { text: "تراجع", style: "cancel" },
                { text: "خروج", style: "destructive", onPress: () => router.back() },
              ]);
            } else {
              setCurrentIdx(i => i - 1);
            }
          }}
        >
          <Feather name="chevron-right" size={18} color={C.text} />
          <Text style={{ fontSize: 13, fontFamily: "Tajawal_700Bold", color: C.text }}>السابق</Text>
        </Pressable>

        <View style={styles.bottomCenter}>
          <Text style={{ fontSize: 13, fontFamily: "Tajawal_700Bold", color: C.textMuted }}>{currentIdx + 1} / {totalCount}</Text>
          <View style={[styles.progressBg, { backgroundColor: C.border }]}>
            <Animated.View style={[styles.progressFill, {
              backgroundColor: C.primary,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            }]} />
          </View>
        </View>

        {currentIdx < totalCount - 1 ? (
          <Pressable
            style={[styles.navBtn, { backgroundColor: C.primary }]}
            onPress={() => setCurrentIdx(i => Math.min(totalCount - 1, i + 1))}
          >
            <Text style={{ fontSize: 13, fontFamily: "Tajawal_700Bold", color: "#fff" }}>التالي</Text>
            <Feather name="chevron-left" size={18} color="#fff" />
          </Pressable>
        ) : (
          <Pressable
            style={[styles.navBtn, {
              backgroundColor: isComplete ? C.primary : "#F97316",
              paddingHorizontal: 16,
            }]}
            onPress={() => handleSubmit(false)}
            disabled={phase === "submitting"}
          >
            {phase === "submitting" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="send" size={15} color="#fff" />
                <Text style={{ fontSize: 13, fontFamily: "Tajawal_700Bold", color: "#fff" }}>تسليم</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Bottom status messages */}
      {currentIdx === totalCount - 1 && !isComplete && (
        <View style={[styles.statusMsg, { backgroundColor: C.secondary + "18", bottom: bottomPad + 70 }]}>
          <Text style={{ color: C.secondary, fontFamily: "Tajawal_700Bold", fontSize: 12, textAlign: "center" }}>
            ⚠️ تبقى {totalCount - answeredCount} سؤال بدون إجابة
          </Text>
        </View>
      )}
      {currentIdx === totalCount - 1 && isComplete && (
        <View style={[styles.statusMsg, { backgroundColor: C.primary + "18", bottom: bottomPad + 70 }]}>
          <Feather name="check-circle" size={14} color={C.primary} />
          <Text style={{ color: C.primary, fontFamily: "Tajawal_700Bold", fontSize: 12 }}>أجبت على جميع الأسئلة — جاهز للتسليم</Text>
        </View>
      )}
      <Modal visible={!!zoomedImage} transparent animationType="fade" onRequestClose={() => setZoomedImage(null)}>
        <Pressable style={styles.zoomOverlay} onPress={() => setZoomedImage(null)}>
          <View style={styles.zoomContainer}>
            {zoomedImage && (
              <Image source={{ uri: zoomedImage }} style={styles.zoomImage} resizeMode="contain" />
            )}
            <Pressable style={styles.zoomClose} onPress={() => setZoomedImage(null)}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pillBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  confirmCard: { borderRadius: 24, padding: 28, alignItems: "center", gap: 14, width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  confirmIcon: { width: 64, height: 64, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  confirmTitle: { fontSize: 22, textAlign: "center" },
  confirmStats: { flexDirection: "row-reverse", justifyContent: "center", gap: 40, paddingVertical: 12 },
  confirmStatItem: { alignItems: "center", gap: 4 },
  confirmStatNum: { fontSize: 28 },
  confirmActions: { flexDirection: "row-reverse", gap: 10, width: "100%", paddingTop: 8 },
  confirmBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 14 },
  topBar: { borderBottomWidth: 1, paddingHorizontal: 14, paddingBottom: 10 },
  topRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  examTitle: { fontSize: 15, flex: 1, textAlign: "right" },
  topRight: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  timerBox: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  timerText: { fontSize: 13 },
  qGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 5, marginBottom: 6 },
  qGridBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, justifyContent: "center", alignItems: "center", position: "relative" },
  bookmarkDot: { position: "absolute", top: -3, left: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FB923C" },
  legend: { flexDirection: "row-reverse", gap: 12, paddingTop: 4 },
  legendItem: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontFamily: "Tajawal_400Regular" },
  scrollContent: { paddingHorizontal: 14, paddingTop: 14 },
  qCard: { borderRadius: 20, padding: 18, borderWidth: 1.5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  qHeader: { flexDirection: "row-reverse", justifyContent: "space-between", gap: 10, marginBottom: 16 },
  qNumCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  qText: { fontSize: 17, textAlign: "right", lineHeight: 28 },
  actionTag: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, borderWidth: 1.5 },
  optionsContainer: { gap: 8 },
  optionBtn: { flexDirection: "row-reverse", alignItems: "center", padding: 14, borderRadius: 16, gap: 10 },
  optLetter: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  optText: { flex: 1, fontSize: 15, textAlign: "right", lineHeight: 22 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1 },
  navBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 12, height: 42, borderRadius: 12, justifyContent: "center" },
  bottomCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8, gap: 4 },
  progressBg: { height: 5, width: "100%", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 5, borderRadius: 3 },
  statusMsg: { position: "absolute", left: 14, right: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6, borderRadius: 10 },
  qImage: { width: "100%", height: 200, borderRadius: 12, marginTop: 10, backgroundColor: "#f0f0f0" },
  zoomBadge: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 12, padding: 4 },
  zoomOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  zoomContainer: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  zoomImage: { width: "90%", height: "80%" },
  zoomClose: { position: "absolute", top: 60, right: 20, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, padding: 8 },
});
