import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiRequest } from "@/utils/api";

interface Exam {
  id: number;
  title: string;
  unitId: number;
  questionCount: number;
  timeLimit?: number | null;
  questionLimit?: number | null;
  createdAt: string;
}

export default function ExamsScreen() {
  const { unitId, name, subjectName } = useLocalSearchParams<{ unitId: string; name: string; subjectName: string }>();
  const { isDark, C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: exams, isLoading, error, refetch } = useQuery<Exam[]>({
    queryKey: ["exams", unitId],
    queryFn: () => apiRequest<Exam[]>(`/api/exams?unitId=${unitId}`),
    enabled: !!unitId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = ({ item }: { item: Exam }) => {
    const count = item.questionLimit && item.questionLimit < item.questionCount ? item.questionLimit : item.questionCount;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: C.card, borderColor: C.border, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({ pathname: "/exam/[id]", params: { id: item.id } });
        }}
      >
        {/* Trophy icon */}
        <View style={[styles.examIcon, { backgroundColor: C.primary + "12" }]}>
          <Feather name="file-text" size={22} color={C.primary} />
        </View>

        <View style={styles.examBody}>
          <Text style={[styles.examTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: C.primary + "12" }]}>
              <Feather name="help-circle" size={12} color={C.primary} />
              <Text style={[styles.badgeText, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>{count} سؤال</Text>
            </View>
            {!!item.timeLimit && (
              <View style={[styles.badge, { backgroundColor: C.secondary + "18" }]}>
                <Feather name="clock" size={12} color={C.secondary} />
                <Text style={[styles.badgeText, { color: C.secondary, fontFamily: "Tajawal_700Bold" }]}>{item.timeLimit} دقيقة</Text>
              </View>
            )}
          </View>
        </View>

        <Pressable
          style={[styles.startBtn, { backgroundColor: C.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({ pathname: "/exam/[id]", params: { id: item.id } });
          }}
        >
          <Text style={[styles.startText, { fontFamily: "Tajawal_700Bold" }]}>ابدأ</Text>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: C.border }]}>
            <Feather name="arrow-right" size={18} color={C.primary} />
            <Text style={[styles.backText, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>العودة للوحدات</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>الامتحانات</Text>
            {subjectName ? (
              <Text style={[styles.headerSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>{name} • {subjectName}</Text>
            ) : (
              <Text style={[styles.headerSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>{name}</Text>
            )}
          </View>
        </View>
      </View>

      {isLoading && <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>}

      {!!error && (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={C.error} />
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: C.primary }]}>
            <Text style={[{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 14 }]}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !error && (!exams || exams.length === 0) && (
        <View style={styles.center}>
          <View style={[styles.emptyBox, { borderColor: C.border }]}>
            <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_700Bold", fontSize: 15, textAlign: "center" }]}>
              لا توجد امتحانات في هذه الوحدة
            </Text>
          </View>
        </View>
      )}

      {!isLoading && !!exams && exams.length > 0 && (
        <FlatList
          data={exams}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, gap: 12 },
  headerRow: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headerText: { alignItems: "flex-end", flex: 1 },
  headerTitle: { fontSize: 22 },
  headerSub: { fontSize: 13, textAlign: "right" },
  backBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, flexShrink: 0 },
  backText: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  card: { flexDirection: "row-reverse", alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10, gap: 12 },
  examIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  examBody: { flex: 1, gap: 8, alignItems: "flex-end" },
  examTitle: { fontSize: 15, textAlign: "right", lineHeight: 22 },
  badgeRow: { flexDirection: "row-reverse", gap: 6, flexWrap: "wrap" },
  badge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11 },
  startBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexShrink: 0 },
  startText: { color: "#fff", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14, padding: 24 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBox: { padding: 32, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center" },
});
