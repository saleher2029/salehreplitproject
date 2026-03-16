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

function getGrade(pct: number, C: typeof Colors.light) {
  if (pct >= 85) return { bar: C.primary,    badge: C.primary + "1A",    text: C.primary,     label: "ممتاز" };
  if (pct >= 65) return { bar: C.secondary,  badge: C.secondary + "1A",  text: C.secondary,   label: "جيد جداً" };
  if (pct >= 50) return { bar: "#F59E0B",    badge: "#FEF3C7",            text: "#92400E",     label: "مقبول" };
  return           { bar: C.error,           badge: C.error + "1A",      text: C.error,       label: "راسب" };
}

const formatDate = (s: string) => new Date(s).toLocaleDateString("ar-SA", { day: "numeric", month: "long", year: "numeric" });

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

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

  const renderItem = ({ item }: { item: ExamResult }) => {
    const grade = getGrade(item.percentage, C);
    const pct = Math.round(item.percentage);
    return (
      <Pressable
        style={({ pressed }) => [styles.card, { backgroundColor: C.card, borderColor: C.border, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        onPress={() => router.push({ pathname: "/result/[id]", params: { id: item.id } })}
      >
        {/* Right: percent */}
        <View style={styles.cardLeft}>
          <View style={[styles.pctBadge, { backgroundColor: grade.badge }]}>
            <Text style={[styles.pctText, { color: grade.text, fontFamily: "Tajawal_700Bold" }]}>{pct}%</Text>
          </View>
        </View>

        {/* Center: info */}
        <View style={styles.cardBody}>
          <Text style={[styles.examTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>
            {item.examTitle}
          </Text>

          {/* Score bar */}
          <View style={[styles.barBg, { backgroundColor: C.muted }]}>
            <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: grade.bar }]} />
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.gradePill, { backgroundColor: grade.badge }]}>
              <Text style={[styles.gradeText, { color: grade.text, fontFamily: "Tajawal_700Bold" }]}>{grade.label}</Text>
            </View>
            <Text style={[styles.scoreText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
              {item.score}/{item.totalQuestions}
            </Text>
            <View style={[styles.dateDot, { backgroundColor: C.border }]} />
            <Text style={[styles.dateText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>
              {formatDate(item.completedAt)}
            </Text>
          </View>
        </View>

        <Feather name="chevron-left" size={16} color={C.textMuted} style={{ flexShrink: 0 }} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>امتحاناتي</Text>
          {results && results.length > 0 && (
            <View style={[styles.countPill, { backgroundColor: C.primary + "1A" }]}>
              <Text style={[styles.countText, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>{results.length}</Text>
            </View>
          )}
        </View>
        {!token && (
          <Text style={[styles.headerSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
            سجّل دخولك لعرض امتحاناتك
          </Text>
        )}
      </View>

      {/* No Auth */}
      {!token && (
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: C.primary + "1A" }]}>
            <Feather name="log-in" size={36} color={C.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>سجّل دخولك أولاً</Text>
          <Text style={[styles.emptyBody, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
            يجب تسجيل الدخول لعرض سجل امتحاناتك
          </Text>
          <Pressable onPress={() => router.push("/(main)")} style={[styles.ctaBtn, { backgroundColor: C.primary }]}>
            <Text style={[{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 15 }]}>الذهاب للرئيسية</Text>
          </Pressable>
        </View>
      )}

      {token && isLoading && <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>}

      {token && !!error && (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={C.error} />
          <Text style={[styles.emptyTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>تعذّر التحميل</Text>
          <Pressable onPress={() => refetch()} style={[styles.ctaBtn, { backgroundColor: C.primary }]}>
            <Text style={[{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 15 }]}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}

      {token && !isLoading && !error && (!results || results.length === 0) && (
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: C.primary + "1A" }]}>
            <Feather name="award" size={36} color={C.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>لا توجد امتحانات بعد</Text>
          <Text style={[styles.emptyBody, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
            ابدأ بحل أول امتحان وستظهر نتائجك هنا
          </Text>
          <Pressable onPress={() => router.push("/(main)")} style={[styles.ctaBtn, { backgroundColor: C.primary }]}>
            <Text style={[{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 15 }]}>ابدأ الآن</Text>
          </Pressable>
        </View>
      )}

      {token && !isLoading && !!results && results.length > 0 && (
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
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 24, textAlign: "right" },
  headerSub: { fontSize: 13, textAlign: "right", marginTop: 2 },
  countPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countText: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  card: { flexDirection: "row-reverse", alignItems: "center", padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 10, gap: 12 },
  cardLeft: { flexShrink: 0 },
  pctBadge: { width: 58, height: 58, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  pctText: { fontSize: 16 },
  cardBody: { flex: 1, gap: 6, alignItems: "flex-end" },
  examTitle: { fontSize: 15, textAlign: "right", lineHeight: 22 },
  barBg: { height: 5, width: "100%", borderRadius: 4, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 4, maxWidth: "100%" },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, flexWrap: "wrap" },
  gradePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  gradeText: { fontSize: 11 },
  scoreText: { fontSize: 12 },
  dateDot: { width: 3, height: 3, borderRadius: 2 },
  dateText: { fontSize: 11 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14, padding: 24 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 20, textAlign: "center" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  ctaBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
});
