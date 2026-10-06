import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Informe um email válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export const recoverySchema = z.object({
  email: z.string().trim().email("Informe um email válido."),
});

export const newPasswordSchema = z.object({
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});

export type SignInValues = z.infer<typeof signInSchema>;