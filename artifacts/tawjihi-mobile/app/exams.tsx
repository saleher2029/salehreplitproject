import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

  const renderItem = ({ item, index }: { item: Exam; index: number }) => {
    const count = item.questionLimit && item.questionLimit < item.questionCount ? item.questionLimit : item.questionCount;
    return (
      <Pressable
        style={({ pressed }) => [styles.card, { backgroundColor: C.card, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({ pathname: "/exam/[id]", params: { id: item.id } });
        }}
      >
        {/* Left accent */}
        <LinearGradient
          colors={index % 2 === 0 ? ["#6C63FF", "#B15EFF"] : ["#FF6B6B", "#FF8E53"]}
          style={styles.cardAccent}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        />

        <View style={styles.cardContent}>
          <Text style={[styles.examTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: C.primary + "18" }]}>
              <Feather name="help-circle" size={12} color={C.primary} />
              <Text style={[styles.badgeText, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>{count} سؤال</Text>
            </View>
            {!!item.timeLimit && (
              <View style={[styles.badge, { backgroundColor: C.warning + "18" }]}>
                <Feather name="clock" size={12} color={C.warning} />
                <Text style={[styles.badgeText, { color: C.warning, fontFamily: "Tajawal_500Medium" }]}>{item.timeLimit} دقيقة</Text>
              </View>
            )}
          </View>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({ pathname: "/exam/[id]", params: { id: item.id } });
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <LinearGradient colors={["#6C63FF", "#B15EFF"]} style={styles.startBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={[styles.startText, { fontFamily: "Tajawal_700Bold" }]}>ابدأ</Text>
            <Feather name="arrow-left" size={14} color="#fff" />
          </LinearGradient>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={isDark ? ["#130F3A", "#07061A"] : ["#6C63FF", "#B15EFF"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Pressable onPress={() => router.back()}>
          <View style={styles.backCircle}>
            <Feather name="arrow-right" size={20} color="#fff" />
          </View>
        </Pressable>
        <View style={styles.headerText}>
          {subjectName ? <Text style={[styles.headerSub, { fontFamily: "Tajawal_400Regular" }]}>{subjectName}</Text> : null}
          <Text style={[styles.headerTitle, { fontFamily: "Tajawal_700Bold" }]} numberOfLines={1}>{name}</Text>
        </View>
      </LinearGradient>

      {isLoading && <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>}

      {!!error && (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={C.error} />
          <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 15 }]}>تعذّر التحميل</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: C.primary }]}>
            <Text style={[{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 14 }]}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !error && (!exams || exams.length === 0) && (
        <View style={styles.center}>
          <LinearGradient colors={["#6C63FF", "#B15EFF"]} style={styles.emptyIcon}>
            <Feather name="file-text" size={30} color="#fff" />
          </LinearGradient>
          <Text style={[{ color: C.text, fontFamily: "Tajawal_700Bold", fontSize: 17 }]}>لا توجد امتحانات</Text>
          <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 14 }]}>لم تُضَف امتحانات لهذه الوحدة بعد</Text>
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
  header: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  backCircle: { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerText: { flex: 1, alignItems: "flex-end" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  headerTitle: { fontSize: 20, color: "#fff" },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },
  card: { flexDirection: "row-reverse", alignItems: "center", borderRadius: 16, marginBottom: 10, overflow: "hidden", gap: 0 },
  cardAccent: { width: 5, alignSelf: "stretch" },
  cardContent: { flex: 1, padding: 14, gap: 8, alignItems: "flex-end" },
  examTitle: { fontSize: 15, textAlign: "right" },
  metaRow: { flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" },
  badge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12 },
  startBtn: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row-reverse", alignItems: "center", gap: 5, margin: 10, borderRadius: 12 },
  startText: { color: "#fff", fontSize: 13 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
});
