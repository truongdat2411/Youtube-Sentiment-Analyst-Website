"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, Eye, Heart, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { analyzeComments } from "@/lib/api";
import type { AnalyzeCommentsResponse } from "@/types/analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const nf = new Intl.NumberFormat("vi-VN");

function sentimentVariant(s: string): "positive" | "neutral" | "negative" | "outline" {
  if (s === "positive") return "positive";
  if (s === "negative") return "negative";
  if (s === "neutral") return "neutral";
  return "outline";
}

export function AnalysisWorkspace({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [data, setData] = useState<AnalyzeCommentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (target: string) => {
    const u = target.trim();
    if (!u) {
      setError("Vui lòng nhập URL YouTube.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeComments(u);
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialUrl.trim()) {
      setUrl(initialUrl);
      void run(initialUrl);
    }
  }, [initialUrl, run]);

  const barData = useMemo(() => {
    if (!data) return [];
    const b = data.sentiment_breakdown;
    return [
      { name: "Tích cực", value: b.positive, fill: "hsl(152 69% 40%)" },
      { name: "Trung lập", value: b.neutral, fill: "hsl(215 16% 47%)" },
      { name: "Tiêu cực", value: b.negative, fill: "hsl(0 72% 51%)" },
    ];
  }, [data]);

  const pieData = useMemo(() => barData.filter((d) => d.value > 0), [barData]);

  const commentStat = data?.video.comment_count_total ?? data?.total_comments;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="dash-url">YouTube URL</Label>
          <Input
            id="dash-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-11 bg-card shadow-sm"
          />
        </div>
        <Button className="h-11 gap-2 sm:w-40" onClick={() => void run(url)} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Phân tích
        </Button>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Không thể hoàn tất phân tích</p>
            <p className="mt-1 text-red-800/90">{error}</p>
          </div>
        </motion.div>
      )}

      {loading && !data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-72 rounded-xl lg:col-span-3" />
        </div>
      )}

      {data && (
        <>
          {/* Video info */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid gap-6 lg:grid-cols-[220px_1fr]"
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-card">
              {data.video.thumbnail_url ? (
                <Image src={data.video.thumbnail_url} alt="" fill className="object-cover" sizes="(max-width:1024px) 100vw, 220px" />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent text-sm text-muted-foreground">
                  No thumbnail
                </div>
              )}
            </div>
            <Card className="border-border/70">
              <CardHeader className="pb-2">
                <CardDescription>Video</CardDescription>
                <CardTitle className="text-2xl leading-snug">{data.video.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Eye, label: "Lượt xem", value: nf.format(data.video.view_count) },
                  { icon: Heart, label: "Lượt thích", value: nf.format(data.video.like_count) },
                  { icon: MessageCircle, label: "Bình luận (YT)", value: commentStat != null ? nf.format(commentStat) : "—" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    className="rounded-xl border border-border/50 bg-secondary/40 px-4 py-3"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <stat.icon className="h-3.5 w-3.5" />
                      {stat.label}
                    </div>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
                  </motion.div>
                ))}
                <p className="sm:col-span-3 text-xs text-muted-foreground">
                  Đã phân tích <strong>{nf.format(data.total_predictions)}</strong> bình luận có trong hệ thống (tối đa theo cấu hình ingest).
                </p>
              </CardContent>
            </Card>
          </motion.section>

          <Separator />

          {/* Sentiment + charts */}
          <section className="grid gap-6 lg:grid-cols-3">
            {(["positive", "neutral", "negative"] as const).map((key, i) => {
              const val = data.sentiment_breakdown[key];
              const labels = { positive: "Tích cực", neutral: "Trung lập", negative: "Tiêu cực" } as const;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.07 * i, duration: 0.35 }}
                  whileHover={{ y: -2 }}
                >
                  <Card className="h-full border-border/70 transition-shadow hover:shadow-lg">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">{labels[key]}</CardTitle>
                        <Badge variant={sentimentVariant(key)}>{nf.format(val)}</Badge>
                      </div>
                      <CardDescription>Tổng nhãn trong tập kết quả</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold tabular-nums tracking-tight">{nf.format(val)}</div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {data.total_predictions > 0
                          ? `${((val / data.total_predictions) * 100).toFixed(1)}% tổng mẫu`
                          : "Chưa có mẫu"}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </section>

          <Tabs defaultValue="charts" className="w-full">
            <TabsList>
              <TabsTrigger value="charts">Biểu đồ</TabsTrigger>
              <TabsTrigger value="table">Bảng bình luận</TabsTrigger>
            </TabsList>
            <TabsContent value="charts" className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố sentiment</CardTitle>
                  <CardDescription>Bar chart — Recharts</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/80" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={88} tick={{ fontSize: 12 }} />
                      <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                        {barData.map((e) => (
                          <Cell key={e.name} fill={e.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tỷ trọng</CardTitle>
                  <CardDescription>Donut — nội dung có trọng số</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {pieData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Không có dữ liệu</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={68} outerRadius={100} paddingAngle={3}>
                          {pieData.map((e, idx) => (
                            <Cell key={idx} fill={e.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="table">
              <Card>
                <CardHeader>
                  <CardTitle>Bình luận & sentiment</CardTitle>
                  <CardDescription>{nf.format(data.predictions.length)} dòng</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tác giả</TableHead>
                        <TableHead>Nội dung</TableHead>
                        <TableHead className="w-[120px]">Sentiment</TableHead>
                        <TableHead className="w-[100px] text-right">Độ tin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.predictions.map((row) => (
                        <TableRow key={row.youtube_comment_id}>
                          <TableCell className="max-w-[140px] truncate font-medium text-foreground/80">
                            {row.author ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-xl">
                            <span className="line-clamp-2 text-muted-foreground">{row.text_original}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={sentimentVariant(row.sentiment)}>{row.sentiment}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {(row.confidence * 100).toFixed(0)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
