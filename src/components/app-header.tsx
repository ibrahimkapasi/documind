import { BookOpenText } from "lucide-react";
import Link from "next/link";

export function AppHeader() {
  return (
    <header className="header-enter sticky top-0 z-40 border-b border-white/70 bg-white/72 shadow-[0_1px_0_rgb(15_23_42/0.035),0_8px_24px_rgb(15_23_42/0.025)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/68">
      <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center px-4 sm:px-6 lg:px-8">
        <Link
          className="brand-link group inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80"
          href="/"
          aria-label="DocuMind home"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] border border-indigo-500/35 bg-indigo-600 text-white shadow-[0_1px_2px_rgb(15_23_42/0.08),0_6px_16px_rgb(79_70_229/0.18)] transition-[background-color,box-shadow,transform] duration-200 ease-out group-hover:-translate-y-px group-hover:bg-indigo-700 group-hover:shadow-[0_2px_4px_rgb(15_23_42/0.08),0_8px_20px_rgb(79_70_229/0.22)]">
            <BookOpenText aria-hidden="true" size={18} strokeWidth={2.15} />
          </span>
          <span className="text-[1.05rem] font-semibold tracking-[-0.025em] text-slate-950 sm:text-[1.08rem]">
            DocuMind
          </span>
        </Link>
      </div>
    </header>
  );
}
