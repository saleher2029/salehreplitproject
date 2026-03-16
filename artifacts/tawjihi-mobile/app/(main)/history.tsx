import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
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

interface ExamResult {
  id: number;
  examTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: results, isLoading, error, refetch } = useQuery<ExamResult[]>({
    queryKey: ["results", token],
    queryFn: () => apiRequest<ExamResult[]>("/api/results", { token }),
    enabled: !!token,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const getGrade = (pct: number) => {
    if (pct >= 90) return { label: "ممتاز", color: "#059669" };
    if (pct >= 80) return { label: "جيد جداً", color: "#2563EB" };
    if (pct >= 70) return { label: "جيد", color: "#7C3AED" };
    if (pct >= 50) return { label: "مقبول", color: "#D97706" };
    return { label: "راسب", color: "#DC2626" };
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" });
  };

  const renderItem = ({ item }: { item: ExamResult }) => {
    const grade = getGrade(item.percentage);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, { backgroundColor: C.card, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        onPress={() => router.push({ pathname: "/result/[id]", params: { id: item.id } })}
      >
        <View style={styles.cardRight}>
          <View style={[styles.pctCircle, { backgroundColor: grade.color + "18", borderColor: grade.color + "40" }]}>
            <Text style={[styles.pctNum, { color: grade.color, fontFamily: "Tajawal_700Bold" }]}>{Math.round(item.percentage)}%</Text>
          </View>
        </View>
        <View style={styles.cardMid}>
          <Text style={[styles.examTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>{item.examTitle}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.gradeBadge, { backgroundColor: grade.color + "18" }]}>
              <Text style={[styles.gradeText, { color: grade.color, fontFamily: "Tajawal_500Medium" }]}>{grade.label}</Text>
            </View>
            <Text style={[styles.scoreText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
              {item.score}/{item.totalQuestions}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>{formatDate(item.completedAt)}</Text>
        </View>
        <Feather name="chevron-left" size={18} color={C.textMuted} style={styles.chevron} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>سجل الامتحانات</Text>
        <Text style={[styles.headerSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
          {results?.length ? `${results.length} امتحان` : ""}
        </Text>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      )}

      {!!error && (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>تعذّر تحميل السجل</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: C.primary + "18" }]}>
            <Text style={[styles.retryText, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !error && (!results || results.length === 0) && (
        <View style={styles.center}>
          <Feather name="clock" size={48} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>لا توجد امتحانات بعد</Text>
          <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>ابدأ بحل أول امتحان لتظهر هنا</Text>
          <Pressable onPress={() => router.push("/(main)")} style={[styles.retryBtn, { backgroundColor: C.primary }]}>
            <Text style={[styles.retryText, { color: "#fff", fontFamily: "Tajawal_500Medium" }]}>ابدأ الآن</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !!results && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, textAlign: "right" },
  headerSub: { fontSize: 13, textAlign: "right", marginTop: 2 },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  card: { flexDirection: "row-reverse", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 12 },
  cardRight: {},
  pctCircle: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  pctNum: { fontSize: 15 },
  cardMid: { flex: 1, gap: 4, alignItems: "flex-end" },
  examTitle: { fontSize: 15, textAlign: "right" },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  gradeText: { fontSize: 12 },
  scoreText: { fontSize: 13 },
  dateText: { fontSize: 12 },
  chevron: { marginLeft: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingBottom: 80 },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptyText: { fontSize: 14, textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { fontSize: 15 },
});
