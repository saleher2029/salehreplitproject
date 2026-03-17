import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";

import { useAppTheme } from "@/hooks/useAppTheme";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/api";

type Level = "specs" | "subjects" | "units" | "exams" | "questions";

interface Breadcrumb { level: Level; id?: number; name: string; }

const LEVEL_CONFIG: Record<Level, { title: string; icon: string; apiPath: string; parentKey?: string; nextLevel?: Level }> = {
  specs:     { title: "التخصصات",  icon: "layers",    apiPath: "/api/specializations" },
  subjects:  { title: "المواد",    icon: "book",      apiPath: "/api/subjects",  parentKey: "specializationId", nextLevel: undefined },
  units:     { title: "الوحدات",   icon: "folder",    apiPath: "/api/units",     parentKey: "subjectId" },
  exams:     { title: "الامتحانات", icon: "file-text", apiPath: "/api/exams",     parentKey: "unitId" },
  questions: { title: "الأسئلة",   icon: "help-circle", apiPath: "/api/questions", parentKey: "examId" },
};
LEVEL_CONFIG.specs.nextLevel = "subjects";
LEVEL_CONFIG.subjects.nextLevel = "units";
LEVEL_CONFIG.units.nextLevel = "exams";
LEVEL_CONFIG.exams.nextLevel = "questions";

const OPTION_LABELS = ["أ", "ب", "ج", "د"];

