import Image from "next/image";

import type { AppRole, Profile } from "@/lib/auth/profile";

const roleLabels: Record<AppRole, string> = {
  teacher: "Professor",
  student: "Aluno",
  parent: "Responsável",
};

export function DashboardHome({ profile, role }: { profile: Profile; role: AppRole }) {
  return (
    <section aria-labelledby="dashboard-title">
      <div className="border-b border-[#dce4de] pb-6">
        <p className="text-sm font-medium text-[#52706a]">Painel de {roleLabels[role].toLowerCase()}</p>
        <h1 id="dashboard-title" className="mt-2 text-2xl font-semibold sm:text-3xl">
          Olá, {profile.full_name.split(" ")[0]}
        </h1>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Alunos", "—"],
          ["Tarefas abertas", "—"],
          ["Pendências", "—"],
          ["Desempenho", "—"],
        ].map(([label, value]) => (
          <div key={label} className="border border-[#dce4de] bg-white p-5">
            <p className="text-sm text-[#667873]">{label}</p>
            <p className="mt-4 text-2xl font-semibold text-[#315b51]">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex min-h-64 flex-col items-center justify-center border border-dashed border-[#cbd6ce] bg-white px-5 py-10 text-center">
        <Image
          src="/brand/soul-mais-cristo.jpg"
          alt="Soul+ em Cristo"
          width={180}
          height={101}
          className="h-auto w-36 rounded-sm object-contain"
        />
        <p className="mt-5 text-sm font-medium">Seu painel está pronto</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#6a7b75]">
          Os indicadores serão exibidos quando os dados da sua área estiverem disponíveis.
        </p>
      </div>
    </section>
  );
}