import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

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
        style={({ pressed }) => [styles.card, { backgroundColor: C.card, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({ pathname: "/exam/[id]", params: { id: item.id } });
        }}
      >
        <View style={styles.cardContent}>
          <Text style={[styles.examTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>{item.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, { backgroundColor: C.primary + "18" }]}>
              <Feather name="help-circle" size={13} color={C.primary} />
              <Text style={[styles.metaText, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>{count} سؤال</Text>
            </View>
            {!!item.timeLimit && (
              <View style={[styles.metaBadge, { backgroundColor: C.warning + "18" }]}>
                <Feather name="clock" size={13} color={C.warning} />
                <Text style={[styles.metaText, { color: C.warning, fontFamily: "Tajawal_500Medium" }]}>{item.timeLimit} دقيقة</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.startBtn, { backgroundColor: C.primary }]}>
          <Text style={[styles.startText, { fontFamily: "Tajawal_700Bold" }]}>ابدأ</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-right" size={22} color={C.primary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={1}>{name}</Text>
          {subjectName && <Text style={[styles.headerSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>{subjectName}</Text>}
        </View>
      </View>

      {isLoading && <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>}

      {!!error && (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>تعذّر تحميل البيانات</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: C.primary + "18" }]}>
            <Text style={[styles.retryText, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !error && (!exams || exams.length === 0) && (
        <View style={styles.center}>
          <Feather name="file-text" size={48} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>لا توجد امتحانات في هذه الوحدة</Text>
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
  header: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 6 },
  headerText: { flex: 1, alignItems: "flex-end" },
  headerTitle: { fontSize: 18 },
  headerSub: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  card: { flexDirection: "row-reverse", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 14 },
  cardContent: { flex: 1, gap: 8, alignItems: "flex-end" },
  examTitle: { fontSize: 16, textAlign: "right" },
  metaRow: { flexDirection: "row-reverse", gap: 8 },
  metaBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  metaText: { fontSize: 12 },
  startBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  startText: { color: "#fff", fontSize: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 15, textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { fontSize: 14 },
});
