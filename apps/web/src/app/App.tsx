import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { ApiError } from '@/lib/api';
import { AuthProvider } from './auth';
import { router } from './router';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <RouterProvider router={router} />
          <Toaster position="top-center" toastOptions={{ className: 'font-sans' }} />
        </MotionConfig>
      </AuthProvider>
    </QueryClientProvider>
  );
}
