export async function parseFile(file: File): Promise<string> {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type === "text/plain" || name.endsWith(".txt")) {
    return parseTxt(file);
  }
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return parseDocx(file);
  }
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return parsePdf(file);
  }

  throw new Error("Unsupported file type. Supported: .txt, .docx, .pdf");
}

// Minimal types to avoid 'any' while using dynamic imports
 type MammothModule = {
   extractRawText: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
 };
 type PdfTextItem = { str: string };
 type PdfTextContent = { items: PdfTextItem[] };
 type PdfPage = { getTextContent: () => Promise<PdfTextContent> };
 type PdfDocument = { numPages: number; getPage: (n: number) => Promise<PdfPage> };
 type PdfjsLib = {
   GlobalWorkerOptions?: { workerSrc: string };
   getDocument: (options: { data: Uint8Array }) => { promise: Promise<PdfDocument> };
 };

 export async function parseTxt(file: File): Promise<string> {
   const text = await file.text();
   return normalizeText(text);
 }

 export async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  let mammoth: MammothModule;
  try {
    mammoth = (await import("mammoth/mammoth.browser")) as unknown as MammothModule;
  } catch {
    // Fallback for environments that don't expose the browser build path
    mammoth = (await import("mammoth")) as unknown as MammothModule;
  }
  const result = await mammoth.extractRawText({ arrayBuffer });
  return normalizeText(result.value || "");
}

export async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = (await import("pdfjs-dist")) as unknown as PdfjsLib;
  // Prefer local worker for offline use; fallback to CDN if not present
  if (pdfjsLib.GlobalWorkerOptions && typeof window !== "undefined") {
    try {
      const res = await fetch("/pdf.worker.min.js", { method: "HEAD" });
      if (res.ok) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      } else {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
  }

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  let out = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent: PdfTextContent = await page.getTextContent();
    const pageText = textContent.items.map((item: PdfTextItem) => item.str).join(" ");
    out += pageText;
    if (i < pdf.numPages) out += "\n\n"; // separate pages
  }

  return normalizeText(out);
}

function normalizeText(text: string): string {
  // Normalize whitespace while preserving paragraph breaks
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[ \f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}