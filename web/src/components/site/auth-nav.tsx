"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, History, UserCircle } from "lucide-react";

import { clearAuthToken, getAuthToken } from "@/lib/auth-token";
import { fetchMe } from "@/lib/api";
import type { UserRead } from "@/types/auth";
import { Button } from "@/components/ui/button";

export function AuthNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserRead | null>(null);
  const [checked, setChecked] = useState(false);

  const load = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setChecked(true);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, pathname]);

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setChecked(true);
    router.refresh();
    router.push("/");
  };

  if (!checked) {
    return <div className="h-8 w-24 animate-pulse rounded-md bg-muted/60" aria-hidden />;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link href="/login">Đăng nhập</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">Đăng ký</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
        <Link href="/history">
          <History className="h-4 w-4" />
          Lịch sử
        </Link>
      </Button>
      <span className="hidden max-w-[160px] truncate text-xs text-muted-foreground sm:inline-flex sm:items-center sm:gap-1">
        <UserCircle className="h-4 w-4 shrink-0" />
        {user.full_name || user.email}
      </span>
      <Button variant="outline" size="sm" className="gap-1.5" type="button" onClick={logout}>
        <LogOut className="h-4 w-4" />
        Đăng xuất
      </Button>
    </div>
  );
}
