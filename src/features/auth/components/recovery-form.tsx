"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

import { requestPasswordReset, updatePassword } from "@/lib/auth/actions";
import { newPasswordSchema, recoverySchema } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const recoveryFormSchema = z.object({
  email: recoverySchema.shape.email.optional(),
  password: newPasswordSchema.shape.password.optional(),
});
type RecoveryFormValues = z.infer<typeof recoveryFormSchema>;

export function RecoveryForm({ mode }: { mode: "request" | "update" }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isRequest = mode === "request";
  const form = useForm<RecoveryFormValues>({
    resolver: zodResolver(recoveryFormSchema),
    defaultValues: isRequest ? { email: "" } : { password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = isRequest
        ? await requestPasswordReset({ email: values.email ?? "" })
        : await updatePassword({ password: values.password ?? "" });
      if (result.error) setError(result.error);
      if (result.success) setMessage(result.success);
    });
  });

  return (
    <section className="w-full max-w-[420px]">
      <p className="text-sm font-medium text-[#52706a]">Soul+</p>
      <h1 className="mt-2 text-2xl font-semibold">
        {isRequest ? "Recuperar senha" : "Criar nova senha"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#667873]">
        {isRequest
          ? "Enviaremos instruções para o email informado, se ele estiver cadastrado."
          : "Escolha uma senha com pelo menos 8 caracteres."}
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-7 space-y-5">
        {isRequest ? (
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email && <p className="text-sm text-[#a23f2b]">{form.formState.errors.email.message}</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
            {form.formState.errors.password && <p className="text-sm text-[#a23f2b]">{form.formState.errors.password.message}</p>}
          </div>
        )}
        {error && <p role="alert" className="text-sm text-[#a23f2b]">{error}</p>}
        {message && <p role="status" className="text-sm text-[#126b63]">{message}</p>}
        <Button type="submit" disabled={isPending} className="h-11 w-full rounded-md bg-[#126b63] text-white hover:bg-[#0d5952]">
          {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : isRequest ? "Enviar instruções" : "Atualizar senha"}
        </Button>
      </form>
      <Link href="/login" className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-[#126b63] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126b63]">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar ao login
      </Link>
    </section>
  );
}