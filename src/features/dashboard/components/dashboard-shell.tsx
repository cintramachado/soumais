import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, ClipboardList, LayoutDashboard, LogOut, Settings, Tags, Users } from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import type { Profile } from "@/lib/auth/profile";

const roleLabels = {
  teacher: "Professor",
  student: "Aluno",
  parent: "Responsável",
} as const;

export function DashboardShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const homePath = `/${profile.role}`;
  const navigation = profile.role === "teacher"
    ? [
        { href: homePath, label: "Visão geral", icon: LayoutDashboard },
        { href: "/teacher/school-years", label: "Anos letivos", icon: CalendarDays },
        { href: "/teacher/periods", label: "Períodos", icon: CalendarDays },
        { href: "/teacher/classes", label: "Turmas e alunos", icon: Users },
        { href: "/teacher/parents", label: "Responsáveis", icon: Users },
        { href: "/teacher/task-types", label: "Tipos de tarefa", icon: Tags },
        { href: "/teacher/tasks", label: "Tarefas", icon: ClipboardList },
        { href: "/teacher/score-settings", label: "Regras de pontos", icon: Settings },
      ]
    : [{ href: homePath, label: "Visão geral", icon: LayoutDashboard }];

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-[#172522] md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-[#dce4de] bg-white md:flex md:flex-col">
        <Link href={homePath} className="flex h-[88px] items-center border-b border-[#e6ebe7] px-6">
          <Image
            src="/brand/soul-mais-cristo.jpg"
            alt="Soul+ em Cristo"
            width={170}
            height={96}
            className="h-auto w-36 rounded-sm object-contain"
          />
        </Link>
        <nav aria-label="Navegação principal" className="flex-1 p-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-[#52645e] hover:bg-[#f0f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]"
              >
                <Icon aria-hidden="true" className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#e6ebe7] p-4">
          <p className="truncate text-sm font-medium">{profile.full_name}</p>
          <p className="mt-1 text-xs text-[#6a7b75]">{roleLabels[profile.role]}</p>
          <form action={signOutAction} className="mt-3">
            <button className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-sm text-[#52645e] hover:bg-[#f0f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]">
              <LogOut aria-hidden="true" className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex min-h-16 items-center justify-between border-b border-[#dce4de] bg-white px-4 sm:px-7">
          <div className="flex items-center gap-3 md:hidden">
            <Image
              src="/brand/soul-mais-cristo.jpg"
              alt="Soul+ em Cristo"
              width={106}
              height={60}
              className="h-10 w-[72px] rounded-sm object-contain"
            />
            <span className="text-sm font-medium">{roleLabels[profile.role]}</span>
          </div>
          <span className="hidden text-sm text-[#60716b] md:block">Área de {roleLabels[profile.role].toLowerCase()}</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-52 truncate text-sm text-[#52645e] sm:block">{profile.full_name}</span>
            <form action={signOutAction} className="md:hidden">
              <button
                aria-label="Sair"
                className="grid size-10 place-items-center rounded-md text-[#52645e] hover:bg-[#f0f3ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </form>
          </div>
        </header>
        {profile.role === "teacher" && (
          <nav aria-label="Módulos escolares" className="flex gap-1 overflow-x-auto border-b border-[#dce4de] bg-white px-3 py-2 md:hidden">
            {navigation.slice(1).map((item) => (
              <Link key={item.href} href={item.href} className="flex min-h-10 shrink-0 items-center rounded-md px-3 text-sm font-medium text-[#52645e] hover:bg-[#e9f2ed] hover:text-[#115e56] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]">
                {item.label}
              </Link>
            ))}
          </nav>
        )}
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-7 sm:px-7 lg:px-10">
          {children}
        </main>
        <footer className="flex items-center justify-between border-t border-[#dce4de] bg-white px-4 py-3 text-xs text-[#71817c] sm:px-7">
          <span>Soul+ · Acompanhamento escolar</span>
          <a className="inline-flex items-center gap-1 hover:text-[#126b63]" href="/manifest.webmanifest">
            Instalar aplicativo <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </footer>
      </div>
    </div>
  );
}