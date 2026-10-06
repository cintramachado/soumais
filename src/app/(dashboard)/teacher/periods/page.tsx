import { ActiveToggle } from "@/features/school/components/active-toggle";
import { SchoolEmptyState, SchoolLoadError, formatDatePtBr } from "@/features/school/components/school-empty-state";
import { PeriodForm } from "@/features/school/components/school-admin-forms";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export default async function PeriodsPage() {
  await requireProfile("teacher");
  const supabase = await createClient();
  const [yearsResult, periodsResult] = await Promise.all([
    supabase.from("school_years").select("id, year").eq("active", true).order("year", { ascending: false }).limit(50),
    supabase.from("periods").select("id, name, start_date, end_date, active, school_year_id, school_years!inner(year)").order("start_date", { ascending: false }).limit(100),
  ]);

  return (
    <div className="space-y-8">
      <header className="border-b border-[#dce4de] pb-5">
        <p className="text-sm text-[#52706a]">Estrutura escolar</p>
        <h1 className="mt-2 text-2xl font-semibold">Períodos</h1>
        <p className="mt-2 text-sm text-[#667873]">Os períodos são definidos por ano letivo.</p>
      </header>

      {!yearsResult.error && (yearsResult.data?.length ?? 0) > 0 && (
        <section className="border-b border-[#dce4de] pb-7">
          <details>
            <summary className="min-h-11 w-fit cursor-pointer rounded-md bg-[#126b63] px-4 py-3 text-sm font-medium text-white marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]">
              Cadastrar período
            </summary>
            <div className="pt-5">
              <PeriodForm years={yearsResult.data ?? []} />
            </div>
          </details>
        </section>
      )}

      {yearsResult.error || periodsResult.error ? <SchoolLoadError /> : !yearsResult.data?.length ? (
        <SchoolEmptyState message="Cadastre um ano letivo ativo antes de criar períodos." />
      ) : !periodsResult.data?.length ? (
        <SchoolEmptyState message="Nenhum período cadastrado." />
      ) : (
        <section aria-label="Períodos cadastrados" className="divide-y divide-[#dce4de] border-y border-[#dce4de] bg-white">
          {periodsResult.data.map((period) => {
            const schoolYear = period.school_years as unknown as { year: number };
            return (
              <article key={period.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{period.name}</h2>
                    <span className="text-xs text-[#667873]">{schoolYear.year}</span>
                    {!period.active && <span className="text-xs text-[#71817c]">Inativo</span>}
                  </div>
                  <p className="mt-1 text-sm text-[#667873]">
                    {formatDatePtBr(period.start_date)} a {formatDatePtBr(period.end_date)}
                  </p>
                </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <details>
                      <summary className="inline-flex min-h-9 cursor-pointer items-center rounded-md px-3 text-sm text-[#52645e] hover:bg-[#f0f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63] marker:content-none">
                        Editar
                      </summary>
                      <div className="absolute right-4 z-10 mt-2 w-[min(92vw,42rem)] border border-[#dce4de] bg-white p-4 shadow-md sm:right-8">
                        <PeriodForm
                          years={yearsResult.data ?? []}
                          period={{
                            id: period.id,
                            schoolYearId: period.school_year_id,
                            name: period.name,
                            startDate: period.start_date,
                            endDate: period.end_date,
                            active: period.active,
                          }}
                        />
                      </div>
                    </details>
                    <ActiveToggle kind="period" id={period.id} active={period.active} label={`período ${period.name}`} />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}