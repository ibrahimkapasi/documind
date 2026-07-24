import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";

import {
  extractTextFromDocx,
  extractTextFromWordXml,
} from "@/services/docx-text";

describe("DOCX text extraction", () => {
  it("preserves paragraphs, tables, entities, and Arabic text", () => {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      "<w:body>",
      "<w:p><w:r><w:t>Invoice &amp; receipt</w:t></w:r></w:p>",
      "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>Total</w:t></w:r></w:p></w:tc>",
      "<w:tc><w:p><w:r><w:t>INR 54,321</w:t></w:r></w:p></w:tc></w:tr></w:tbl>",
      "<w:p><w:r><w:t>مرحبا هذا مستند تجريبي</w:t></w:r></w:p>",
      "</w:body></w:document>",
    ].join("");

    expect(extractTextFromWordXml(xml)).toContain("Invoice & receipt");
    expect(extractTextFromWordXml(xml)).toContain("Total");
    expect(extractTextFromWordXml(xml)).toContain("INR 54,321");
    expect(extractTextFromWordXml(xml)).toContain("مرحبا هذا مستند تجريبي");
  });

  it("extracts the main document from a valid DOCX archive", () => {
    const archive = zipSync({
      "[Content_Types].xml": strToU8("<Types />"),
      "word/document.xml": strToU8(
        '<w:document xmlns:w="x"><w:body><w:p><w:r><w:t>Arabic Demo Company</w:t></w:r></w:p></w:body></w:document>',
      ),
    });

    expect(extractTextFromDocx(archive)).toBe("Arabic Demo Company");
  });

  it("accepts Windows-style archive paths", () => {
    const archive = zipSync({
      "word\\document.xml": strToU8(
        '<w:document xmlns:w="x"><w:body><w:p><w:r><w:t>Windows DOCX</w:t></w:r></w:p></w:body></w:document>',
      ),
    });

    expect(extractTextFromDocx(archive)).toBe("Windows DOCX");
  });

  it("rejects an archive without a Word document body", () => {
    const archive = zipSync({
      "[Content_Types].xml": strToU8("<Types />"),
    });

    expect(() => extractTextFromDocx(archive)).toThrow(
      "word/document.xml",
    );
  });
});
