import { z } from "zod";

export const staffEmailSchema = z.string().trim().toLowerCase()
  .max(254, "O e-mail é muito longo.")
  .email("Informe um e-mail válido.");

export const staffPasswordSchema = z.string()
  .min(12, "A senha precisa ter pelo menos 12 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.")
  .refine(password => new TextEncoder().encode(password).length <= 72,
    "A senha deve ter no máximo 72 bytes para evitar truncamento.")
  .refine(password => /[a-zA-Z]/.test(password) && /[0-9]/.test(password),
    "Inclua pelo menos uma letra e um número.")
  .refine(password => password.trim() === password,
    "A senha não pode começar ou terminar com espaços.");

export const staffIdSchema = z.string().uuid();
export const STAFF_LIMIT = 30;
