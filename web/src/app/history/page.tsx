import { Suspense } from "react";

import { RequireAuth } from "@/components/auth/require-auth";
import { HistoryTable } from "./history-table";

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Đang tải…</div>
      }
    >
      <RequireAuth>
        <HistoryTable />
      </RequireAuth>
    </Suspense>
  );
}
