import { Suspense } from "react";

import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted-foreground">Đang tải…</div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
