import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  subscriptionStatus: boolean;
  provider: string;
  createdAt: string;
};

export type Specialization = {
  id: number;
  name: string;
  createdAt: string;
};

export type Subject = {
  id: number;
  name: string;
  specializationId: number;
  createdAt: string;
};

export type Unit = {
  id: number;
  name: string;
  subjectId: number;
  createdAt: string;
};

export type Exam = {
  id: number;
  title: string;
  unitId: number;
  timeLimit: number | null;
  questionLimit: number | null;
  isPublished: boolean;
  questionCount: number;
  createdAt: string;
  isLocked: boolean;
};

export type Question = {
  id: number;
  examId: number;
  text: string;
  imageUrl: string | null;
  optionA: string;
  optionAImage: string | null;
  optionB: string;
  optionBImage: string | null;
  optionC: string;
  optionCImage: string | null;
  optionD: string;
  optionDImage: string | null;
  correctOption: string;
  orderIndex: number;
};

export type ExamDetail = Exam & {
  questions: Question[];
};

export type AnswerDetail = {
  questionId: number;
  selectedOption: string;
  isCorrect: boolean;
  questionText: string;
  questionImage: string | null;
  optionA: string;
  optionAImage: string | null;
  optionB: string;
  optionBImage: string | null;
  optionC: string;
  optionCImage: string | null;
  optionD: string;
  optionDImage: string | null;
  correctOption: string;
};

export type ExamResult = {
  id: number;
  userId: string;
  examId: number;
  examTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  difficulty: string | null;
  notes: string | null;
  bookmarkedQuestions: string | null;
  unitId: number;
  subjectId: number;
  specializationId: number;
  answers: AnswerDetail[];
};

export type ExamResultListItem = {
  id: number;
  examId: number;
  examTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
};

export type SiteSettings = {
  id: number;
  whatsappNumber: string;
  telegramUsername: string | null;
  subscriptionInfo: string;
};

export type ExamTargetUnit = {
  examId: number;
  unitId: number;
};

export type AdminUser = Profile & {
  id: string;
};

export type NoteRow = {
  id: number;
  userId: string;
  examId: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: string;
  difficulty: string | null;
  notes: string | null;
  studentName: string;
  examTitle: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapProfile(row: any): Profile {
  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email ?? null,
    role: row.role ?? "student",
    subscriptionStatus: row.subscription_status ?? false,
    provider: row.provider ?? "email",
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function mapSpec(row: any): Specialization {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

function mapSubject(row: any): Subject {
  return { id: row.id, name: row.name, specializationId: row.specialization_id, createdAt: row.created_at };
}

function mapUnit(row: any): Unit {
  return { id: row.id, name: row.name, subjectId: row.subject_id, createdAt: row.created_at };
}

function mapQuestion(row: any): Question {
  return {
    id: row.id,
    examId: row.exam_id,
    text: row.text ?? "",
    imageUrl: row.image_url ?? null,
    optionA: row.option_a,
    optionAImage: row.option_a_image ?? null,
    optionB: row.option_b,
    optionBImage: row.option_b_image ?? null,
    optionC: row.option_c,
    optionCImage: row.option_c_image ?? null,
    optionD: row.option_d,
    optionDImage: row.option_d_image ?? null,
    correctOption: row.correct_option,
    orderIndex: row.order_index ?? 0,
  };
}

function mapExam(row: any, isLocked: boolean): Exam {
  return {
    id: row.id,
    title: row.title,
    unitId: row.unit_id,
    timeLimit: row.time_limit ?? null,
    questionLimit: row.question_limit ?? null,
    isPublished: row.is_published ?? false,
    questionCount: row.question_count ?? 0,
    createdAt: row.created_at,
    isLocked,
  };
}

// ─── Specializations ─────────────────────────────────────────────────────────

export function useGetSpecializations() {
  return useQuery<Specialization[]>({
    queryKey: ["/api/specializations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specializations")
        .select("*")
        .order("id");
      if (error) throw error;
      return (data ?? []).map(mapSpec);
    },
  });
}

export function useCreateSpecialization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data: body }: { data: { name: string } }) => {
      const { error } = await supabase.from("specializations").insert({ name: body.name });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/specializations"] }),
  });
}

export function useUpdateSpecialization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: body }: { id: number; data: { name: string } }) => {
      const { error } = await supabase.from("specializations").update({ name: body.name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/specializations"] }),
  });
}

