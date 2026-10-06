import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { ActiveToggle } from "@/features/school/components/active-toggle";
import { SchoolEmptyState, SchoolLoadError } from "@/features/school/components/school-empty-state";
import { ClassEditForm, ClassForm } from "@/features/school/components/entity-forms";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function ClassesPage() {
  await requireProfile("teacher");
  const supabase = await createClient();
  const [yearsResult, classesResult] = await Promise.all([
    supabase.from("school_years").select("id, year").eq("active", true).order("year", { ascending: false }).limit(50),
    supabase.from("classes").select("id, name, active, school_year_id, school_years!inner(year)").order("name").limit(100),
  ]);

  return (
    <div className="space-y-8">
      <header className="border-b border-[#dce4de] pb-5">
        <p className="text-sm text-[#52706a]">Estrutura escolar</p>
        <h1 className="mt-2 text-2xl font-semibold">Turmas</h1>
        <p className="mt-2 text-sm text-[#667873]">Turmas que estão sob sua responsabilidade.</p>
      </header>

      {yearsResult.error || classesResult.error ? <SchoolLoadError /> : null}

      {!yearsResult.error && (yearsResult.data?.length ?? 0) > 0 && (
        <section className="border-b border-[#dce4de] pb-7">
          <details>
            <summary className="min-h-11 w-fit cursor-pointer rounded-md bg-[#126b63] px-4 py-3 text-sm font-medium text-white marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]">
              Cadastrar turma
            </summary>
            <div className="pt-5">
              <ClassForm schoolYears={yearsResult.data ?? []} />
            </div>
          </details>
        </section>
      )}

      {yearsResult.data?.length === 0 && <SchoolEmptyState message="Cadastre um ano letivo ativo antes de criar turmas." />}
      {!classesResult.error && classesResult.data?.length === 0 && <SchoolEmptyState message="Nenhuma turma cadastrada." />}
      {!classesResult.error && (classesResult.data?.length ?? 0) > 0 && (
        <section aria-label="Turmas cadastradas" className="divide-y divide-[#dce4de] border-y border-[#dce4de] bg-white">
          {classesResult.data?.map((schoolClass) => {
            const schoolYear = schoolClass.school_years as unknown as { year: number };
            return (
              <article key={schoolClass.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="font-medium">{schoolClass.name}</h2>
                    <p className="mt-1 text-sm text-[#667873]">
                      Ano letivo {schoolYear.year}{schoolClass.active ? "" : " · Inativa"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/teacher/classes/${schoolClass.id}`} className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-[#126b63] hover:bg-[#e9f2ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]">
                      Abrir turma <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                    <ActiveToggle kind="class" id={schoolClass.id} active={schoolClass.active} label={`turma ${schoolClass.name}`} />
                  </div>
                </div>
                <details className="mt-3">
                  <summary className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-md px-3 text-sm text-[#52645e] hover:bg-[#f0f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63] marker:content-none">
                    Editar turma <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </summary>
                  <div className="pt-3">
                    <ClassEditForm id={schoolClass.id} name={schoolClass.name} active={schoolClass.active} />
                  </div>
                </details>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}