export default function ContentManagement() {
  const { C } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ startLevel?: string }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ level: "specs", name: "التخصصات" }]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formTimeLimit, setFormTimeLimit] = useState("");
  const [formQuestionLimit, setFormQuestionLimit] = useState("");
  const [formQText, setFormQText] = useState("");
  const [formOptions, setFormOptions] = useState(["", "", "", ""]);
  const [formCorrect, setFormCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.startLevel && params.startLevel !== breadcrumbs[0].level) {
      const lvl = params.startLevel as Level;
      if (LEVEL_CONFIG[lvl]) {
        setBreadcrumbs([{ level: lvl, name: LEVEL_CONFIG[lvl].title }]);
      }
    }
  }, [params.startLevel]);

  const current = breadcrumbs[breadcrumbs.length - 1];
  const config = LEVEL_CONFIG[current.level];
  const parentId = current.id;
  const canCreate = current.level === "specs" || !!parentId;

  const queryKey = [config.apiPath, parentId ?? "all"];
  const { data: items, isLoading, isError, refetch } = useQuery<any[]>({
    queryKey,
    queryFn: async () => {
      let url = config.apiPath;
      if (config.parentKey && parentId) {
        url += `?${config.parentKey}=${parentId}`;
      }
      return apiRequest<any[]>(url, { token });
    },
  });

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest(config.apiPath, { method: "POST", body: JSON.stringify(body), token }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); setModalVisible(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) =>
      apiRequest(`${config.apiPath}/${id}`, { method: "PUT", body: JSON.stringify(body), token }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey }); setModalVisible(false); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest(`${config.apiPath}/${id}`, { method: "DELETE", token }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err: any) => Alert.alert("خطأ", err?.message || "فشل الحذف"),
  });

  const drillDown = (item: any) => {
    if (!config.nextLevel) return;
    const nextConfig = LEVEL_CONFIG[config.nextLevel];
    setBreadcrumbs(prev => [...prev, { level: config.nextLevel!, id: item.id, name: item.title || item.name }]);
  };

  const goBack = () => {
    if (breadcrumbs.length > 1) {
      setBreadcrumbs(prev => prev.slice(0, -1));
    }
  };

  const goToLevel = (index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  const openCreate = () => {
    setEditingItem(null);
    setFormName("");
    setFormTimeLimit("");
    setFormQuestionLimit("");
    setFormQText("");
    setFormOptions(["", "", "", ""]);
    setFormCorrect("A");
    setModalVisible(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    if (current.level === "questions") {
      setFormQText(item.text ?? "");
      setFormOptions([item.optionA ?? "", item.optionB ?? "", item.optionC ?? "", item.optionD ?? ""]);
      setFormCorrect(item.correctOption ?? "A");
    } else if (current.level === "exams") {
      setFormName(item.title ?? "");
      setFormTimeLimit(item.timeLimit?.toString() ?? "");
      setFormQuestionLimit(item.questionLimit?.toString() ?? "");
    } else {
      setFormName(item.name ?? item.title ?? "");
    }
    setModalVisible(true);
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let body: any;

    if (current.level === "questions") {
      const filled = formOptions.every(o => o.trim());
      if (!formQText.trim() || !filled) return;
      body = {
        text: formQText.trim(),
        optionA: formOptions[0].trim(),
        optionB: formOptions[1].trim(),
        optionC: formOptions[2].trim(),
        optionD: formOptions[3].trim(),
        correctOption: formCorrect,
        orderIndex: editingItem?.orderIndex ?? (items?.length ?? 0),
      };
      if (config.parentKey && parentId) body[config.parentKey] = parentId;
    } else if (current.level === "exams") {
      if (!formName.trim()) return;
      body = {
        title: formName.trim(),
        timeLimit: formTimeLimit ? parseInt(formTimeLimit) : null,
        questionLimit: formQuestionLimit ? parseInt(formQuestionLimit) : null,
      };
      if (config.parentKey && parentId) body[config.parentKey] = parentId;
    } else {
      if (!formName.trim()) return;
      body = { name: formName.trim() };
      if (config.parentKey && parentId) body[config.parentKey] = parentId;
    }

    if (editingItem) {
      updateMut.mutate({ id: editingItem.id, body });
    } else {
      createMut.mutate(body);
    }
  };

  const handleDelete = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const name = item.name || item.title || item.text?.substring(0, 30) || "";
    if (Platform.OS === "web") {
      if (confirm(`حذف "${name}"؟`)) deleteMut.mutate(item.id);
    } else {
      Alert.alert("تأكيد الحذف", `هل تريد حذف "${name}"؟`, [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: () => deleteMut.mutate(item.id) },
      ]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = ({ item }: { item: any }) => {
    const label = item.name || item.title || item.text?.substring(0, 60) || `#${item.id}`;
    const hasNext = !!config.nextLevel;
    const subtitle = current.level === "exams"
      ? `${item.questionCount ?? 0} أسئلة${item.timeLimit ? ` · ${item.timeLimit} دقيقة` : ""}`
      : current.level === "questions"
        ? `الإجابة: ${OPTION_LABELS["ABCD".indexOf(item.correctOption)]}`
        : undefined;

    return (
      <Pressable
        style={({ pressed }) => [styles.itemRow, { backgroundColor: C.card, borderColor: C.border, opacity: pressed ? 0.9 : 1 }]}
        onPress={hasNext ? () => drillDown(item) : undefined}
      >
        <View style={styles.itemActions}>
          <Pressable onPress={() => openEdit(item)} hitSlop={8} style={styles.actionBtn}>
            <Feather name="edit-2" size={16} color={C.secondary} />
          </Pressable>
          <Pressable onPress={() => handleDelete(item)} hitSlop={8} style={styles.actionBtn}>
            <Feather name="trash-2" size={16} color={C.error} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={[styles.itemName, { color: C.text, fontFamily: "Tajawal_500Medium" }]} numberOfLines={2}>{label}</Text>
          {subtitle && <Text style={[styles.itemSub, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>{subtitle}</Text>}
        </View>
        {hasNext && <Feather name="chevron-right" size={18} color={C.textMuted} />}
      </Pressable>
    );
  };

  const isQ = current.level === "questions";
  const isE = current.level === "exams";

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={styles.topRow}>
          {breadcrumbs.length > 1 && (
            <Pressable onPress={goBack} style={styles.backBtn}>
              <Feather name="arrow-right" size={20} color={C.primary} />
            </Pressable>
          )}
          <Text style={[styles.topTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>{config.title}</Text>
          {canCreate && (
            <Pressable onPress={openCreate} style={[styles.addBtn, { backgroundColor: C.primary }]}>
              <Feather name="plus" size={18} color="#fff" />
            </Pressable>
          )}
        </View>

        {breadcrumbs.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbs}>
            {breadcrumbs.map((b, i) => (
              <Pressable key={i} onPress={() => goToLevel(i)} style={styles.crumb}>
                <Text style={[styles.crumbText, { color: i === breadcrumbs.length - 1 ? C.primary : C.textMuted, fontFamily: "Tajawal_400Regular" }]}>
                  {b.name}
                </Text>
                {i < breadcrumbs.length - 1 && <Feather name="chevron-left" size={12} color={C.textMuted} />}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={C.secondary} />
          <Text style={{ color: C.textMuted, fontFamily: "Tajawal_400Regular", marginTop: 12, textAlign: "center" }}>حدث خطأ في تحميل البيانات</Text>
          <Pressable onPress={() => refetch()} style={[styles.emptyBtn, { backgroundColor: C.primary, marginTop: 12 }]}>
            <Text style={[styles.emptyBtnText, { fontFamily: "Tajawal_700Bold" }]}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={40} color={C.textMuted} />
              <Text style={[styles.emptyText, { color: C.textMuted, fontFamily: "Tajawal_400Regular" }]}>
                {canCreate ? "لا توجد عناصر بعد" : "اختر من القائمة للتصفح"}
              </Text>
              {canCreate && (
                <Pressable onPress={openCreate} style={[styles.emptyBtn, { backgroundColor: C.primary }]}>
                  <Text style={[styles.emptyBtnText, { fontFamily: "Tajawal_700Bold" }]}>إضافة جديد</Text>
                  <Feather name="plus" size={16} color="#fff" />
                </Pressable>
              )}
            </View>
          }
        />
      )}

      {/* ── Create/Edit Modal ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: C.card }]} onPress={e => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: C.text, fontFamily: "Tajawal_700Bold" }]}>
              {editingItem ? "تعديل" : "إضافة"} {isQ ? "سؤال" : isE ? "امتحان" : "عنصر"}
            </Text>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {isQ ? (
                <View style={styles.formGap}>
                  <TextInput
                    style={[styles.inputField, { color: C.text, borderColor: C.input, backgroundColor: C.cardSecondary, fontFamily: "Tajawal_400Regular" }]}
                    placeholder="نص السؤال"
                    placeholderTextColor={C.textMuted}
                    value={formQText}
                    onChangeText={setFormQText}
                    textAlign="right"
                    multiline
                  />
                  {formOptions.map((opt, i) => (
                    <View key={i} style={styles.optionRow}>
                      <TextInput
                        style={[styles.inputField, { flex: 1, color: C.text, borderColor: formCorrect === "ABCD"[i] ? C.primary : C.input, backgroundColor: C.cardSecondary, fontFamily: "Tajawal_400Regular", borderWidth: formCorrect === "ABCD"[i] ? 2 : 1.5 }]}
                        placeholder={`الخيار ${OPTION_LABELS[i]}`}
                        placeholderTextColor={C.textMuted}
                        value={opt}
                        onChangeText={v => { const n = [...formOptions]; n[i] = v; setFormOptions(n); }}
                        textAlign="right"
                      />
                      <Pressable
                        onPress={() => setFormCorrect("ABCD"[i] as any)}
                        style={[styles.correctBtn, { backgroundColor: formCorrect === "ABCD"[i] ? C.primary : C.muted, borderColor: formCorrect === "ABCD"[i] ? C.primary : C.border }]}
                      >
                        <Feather name="check" size={14} color={formCorrect === "ABCD"[i] ? "#fff" : C.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : isE ? (
                <View style={styles.formGap}>
                  <TextInput
                    style={[styles.inputField, { color: C.text, borderColor: C.input, backgroundColor: C.cardSecondary, fontFamily: "Tajawal_400Regular" }]}
                    placeholder="اسم الامتحان"
                    placeholderTextColor={C.textMuted}
                    value={formName}
                    onChangeText={setFormName}
                    textAlign="right"
                  />
                  <TextInput
                    style={[styles.inputField, { color: C.text, borderColor: C.input, backgroundColor: C.cardSecondary, fontFamily: "Tajawal_400Regular" }]}
                    placeholder="المدة (بالدقائق) — اختياري"
                    placeholderTextColor={C.textMuted}
                    value={formTimeLimit}
                    onChangeText={setFormTimeLimit}
                    textAlign="right"
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.inputField, { color: C.text, borderColor: C.input, backgroundColor: C.cardSecondary, fontFamily: "Tajawal_400Regular" }]}
                    placeholder="عدد الأسئلة العشوائية — اختياري"
                    placeholderTextColor={C.textMuted}
                    value={formQuestionLimit}
                    onChangeText={setFormQuestionLimit}
                    textAlign="right"
                    keyboardType="number-pad"
                  />
                </View>
              ) : (
                <TextInput
                  style={[styles.inputField, { color: C.text, borderColor: C.input, backgroundColor: C.cardSecondary, fontFamily: "Tajawal_400Regular" }]}
                  placeholder="الاسم"
                  placeholderTextColor={C.textMuted}
                  value={formName}
                  onChangeText={setFormName}
                  textAlign="right"
                />
              )}
            </ScrollView>

            {(createMut.isError || updateMut.isError) && (
              <View style={[styles.errBox, { backgroundColor: C.errorGlow }]}>
                <Text style={[styles.errText, { color: C.error, fontFamily: "Tajawal_400Regular" }]}>
                  {(createMut.error as any)?.message || (updateMut.error as any)?.message || "حدث خطأ"}
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: C.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.saveBtnText, { fontFamily: "Tajawal_700Bold" }]}>
                  {editingItem ? "حفظ التعديل" : "إضافة"}
                </Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 10 },
  topRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  backBtn: { padding: 6 },
  topTitle: { flex: 1, fontSize: 20, textAlign: "right" },
  addBtn: { width: 36, height: 36, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  breadcrumbs: { flexDirection: "row-reverse", gap: 4, paddingTop: 8 },
  crumb: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  crumbText: { fontSize: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  itemRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  itemActions: { flexDirection: "row", gap: 8 },
  actionBtn: { padding: 6 },
  itemName: { fontSize: 14, textAlign: "right" },
  itemSub: { fontSize: 12, textAlign: "right", marginTop: 2 },
  emptyBox: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 15 },
  emptyBtn: { flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontSize: 14 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: "80%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#ccc", alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, textAlign: "right", marginBottom: 16 },
  formGap: { gap: 10 },
  inputField: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 14 },
  optionRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  correctBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  errBox: { padding: 10, borderRadius: 10, marginTop: 10 },
  errText: { fontSize: 13, textAlign: "right" },
  saveBtn: { height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 16 },
  saveBtnText: { color: "#fff", fontSize: 16 },
});
