import { strFromU8, unzipSync, type UnzipFileInfo } from "fflate";

const MAX_DOCX_XML_BYTES = 20 * 1024 * 1024;
const WORD_CONTENT_PATH =
  /^word[\\/](?:document|header\d+|footer\d+|footnotes|endnotes)\.xml$/i;

function normalizedArchivePath(path: string): string {
  return path.replaceAll("\\", "/").toLowerCase();
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

export function extractTextFromWordXml(xml: string): string {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab\b[^>]*\/>/gi, "\t")
      .replace(/<w:(?:br|cr)\b[^>]*\/>/gi, "\n")
      .replace(/<\/w:tc>/gi, "\t")
      .replace(/<\/w:(?:p|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractTextFromDocx(buffer: Uint8Array): string {
  let selectedBytes = 0;
  const archive = unzipSync(buffer, {
    filter(file: UnzipFileInfo) {
      if (!WORD_CONTENT_PATH.test(file.name)) return false;

      selectedBytes += file.originalSize;
      if (selectedBytes > MAX_DOCX_XML_BYTES) {
        throw new Error("DOCX text content is too large.");
      }

      return true;
    },
  });

  const paths = Object.keys(archive).sort((left, right) => {
    if (normalizedArchivePath(left) === "word/document.xml") return -1;
    if (normalizedArchivePath(right) === "word/document.xml") return 1;
    return left.localeCompare(right);
  });

  if (
    !paths.some(
      (path) => normalizedArchivePath(path) === "word/document.xml",
    )
  ) {
    throw new Error("DOCX does not contain word/document.xml.");
  }

  return paths
    .map((path) => extractTextFromWordXml(strFromU8(archive[path])))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}
