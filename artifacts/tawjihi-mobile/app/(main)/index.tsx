import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

interface Specialization { id: number; name: string; }

const CARD_GRADIENTS = [
  ["#6C63FF", "#B15EFF"],
  ["#FF6B6B", "#FF8E53"],
  ["#00C896", "#00A8CC"],
  ["#FFB347", "#FF6B6B"],
  ["#4ECDC4", "#44A08D"],
  ["#A8EDEA", "#FED6E3"],
  ["#F093FB", "#F5576C"],
  ["#4FACFE", "#00F2FE"],
] as const;

const SPEC_ICONS: Array<keyof typeof Feather.glyphMap> = ["book-open", "cpu", "globe", "heart", "layers", "star", "zap", "compass"];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data: specs, isLoading, error, refetch } = useQuery<Specialization[]>({
    queryKey: ["specializations"],
    queryFn: () => apiRequest<Specialization[]>("/api/specializations"),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "صباح النشاط";
    if (h < 17) return "مساء التفوق";
    return "مساء الدراسة";
  };

  const renderItem = ({ item, index }: { item: Specialization; index: number }) => {
    const grad = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
    const icon = SPEC_ICONS[index % SPEC_ICONS.length];
    return (
      <Pressable
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/subjects", params: { specializationId: item.id, name: item.name } });
        }}
      >
        <LinearGradient colors={[grad[0], grad[1]]} style={styles.specCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.specIconBg}>
            <Feather name={icon} size={26} color="#fff" />
          </View>
          <Text style={[styles.specName, { fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>{item.name}</Text>
          <View style={styles.specArrow}>
            <Feather name="arrow-left" size={16} color="rgba(255,255,255,0.7)" />
          </View>
        </LinearGradient>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ["#130F3A", "#07061A"] : ["#6C63FF", "#9B59F5"]}
        style={[styles.header, { paddingTop: topPad + 16 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.avatarBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}
            onPress={() => router.push("/(main)/profile")}
          >
            <Text style={[styles.avatarLetter, { fontFamily: "Tajawal_700Bold" }]}>
              {(user?.name || "T")[0].toUpperCase()}
            </Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.greetText, { fontFamily: "Tajawal_400Regular" }]}>{greeting()}</Text>
            <Text style={[styles.nameText, { fontFamily: "Tajawal_700Bold" }]} numberOfLines={1}>
              {user?.name || "طالب"}
            </Text>
          </View>
        </View>

        <View style={styles.subtitleRow}>
          <View style={[styles.subtitleBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Feather name="target" size={14} color="#fff" />
            <Text style={[styles.subtitleText, { fontFamily: "Tajawal_500Medium" }]}>اختر تخصصك وابدأ الآن</Text>
          </View>
        </View>
      </LinearGradient>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      )}

      {!!error && (
        <View style={styles.center}>
          <View style={[styles.errorCard, { backgroundColor: C.card }]}>
            <Feather name="wifi-off" size={36} color={C.error} />
            <Text style={[styles.errorTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>تعذّر الاتصال</Text>
            <Pressable onPress={() => refetch()} style={{ backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
              <Text style={[{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 15 }]}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!isLoading && !error && (!specs || specs.length === 0) && (
        <View style={styles.center}>
          <Feather name="inbox" size={48} color={C.textMuted} />
          <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 15 }]}>لا توجد تخصصات بعد</Text>
        </View>
      )}

      {!isLoading && !!specs && specs.length > 0 && (
        <FlatList
          data={specs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>التخصصات</Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: "row-reverse", alignItems: "center", gap: 14, marginBottom: 14 },
  avatarBtn: { width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  avatarLetter: { fontSize: 22, color: "#fff" },
  headerText: { flex: 1, alignItems: "flex-end" },
  greetText: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  nameText: { fontSize: 20, color: "#fff" },
  subtitleRow: { alignItems: "flex-end" },
  subtitleBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  subtitleText: { fontSize: 13, color: "#fff" },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  listHeader: { fontSize: 20, textAlign: "right", marginTop: 16, marginBottom: 12 },
  row: { gap: 12, justifyContent: "space-between" },
  specCard: { width: "100%", borderRadius: 20, padding: 18, marginBottom: 12, minHeight: 130, justifyContent: "space-between" },
  specIconBg: { width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  specName: { fontSize: 15, color: "#fff", textAlign: "right", lineHeight: 22 },
  specArrow: { alignSelf: "flex-end" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  errorCard: { padding: 24, borderRadius: 20, alignItems: "center", gap: 14, width: "100%" },
  errorTitle: { fontSize: 18 },
});
