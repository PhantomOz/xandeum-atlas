import { Loader2 } from "lucide-react";

interface EmbedLoaderProps {
  label?: string;
}

export function EmbedLoader({ label }: EmbedLoaderProps) {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-[24px] bg-slate-950/70 p-8 text-slate-300">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{label ?? "Loading"}</p>
      </div>
    </div>
  );
}
