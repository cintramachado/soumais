"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteGroup, deletePeriod, deleteStudent, type MutationResult } from "@/features/school/actions";

type EntityKind = "period" | "group" | "student";

const actions: Record<EntityKind, (id: string) => Promise<MutationResult>> = {
  period: deletePeriod,
  group: deleteGroup,
  student: deleteStudent,
};

export function DeleteButton({ kind, id, label }: { kind: EntityKind; id: string; label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!window.confirm(`Apagar ${label}? Esta ação não pode ser desfeita.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await actions[kind](id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={remove}
        aria-label={`Apagar ${label}`}
        className="min-h-9 rounded-md"
      >
        {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="size-4" />}
        <span>Apagar</span>
      </Button>
      {error && <span role="alert" className="max-w-48 text-right text-xs text-destructive">{error}</span>}
    </span>
  );
}
