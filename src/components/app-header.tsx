import { BookOpenText } from "lucide-react";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="inline-flex items-center gap-2.5" href="/" aria-label="DocuMind home">
          <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
            <BookOpenText aria-hidden="true" size={19} strokeWidth={2.2} />
          </span>
          <span className="text-[1.05rem] font-semibold tracking-tight text-slate-950">
            DocuMind
          </span>
        </Link>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
          Phase 1
        </span>
      </div>
    </header>
  );
}
