import { FileText, LockKeyhole, Sparkles } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { DocumentWorkspace } from "@/components/document-workspace";

export default function Home() {
  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1480px] px-4 pb-8 pt-10 sm:px-6 lg:px-8 lg:pb-12 lg:pt-14">
        <section className="mx-auto max-w-3xl text-center">
          <div className="eyebrow">
            <Sparkles aria-hidden="true" size={14} />
            Document intelligence, simplified
          </div>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
            Read less. Understand more.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg">
            Add a PDF, Word document, text file, scan, or image to explore its contents and ask focused questions.
            Every answer will be grounded only in your uploaded documents.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <FileText aria-hidden="true" size={15} />
              PDF, DOCX &amp; TXT
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole aria-hidden="true" size={15} />
              Gemini-powered answers
            </span>
          </div>
        </section>

        <DocumentWorkspace />
      </main>

      <footer className="border-t border-slate-200/80 px-6 py-5 text-center text-xs text-slate-500">
        Powered by Gemini multimodal understanding and grounded File Search.
      </footer>
    </div>
  );
}
