// Minimal declarations for the Workers runtime modules used by src/worker.ts.
declare module 'cloudflare:node' {
  export function httpServerHandler(options: { port: number }): {
    fetch(request: Request, env: unknown, ctx: unknown): Promise<Response>;
  };
}
declare module 'cloudflare:workers' {
  export function waitUntil(promise: Promise<unknown>): void;
}
