"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, LoaderCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  setClassActive,
  setGroupActive,
  setPeriodActive,
  setSchoolYearActive,
  setStudentActive,
  type MutationResult,
} from "@/features/school/actions";

type EntityKind = "school-year" | "period" | "class" | "group" | "student";

const actions: Record<EntityKind, (input: unknown) => Promise<MutationResult>> = {
  "school-year": setSchoolYearActive,
  period: setPeriodActive,
  class: setClassActive,
  group: setGroupActive,
  student: setStudentActive,
};

export function ActiveToggle({
  kind,
  id,
  active,
  label,
}: {
  kind: EntityKind;
  id: string;
  active: boolean;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (active && !window.confirm(`Inativar ${label}? O registro será mantido no histórico.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await actions[kind]({ id, active: !active });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={toggle}
        aria-label={`${active ? "Inativar" : "Reativar"} ${label}`}
        className="min-h-9 rounded-md border-[#cbd4cf]"
      >
        {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : active ? <Archive aria-hidden="true" className="size-4" /> : <RotateCcw aria-hidden="true" className="size-4" />}
        <span>{active ? "Inativar" : "Reativar"}</span>
      </Button>
      {error && <span role="alert" className="max-w-48 text-right text-xs text-[#a23f2b]">{error}</span>}
    </span>
  );
}