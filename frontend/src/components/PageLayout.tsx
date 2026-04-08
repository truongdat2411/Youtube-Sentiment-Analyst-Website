import type { ReactNode } from "react";

import { theme } from "../theme";

interface PageLayoutProps {
  topBar?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function PageLayout({ topBar, title, subtitle, children }: PageLayoutProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${theme.pageBgTop} 0%, ${theme.pageBgBottom} 100%)`,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "30px 16px 54px",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
          color: theme.textMain,
        }}
      >
        {topBar ? <div style={{ marginBottom: 16 }}>{topBar}</div> : null}
        <section
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 18,
            background: theme.surface,
            boxShadow: theme.shadow,
            padding: 22,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26 }}>{title}</h1>
          {subtitle ? <p style={{ margin: "8px 0 0", color: theme.textSoft }}>{subtitle}</p> : null}
          <div style={{ marginTop: 18 }}>{children}</div>
        </section>
      </div>
    </main>
  );
}
