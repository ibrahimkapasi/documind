# DocuMind

DocuMind is a Gemini-powered document intelligence workspace built with
Next.js, TypeScript, Tailwind CSS, the Google Gen AI SDK, and Gemini File
Search.

Users can upload up to five PDF, DOCX, TXT, PNG, JPG, or WebP files. Every
upload is indexed by Gemini, receives an AI-generated overview, and becomes
available for grounded question answering. Questions can target the selected
document or the entire workspace. Gemini answers in the user's language and
returns source filenames, excerpts, and PDF page numbers when available.

## Architecture

1. `POST /api/documents` validates an uploaded file.
2. DOCX files are safely unpacked as text, preserving multilingual content
   such as Arabic while avoiding a Gemini File Search MIME incompatibility.
3. Gemini Vision transcribes images and describes useful visual content before
   it is indexed, making scans, screenshots, tables, and diagrams searchable.
4. The server creates one Gemini File Search store per document.
5. Gemini chunks, embeds, and indexes the prepared content.
6. The browser receives a signed opaque document token instead of a Gemini
   resource name.
7. Question routes verify those tokens and ask Gemini across the selected File
   Search stores.
8. Deleting a document permanently deletes its Gemini File Search store.

The signed-token design does not depend on process memory, so document
references continue to work across Vercel serverless instances. Raw Gemini
resource names and the Gemini API key never reach the browser.

## Supported uploads

- PDF
- DOCX
- TXT
- PNG
- JPG and JPEG
- WebP

The application accepts one file per upload request, up to 10 MB per file, and
keeps up to five documents in the current browser workspace.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   ```env
   GEMINI_API_KEY=your_google_ai_studio_key
   GEMINI_MODEL=gemini-3.6-flash
   DOCUMENT_TOKEN_SECRET=replace_with_a_long_random_value
   ```

   `GEMINI_MODEL` and `DOCUMENT_TOKEN_SECRET` are optional locally. In
   production, a separate stable `DOCUMENT_TOKEN_SECRET` is recommended so
   rotating the Gemini key does not invalidate existing document tokens.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Vercel

Add `GEMINI_API_KEY`, `GEMINI_MODEL`, and `DOCUMENT_TOKEN_SECRET` to the Vercel
project environment. The API key and signing secret must be server-only
variables and must not use the `NEXT_PUBLIC_` prefix.

Gemini free-tier quotas vary by project. The application returns safe messages
for quota exhaustion, authentication failure, unsupported content, indexing
timeouts, and temporary Gemini errors.

## Validation

```bash
npm test
npm run typecheck
npm run lint
npm run build
```
