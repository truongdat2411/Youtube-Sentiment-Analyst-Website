"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { registerApi } from "@/lib/api";
import { setAuthToken } from "@/lib/auth-token";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next") ?? "/analysis";
  const nextEnc = encodeURIComponent(nextRaw.startsWith("/") ? nextRaw : "/analysis");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tok = await registerApi(email.trim(), password, fullName.trim() || undefined);
      setAuthToken(tok.access_token);
      router.replace(nextRaw.startsWith("/") ? nextRaw : "/analysis");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Đăng ký</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href={`/login?next=${nextEnc}`} className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </motion.div>

      <Card className="border-border/70 shadow-card">
        <CardHeader>
          <CardTitle>Tạo tài khoản</CardTitle>
          <CardDescription>Mật khẩu tối thiểu 8 ký tự.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full-name">Họ tên (tuỳ chọn)</Label>
              <Input
                id="full-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Mật khẩu</Label>
              <Input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                className="bg-card"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Đăng ký"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
