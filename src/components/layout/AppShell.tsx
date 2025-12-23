import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.25),_transparent_55%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(248,250,252,0.08),_transparent_45%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-10 lg:px-10 lg:py-14">
          <div className="rounded-3xl border border-white/5 bg-slate-950/60 p-6 shadow-[0_0_40px_rgba(15,23,42,0.45)] backdrop-blur">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
