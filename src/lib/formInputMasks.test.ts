import { describe, expect, it } from "vitest";
import { formatBrazilAmount, formatBrazilWhatsApp } from "./formInputMasks";

describe("Máscara do WhatsApp brasileiro", () => {
  it("forma o DDD e o hífen de um celular de 11 dígitos", () => {
    expect(formatBrazilWhatsApp("3")).toBe("(3");
    expect(formatBrazilWhatsApp("35")).toBe("(35)");
    expect(formatBrazilWhatsApp("359")).toBe("(35) 9");
    expect(formatBrazilWhatsApp("3599999")).toBe("(35) 99999");
    expect(formatBrazilWhatsApp("35999999")).toBe("(35) 99999-9");
    expect(formatBrazilWhatsApp("35999999999")).toBe("(35) 99999-9999");
  });
  it("limita a 11 dígitos e sanitiza caracteres colados", () => {
    expect(formatBrazilWhatsApp("(35) 99999-99991234")).toBe("(35) 99999-9999");
    expect(formatBrazilWhatsApp("abc 35/99999.9999")).toBe("(35) 99999-9999");
    expect(formatBrazilWhatsApp("")).toBe("");
  });
});

describe("Entrada em reais", () => {
  it("formata milhares e até dois decimais", () => {
    expect(formatBrazilAmount("2")).toBe("2");
    expect(formatBrazilAmount("20000")).toBe("20.000");
    expect(formatBrazilAmount("20.000,50")).toBe("20.000,50");
    expect(formatBrazilAmount("20000,5")).toBe("20.000,5");
    expect(formatBrazilAmount("20,")).toBe("20,");
  });
  it("remove letras e símbolos de colagens", () => {
    expect(formatBrazilAmount("R$ 1a2.500,789")).toBe("12.500,78");
    expect(formatBrazilAmount("a!?")).toBe("");
    expect(formatBrazilAmount("1,2,3")).toBe("1,23");
  });
});
