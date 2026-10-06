import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { ActiveToggle } from "@/features/school/components/active-toggle";
import { SchoolEmptyState, SchoolLoadError, formatDatePtBr } from "@/features/school/components/school-empty-state";
import { ClassEditForm, GroupEditForm, GroupForm, StudentEditForm, StudentForm } from "@/features/school/components/entity-forms";
import { StudentGroupsControl } from "@/features/school/components/student-groups-control";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

type ClassPageProps = { params: Promise<{ classId: string }> };

export default async function ClassDetailPage({ params }: ClassPageProps) {
  await requireProfile("teacher");
  const { classId } = await params;
  const supabase = await createClient();
  const [classResult, groupsResult, enrollmentsResult] = await Promise.all([
    supabase.from("classes").select("id, name, active, school_year_id, school_years!inner(year)").eq("id", classId).maybeSingle(),
    supabase.from("groups").select("id, name, active").eq("class_id", classId).order("name").limit(100),
    supabase.from("student_enrollments")
      .select("id, students!inner(id, name, birth_date, active), student_groups(group_id, groups(id, name))")
      .eq("class_id", classId)
      .eq("active", true)
      .order("enrolled_at", { ascending: true })
      .limit(100),
  ]);

  if (!classResult.data && !classResult.error) notFound();
  const schoolClass = classResult.data;
  const schoolYear = schoolClass?.school_years as unknown as { year: number } | null;
  const activeGroups = (groupsResult.data ?? []).filter((group) => group.active);

  return (
    <div className="space-y-9">
      <header className="border-b border-[#dce4de] pb-5">
        <Link href="/teacher/classes" className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm text-[#126b63] hover:bg-[#e9f2ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]">
          <ArrowLeft aria-hidden="true" className="size-4" /> Turmas
        </Link>
        {classResult.error ? <SchoolLoadError /> : (
          <>
            <p className="text-sm text-[#52706a]">Ano letivo {schoolYear?.year}</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">{schoolClass?.name}</h1>
                {!schoolClass?.active && <p className="mt-1 text-sm text-[#71817c]">Turma inativa</p>}
              </div>
              {schoolClass && <ActiveToggle kind="class" id={schoolClass.id} active={schoolClass.active} label={`turma ${schoolClass.name}`} />}
            </div>
            {schoolClass && (
              <details className="mt-3">
                <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-md px-3 text-sm text-[#52645e] hover:bg-[#f0f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63] marker:content-none">
                  Editar turma <ChevronDown aria-hidden="true" className="size-4" />
                </summary>
                <div className="pt-3">
                  <ClassEditForm id={schoolClass.id} name={schoolClass.name} active={schoolClass.active} />
                </div>
              </details>
            )}
          </>
        )}
      </header>

      <section className="space-y-4">
        <div className="flex items-end justify-between border-b border-[#dce4de] pb-3">
          <div>
            <h2 className="text-lg font-semibold">Grupos</h2>
            <p className="mt-1 text-sm text-[#667873]">Os grupos pertencem a esta turma.</p>
          </div>
        </div>
        {!schoolClass?.active ? <SchoolEmptyState message="Reative a turma para gerenciar grupos." /> : (
          <details>
            <summary className="min-h-10 w-fit cursor-pointer rounded-md border border-[#cbd4cf] bg-white px-3 py-2 text-sm font-medium text-[#315b51] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63] marker:content-none">
              Criar grupo
            </summary>
            <div className="pt-4">
              <GroupForm classId={classId} />
            </div>
          </details>
        )}
        {groupsResult.error ? <SchoolLoadError /> : !groupsResult.data?.length ? (
          <SchoolEmptyState message="Nenhum grupo cadastrado nesta turma." />
        ) : (
          <div className="divide-y divide-[#dce4de] border-y border-[#dce4de] bg-white">
            {groupsResult.data.map((group) => (
              <article key={group.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h3 className="text-sm font-medium">{group.name}</h3>
                  {!group.active && <p className="mt-1 text-xs text-[#71817c]">Inativo</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <details>
                    <summary className="inline-flex min-h-9 cursor-pointer items-center rounded-md px-3 text-sm text-[#52645e] hover:bg-[#f0f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63] marker:content-none">
                      Editar
                    </summary>
                    <div className="absolute right-4 z-10 mt-2 w-[min(92vw,32rem)] border border-[#dce4de] bg-white p-4 shadow-md sm:right-8">
                      <GroupEditForm id={group.id} name={group.name} active={group.active} />
                    </div>
                  </details>
                  <ActiveToggle kind="group" id={group.id} active={group.active} label={`grupo ${group.name}`} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="border-b border-[#dce4de] pb-3">
          <h2 className="text-lg font-semibold">Alunos</h2>
          <p className="mt-1 text-sm text-[#667873]">Matrículas ativas nesta turma, com até 100 registros por consulta.</p>
        </div>
        {!schoolClass?.active ? <SchoolEmptyState message="Reative a turma para cadastrar alunos." /> : (
          <details>
            <summary className="min-h-10 w-fit cursor-pointer rounded-md bg-[#126b63] px-4 py-2.5 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63] marker:content-none">
              Cadastrar aluno
            </summary>
            <div className="border-b border-[#dce4de] py-5">
              <StudentForm classId={classId} groups={activeGroups.map(({ id, name }) => ({ id, name }))} />
            </div>
          </details>
        )}
        {enrollmentsResult.error ? <SchoolLoadError /> : !enrollmentsResult.data?.length ? (
          <SchoolEmptyState message="Nenhum aluno matriculado nesta turma." />
        ) : (
          <div className="divide-y divide-[#dce4de] border-y border-[#dce4de] bg-white">
            {enrollmentsResult.data.map((enrollment) => {
              const student = enrollment.students as unknown as { id: string; name: string; birth_date: string; active: boolean };
              const studentGroups = (enrollment.student_groups ?? []).map((membership) => {
                const group = membership.groups as unknown as { id: string; name: string } | null;
                return group ? { id: group.id, name: group.name } : null;
              }).filter((group): group is { id: string; name: string } => group !== null);

              return (
                <article key={enrollment.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-medium">{student.name}</h3>
                      <p className="mt-1 text-sm text-[#667873]">
                        Nascimento: {formatDatePtBr(student.birth_date)}
                        {!student.active && " · Inativo"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <details>
                        <summary className="inline-flex min-h-9 cursor-pointer items-center rounded-md px-3 text-sm text-[#52645e] hover:bg-[#f0f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63] marker:content-none">
                          Editar
                        </summary>
                        <div className="absolute right-4 z-10 mt-2 w-[min(92vw,42rem)] border border-[#dce4de] bg-white p-4 shadow-md sm:right-8">
                          <StudentEditForm id={student.id} name={student.name} birthDate={student.birth_date.slice(0, 10)} active={student.active} />
                        </div>
                      </details>
                      <ActiveToggle kind="student" id={student.id} active={student.active} label={`aluno ${student.name}`} />
                    </div>
                  </div>
                  <StudentGroupsControl enrollmentId={enrollment.id} groups={activeGroups} memberships={studentGroups} />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}