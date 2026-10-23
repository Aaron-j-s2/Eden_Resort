import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import { vi } from 'vitest';
import { AuthProvider } from '@/app/auth';

/** Render a route tree in memory with fresh query cache. */
export function renderRoutes(routes: RouteObject[], initialPath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const utils = render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { ...utils, router };
}

export const renderAt = (element: ReactElement, path = '/') => renderRoutes([{ path: '*', element }], path);

type Handler = (url: URL, init?: RequestInit) => unknown | Promise<unknown>;

/** Mock fetch with a map of `METHOD /path` → handler returning data (wrapped in the API envelope). */
export function mockApi(routes: Record<string, Handler | { status: number; error: { code: string; message: string; details?: unknown } }>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const key = `${init?.method ?? 'GET'} ${url.pathname}`;
    const route = routes[key];
    if (!route) return new Response(JSON.stringify({ ok: false, error: { code: 'NOT_FOUND', message: `No mock for ${key}` } }), { status: 404 });
    if (typeof route === 'function') {
      const data = await route(url, init);
      return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: false, error: route.error }), { status: route.status });
  });
}
