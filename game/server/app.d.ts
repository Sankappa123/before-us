export interface ServerOptions { mongoUrl?: string; dbName?: string; port?: number; dbTimeoutMs?: number }
export interface ServerHandle {
  port: number; url: string;
  dbOk(): Promise<boolean>;
  dropDb(): Promise<void>;
  close(): Promise<void>;
}
export const DEFAULTS: { mongoUrl: string; dbName: string; port: number };
export function startServer(opts?: ServerOptions): Promise<ServerHandle>;
