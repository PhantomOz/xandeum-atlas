import { BellRing, BookOpen, Code, LayoutPanelLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.28),_transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(248,250,252,0.08),_transparent_45%)]" />
        <div className="relative mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-8 lg:px-12 lg:py-14 xl:px-16 xl:py-20">
          <div className="rounded-[32px] border border-white/5 bg-slate-950/70 p-6 shadow-[0_40px_120px_rgba(2,6,23,0.65)] backdrop-blur-xl sm:p-8">
            <div className="mb-10 flex flex-col gap-5 border-b border-white/5 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/" className="flex items-center gap-4">
                <div className="relative h-12 w-12 sm:h-14 sm:w-14">
                  <Image src="/xandeum-logo.svg" alt="Xandeum" width={80} height={80} priority className="h-full w-full" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.45em] text-emerald-300">Xandeum</p>
                  <p className="text-lg font-semibold text-white">pNode Atlas</p>
                </div>
              </Link>
              <div className="flex flex-col gap-3 text-sm text-slate-400 sm:max-w-md sm:text-right">
                <p>Operational telemetry for the distributed storage network — crafted for operators who need desktop-grade insight.</p>
                <nav className="flex flex-wrap justify-start gap-2 text-xs sm:justify-end">
                  <Link
                    href="/alerts"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-semibold uppercase tracking-[0.35em] text-white transition hover:border-emerald-400"
                  >
                    <BellRing className="h-3.5 w-3.5 text-emerald-300" />
                    Alerts
                  </Link>
                  <Link
                    href="/guide"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-semibold uppercase tracking-[0.35em] text-white transition hover:border-emerald-400"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-emerald-300" />
                    Guide
                  </Link>
                  <Link
                    href="/docs/export-api"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-semibold uppercase tracking-[0.35em] text-white transition hover:border-emerald-400"
                  >
                    <Code className="h-3.5 w-3.5 text-emerald-300" />
                    API Docs
                  </Link>
                  <Link
                    href="/embed/summary"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-semibold uppercase tracking-[0.35em] text-white transition hover:border-emerald-400"
                  >
                    <LayoutPanelLeft className="h-3.5 w-3.5 text-emerald-300" />
                    Embeds
                  </Link>
                </nav>
              </div>
            </div>
            {children}
            <p className="mt-8 text-[11px] uppercase tracking-[0.4em] text-white/25">
              Crafted by
              {" "}
              <Link href="https://x.com/SuperDevFavour" className="text-white/40 underline-offset-2 hover:text-white/70">
                @SuperDevFavour
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
