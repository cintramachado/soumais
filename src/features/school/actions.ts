"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import {
  activeStateSchema,
  classSchema,
  classUpdateSchema,
  groupSchema,
  groupUpdateSchema,
  periodSchema,
  periodUpdateSchema,
  schoolYearSchema,
  schoolYearUpdateSchema,
  studentGroupSchema,
  studentGroupRemoveSchema,
  studentSchema,
  studentUpdateSchema,
} from "@/features/school/schemas";

export type MutationResult = { error?: string; success?: string; id?: string };

function reportFailure(action: string, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.error(`Soul+ ${action} failed`, error);
  }
}

export async function createSchoolYear(input: unknown): Promise<MutationResult> {
  const parsed = schoolYearSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira o ano e as datas informadas." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_school_year", {
    p_year: parsed.data.year,
    p_start_date: parsed.data.startDate,
    p_end_date: parsed.data.endDate,
  });
  if (error) {
    reportFailure("create school year", error);
    return { error: "Não foi possível cadastrar o ano letivo. Verifique se ele já existe." };
  }

  revalidatePath("/teacher/school-years");
  revalidatePath("/teacher/periods");
  return { success: "Ano letivo cadastrado.", id: data as string };
}

export async function updateSchoolYear(input: unknown): Promise<MutationResult> {
  const parsed = schoolYearUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira os dados do ano letivo." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { id, ...values } = parsed.data;
  const { error } = await supabase.from("school_years").update({
    year: values.year,
    start_date: values.startDate,
    end_date: values.endDate,
    active: values.active,
  }).eq("id", id);
  if (error) {
    reportFailure("update school year", error);
    return { error: "Não foi possível atualizar o ano letivo." };
  }
  revalidatePath("/teacher/school-years");
  revalidatePath("/teacher/periods");
  return { success: "Ano letivo atualizado." };
}

export async function createPeriod(input: unknown): Promise<MutationResult> {
  const parsed = periodSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira os dados do período." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { data, error } = await supabase.from("periods").insert({
    school_year_id: parsed.data.schoolYearId,
    name: parsed.data.name,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
  }).select("id").single();
  if (error) {
    reportFailure("create period", error);
    return { error: "Não foi possível cadastrar o período." };
  }
  revalidatePath("/teacher/periods");
  return { success: "Período cadastrado.", id: data.id };
}

export async function updatePeriod(input: unknown): Promise<MutationResult> {
  const parsed = periodUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira os dados do período." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { id, ...values } = parsed.data;
  const { error } = await supabase.from("periods").update({
    school_year_id: values.schoolYearId,
    name: values.name,
    start_date: values.startDate,
    end_date: values.endDate,
    active: values.active,
  }).eq("id", id);
  if (error) {
    reportFailure("update period", error);
    return { error: "Não foi possível atualizar o período." };
  }
  revalidatePath("/teacher/periods");
  return { success: "Período atualizado." };
}

export async function createClass(input: unknown): Promise<MutationResult> {
  const parsed = classSchema.safeParse(input);
  if (!parsed.success) return { error: "Selecione o ano e informe o nome da turma." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_class", {
    p_school_year_id: parsed.data.schoolYearId,
    p_name: parsed.data.name,
  });
  if (error) {
    reportFailure("create class", error);
    return { error: "Não foi possível cadastrar a turma." };
  }
  revalidatePath("/teacher/classes");
  return { success: "Turma cadastrada.", id: data as string };
}

