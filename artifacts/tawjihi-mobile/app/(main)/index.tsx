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

interface Specialization { id: number; name: string; }
interface SiteSettings { whatsappNumber: string; telegramUsername: string; subscriptionInfo: string; }

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: specs, isLoading, error, refetch } = useQuery<Specialization[]>({
    queryKey: ["specializations"],
    queryFn: () => apiRequest<Specialization[]>("/api/specializations"),
  });

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: () => apiRequest<SiteSettings>("/api/settings"),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = ({ item, index }: { item: Specialization; index: number }) => (
    <Pressable
      style={({ pressed }) => [styles.specCard, { backgroundColor: C.card, borderColor: C.border, transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/subjects", params: { specializationId: item.id, name: item.name } });
      }}
    >
      {/* Decorative top-right circle */}
      <View style={[styles.specDecor, { backgroundColor: C.primary + "0D" }]} />

      <View style={[styles.specIconWrap, { backgroundColor: C.primary + "1A" }]}>
        <Feather name="layers" size={28} color={C.primary} />
      </View>

      <Text style={[styles.specName, { color: C.text, fontFamily: "Tajawal_700Bold" }]} numberOfLines={2}>
        {item.name}
      </Text>

      <View style={styles.specFooter}>
        <Feather name="chevron-left" size={14} color={C.textMuted} />
        <Text style={[styles.specLink, { color: C.textMuted, fontFamily: "Tajawal_700Bold" }]}>عرض المواد</Text>
      </View>
    </Pressable>
  );

  const hasBanner = settings && (settings.subscriptionInfo || settings.whatsappNumber || settings.telegramUsername);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: C.card, borderBottomColor: C.border }]}>
        {/* Subscription Banner */}
        {!!hasBanner && (
          <View style={[styles.banner, { backgroundColor: C.primary }]}>
            <View style={styles.bannerContent}>
              <Text style={[styles.bannerText, { fontFamily: "Tajawal_500Medium" }]} numberOfLines={1}>
                {settings?.subscriptionInfo || "اشترك الآن للوصول إلى كافة الامتحانات!"}
              </Text>
              <View style={styles.bannerLinks}>
                {settings?.whatsappNumber ? (
                  <View style={styles.bannerPill}>
                    <Text style={[styles.bannerPillText, { fontFamily: "Tajawal_700Bold" }]}>واتساب</Text>
                    <Feather name="message-circle" size={12} color="#fff" />
                  </View>
                ) : null}
                {settings?.telegramUsername ? (
                  <View style={styles.bannerPill}>
                    <Text style={[styles.bannerPillText, { fontFamily: "Tajawal_700Bold" }]}>تيليغرام</Text>
                    <Feather name="send" size={12} color="#fff" />
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* Nav Row */}
        <View style={styles.navRow}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={[styles.logoIcon, { backgroundColor: C.primary + "18" }]}>
              <Feather name="book-open" size={20} color={C.primary} />
            </View>
            <View>
              <Text style={[styles.logoTitle, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>Tawjihi-Exams</Text>
              <Text style={[styles.logoSub, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>By S&S</Text>
            </View>
          </View>

          {/* User + History */}
          <View style={styles.navRight}>
            <Pressable
              style={[styles.navPill, { backgroundColor: C.primary + "18" }]}
              onPress={() => router.push("/(main)/history")}
            >
              <Text style={[styles.navPillText, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>امتحاناتي</Text>
              <Feather name="award" size={14} color={C.primary} />
            </Pressable>
            <Pressable
              style={[styles.userAvatar, { backgroundColor: C.primary + "18", borderColor: C.primary + "30" }]}
              onPress={() => router.push("/(main)/profile")}
            >
              <Text style={[styles.userInitial, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>
                {(user?.name || "T")[0].toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <View style={[styles.spinnerWrap, { borderColor: C.primary }]} />
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      )}

      {!!error && (
        <View style={styles.center}>
          <Feather name="wifi-off" size={40} color={C.error} />
          <Text style={[styles.errText, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>تعذّر الاتصال</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: C.primary }]}>
            <Text style={[{ color: "#fff", fontFamily: "Tajawal_700Bold", fontSize: 14 }]}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !error && (
        <FlatList
          data={specs || []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.specRow}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.pageHeader}>
              <Text style={[styles.pageTitle, { color: C.primary, fontFamily: "Tajawal_700Bold" }]}>ما هو تخصصك؟</Text>
              <Text style={[styles.pageSub, { color: C.textSecondary, fontFamily: "Tajawal_400Regular" }]}>
                اختر تخصصك لعرض المواد والامتحانات الخاصة بك
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[{ color: C.textSecondary, fontFamily: "Tajawal_400Regular", fontSize: 15, textAlign: "center" }]}>
                لا توجد تخصصات متاحة حالياً
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1 },
  banner: { paddingHorizontal: 16, paddingVertical: 8 },
  bannerContent: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 },
  bannerText: { color: "#fff", fontSize: 12, flex: 1 },
  bannerLinks: { flexDirection: "row-reverse", gap: 6 },
  bannerPill: { flexDirection: "row-reverse", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  bannerPillText: { color: "#fff", fontSize: 11 },
  navRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 60 },
  logoRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  logoIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  logoTitle: { fontSize: 18, lineHeight: 22 },
  logoSub: { fontSize: 10 },
  navRight: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  navPill: { flexDirection: "row-reverse", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  navPillText: { fontSize: 12 },
  userAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  userInitial: { fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  pageHeader: { alignItems: "center", paddingVertical: 24, gap: 8 },
  pageTitle: { fontSize: 28, textAlign: "center" },
  pageSub: { fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  specRow: { gap: 12, marginBottom: 12 },
  specCard: { flex: 1, borderWidth: 2, borderRadius: 24, padding: 20, minHeight: 160, justifyContent: "space-between", overflow: "hidden" },
  specDecor: { position: "absolute", top: 0, right: 0, width: 72, height: 72, borderBottomLeftRadius: 72 },
  specIconWrap: { width: 64, height: 64, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  specName: { fontSize: 16, textAlign: "right", lineHeight: 24, flex: 1 },
  specFooter: { flexDirection: "row-reverse", alignItems: "center", gap: 3, marginTop: 12 },
  specLink: { fontSize: 11 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  spinnerWrap: {},
  errText: { fontSize: 15 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyWrap: { paddingVertical: 60, alignItems: "center", borderWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(0,0,0,0.1)", borderRadius: 20, marginTop: 8 },
});
