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

interface Unit { id: number; name: string; subjectId: number; }

export default function UnitsScreen() {
  const { subjectId, name, specializationId, specializationName } = useLocalSearchParams<{
    subjectId: string; name: string; specializationId: string; specializationName: string;
  }>();
  const { isDark, C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: units, isLoading, error, refetch } = useQuery<Unit[]>({
    queryKey: ["units", subjectId],
    queryFn: () => apiRequest<Unit[]>(`/api/units?subjectId=${subjectId}`),
    enabled: !!subjectId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = ({ item }: { item: Unit }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? C.primary + "08" : C.card, borderColor: pressed ? C.primary : C.border, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/exams", params: { unitId: item.id, name: item.name, subjectName: name } });
      }}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.bookmarkIcon, { borderColor: C.border }]}>
          <Feather name="bookmark" size={18} color={C.textSecondary} />
        </View>
        <Text style={[styles.cardTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>{item.name}</Text>
      </View>
      <Feather name="chevron-left" size={18} color={C.textMuted} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: C.border }]}>
            <Feather name="arrow-right" size={18} color={C.primary} />
            <Text style={[styles.backText, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>العودة للمواد</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>اختر الوحدة</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
              الوحدات الدراسية ضمن هذه المادة
            </Text>
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

      {!isLoading && !error && (!units || units.length === 0) && (
        <View style={styles.center}>
          <View style={[styles.emptyBox, { borderColor: C.border }]}>
            <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_700Bold", fontSize: 15 }]}>لا توجد وحدات في هذه المادة</Text>
          </View>
        </View>
      )}

      {!isLoading && !!units && units.length > 0 && (
        <FlatList
          data={units}
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
  card: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  cardLeft: { flexDirection: "row-reverse", alignItems: "center", gap: 12, flex: 1 },
  bookmarkIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  cardTitle: { fontSize: 16, textAlign: "right", flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14, padding: 24 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBox: { padding: 32, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center" },
});