export function useDeleteSpecialization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase.from("specializations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/specializations"] }),
  });
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export function useGetSubjects({ specializationId }: { specializationId?: number } = {}) {
  return useQuery<Subject[]>({
    queryKey: ["/api/subjects", specializationId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("subjects").select("*").order("id");
      if (specializationId) q = (q as any).eq("specialization_id", specializationId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return (data ?? []).map(mapSubject);
    },
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data: body }: { data: { name: string; specializationId: number } }) => {
      const { error } = await supabase.from("subjects").insert({ name: body.name, specialization_id: body.specializationId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/subjects"] }),
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: body }: { id: number; data: { name: string; specializationId: number } }) => {
      const { error } = await supabase.from("subjects").update({ name: body.name, specialization_id: body.specializationId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/subjects"] }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/subjects"] }),
  });
}

// ─── Units ────────────────────────────────────────────────────────────────────

export function useGetUnits({ subjectId }: { subjectId?: number } = {}) {
  return useQuery<Unit[]>({
    queryKey: ["/api/units", subjectId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("units").select("*").order("id");
      if (subjectId) q = (q as any).eq("subject_id", subjectId);
      const { data, error } = await (q as any);
      if (error) throw error;
      return (data ?? []).map(mapUnit);
    },
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data: body }: { data: { name: string; subjectId: number } }) => {
      const { error } = await supabase.from("units").insert({ name: body.name, subject_id: body.subjectId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/units"] }),
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: body }: { id: number; data: { name: string; subjectId: number } }) => {
      const { error } = await supabase.from("units").update({ name: body.name, subject_id: body.subjectId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/units"] }),
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase.from("units").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/units"] }),
  });
}

// ─── Exams ────────────────────────────────────────────────────────────────────

export function useGetExams({ unitId, subscriptionStatus, userAccessIds }: {
  unitId?: number;
  subscriptionStatus?: boolean;
  userAccessIds?: number[];
} = {}) {
  return useQuery<Exam[]>({
    queryKey: ["/api/exams", unitId],
    queryFn: async () => {
      let q = supabase
        .from("exams")
        .select("*, questions(count)")
        .order("id");
      if (unitId) q = q.eq("unit_id", unitId);

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((row: any) => {
        const isLocked = !subscriptionStatus && !(userAccessIds ?? []).includes(row.id);
        const qCount = (row.questions as any)?.[0]?.count ?? 0;
        return {
          id: row.id,
          title: row.title,
          unitId: row.unit_id,
          timeLimit: row.time_limit ?? null,
          questionLimit: row.question_limit ?? null,
          isPublished: row.is_published ?? false,
          questionCount: Number(qCount),
          createdAt: row.created_at,
          isLocked,
        };
      });
    },
  });
}

export function useGetAllExamsAdmin() {
  return useQuery<Exam[]>({
    queryKey: ["/api/exams/admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*, questions(count)")
        .order("id");
      if (error) throw error;
      return (data ?? []).map((row: any) => {
        const qCount = (row.questions as any)?.[0]?.count ?? 0;
        return mapExam({ ...row, question_count: Number(qCount) }, false);
      });
    },
  });
}

export function useGetExam(id: number) {
  return useQuery<ExamDetail>({
    queryKey: ["/api/exams", id, "detail"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*, questions(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      const questions = ((data as any).questions ?? []).map(mapQuestion).sort((a: Question, b: Question) => a.orderIndex - b.orderIndex);
      return {
        ...mapExam({ ...(data as any), question_count: questions.length }, false),
        questions,
      };
    },
    enabled: !!id,
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data: body }: { data: { title: string; unitId: number; timeLimit?: number; questionLimit?: number; isPublished?: boolean } }) => {
      const { data, error } = await supabase.from("exams").insert({
        title: body.title,
        unit_id: body.unitId,
        time_limit: body.timeLimit ?? null,
        question_limit: body.questionLimit ?? null,
        is_published: body.isPublished ?? false,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/exams"] });
      qc.invalidateQueries({ queryKey: ["/api/exams/admin"] });
    },
  });
}

export function useUpdateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: body }: { id: number; data: Partial<{ title: string; unitId: number; timeLimit: number | null; questionLimit: number | null; isPublished: boolean }> }) => {
      const patch: any = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.unitId !== undefined) patch.unit_id = body.unitId;
      if (body.timeLimit !== undefined) patch.time_limit = body.timeLimit;
      if (body.questionLimit !== undefined) patch.question_limit = body.questionLimit;
      if (body.isPublished !== undefined) patch.is_published = body.isPublished;
      const { error } = await supabase.from("exams").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/exams"] });
      qc.invalidateQueries({ queryKey: ["/api/exams/admin"] });
    },
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/exams"] });
      qc.invalidateQueries({ queryKey: ["/api/exams/admin"] });
    },
  });
}

