"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPeriod, createSchoolYear, updatePeriod, updateSchoolYear } from "@/features/school/actions";
import {
  periodSchema,
  schoolYearSchema,
} from "@/features/school/schemas";

type SchoolYearValues = {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  active: boolean;
};

type PeriodValues = {
  id: string;
  schoolYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
};

type YearOption = { id: string; year: number };

export function SchoolYearForm({ schoolYear }: { schoolYear?: SchoolYearValues }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(schoolYearSchema),
    defaultValues: schoolYear
      ? { year: schoolYear.year, startDate: schoolYear.startDate, endDate: schoolYear.endDate }
      : { year: new Date().getFullYear(), startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31` },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = schoolYear
        ? await updateSchoolYear({ ...values, id: schoolYear.id, active: schoolYear.active })
        : await createSchoolYear(values);
      if (result.error) form.setError("root", { message: result.error });
      else router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="school-year">Ano</Label>
        <Input id="school-year" type="number" min={1900} max={2200} readOnly={Boolean(schoolYear)} {...form.register("year", { valueAsNumber: true })} />
        {form.formState.errors.year && <FieldError>{form.formState.errors.year.message}</FieldError>}
      </div>
      <div className="hidden sm:block" />
      <DateField id="school-year-start" label="Data inicial" error={form.formState.errors.startDate?.message} {...form.register("startDate")} />
      <DateField id="school-year-end" label="Data final" error={form.formState.errors.endDate?.message} {...form.register("endDate")} />
      <FormResult message={form.formState.errors.root?.message} />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending} className="min-h-10 rounded-md bg-[#126b63] text-white hover:bg-[#0d5952]">
          {isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {schoolYear ? "Salvar alterações" : "Cadastrar ano letivo"}
        </Button>
      </div>
    </form>
  );
}

export function PeriodForm({
  years,
  period,
}: {
  years: YearOption[];
  period?: PeriodValues;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm({
    resolver: zodResolver(periodSchema),
    defaultValues: period
      ? {
          schoolYearId: period.schoolYearId,
          name: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
        }
      : {
          schoolYearId: years[0]?.id ?? "",
          name: "",
          startDate: "",
          endDate: "",
        },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = period
        ? await updatePeriod({ ...values, id: period.id, active: period.active })
        : await createPeriod(values);
      if (result.error) form.setError("root", { message: result.error });
      else router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {!period && (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="period-year">Ano letivo</Label>
          <select id="period-year" className="h-10 w-full rounded-md border border-[#cbd4cf] bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]" {...form.register("schoolYearId")}>
            {years.map((year) => <option key={year.id} value={year.id}>{year.year}</option>)}
          </select>
          {form.formState.errors.schoolYearId && <FieldError>{form.formState.errors.schoolYearId.message}</FieldError>}
        </div>
      )}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="period-name">Nome do período</Label>
        <Input id="period-name" maxLength={120} placeholder="Ex.: 1º trimestre" {...form.register("name")} />
        {form.formState.errors.name && <FieldError>{form.formState.errors.name.message}</FieldError>}
      </div>
      <DateField id="period-start" label="Data inicial" error={form.formState.errors.startDate?.message} {...form.register("startDate")} />
      <DateField id="period-end" label="Data final" error={form.formState.errors.endDate?.message} {...form.register("endDate")} />
      <FormResult message={form.formState.errors.root?.message} />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending || (!period && years.length === 0)} className="min-h-10 rounded-md bg-[#126b63] text-white hover:bg-[#0d5952]">
          {isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {period ? "Salvar alterações" : "Cadastrar período"}
        </Button>
      </div>
    </form>
  );
}

function DateField({
  id,
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="date" {...props} />
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#a23f2b]">{children}</p>;
}

function FormResult({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="text-sm text-[#a23f2b] sm:col-span-2">{message}</p>;
}