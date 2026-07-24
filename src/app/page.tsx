import { BookOpenCheck, FileSearch, Files, ScanText } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { DocumentWorkspace } from "@/components/document-workspace";

export default function Home() {
  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="page-content-enter mx-auto w-full max-w-[1480px] px-4 pb-8 pt-9 sm:px-6 sm:pt-11 lg:px-8 lg:pb-12 lg:pt-12">
        <section className="mx-auto max-w-[52rem] text-center">
          <div className="flex items-center justify-center gap-2.5">
            <div className="eyebrow">
              <ScanText aria-hidden="true" size={14} />
              Document intelligence workspace
            </div>
            <div
              className="intelligence-mark"
              aria-label="Document intelligence active"
              role="img"
            >
              <span className="intelligence-mark__document">
                <span className="intelligence-mark__line" />
                <span className="intelligence-mark__line intelligence-mark__line--short" />
                <span className="intelligence-mark__scan" />
              </span>
              <span className="intelligence-mark__signal" />
              <span className="intelligence-mark__signal intelligence-mark__signal--delayed" />
            </div>
          </div>
          <h1 className="mt-4 text-balance text-[2.15rem] font-semibold leading-[1.12] tracking-[-0.045em] text-slate-950 sm:text-[2.75rem] lg:text-[3.15rem]">
            Understand your documents.
            <span className="block text-slate-600">Ask with context.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[42rem] text-pretty text-[0.95rem] leading-7 text-slate-600 sm:text-base">
            Upload documents for Gemini to understand, then ask focused
            questions grounded in their content.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-xs font-medium text-slate-500 sm:text-[0.8rem]">
            <span className="inline-flex items-center gap-1.5">
              <Files aria-hidden="true" className="text-slate-400" size={14} />
              Documents, scans, and images
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileSearch aria-hidden="true" className="text-slate-400" size={14} />
              Multimodal document analysis
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpenCheck aria-hidden="true" className="text-slate-400" size={14} />
              Source-grounded answers
            </span>
          </div>
        </section>

        <DocumentWorkspace />
      </main>

      <footer className="border-t border-slate-200/80 px-6 py-5 text-center text-xs text-slate-500">
        Document understanding powered by Gemini.
      </footer>
    </div>
  );
}