// ─── Questions ────────────────────────────────────────────────────────────────

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data: body }: { data: Partial<Question> & { examId: number } }) => {
      const { data, error } = await supabase.from("questions").insert({
        exam_id: body.examId,
        text: body.text ?? " ",
        image_url: body.imageUrl ?? null,
        option_a: body.optionA ?? "",
        option_a_image: body.optionAImage ?? null,
        option_b: body.optionB ?? "",
        option_b_image: body.optionBImage ?? null,
        option_c: body.optionC ?? "",
        option_c_image: body.optionCImage ?? null,
        option_d: body.optionD ?? "",
        option_d_image: body.optionDImage ?? null,
        correct_option: body.correctOption ?? "a",
        order_index: body.orderIndex ?? 0,
      }).select().single();
      if (error) throw error;
      return mapQuestion(data);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/exams", vars.data.examId, "detail"] });
    },
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, examId, data: body }: { id: number; examId: number; data: Partial<Question> }) => {
      const patch: any = {};
      if (body.text !== undefined) patch.text = body.text;
      if (body.imageUrl !== undefined) patch.image_url = body.imageUrl;
      if (body.optionA !== undefined) patch.option_a = body.optionA;
      if (body.optionAImage !== undefined) patch.option_a_image = body.optionAImage;
      if (body.optionB !== undefined) patch.option_b = body.optionB;
      if (body.optionBImage !== undefined) patch.option_b_image = body.optionBImage;
      if (body.optionC !== undefined) patch.option_c = body.optionC;
      if (body.optionCImage !== undefined) patch.option_c_image = body.optionCImage;
      if (body.optionD !== undefined) patch.option_d = body.optionD;
      if (body.optionDImage !== undefined) patch.option_d_image = body.optionDImage;
      if (body.correctOption !== undefined) patch.correct_option = body.correctOption;
      if (body.orderIndex !== undefined) patch.order_index = body.orderIndex;
      const { error } = await supabase.from("questions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/exams", vars.examId, "detail"] });
    },
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, examId }: { id: number; examId: number }) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/exams", vars.examId, "detail"] });
    },
  });
}

export function useReorderQuestions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ examId, questionIds }: { examId: number; questionIds: number[] }) => {
      const updates = questionIds.map((qid, i) =>
        supabase.from("questions").update({ order_index: i }).eq("id", qid)
      );
      await Promise.all(updates);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/exams", vars.examId, "detail"] });
    },
  });
}

// ─── Exam Results ─────────────────────────────────────────────────────────────

export function useGetMyResults(userId?: string) {
  return useQuery<ExamResultListItem[]>({
    queryKey: ["/api/results/my"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select("*, exams(title)")
        .eq("user_id", userId!)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        examId: row.exam_id,
        examTitle: row.exams?.title ?? "",
        score: row.score,
        totalQuestions: row.total_questions,
        percentage: row.percentage,
        completedAt: row.completed_at,
      }));
    },
    enabled: !!userId,
  });
}

export function useGetResult(id: number) {
  return useQuery<ExamResult>({
    queryKey: ["/api/results", id],
    queryFn: async () => {
      const { data: resultRow, error: rErr } = await supabase
        .from("exam_results")
        .select("*, exams(title, unit_id, units(subject_id, subjects(specialization_id)))")
        .eq("id", id)
        .single();
      if (rErr) throw rErr;

      const { data: answerRows, error: aErr } = await supabase
        .from("answer_details")
        .select("*, questions(text, image_url, option_a, option_a_image, option_b, option_b_image, option_c, option_c_image, option_d, option_d_image, correct_option)")
        .eq("result_id", id);
      if (aErr) throw aErr;

      const row = resultRow as any;
      const answers: AnswerDetail[] = (answerRows ?? []).map((a: any) => ({
        questionId: a.question_id,
        selectedOption: a.selected_option,
        isCorrect: a.is_correct,
        questionText: a.questions?.text ?? "",
        questionImage: a.questions?.image_url ?? null,
        optionA: a.questions?.option_a ?? "",
        optionAImage: a.questions?.option_a_image ?? null,
        optionB: a.questions?.option_b ?? "",
        optionBImage: a.questions?.option_b_image ?? null,
        optionC: a.questions?.option_c ?? "",
        optionCImage: a.questions?.option_c_image ?? null,
        optionD: a.questions?.option_d ?? "",
        optionDImage: a.questions?.option_d_image ?? null,
        correctOption: a.questions?.correct_option ?? "",
      }));

      const unitId = row.exams?.unit_id ?? 0;
      const subjectId = row.exams?.units?.subject_id ?? 0;
      const specializationId = row.exams?.units?.subjects?.specialization_id ?? 0;

      return {
        id: row.id,
        userId: row.user_id,
        examId: row.exam_id,
        examTitle: row.exams?.title ?? "",
        score: row.score,
        totalQuestions: row.total_questions,
        percentage: row.percentage,
        completedAt: row.completed_at,
        difficulty: row.difficulty ?? null,
        notes: row.notes ?? null,
        bookmarkedQuestions: row.bookmarked_questions ?? null,
        unitId,
        subjectId,
        specializationId,
        answers,
      };
    },
    enabled: !!id,
  });
}

