"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, LineChart, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.06 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] } }),
};

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    router.push(`/analysis?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="space-y-16">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <motion.div custom={0} initial="hidden" animate="show" variants={fadeUp} className="inline-flex">
            <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              AI analytics · PhoBERT · Production layout
            </span>
          </motion.div>
          <motion.h1
            custom={1}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]"
          >
            Hiểu khán giả qua <span className="text-primary">sentiment</span> bình luận YouTube
          </motion.h1>
          <motion.p
            custom={2}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            className="max-w-xl text-lg text-muted-foreground"
          >
            Nhập URL video để trích xuất bình luận, phân loại cảm xúc và xem dashboard trực quan — cần{" "}
            <strong>đăng nhập</strong> để phân tích và xem lịch sử. UI SaaS hiện đại, biểu đồ Recharts và Framer Motion.
          </motion.p>

          <motion.form
            custom={3}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            onSubmit={onSubmit}
            className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="url">YouTube URL</Label>
              <Input
                id="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-11 bg-card shadow-sm"
              />
            </div>
            <Button type="submit" size="lg" className="h-11 shrink-0 gap-2">
              Mở dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.form>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <Card className="overflow-hidden border-border/70 bg-gradient-to-br from-card to-secondary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChart className="h-4 w-4 text-primary" />
                Pipeline
              </CardTitle>
              <CardDescription>Ingest → preprocess → PhoBERT → PostgreSQL</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Shield, title: "API an toàn", desc: "FastAPI + validation" },
                { icon: BarChart3, title: "Biểu đồ", desc: "Recharts responsive" },
                { icon: Sparkles, title: "Motion", desc: "Framer Motion cards" },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="rounded-lg border border-border/60 bg-background/80 p-4 shadow-sm"
                >
                  <item.icon className="mb-2 h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  );
}
