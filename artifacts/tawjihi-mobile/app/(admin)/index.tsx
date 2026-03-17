import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/api";

export default function AdminDashboard() {
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: specs } = useQuery({
    queryKey: ["specializations"],
    queryFn: () => apiRequest<any[]>("/api/specializations", { token }),
  });
  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => apiRequest<any[]>("/api/subjects", { token }),
  });
  const { data: exams } = useQuery({
    queryKey: ["exams"],
    queryFn: () => apiRequest<any[]>("/api/exams", { token }),
  });
  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: () => apiRequest<any[]>("/api/units", { token }),
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<any[]>("/api/users", { token }),
  });

  const stats = [
    { title: "التخصصات", value: specs?.length ?? "—", icon: "layers" as const, color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
    { title: "المواد", value: subjects?.length ?? "—", icon: "book" as const, color: "#10B77F", bg: "rgba(16,183,127,0.12)" },
    { title: "الوحدات", value: units?.length ?? "—", icon: "folder" as const, color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
    { title: "الامتحانات", value: exams?.length ?? "—", icon: "file-text" as const, color: "#E7AF08", bg: "rgba(231,175,8,0.12)" },
    { title: "المستخدمين", value: users?.length ?? "—", icon: "users" as const, color: "#EC4899", bg: "rgba(236,72,153,0.12)" },
  ];

  const isAdmin = user?.role === "admin";
  const quickLinks = [
    { title: "إدارة التخصصات", icon: "layers" as const, screen: "specs", type: "content" as const },
    { title: "إدارة المواد", icon: "book" as const, screen: "subjects", type: "content" as const },
    { title: "إدارة الوحدات", icon: "folder" as const, screen: "units", type: "content" as const },
    { title: "إدارة الامتحانات", icon: "file-text" as const, screen: "exams", type: "content" as const },
    ...(isAdmin ? [{ title: "إدارة المستخدمين", icon: "users" as const, screen: "", type: "users" as const }] : []),
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: 120, paddingHorizontal: 16 }}
    >
      <View style={styles.header}>
        <View style={[styles.adminBadge, { backgroundColor: C.secondary + "1A" }]}>
          <Feather name="shield" size={14} color={C.secondary} />
          <Text style={[styles.adminBadgeText, { color: C.secondary, fontFamily: "Tajawal_700Bold" }]}>مدير</Text>
        </View>
        <Text style={[styles.title, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>لوحة التحكم</Text>
        <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>
          مرحباً {user?.name ?? ""}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
              <Feather name={s.icon} size={20} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>{s.value}</Text>
            <Text style={[styles.statTitle, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>{s.title}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>وصول سريع</Text>
      <View style={styles.quickLinks}>
        {quickLinks.map((link, i) => (
          <Pressable
            key={i}
            style={({ pressed }) => [styles.quickLink, { backgroundColor: C.card, borderColor: C.border, opacity: pressed ? 0.8 : 1 }]}
            onPress={() => {
              if (link.type === "users") {
                router.push("/(admin)/users");
              } else {
                router.push({ pathname: "/(admin)/content", params: { startLevel: link.screen } });
              }
            }}
          >
            <View style={[styles.qlIcon, { backgroundColor: C.primary + "1A" }]}>
              <Feather name={link.icon} size={18} color={C.primary} />
            </View>
            <Text style={[styles.qlText, { color: C.text, fontFamily: "Tajawal_500Medium" }]}>{link.title}</Text>
            <Feather name="chevron-left" size={16} color={C.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "flex-end", gap: 4, marginBottom: 20 },
  adminBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  adminBadgeText: { fontSize: 12 },
  title: { fontSize: 26 },
  subtitle: { fontSize: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard: { width: "47%", flexGrow: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  statIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  statValue: { fontSize: 24 },
  statTitle: { fontSize: 12 },
  sectionTitle: { fontSize: 18, textAlign: "right", marginBottom: 12 },
  quickLinks: { gap: 8 },
  quickLink: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14 },
  qlIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  qlText: { flex: 1, fontSize: 15, textAlign: "right" },
});
