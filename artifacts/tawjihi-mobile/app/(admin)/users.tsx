import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/api";

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  supervisor: "مشرف",
  student: "طالب",
  guest: "ضيف",
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:      { bg: "#DC262618", text: "#DC2626" },
  supervisor: { bg: "#D9770618", text: "#D97706" },
  student:    { bg: "#10B77F18", text: "#10B77F" },
  guest:      { bg: "#6B728018", text: "#6B7280" },
};

const ALL_ROLES = ["admin", "supervisor", "student", "guest"];

interface User {
  id: number;
  name: string;
  email?: string | null;
  role: string;
  provider?: string | null;
  createdAt: string;
}

export default function UsersManagement() {
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: users, isLoading, isError, refetch } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<User[]>("/api/users", { token }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiRequest(`/api/users/${id}`, { method: "PUT", body: JSON.stringify({ role }), token }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); setRoleTarget(null); },
    onError: (err: any) => Alert.alert("خطأ", err?.message || "فشل تحديث الصلاحية"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/users/${id}`, { method: "DELETE", token }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-users"] }); setDeleteTarget(null); },
    onError: (err: any) => { Alert.alert("خطأ", err?.message || "فشل الحذف"); setDeleteTarget(null); },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getProviderLabel = (p?: string | null) => {
    if (p === "guest") return "ضيف";
    if (p === "email") return "بريد";
    return p ?? "مباشر";
  };

  const studentCount = users?.filter(u => u.role === "student").length ?? 0;

  const renderUser = ({ item }: { item: User }) => {
    const roleColor = ROLE_COLORS[item.role] ?? ROLE_COLORS.guest;
    return (
      <View style={[styles.userCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.userTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>{item.name}</Text>
            {item.email && (
              <Text style={{ fontSize: 12, color: C.textMuted, fontFamily: "Tajawal_400Regular" }}>{item.email}</Text>
            )}
          </View>
          <Pressable
            onPress={() => setRoleTarget(item)}
            style={[styles.roleBadge, { backgroundColor: roleColor.bg }]}
          >
            <Text style={{ fontSize: 12, fontFamily: "Tajawal_700Bold", color: roleColor.text }}>
              {ROLE_LABELS[item.role] ?? item.role}
            </Text>
            <Feather name="chevron-down" size={12} color={roleColor.text} />
          </Pressable>
        </View>

        <View style={styles.userBottom}>
          <View style={styles.userMeta}>
            <View style={[styles.providerTag, { backgroundColor: C.cardSecondary }]}>
              <Text style={{ fontSize: 11, fontFamily: "Tajawal_400Regular", color: C.textMuted }}>{getProviderLabel(item.provider)}</Text>
            </View>
            <Text style={{ fontSize: 11, color: C.textMuted, fontFamily: "Tajawal_400Regular" }}>
              {new Date(item.createdAt).toLocaleDateString("ar-EG")}
            </Text>
          </View>

          {item.id !== currentUser?.id && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setDeleteTarget(item);
              }}
              style={styles.deleteBtn}
            >
              <Feather name="trash-2" size={16} color={C.error} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.topBar, { paddingTop: topPad + 10, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[styles.topTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>إدارة المستخدمين</Text>
          <View style={[styles.counterTag, { backgroundColor: C.cardSecondary }]}>
            <Feather name="users" size={14} color={C.textMuted} />
            <Text style={{ fontSize: 12, fontFamily: "Tajawal_400Regular", color: C.textMuted }}>{studentCount} طالب مسجل</Text>
          </View>
        </View>
        {users && (
          <Text style={{ fontSize: 13, color: C.textMuted, fontFamily: "Tajawal_400Regular", textAlign: "right", marginTop: 4 }}>
            إجمالي: <Text style={{ fontFamily: "Tajawal_700Bold", color: C.text }}>{users.length}</Text> مستخدم
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={C.secondary} />
          <Text style={{ color: C.textMuted, fontFamily: "Tajawal_400Regular", marginTop: 12 }}>حدث خطأ في تحميل المستخدمين</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: C.primary }]}>
            <Text style={{ color: "#fff", fontFamily: "Tajawal_700Bold" }}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={users ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUser}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="users" size={40} color={C.textMuted} />
              <Text style={{ fontSize: 15, color: C.textMuted, fontFamily: "Tajawal_400Regular" }}>لا يوجد مستخدمون بعد</Text>
            </View>
          }
        />
      )}

      {/* Role change modal */}
      <Modal visible={!!roleTarget} transparent animationType="fade" onRequestClose={() => setRoleTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setRoleTarget(null)}>
          <View style={[styles.roleSheet, { backgroundColor: C.card }]}>
            <Text style={{ fontSize: 16, fontFamily: "Tajawal_700Bold", color: C.text, textAlign: "right", marginBottom: 12 }}>
              تغيير صلاحية: {roleTarget?.name}
            </Text>
            {ALL_ROLES.map(role => {
              const rc = ROLE_COLORS[role] ?? ROLE_COLORS.guest;
              const isCurrent = roleTarget?.role === role;
              return (
                <Pressable
                  key={role}
                  onPress={() => {
                    if (!isCurrent && roleTarget) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      updateMut.mutate({ id: roleTarget.id, role });
                    }
                  }}
                  style={[styles.roleOption, {
                    backgroundColor: isCurrent ? rc.bg : C.cardSecondary,
                    borderColor: isCurrent ? rc.text : C.border,
                  }]}
                >
                  {isCurrent && <Feather name="check" size={16} color={rc.text} />}
                  <Text style={{ fontSize: 14, fontFamily: "Tajawal_700Bold", color: isCurrent ? rc.text : C.text }}>
                    {ROLE_LABELS[role]} ({role})
                  </Text>
                </Pressable>
              );
            })}
            {updateMut.isPending && <ActivityIndicator color={C.primary} style={{ marginTop: 8 }} />}
          </View>
        </Pressable>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <Pressable style={styles.overlay} onPress={() => setDeleteTarget(null)}>
          <View style={[styles.deleteSheet, { backgroundColor: C.card }]}>
            <View style={[styles.deleteIcon, { backgroundColor: "#DC262618" }]}>
              <Feather name="user-x" size={32} color="#DC2626" />
            </View>
            <Text style={{ fontSize: 18, fontFamily: "Tajawal_700Bold", color: "#DC2626", textAlign: "center" }}>تأكيد الحذف</Text>
            <Text style={{ fontSize: 13, fontFamily: "Tajawal_400Regular", color: C.textMuted, textAlign: "center" }}>
              هذا الإجراء لا يمكن التراجع عنه.
            </Text>

            <View style={[styles.deleteInfo, { backgroundColor: "#DC262608", borderColor: "#DC262622" }]}>
              <Text style={{ fontSize: 15, fontFamily: "Tajawal_700Bold", color: C.text }}>{deleteTarget?.name}</Text>
              <Text style={{ fontSize: 12, fontFamily: "Tajawal_400Regular", color: C.textMuted }}>سيتم حذف هذا المستخدم وجميع بياناته نهائياً</Text>
            </View>

            <View style={styles.deleteActions}>
              <Pressable
                onPress={() => setDeleteTarget(null)}
                disabled={deleteMut.isPending}
                style={[styles.deleteActionBtn, { backgroundColor: C.cardSecondary, borderWidth: 1.5, borderColor: C.border, flex: 1 }]}
              >
                <Text style={{ fontFamily: "Tajawal_700Bold", color: C.text }}>إلغاء</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (deleteTarget) deleteMut.mutate(deleteTarget.id);
                }}
                disabled={deleteMut.isPending}
                style={[styles.deleteActionBtn, { backgroundColor: "#DC2626", flex: 1 }]}
              >
                {deleteMut.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="trash-2" size={16} color="#fff" />
                    <Text style={{ fontFamily: "Tajawal_700Bold", color: "#fff" }}>حذف نهائياً</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  topTitle: { fontSize: 20 },
  counterTag: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 12 },
  emptyBox: { alignItems: "center", gap: 12, paddingTop: 60 },
  userCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  userTop: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  userName: { fontSize: 15, textAlign: "right" },
  roleBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  userBottom: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  userMeta: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  providerTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  deleteBtn: { padding: 6 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  roleSheet: { borderRadius: 20, padding: 20, width: "100%", maxWidth: 360, gap: 8 },
  roleOption: { flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  deleteSheet: { borderRadius: 20, padding: 24, width: "100%", maxWidth: 360, alignItems: "center", gap: 10 },
  deleteIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  deleteInfo: { width: "100%", padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  deleteActions: { flexDirection: "row-reverse", gap: 10, width: "100%", paddingTop: 8 },
  deleteActionBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, height: 44, borderRadius: 12 },
});
