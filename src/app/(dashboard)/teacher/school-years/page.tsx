import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ActiveToggle } from "@/features/school/components/active-toggle";
import { SchoolEmptyState, SchoolLoadError, formatDatePtBr } from "@/features/school/components/school-empty-state";
import { SchoolYearForm } from "@/features/school/components/school-admin-forms";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function SchoolYearsPage() {
  await requireProfile("teacher");
  const supabase = await createClient();
  const { data: years, error } = await supabase
    .from("school_years")
    .select("id, year, start_date, end_date, active")
    .order("year", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <header className="border-b border-[#dce4de] pb-5">
        <p className="text-sm text-[#52706a]">Estrutura escolar</p>
        <h1 className="mt-2 text-2xl font-semibold">Anos letivos</h1>
        <p className="mt-2 text-sm text-[#667873]">Organize turmas e períodos por ano.</p>
      </header>

      <section className="border-b border-[#dce4de] pb-7">
        <details>
          <summary className="min-h-11 w-fit cursor-pointer rounded-md bg-[#126b63] px-4 py-3 text-sm font-medium text-white marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]">
            Cadastrar ano letivo
          </summary>
          <div className="pt-5">
            <SchoolYearForm />
          </div>
        </details>
      </section>

      <section aria-label="Anos letivos cadastrados">
        {error ? <SchoolLoadError /> : !years?.length ? <SchoolEmptyState message="Nenhum ano letivo cadastrado." /> : (
          <div className="divide-y divide-[#dce4de] border-y border-[#dce4de] bg-white">
            {years.map((year) => (
              <article key={year.id} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{year.year}</h2>
                    <span className={`text-xs ${year.active ? "text-[#126b63]" : "text-[#71817c]"}`}>
                      {year.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#667873]">
                    {formatDatePtBr(year.start_date)} a {formatDatePtBr(year.end_date)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <details>
                    <summary className="inline-flex min-h-9 cursor-pointer items-center rounded-md px-3 text-sm text-[#52645e] hover:bg-[#f0f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63] marker:content-none">
                      Editar
                    </summary>
                    <div className="absolute right-4 z-10 mt-2 w-[min(92vw,42rem)] border border-[#dce4de] bg-white p-4 shadow-md sm:right-8">
                      <SchoolYearForm
                        schoolYear={{
                          id: year.id,
                          year: year.year,
                          startDate: year.start_date,
                          endDate: year.end_date,
                          active: year.active,
                        }}
                      />
                    </div>
                  </details>
                  <Link href={`/teacher/periods?year=${year.id}`} className="inline-flex min-h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-[#126b63] hover:bg-[#e9f2ed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]">
                    Períodos <ArrowUpRight aria-hidden="true" className="size-4" />
                  </Link>
                  <ActiveToggle kind="school-year" id={year.id} active={year.active} label={`ano ${year.year}`} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}