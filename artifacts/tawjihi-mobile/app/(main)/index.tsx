import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

interface Specialization {
  id: number;
  name: string;
}

const SPEC_ICONS = ["book", "award", "cpu", "globe", "heart", "layers", "star", "zap", "compass", "feather"] as const;
const SPEC_COLORS = ["#1E40AF", "#7C3AED", "#059669", "#D97706", "#DC2626", "#0891B2", "#4F46E5", "#DB2777", "#0F766E", "#9333EA"];

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
    if (h < 12) return "صباح الخير";
    if (h < 17) return "مساء الخير";
    return "مساء النور";
  };

  const renderItem = ({ item, index }: { item: Specialization; index: number }) => {
    const color = SPEC_COLORS[index % SPEC_COLORS.length];
    const icon = SPEC_ICONS[index % SPEC_ICONS.length];
    return (
      <Pressable
        style={({ pressed }) => [styles.card, { backgroundColor: C.card, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/subjects", params: { specializationId: item.id, name: item.name } });
        }}
      >
        <View style={[styles.cardIcon, { backgroundColor: color + "18" }]}>
          <Feather name={icon as any} size={24} color={color} />
        </View>
        <Text style={[styles.cardTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.cardFooter}>
          <Feather name="chevron-left" size={18} color={C.textMuted} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.greeting, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>{greeting()}</Text>
          <Text style={[styles.userName, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>
            {user?.name || "طالب"}
          </Text>
        </View>
        <View style={[styles.avatarCircle, { backgroundColor: C.primary + "18" }]}>
          <Text style={[styles.avatarLetter, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>
            {(user?.name || "T")[0].toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={[styles.sectionHeader, { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 12 }]}>
        <Text style={[styles.sectionTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>التخصصات</Text>
        <Text style={[styles.sectionSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>اختر تخصصك للبدء</Text>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      )}

      {!!error && (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={C.textMuted} />
          <Text style={[styles.errorMsg, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>تعذّر تحميل البيانات</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: C.primary + "18" }]}>
            <Text style={[styles.retryText, { color: C.primary, fontFamily: "Tajawal_500Medium" }]}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !error && (!specs || specs.length === 0) && (
        <View style={styles.center}>
          <Feather name="inbox" size={48} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>لا توجد تخصصات بعد</Text>
        </View>
      )}

      {!isLoading && !!specs && specs.length > 0 && (
        <FlatList
          data={specs}
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
  header: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  greeting: { fontSize: 13, textAlign: "right" },
  userName: { fontSize: 20, textAlign: "right" },
  avatarCircle: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  avatarLetter: { fontSize: 20 },
  sectionHeader: {},
  sectionTitle: { fontSize: 22, textAlign: "right" },
  sectionSub: { fontSize: 14, textAlign: "right" },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  card: { flexDirection: "row-reverse", alignItems: "center", padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, gap: 14 },
  cardIcon: { width: 50, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  cardTitle: { flex: 1, fontSize: 16, textAlign: "right", lineHeight: 24 },
  cardFooter: {},
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingBottom: 80 },
  errorMsg: { fontSize: 15, textAlign: "center" },
  emptyText: { fontSize: 15, textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { fontSize: 14 },
});
