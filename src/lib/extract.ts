import fs from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import JSZip from "jszip";
import TurndownService from "turndown";
import { createWorker } from "tesseract.js";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-"
});

function stripXmlTags(input: string) {
  return input
    .replace(/<\?xml[\s\S]*?\?>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function fromHtml(html: string) {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe").remove();
  const content =
    $("article").text().trim() ||
    $("main").text().trim() ||
    $("body").text().trim() ||
    $.text();
  return content.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function extractFromImage(filePath: string) {
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(filePath);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}

async function extractFromPptx(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const texts: string[] = [];
  for (const slideFile of slideFiles) {
    const slideXml = await zip.files[slideFile]?.async("string");
    if (!slideXml) continue;
    texts.push(stripXmlTags(slideXml));
  }
  return texts.join("\n\n");
}

async function extractFromDocx(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

export async function extractTextFromFile(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  if (extension === ".txt" || extension === ".md" || extension === ".markdown") {
    return buffer.toString("utf8");
  }

  if (extension === ".pdf") {
    const result = await pdfParse(buffer);
    return result.text.trim();
  }

  if (extension === ".docx") {
    return extractFromDocx(buffer);
  }

  if (extension === ".pptx") {
    return extractFromPptx(buffer);
  }

  if ([".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp"].includes(extension)) {
    return extractFromImage(filePath);
  }

  return buffer.toString("utf8");
}

export async function extractTextFromUrl(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "FMS-Knowledge-Workspace/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  if (contentType.includes("text/html")) {
    return fromHtml(body);
  }

  if (contentType.includes("text/markdown") || url.endsWith(".md")) {
    return turndown.turndown(body);
  }

  return body.trim();
}

export async function extractTextFromResource(input: { filePath?: string | null; sourceUrl?: string | null }) {
  if (input.filePath) {
    return extractTextFromFile(input.filePath);
  }
  if (input.sourceUrl) {
    return extractTextFromUrl(input.sourceUrl);
  }
  return "";
}

