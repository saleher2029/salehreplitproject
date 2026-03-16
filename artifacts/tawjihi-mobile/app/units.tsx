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

interface Unit { id: number; name: string; subjectId: number; }

export default function UnitsScreen() {
  const { subjectId, name, specializationId, specializationName } = useLocalSearchParams<{
    subjectId: string; name: string; specializationId: string; specializationName: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
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

  const renderItem = ({ item, index }: { item: Unit; index: number }) => (
    <Pressable
      style={({ pressed }) => [styles.card, { backgroundColor: C.card, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/exams", params: { unitId: item.id, name: item.name, subjectName: name } });
      }}
    >
      <Feather name="chevron-left" size={18} color={C.textMuted} />
      <Text style={[styles.cardTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>
        {item.name}
      </Text>
      <LinearGradient colors={["#6C63FF", "#B15EFF"]} style={styles.numBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={[styles.numText, { fontFamily: "Tajawal_700Bold" }]}>{index + 1}</Text>
      </LinearGradient>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <LinearGradient
        colors={isDark ? ["#130F3A", "#07061A"] : ["#6C63FF", "#B15EFF"]}
        style={[styles.header, { paddingTop: topPad + 12 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <View style={styles.backCircle}>
            <Feather name="arrow-right" size={20} color="#fff" />
          </View>
        </Pressable>
        <View style={styles.headerText}>
          {specializationName ? (
            <Text style={[styles.headerSub, { fontFamily: "Tajawal_400Regular" }]}>{specializationName}</Text>
          ) : null}
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

      {!isLoading && !error && (!units || units.length === 0) && (
        <View style={styles.center}>
          <Feather name="layers" size={48} color={C.textMuted} />
          <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 15 }]}>لا توجد وحدات</Text>
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
  header: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  backBtn: {},
  backCircle: { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerText: { flex: 1, alignItems: "flex-end" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  headerTitle: { fontSize: 20, color: "#fff" },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },
  card: { flexDirection: "row-reverse", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 10, gap: 14 },
  numBadge: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  numText: { fontSize: 15, color: "#fff" },
  cardTitle: { flex: 1, fontSize: 16, textAlign: "right" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
});
