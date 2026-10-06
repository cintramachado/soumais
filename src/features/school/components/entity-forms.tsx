"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createClass,
  createGroup,
  createStudent,
  updateClass,
  updateGroup,
  updateStudent,
} from "@/features/school/actions";
import {
  classSchema,
  classUpdateSchema,
  groupSchema,
  groupUpdateSchema,
  studentSchema,
  studentUpdateSchema,
} from "@/features/school/schemas";

type SchoolYearOption = { id: string; year: number };
type GroupOption = { id: string; name: string };

export function ClassForm({ schoolYears }: { schoolYears: SchoolYearOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof classSchema>>({
    resolver: zodResolver(classSchema),
    defaultValues: { schoolYearId: schoolYears[0]?.id ?? "", name: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createClass(values);
      if (result.error) form.setError("root", { message: result.error });
      else router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="space-y-2">
        <Label htmlFor="class-school-year">Ano letivo</Label>
        <select id="class-school-year" className={selectClassName} {...form.register("schoolYearId")}>
          {schoolYears.map((year) => <option key={year.id} value={year.id}>{year.year}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="class-name">Nome da turma</Label>
        <Input id="class-name" maxLength={120} placeholder="Ex.: Adolescentes" {...form.register("name")} />
        {form.formState.errors.name && <FieldError>{form.formState.errors.name.message}</FieldError>}
      </div>
      <Button disabled={isPending || schoolYears.length === 0} className={submitClassName}>
        {isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Cadastrar turma
      </Button>
      {form.formState.errors.root && <FormError>{form.formState.errors.root.message}</FormError>}
    </form>
  );
}

export function GroupForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: { classId, name: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createGroup(values);
      if (result.error) form.setError("root", { message: result.error });
      else {
        form.reset({ classId, name: "" });
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor="group-name">Nome do grupo</Label>
        <Input id="group-name" maxLength={120} placeholder="Ex.: Grupo A" {...form.register("name")} />
        {form.formState.errors.name && <FieldError>{form.formState.errors.name.message}</FieldError>}
      </div>
      <Button disabled={isPending} className={submitClassName}>
        {isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Criar grupo
      </Button>
      {form.formState.errors.root && <FormError>{form.formState.errors.root.message}</FormError>}
    </form>
  );
}

export function StudentForm({
  classId,
  groups,
}: {
  classId: string;
  groups: GroupOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      birthDate: "",
      classId,
      groupId: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createStudent(values);
      if (result.error) form.setError("root", { message: result.error });
      else {
        form.reset({ name: "", birthDate: "", classId, groupId: "" });
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="student-name">Nome completo</Label>
        <Input id="student-name" autoComplete="name" maxLength={120} {...form.register("name")} />
        {form.formState.errors.name && <FieldError>{form.formState.errors.name.message}</FieldError>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="student-birth-date">Data de nascimento</Label>
        <Input id="student-birth-date" type="date" {...form.register("birthDate")} />
        {form.formState.errors.birthDate && <FieldError>{form.formState.errors.birthDate.message}</FieldError>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="student-group">Grupo inicial (opcional)</Label>
        <select id="student-group" className={selectClassName} {...form.register("groupId")}>
          <option value="">Sem grupo</option>
          {groups.filter((group) => group.id).map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </div>
      <Button disabled={isPending} className={`${submitClassName} sm:col-span-2 sm:justify-self-start`}>
        {isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Cadastrar aluno
      </Button>
      {form.formState.errors.root && <FormError>{form.formState.errors.root.message}</FormError>}
    </form>
  );
}

const selectClassName = "h-10 w-full rounded-md border border-[#cbd4cf] bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]";
const submitClassName = "min-h-10 rounded-md bg-[#126b63] text-white hover:bg-[#0d5952]";

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#a23f2b]">{children}</p>;
}

function FormError({ children }: { children?: React.ReactNode }) {
  return <p role="alert" className="text-sm text-[#a23f2b]">{children}</p>;
}

export function ClassEditForm({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof classUpdateSchema>>({
    resolver: zodResolver(classUpdateSchema),
    defaultValues: { id, name, active },
  });
  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateClass(values);
      if (result.error) form.setError("root", { message: result.error });
      else router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor={`edit-class-${id}`}>Nome da turma</Label>
        <Input id={`edit-class-${id}`} maxLength={120} {...form.register("name")} />
        {form.formState.errors.name && <FieldError>{form.formState.errors.name.message}</FieldError>}
      </div>
      <Button disabled={isPending} className={submitClassName}>
        {isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Salvar
      </Button>
      {form.formState.errors.root && <FormError>{form.formState.errors.root.message}</FormError>}
    </form>
  );
}

export function GroupEditForm({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof groupUpdateSchema>>({
    resolver: zodResolver(groupUpdateSchema),
    defaultValues: { id, name, active },
  });
  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateGroup(values);
      if (result.error) form.setError("root", { message: result.error });
      else router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor={`edit-group-${id}`}>Nome do grupo</Label>
        <Input id={`edit-group-${id}`} maxLength={120} {...form.register("name")} />
        {form.formState.errors.name && <FieldError>{form.formState.errors.name.message}</FieldError>}
      </div>
      <Button disabled={isPending} className={submitClassName}>
        {isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Salvar
      </Button>
      {form.formState.errors.root && <FormError>{form.formState.errors.root.message}</FormError>}
    </form>
  );
}

export function StudentEditForm({
  id,
  name,
  birthDate,
  active,
}: {
  id: string;
  name: string;
  birthDate: string;
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof studentUpdateSchema>>({
    resolver: zodResolver(studentUpdateSchema),
    defaultValues: { id, name, birthDate, active },
  });
  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateStudent(values);
      if (result.error) form.setError("root", { message: result.error });
      else router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end">
      <div className="space-y-2">
        <Label htmlFor={`edit-student-name-${id}`}>Nome</Label>
        <Input id={`edit-student-name-${id}`} maxLength={120} {...form.register("name")} />
        {form.formState.errors.name && <FieldError>{form.formState.errors.name.message}</FieldError>}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit-student-birth-${id}`}>Nascimento</Label>
        <Input id={`edit-student-birth-${id}`} type="date" {...form.register("birthDate")} />
        {form.formState.errors.birthDate && <FieldError>{form.formState.errors.birthDate.message}</FieldError>}
      </div>
      <Button disabled={isPending} className={submitClassName}>
        {isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Salvar
      </Button>
      {form.formState.errors.root && <FormError>{form.formState.errors.root.message}</FormError>}
    </form>
  );
}