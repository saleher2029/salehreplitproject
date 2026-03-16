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

interface Unit {
  id: number;
  name: string;
  subjectId: number;
}

export default function UnitsScreen() {
  const { subjectId, name, specializationId, specializationName } = useLocalSearchParams<{
    subjectId: string; name: string; specializationId: string; specializationName: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

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

  const renderItem = ({ item, index }: { item: Unit; index: number }) => (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: C.card, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/exams", params: { unitId: item.id, name: item.name, subjectName: name } });
      }}
    >
      <View style={[styles.numBadge, { backgroundColor: C.primary + "18" }]}>
        <Text style={[styles.numText, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>{index + 1}</Text>
      </View>
      <Text style={[styles.cardTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>{item.name}</Text>
      <Feather name="chevron-left" size={18} color={C.textMuted} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-right" size={22} color={C.primary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.headerSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>اختر الوحدة</Text>
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

      {!isLoading && !error && (!units || units.length === 0) && (
        <View style={styles.center}>
          <Feather name="layers" size={48} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>لا توجد وحدات في هذه المادة</Text>
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
  header: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 6 },
  headerText: { flex: 1, alignItems: "flex-end" },
  headerTitle: { fontSize: 18 },
  headerSub: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  card: { flexDirection: "row-reverse", alignItems: "center", padding: 18, borderRadius: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, gap: 14 },
  numBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  numText: { fontSize: 15 },
  cardTitle: { flex: 1, fontSize: 16, textAlign: "right" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 15, textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { fontSize: 14 },
});