export function useSubmitResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      userId: string;
      examId: number;
      score: number;
      totalQuestions: number;
      percentage: number;
      difficulty?: string | null;
      notes?: string | null;
      bookmarkedQuestions?: string | null;
      answers: { questionId: number; selectedOption: string; isCorrect: boolean }[];
    }) => {
      const { data: resultRow, error: rErr } = await supabase
        .from("exam_results")
        .insert({
          user_id: body.userId,
          exam_id: body.examId,
          score: body.score,
          total_questions: body.totalQuestions,
          percentage: body.percentage,
          difficulty: body.difficulty ?? null,
          notes: body.notes ?? null,
          bookmarked_questions: body.bookmarkedQuestions ?? null,
        })
        .select()
        .single();
      if (rErr) throw rErr;

      const resultId = (resultRow as any).id;

      if (body.answers.length > 0) {
        const { error: aErr } = await supabase.from("answer_details").insert(
          body.answers.map((a) => ({
            result_id: resultId,
            question_id: a.questionId,
            selected_option: a.selectedOption,
            is_correct: a.isCorrect,
          }))
        );
        if (aErr) throw aErr;
      }

      return { resultId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/results/my"] });
    },
  });
}

// ─── User Exam Access ─────────────────────────────────────────────────────────

export function useGetUserExamAccess(userId?: string) {
  return useQuery<number[]>({
    queryKey: ["/api/user-exam-access", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_exam_access")
        .select("exam_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).filter((r: any) => r.is_unlocked !== false).map((r: any) => r.exam_id);
    },
    enabled: !!userId,
  });
}

// ─── Site Settings ────────────────────────────────────────────────────────────

export function useGetSettings() {
  return useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").limit(1).single();
      if (error) throw error;
      const row = data as any;
      return {
        id: row.id,
        whatsappNumber: row.whatsapp_number ?? "",
        telegramUsername: row.telegram_username ?? null,
        subscriptionInfo: row.subscription_info ?? "",
      };
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data: body }: { data: Partial<{ whatsappNumber: string; telegramUsername: string | null; subscriptionInfo: string }> }) => {
      const { data: existing } = await supabase.from("site_settings").select("id").limit(1).single();
      if (existing) {
        const { error } = await supabase.from("site_settings").update({
          whatsapp_number: body.whatsappNumber,
          telegram_username: body.telegramUsername,
          subscription_info: body.subscriptionInfo,
        }).eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_settings").insert({
          whatsapp_number: body.whatsappNumber,
          telegram_username: body.telegramUsername,
          subscription_info: body.subscriptionInfo,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/settings"] }),
  });
}

// ─── Admin: Users ─────────────────────────────────────────────────────────────

export function useGetUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapProfile);
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: body }: { id: string; data: Partial<{ name: string; role: string; subscriptionStatus: boolean }> }) => {
      const patch: any = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.role !== undefined) patch.role = body.role;
      if (body.subscriptionStatus !== undefined) patch.subscription_status = body.subscriptionStatus;
      const { error } = await supabase.from("profiles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/users"] }),
  });
}

export function useGetUserExamAccessAdmin(userId?: string) {
  return useQuery<{ examId: number; isUnlocked: boolean }[]>({
    queryKey: ["/api/user-exam-access/admin", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_exam_access")
        .select("exam_id, is_unlocked")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ examId: r.exam_id, isUnlocked: r.is_unlocked }));
    },
    enabled: !!userId,
  });
}

