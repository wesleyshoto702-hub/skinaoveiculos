import { describe, expect, it } from "vitest";
import { staffEmailSchema, staffPasswordSchema, STAFF_LIMIT } from "./skinaoTeamRules";

describe("cadastro seguro de funcionários", () => {
  it("aceita Gmail, Outlook e outros provedores, normalizando o e-mail", () => {
    expect(staffEmailSchema.parse("  FUNCIONARIO@GMAIL.COM ")).toBe("funcionario@gmail.com");
    expect(staffEmailSchema.parse("suporte@outlook.com")).toBe("suporte@outlook.com");
    expect(staffEmailSchema.parse("contato+loja@empresa.com.br")).toBe("contato+loja@empresa.com.br");
  });
  it("recusa nome sem e-mail, formato inválido e e-mails longos", () => {
    expect(staffEmailSchema.safeParse("joao").success).toBe(false);
    expect(staffEmailSchema.safeParse("joao@").success).toBe(false);
    expect(staffEmailSchema.safeParse("a".repeat(250)+"@example.com").success).toBe(false);
  });
  it("exige senha forte com 12 caracteres, letras e números", () => {
    expect(staffPasswordSchema.safeParse("SenhaForte123!").success).toBe(true);
    expect(staffPasswordSchema.safeParse("curta123").success).toBe(false);
    expect(staffPasswordSchema.safeParse("SomenteLetrasCompridas").success).toBe(false);
    expect(staffPasswordSchema.safeParse("123456789012345").success).toBe(false);
  });
  it("impede truncamento silencioso de senha bcrypt", () => {
    expect(staffPasswordSchema.safeParse("Abcd1234"+ "x".repeat(65)).success).toBe(false);
    expect(staffPasswordSchema.safeParse("Senha123" + "á".repeat(34)).success).toBe(false);
  });
  it("limita quantidade de funcionários ao valor de segurança previsto", () => {
    expect(STAFF_LIMIT).toBe(30);
  });
});
