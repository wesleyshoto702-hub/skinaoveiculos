/** Deliberately fail closed until the owner links the existing Neon connector.
 * Never replace this with a direct DATABASE_URL client or a different database.
 * After linking, install the official Neon gateway helpers and wire this transport.
 */
export type Statement = { query: string; params?: unknown[] };
export type Result = { rows: Record<string, unknown>[] };
export type Transport = (statements: Statement[], write: boolean) => Promise<Result[]>;
export const neonTransportReady = false;
export const neonTransport: Transport = async () => {
  throw new Error("O banco Neon ainda não está conectado a este projeto. Nenhuma alteração remota foi executada.");
};