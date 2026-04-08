import type { ReactNode } from "react";

interface ProtectedRouteProps {
  isAllowed: boolean;
  fallback: ReactNode;
  children: ReactNode;
}

export default function ProtectedRoute({ isAllowed, fallback, children }: ProtectedRouteProps) {
  if (!isAllowed) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
