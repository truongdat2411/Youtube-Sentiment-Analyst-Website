"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { getAuthToken } from "@/lib/auth-token";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      const qs = searchParams.toString();
      const nextPath = qs ? `${pathname}?${qs}` : pathname;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    setAllowed(true);
  }, [pathname, router, searchParams]);

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Đang kiểm tra phiên đăng nhập…</p>
      </div>
    );
  }

  return <>{children}</>;
}