export async function updateClass(input: unknown): Promise<MutationResult> {
  const parsed = classUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira os dados da turma." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { error } = await supabase.from("classes").update({
    name: parsed.data.name,
    active: parsed.data.active,
  }).eq("id", parsed.data.id);
  if (error) {
    reportFailure("update class", error);
    return { error: "Não foi possível atualizar a turma." };
  }
  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/classes/${parsed.data.id}`);
  return { success: "Turma atualizada." };
}

export async function createGroup(input: unknown): Promise<MutationResult> {
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) return { error: "Informe o nome do grupo." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { data, error } = await supabase.from("groups").insert({
    class_id: parsed.data.classId,
    name: parsed.data.name,
  }).select("id").single();
  if (error) {
    reportFailure("create group", error);
    return { error: "Não foi possível cadastrar o grupo." };
  }
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  return { success: "Grupo cadastrado.", id: data.id };
}

export async function updateGroup(input: unknown): Promise<MutationResult> {
  const parsed = groupUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira os dados do grupo." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { error } = await supabase.from("groups").update({
    name: parsed.data.name,
    active: parsed.data.active,
  }).eq("id", parsed.data.id);
  if (error) {
    reportFailure("update group", error);
    return { error: "Não foi possível atualizar o grupo." };
  }
  revalidatePath("/teacher/classes");
  return { success: "Grupo atualizado." };
}

export async function createStudent(input: unknown): Promise<MutationResult> {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira os dados do aluno e a turma." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_student_with_enrollment", {
    p_name: parsed.data.name,
    p_birth_date: parsed.data.birthDate,
    p_class_id: parsed.data.classId,
    p_group_id: parsed.data.groupId || null,
  });
  if (error) {
    reportFailure("create student", error);
    return { error: "Não foi possível cadastrar o aluno." };
  }
  revalidatePath(`/teacher/classes/${parsed.data.classId}`);
  revalidatePath("/teacher/classes");
  return { success: "Aluno cadastrado.", id: data as string };
}

export async function updateStudent(input: unknown): Promise<MutationResult> {
  const parsed = studentUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Confira os dados do aluno." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { id, ...values } = parsed.data;
  const { error } = await supabase.from("students").update({
    name: values.name,
    birth_date: values.birthDate,
    active: values.active,
  }).eq("id", id);
  if (error) {
    reportFailure("update student", error);
    return { error: "Não foi possível atualizar o aluno." };
  }
  revalidatePath("/teacher/classes");
  revalidatePath("/teacher/students");
  return { success: "Aluno atualizado." };
}

export async function addStudentToGroup(input: unknown): Promise<MutationResult> {
  const parsed = studentGroupSchema.safeParse(input);
  if (!parsed.success) return { error: "Não foi possível vincular o aluno ao grupo." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { error } = await supabase.from("student_groups").insert({
    enrollment_id: parsed.data.enrollmentId,
    group_id: parsed.data.groupId,
  });
  if (error) {
    reportFailure("add student group", error);
    return { error: "Não foi possível vincular o aluno ao grupo." };
  }
  revalidatePath("/teacher/classes");
  return { success: "Aluno vinculado ao grupo." };
}

export async function removeStudentFromGroup(input: unknown): Promise<MutationResult> {
  const parsed = studentGroupRemoveSchema.safeParse(input);
  if (!parsed.success) return { error: "Não foi possível remover o vínculo." };
  await requireProfile("teacher");

  const supabase = await createClient();
  const { error } = await supabase.from("student_groups")
    .delete()
    .eq("enrollment_id", parsed.data.enrollmentId)
    .eq("group_id", parsed.data.groupId);
  if (error) {
    reportFailure("remove student group", error);
    return { error: "Não foi possível remover o vínculo." };
  }
  revalidatePath("/teacher/classes");
  return { success: "Vínculo removido." };
}

export async function setSchoolYearActive(input: unknown): Promise<MutationResult> {
  const parsed = activeStateSchema.safeParse(input);
  if (!parsed.success) return { error: "Não foi possível atualizar o ano letivo." };
  await requireProfile("teacher");
  const supabase = await createClient();
  const { error } = await supabase.from("school_years").update({ active: parsed.data.active }).eq("id", parsed.data.id);
  if (error) {
    reportFailure("set school year active", error);
    return { error: "Não foi possível atualizar o ano letivo." };
  }
  revalidatePath("/teacher/school-years");
  revalidatePath("/teacher/periods");
  return { success: "Ano letivo atualizado." };
}

export async function setPeriodActive(input: unknown): Promise<MutationResult> {
  const parsed = activeStateSchema.safeParse(input);
  if (!parsed.success) return { error: "Não foi possível atualizar o período." };
  await requireProfile("teacher");
  const supabase = await createClient();
  const { error } = await supabase.from("periods").update({ active: parsed.data.active }).eq("id", parsed.data.id);
  if (error) {
    reportFailure("set period active", error);
    return { error: "Não foi possível atualizar o período." };
  }
  revalidatePath("/teacher/periods");
  return { success: "Período atualizado." };
}

export async function setClassActive(input: unknown): Promise<MutationResult> {
  const parsed = activeStateSchema.safeParse(input);
  if (!parsed.success) return { error: "Não foi possível atualizar a turma." };
  await requireProfile("teacher");
  const supabase = await createClient();
  const { error } = await supabase.from("classes").update({ active: parsed.data.active }).eq("id", parsed.data.id);
  if (error) {
    reportFailure("set class active", error);
    return { error: "Não foi possível atualizar a turma." };
  }
  revalidatePath("/teacher/classes");
  revalidatePath(`/teacher/classes/${parsed.data.id}`);
  return { success: "Turma atualizada." };
}

export async function setGroupActive(input: unknown): Promise<MutationResult> {
  const parsed = activeStateSchema.safeParse(input);
  if (!parsed.success) return { error: "Não foi possível atualizar o grupo." };
  await requireProfile("teacher");
  const supabase = await createClient();
  const { error } = await supabase.from("groups").update({ active: parsed.data.active }).eq("id", parsed.data.id);
  if (error) {
    reportFailure("set group active", error);
    return { error: "Não foi possível atualizar o grupo." };
  }
  revalidatePath("/teacher/classes");
  return { success: "Grupo atualizado." };
}

export async function setStudentActive(input: unknown): Promise<MutationResult> {
  const parsed = activeStateSchema.safeParse(input);
  if (!parsed.success) return { error: "Não foi possível atualizar o aluno." };
  await requireProfile("teacher");
  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ active: parsed.data.active }).eq("id", parsed.data.id);
  if (error) {
    reportFailure("set student active", error);
    return { error: "Não foi possível atualizar o aluno." };
  }
  revalidatePath("/teacher/classes");
  revalidatePath("/teacher/students");
  return { success: "Aluno atualizado." };
}