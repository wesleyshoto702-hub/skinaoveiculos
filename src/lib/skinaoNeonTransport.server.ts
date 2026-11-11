/** A conexão com o Neon acontece exclusivamente no servidor TanStack Start.
 * DATABASE_URL deve ser configurada no ambiente de hospedagem, sem prefixo VITE_.
 * Nunca envie a URL com senha para o navegador ou para o repositório.
 */
import { neon } from "@neondatabase/serverless";

export type Statement = { query: string; params?: unknown[] };
export type Result = { rows: Record<string, unknown>[] };
export type Transport = (statements: Statement[], write: boolean) => Promise<Result[]>;

/** O adaptador está implementado; a disponibilidade depende de DATABASE_URL no servidor. */
export const neonTransportReady = true;

export const neonTransport: Transport = async (statements, write) => {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
    throw new Error("Configure DATABASE_URL do Neon no ambiente de hospedagem para ativar o estoque online.");
  }
  if (!statements.length) return [];
  const sql = neon(databaseUrl);
  const queries = statements.map(({ query, params }) => sql.query(query, params ?? []));
  const rows = statements.length === 1
    ? [await queries[0]]
    : await sql.transaction(queries, { readOnly: !write });
  return rows.map(group => ({ rows: group as Record<string, unknown>[] }));
};
