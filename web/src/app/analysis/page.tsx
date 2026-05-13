import { Suspense } from "react";

import { AnalysisWorkspace } from "@/components/analysis/analysis-workspace";
import { RequireAuth } from "@/components/auth/require-auth";

function AnalysisContent({ url }: { url: string }) {
  return (
    <RequireAuth>
      <AnalysisWorkspace initialUrl={url} />
    </RequireAuth>
  );
}

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const sp = await searchParams;
  const url = sp.url ?? "";
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Đang tải…
        </div>
      }
    >
      <AnalysisContent url={url} />
    </Suspense>
  );
}
