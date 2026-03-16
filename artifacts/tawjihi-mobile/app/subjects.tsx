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
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { apiRequest } from "@/utils/api";

interface Subject { id: number; name: string; specializationId: number; }

export default function SubjectsScreen() {
  const { specializationId, name } = useLocalSearchParams<{ specializationId: string; name: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: subjects, isLoading, error, refetch } = useQuery<Subject[]>({
    queryKey: ["subjects", specializationId],
    queryFn: () => apiRequest<Subject[]>(`/api/subjects?specializationId=${specializationId}`),
    enabled: !!specializationId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = ({ item }: { item: Subject }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: C.card, borderColor: pressed ? C.secondary + "80" : C.border, transform: [{ translateY: pressed ? 0 : 0 }], opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/units", params: { subjectId: item.id, name: item.name, specializationId, specializationName: name } });
      }}
    >
      {/* Amber strip on hover — simulated via secondary color always visible on right */}
      <View style={[styles.cardStrip, { backgroundColor: C.secondary + "00" }]} />

      <View style={[styles.cardIconWrap, { backgroundColor: C.secondary + "1A" }]}>
        <Feather name="book" size={22} color={C.secondary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardLink}>
          <Feather name="chevron-left" size={12} color={C.textMuted} />
          <Text style={[styles.cardLinkText, { color: C.textMuted, fontFamily: "Tajawal_700Bold" }]}>دخول للوحدات</Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: C.border }]}>
            <Feather name="arrow-right" size={18} color={C.primary} />
            <Text style={[styles.backText, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>تغيير التخصص</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>اختر المادة</Text>
            <Text style={[styles.headerSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
              المواد الدراسية المقررة لهذا التخصص
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

      {!isLoading && !error && (!subjects || subjects.length === 0) && (
        <View style={styles.center}>
          <View style={[styles.emptyBox, { borderColor: C.border }]}>
            <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_700Bold", fontSize: 15 }]}>
              لم يتم إضافة مواد لهذا التخصص بعد
            </Text>
          </View>
        </View>
      )}

      {!isLoading && !!subjects && subjects.length > 0 && (
        <FlatList
          data={subjects}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
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
  list: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 40 },
  row: { gap: 10, marginBottom: 10 },
  card: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 16, overflow: "hidden", gap: 10, minHeight: 120 },
  cardStrip: { position: "absolute", top: 0, right: 0, width: 3, height: "100%", borderTopRightRadius: 18, borderBottomRightRadius: 18 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  cardBody: { gap: 4, flex: 1, justifyContent: "space-between" },
  cardTitle: { fontSize: 14, textAlign: "right", lineHeight: 20 },
  cardLink: { flexDirection: "row-reverse", alignItems: "center", gap: 3 },
  cardLinkText: { fontSize: 11 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14, padding: 24 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBox: { padding: 32, borderRadius: 20, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center" },
});
