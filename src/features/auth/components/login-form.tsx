"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";

import { signInAction } from "@/lib/auth/actions";
import { signInSchema, type SignInValues } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  initialError,
  passwordUpdated = false,
}: {
  initialError?: string;
  passwordUpdated?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await signInAction(values);
      if (result.error) setServerError(result.error);
    });
  });

  return (
    <main className="grid min-h-screen bg-[#f5f7f4] text-[#172522] lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)]">
      <section className="relative hidden overflow-hidden bg-[#115e56] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(135deg,transparent_48%,#fff_49%,transparent_50%)] [background-size:28px_28px]" />
        <Link href="/login" className="relative inline-flex w-fit rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          <Image
            src="/brand/soul-mais-cristo.jpg"
            alt="Soul+ em Cristo"
            width={270}
            height={152}
            priority
            className="h-auto w-[220px] rounded-sm object-contain"
          />
        </Link>
        <div className="relative max-w-lg pb-12">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#c5dfd4]">Acompanhamento escolar</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight xl:text-5xl">Soul+</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-[#e0eee8]">
            Um espaço seguro para acompanhar alunos, tarefas e pontuações.
          </p>
        </div>
        <p className="relative text-xs text-[#c5dfd4]">Acesso restrito a usuários autorizados.</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/brand/soul-mais-cristo.jpg"
              alt="Soul+ em Cristo"
              width={260}
              height={146}
              priority
              className="h-auto w-[220px] rounded-sm object-contain"
            />
          </div>
          <div className="mb-8">
            <p className="text-sm font-medium text-[#52706a]">Bem-vindo</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Entre na sua conta</h2>
            <p className="mt-2 text-sm leading-6 text-[#667873]">
              Use o email e a senha vinculados ao seu perfil.
            </p>
          </div>

          {initialError && (
            <div role="alert" className="mb-5 border-l-2 border-[#b54d36] bg-[#f9ebe6] px-4 py-3 text-sm text-[#813523]">
              {initialError}
            </div>
          )}
          {passwordUpdated && (
            <div role="status" className="mb-5 border-l-2 border-[#126b63] bg-[#e9f2ed] px-4 py-3 text-sm text-[#115e56]">
              Sua senha foi atualizada. Entre com a nova senha.
            </div>
          )}
          {serverError && (
            <div role="alert" className="mb-5 border-l-2 border-[#b54d36] bg-[#f9ebe6] px-4 py-3 text-sm text-[#813523]">
              {serverError}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71817c]" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  placeholder="voce@exemplo.com"
                  aria-invalid={Boolean(form.formState.errors.email)}
                  className="h-11 rounded-md border-[#cbd4cf] bg-white pl-10"
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-[#a23f2b]">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Senha</Label>
                <Link className="text-sm font-medium text-[#126b63] underline-offset-4 hover:underline" href="/forgot-password">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71817c]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={Boolean(form.formState.errors.password)}
                  className="h-11 rounded-md border-[#cbd4cf] bg-white pl-10 pr-11"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-sm text-[#60716b] hover:bg-[#edf1ed] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#126b63]"
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-[#a23f2b]">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" disabled={isPending} className="h-11 w-full rounded-md bg-[#126b63] text-white hover:bg-[#0d5952]">
              {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
          <p className="mt-8 text-center text-xs leading-5 text-[#71817c]">
            O email informado no cadastro escolar é apenas para contato e não cria um login. Peça à escola para liberar seu acesso.
          </p>
        </div>
      </section>
    </main>
  );
}