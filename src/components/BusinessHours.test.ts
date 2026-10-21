import { describe, expect, it } from "vitest";
import { isOpenInBrasilia } from "./BusinessHours";

describe("horário de funcionamento em Brasília", () => {
  const check = (iso: string, open: boolean) =>
    expect(isOpenInBrasilia(new Date(iso))).toBe(open);

  it("abre exatamente às 08h e fecha às 18h de segunda a sexta", () => {
    check("2026-10-19T10:59:00Z", false); // segunda, 07:59 em Brasília
    check("2026-10-19T11:00:00Z", true);  // segunda, 08:00
    check("2026-10-19T20:59:00Z", true);  // segunda, 17:59
    check("2026-10-19T21:00:00Z", false); // segunda, 18:00
  });

  it("fecha aos sábados ao meio-dia", () => {
    check("2026-10-24T10:59:00Z", false); // sábado, 07:59
    check("2026-10-24T11:00:00Z", true);  // sábado, 08:00
    check("2026-10-24T14:59:00Z", true);  // sábado, 11:59
    check("2026-10-24T15:00:00Z", false); // sábado, 12:00
  });

  it("não abre aos domingos e considera o dia de Brasília, não UTC", () => {
    check("2026-10-18T15:00:00Z", false); // domingo, 12:00
    check("2026-10-19T01:00:00Z", false); // domingo, 22:00 (segunda em UTC)
  });
});