export function useSetUserExamAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, examIds }: { userId: string; examIds: number[] }) => {
      await supabase.from("user_exam_access").delete().eq("user_id", userId);
      if (examIds.length > 0) {
        const { error } = await supabase.from("user_exam_access").insert(
          examIds.map((eid) => ({ user_id: userId, exam_id: eid, is_unlocked: true }))
        );
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/user-exam-access/admin", vars.userId] });
      qc.invalidateQueries({ queryKey: ["/api/user-exam-access", vars.userId] });
    },
  });
}

export function useUnlockAllExamsForUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data: exams, error: eErr } = await supabase.from("exams").select("id");
      if (eErr) throw eErr;
      await supabase.from("user_exam_access").delete().eq("user_id", userId);
      if ((exams ?? []).length > 0) {
        const { error } = await supabase.from("user_exam_access").insert(
          (exams ?? []).map((e: any) => ({ user_id: userId, exam_id: e.id, is_unlocked: true }))
        );
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/user-exam-access/admin", vars.userId] });
    },
  });
}

export function useUpdateUserSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, subscriptionStatus }: { userId: string; subscriptionStatus: boolean }) => {
      const { error } = await supabase.from("profiles").update({ subscription_status: subscriptionStatus }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/users"] }),
  });
}

// ─── Admin: Notes ─────────────────────────────────────────────────────────────

export function useGetAdminNotes() {
  return useQuery<NoteRow[]>({
    queryKey: ["/api/results/admin/notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select("*, profiles(name), exams(title)")
        .not("notes", "is", null)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        examId: row.exam_id,
        score: row.score,
        totalQuestions: row.total_questions,
        percentage: row.percentage,
        completedAt: row.completed_at,
        difficulty: row.difficulty ?? null,
        notes: row.notes ?? null,
        studentName: row.profiles?.name ?? "مجهول",
        examTitle: row.exams?.title ?? "",
      }));
    },
  });
}

// ─── Admin: Exam Target Units ─────────────────────────────────────────────────

export function useGetExamTargetUnits(examId?: number) {
  return useQuery<{ unitId: number }[]>({
    queryKey: ["/api/exam-target-units", examId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_target_units")
        .select("unit_id")
        .eq("exam_id", examId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ unitId: r.unit_id }));
    },
    enabled: !!examId,
  });
}

export function useLinkExamToSpecs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      examId,
      specIds,
      examUnitId,
    }: {
      examId: number;
      specIds: number[];
      examUnitId: number;
    }) => {
      const { data: sourceUnit } = await supabase.from("units").select("name, subjects(name, specialization_id)").eq("id", examUnitId).single();
      const sourceUnitName = (sourceUnit as any)?.name ?? "";
      const sourceSubjectName = (sourceUnit as any)?.subjects?.name ?? "";

      const unitIds: number[] = [examUnitId];

      for (const specId of specIds) {
        const { data: targetSubjects } = await supabase
          .from("subjects")
          .select("id, name")
          .eq("specialization_id", specId);

        const matchingSubject = (targetSubjects ?? []).find((s: any) => s.name === sourceSubjectName);
        if (!matchingSubject) continue;

        const { data: targetUnits } = await supabase
          .from("units")
          .select("id, name")
          .eq("subject_id", matchingSubject.id);

        const matchingUnit = (targetUnits ?? []).find((u: any) => u.name === sourceUnitName);
        if (matchingUnit && !unitIds.includes(matchingUnit.id)) {
          unitIds.push(matchingUnit.id);
        }
      }

      await supabase.from("exam_target_units").delete().eq("exam_id", examId);
      if (unitIds.length > 0) {
        const { error } = await supabase.from("exam_target_units").insert(
          unitIds.map((uid) => ({ exam_id: examId, unit_id: uid }))
        );
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/exam-target-units", vars.examId] });
      qc.invalidateQueries({ queryKey: ["/api/exams"] });
    },
  });
}

// ─── Direct async helpers (for use in queryFn without hooks) ─────────────────

export async function fetchExamDetail(id: number): Promise<ExamDetail> {
  const { data, error } = await supabase
    .from("exams")
    .select("*, questions(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  const questions = ((data as any).questions ?? []).map(mapQuestion).sort(
    (a: Question, b: Question) => a.orderIndex - b.orderIndex
  );
  return {
    ...mapExam({ ...(data as any), question_count: questions.length }, false),
    questions,
  };
}

