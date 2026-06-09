declare module "pdf-parse" {
  type PdfParseResult = {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
  };

  function pdfParse(dataBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<PdfParseResult>;

  export default pdfParse;
}

