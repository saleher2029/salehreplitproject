import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

const getGrade = (pct: number) => {
  if (pct >= 90) return { label: "ممتاز", colors: ["#00C896", "#00A8CC"] as [string,string] };
  if (pct >= 80) return { label: "جيد جداً", colors: ["#6C63FF", "#4FACFE"] as [string,string] };
  if (pct >= 70) return { label: "جيد", colors: ["#B15EFF", "#6C63FF"] as [string,string] };
  if (pct >= 50) return { label: "مقبول", colors: ["#FFB347", "#FF9500"] as [string,string] };
  return { label: "راسب", colors: ["#FF4757", "#FF6B81"] as [string,string] };
};

const formatDate = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" });
};

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

  const avgScore = results && results.length > 0
    ? Math.round(results.reduce((a, r) => a + r.percentage, 0) / results.length)
    : 0;

  const renderItem = ({ item, index }: { item: ExamResult; index: number }) => {
    const grade = getGrade(item.percentage);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, { backgroundColor: C.card, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.975 : 1 }] }]}
        onPress={() => router.push({ pathname: "/result/[id]", params: { id: item.id } })}
      >
        {/* Score Circle */}
        <View style={styles.scoreWrap}>
          <LinearGradient colors={grade.colors} style={styles.scoreCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={[styles.scorePct, { fontFamily: "Tajawal_700Bold" }]}>{Math.round(item.percentage)}%</Text>
          </LinearGradient>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>
            {item.examTitle}
          </Text>
          <View style={styles.cardMeta}>
            <LinearGradient colors={grade.colors} style={styles.gradeBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={[styles.gradeText, { fontFamily: "Tajawal_700Bold" }]}>{grade.label}</Text>
            </LinearGradient>
            <Text style={[styles.scoreCount, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
              {item.score}/{item.totalQuestions} ✓
            </Text>
          </View>
          <Text style={[styles.dateText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>
            {formatDate(item.completedAt)}
          </Text>
        </View>

        <Feather name="chevron-left" size={16} color={C.textMuted} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ["#130F3A", "#07061A"] : ["#6C63FF", "#B15EFF"]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }} />
          <Text style={[styles.headerTitle, { fontFamily: "Tajawal_700Bold" }]}>سجل الامتحانات</Text>
        </View>

        {results && results.length > 0 && (
          <View style={styles.statsRow}>
            <StatChip icon="file-text" value={String(results.length)} label="امتحان" />
            <StatChip icon="trending-up" value={avgScore + "%"} label="متوسط" />
            <StatChip
              icon="award"
              value={String(results.filter(r => r.percentage >= 50).length)}
              label="ناجح"
            />
          </View>
        )}
      </LinearGradient>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 14 }]}>جاري التحميل...</Text>
        </View>
      )}

      {!!error && (
        <View style={styles.center}>
          <View style={[styles.emptyCard, { backgroundColor: C.card }]}>
            <Feather name="wifi-off" size={42} color={C.error} />
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>تعذّر الاتصال</Text>
            <Pressable onPress={() => refetch()} style={{ backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 }}>
              <Text style={[{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 15 }]}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!isLoading && !error && (!results || results.length === 0) && (
        <View style={styles.center}>
          <View style={[styles.emptyCard, { backgroundColor: C.card }]}>
            <LinearGradient colors={["#6C63FF", "#B15EFF"]} style={styles.emptyIconBg}>
              <Feather name="clock" size={30} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>لا توجد نتائج بعد</Text>
            <Text style={[styles.emptyBody, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
              ابدأ بحل امتحان وستظهر نتائجك هنا
            </Text>
            <Pressable
              onPress={() => router.push("/(main)")}
              style={{ overflow: "hidden", borderRadius: 14, width: "100%" }}
            >
              <LinearGradient colors={["#6C63FF", "#B15EFF"]} style={{ paddingVertical: 14, alignItems: "center" }}>
                <Text style={[{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 16 }]}>ابدأ الآن</Text>
              </LinearGradient>
            </Pressable>
          </View>
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

function StatChip({ icon, value, label }: { icon: keyof typeof Feather.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.statChip}>
      <Feather name={icon} size={14} color="rgba(255,255,255,0.7)" />
      <Text style={[styles.statValue, { fontFamily: "Tajawal_700Bold" }]}>{value}</Text>
      <Text style={[styles.statLabel, { fontFamily: "Tajawal_400Regular" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  headerTop: { flexDirection: "row-reverse", alignItems: "center" },
  headerTitle: { fontSize: 22, color: "#fff" },
  statsRow: { flexDirection: "row-reverse", gap: 10 },
  statChip: { flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 14, padding: 12, alignItems: "center", gap: 3 },
  statValue: { color: "#fff", fontSize: 16 },
  statLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  list: { paddingHorizontal: 16, paddingTop: 14 },
  card: { flexDirection: "row-reverse", alignItems: "center", padding: 14, borderRadius: 18, marginBottom: 10, gap: 12 },
  scoreWrap: { flexShrink: 0 },
  scoreCircle: { width: 60, height: 60, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  scorePct: { fontSize: 15, color: "#fff" },
  cardInfo: { flex: 1, alignItems: "flex-end", gap: 5 },
  cardTitle: { fontSize: 14, textAlign: "right", lineHeight: 20 },
  cardMeta: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  gradeText: { fontSize: 11, color: "#fff" },
  scoreCount: { fontSize: 12 },
  dateText: { fontSize: 11 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyCard: { width: "100%", padding: 28, borderRadius: 24, alignItems: "center", gap: 12 },
  emptyIconBg: { width: 70, height: 70, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 22 },
});
