"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ExternalLink, Loader2 } from "lucide-react";

import { fetchAnalysisHistory } from "@/lib/api";
import type { AnalysisHistoryEntry } from "@/types/history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const nf = new Intl.NumberFormat("vi-VN");

function formatDt(iso: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function HistoryTable() {
  const [items, setItems] = useState<AnalysisHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAnalysisHistory(0, 100);
        if (!cancelled) {
          setItems(res.items);
          setTotal(res.total);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Không tải được lịch sử");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Lịch sử phân tích</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Các lần bạn chạy phân tích đã được ghi nhận theo tài khoản. Tổng:{" "}
          <strong>{nf.format(total)}</strong> mục.
        </p>
      </motion.div>

      <Card className="border-border/70 shadow-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Bản ghi</CardTitle>
            <CardDescription>Mở lại dashboard với cùng URL video.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/analysis">Phân tích mới</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div>
          )}
          {!loading && !error && items.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Chưa có lịch sử. Hãy phân tích một video.</p>
          )}
          {!loading && !error && items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời điểm</TableHead>
                  <TableHead>Video</TableHead>
                  <TableHead className="text-right">Tích cực</TableHead>
                  <TableHead className="text-right">Trung lập</TableHead>
                  <TableHead className="text-right">Tiêu cực</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDt(row.analyzed_at)}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="truncate font-medium text-foreground" title={row.video_title ?? row.video_url}>
                        {row.video_title ?? row.youtube_video_id}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{row.video_url}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{nf.format(row.positive_count)}</TableCell>
                    <TableCell className="text-right tabular-nums">{nf.format(row.neutral_count)}</TableCell>
                    <TableCell className="text-right tabular-nums">{nf.format(row.negative_count)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1" asChild>
                        <Link href={`/analysis?url=${encodeURIComponent(row.video_url)}`}>
                          Mở lại
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
