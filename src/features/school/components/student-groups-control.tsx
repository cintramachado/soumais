"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addStudentToGroup, removeStudentFromGroup } from "@/features/school/actions";

type GroupMembership = { id: string; name: string };

export function StudentGroupsControl({
  enrollmentId,
  groups,
  memberships,
}: {
  enrollmentId: string;
  groups: GroupMembership[];
  memberships: GroupMembership[];
}) {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const availableGroups = groups.filter((group) => !memberships.some((membership) => membership.id === group.id));

  function addGroup() {
    if (!selectedGroup) return;
    setError(null);
    startTransition(async () => {
      const result = await addStudentToGroup({ enrollmentId, groupId: selectedGroup });
      if (result.error) setError(result.error);
      else {
        setSelectedGroup("");
        router.refresh();
      }
    });
  }

  function removeGroup(group: GroupMembership) {
    if (!window.confirm(`Remover o vínculo com ${group.name}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await removeStudentFromGroup({ enrollmentId, groupId: group.id });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {memberships.length ? memberships.map((group) => (
          <span key={group.id} className="inline-flex min-h-8 items-center gap-1 rounded-md bg-[#e9f2ed] px-2 text-xs text-[#315b51]">
            {group.name}
            <button
              type="button"
              disabled={isPending}
              aria-label={`Remover aluno do grupo ${group.name}`}
              onClick={() => removeGroup(group)}
              className="grid size-6 place-items-center rounded-sm hover:bg-[#dcebe2] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#126b63]"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        )) : <span className="text-xs text-[#71817c]">Sem grupo vinculado</span>}
      </div>
      {availableGroups.length > 0 && (
        <div className="flex max-w-sm gap-2">
          <label className="sr-only" htmlFor={`student-group-${enrollmentId}`}>Adicionar grupo</label>
          <select
            id={`student-group-${enrollmentId}`}
            value={selectedGroup}
            onChange={(event) => setSelectedGroup(event.target.value)}
            className="h-9 min-w-0 flex-1 rounded-md border border-[#cbd4cf] bg-white px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]"
          >
            <option value="">Adicionar grupo...</option>
            {availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <Button type="button" size="icon" variant="outline" aria-label="Vincular ao grupo" disabled={!selectedGroup || isPending} onClick={addGroup} className="size-9 rounded-md">
            {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
          </Button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-[#a23f2b]">{error}</p>}
    </div>
  );
}