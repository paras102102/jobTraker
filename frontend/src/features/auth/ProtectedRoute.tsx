import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 flex flex-col gap-6 max-w-4xl mx-auto animate-pulse">
        <div className="h-8 w-40 bg-zinc-200 dark:bg-zinc-800 rounded-[4px]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-[6px]" />
          <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-[6px]" />
        </div>
      </div>
    );
  }

  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${returnUrl}`} replace />;
  }

  return <>{children}</>;
}