export async function updateResultFeedback(
  resultId: number,
  body: { difficulty?: string; notes?: string }
): Promise<void> {
  const patch: any = {};
  if (body.difficulty !== undefined) patch.difficulty = body.difficulty;
  if (body.notes !== undefined) patch.notes = body.notes;
  const { error } = await supabase.from("exam_results").update(patch).eq("id", resultId);
  if (error) throw error;
}

export async function linkExamToSpecsDirect({
  examId,
  specIds,
  examUnitId,
  allUnits,
  allSubjects,
}: {
  examId: number;
  specIds: number[];
  examUnitId: number;
  allUnits: Unit[];
  allSubjects: Subject[];
}): Promise<{ specId: number; unitId: number | null }[]> {
  const sourceUnit = allUnits.find((u) => u.id === examUnitId);
  const sourceSubject = allSubjects.find((s) => s.id === sourceUnit?.subjectId);
  const sourceUnitName = sourceUnit?.name ?? "";
  const sourceSubjectName = sourceSubject?.name ?? "";

  const unitIds: number[] = [examUnitId];
  const results: { specId: number; unitId: number | null }[] = [];

  for (const specId of specIds) {
    const matchingSubject = allSubjects.find(
      (s) => s.specializationId === specId && s.name === sourceSubjectName
    );
    if (!matchingSubject) { results.push({ specId, unitId: null }); continue; }
    const matchingUnit = allUnits.find(
      (u) => u.subjectId === matchingSubject.id && u.name === sourceUnitName
    );
    if (!matchingUnit) { results.push({ specId, unitId: null }); continue; }
    if (!unitIds.includes(matchingUnit.id)) unitIds.push(matchingUnit.id);
    results.push({ specId, unitId: matchingUnit.id });
  }

  await supabase.from("exam_target_units").delete().eq("exam_id", examId);
  if (unitIds.length > 0) {
    const { error } = await supabase.from("exam_target_units").insert(
      unitIds.map((uid) => ({ exam_id: examId, unit_id: uid }))
    );
    if (error) throw error;
  }
  return results;
}

export async function appendExamToSpecs({
  examId,
  specIds,
  examUnitId,
  allUnits,
  allSubjects,
}: {
  examId: number;
  specIds: number[];
  examUnitId: number;
  allUnits: Unit[];
  allSubjects: Subject[];
}): Promise<{ specId: number; unitId: number | null }[]> {
  const sourceUnit = allUnits.find((u) => u.id === examUnitId);
  const sourceSubject = allSubjects.find((s) => s.id === sourceUnit?.subjectId);
  const sourceUnitName = sourceUnit?.name ?? "";
  const sourceSubjectName = sourceSubject?.name ?? "";

  const { data: existing } = await supabase
    .from("exam_target_units")
    .select("unit_id")
    .eq("exam_id", examId);
  const existingUnitIds = new Set((existing ?? []).map((r: any) => r.unit_id));

  const toInsert: { exam_id: number; unit_id: number }[] = [];
  const results: { specId: number; unitId: number | null }[] = [];

  for (const specId of specIds) {
    const matchingSubject = allSubjects.find(
      (s) => s.specializationId === specId && s.name === sourceSubjectName
    );
    if (!matchingSubject) { results.push({ specId, unitId: null }); continue; }
    const matchingUnit = allUnits.find(
      (u) => u.subjectId === matchingSubject.id && u.name === sourceUnitName
    );
    if (!matchingUnit) { results.push({ specId, unitId: null }); continue; }
    if (!existingUnitIds.has(matchingUnit.id)) {
      toInsert.push({ exam_id: examId, unit_id: matchingUnit.id });
    }
    results.push({ specId, unitId: matchingUnit.id });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("exam_target_units").insert(toInsert);
    if (error) throw error;
  }
  return results;
}

// ─── Admin: All Exam Target Units ─────────────────────────────────────────────

export function useGetAllExamTargetUnits() {
  return useQuery<Record<number, number[]>>({
    queryKey: ["exam-target-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_target_units")
        .select("exam_id, unit_id");
      if (error) throw error;
      const result: Record<number, number[]> = {};
      for (const row of data ?? []) {
        const r = row as any;
        if (!result[r.exam_id]) result[r.exam_id] = [];
        result[r.exam_id].push(r.unit_id);
      }
      return result;
    },
  });
}

export async function toggleExamPublish(examId: number, isPublished: boolean) {
  const { error } = await supabase
    .from("exams")
    .update({ is_published: isPublished })
    .eq("id", examId);
  if (error) throw error;
}
