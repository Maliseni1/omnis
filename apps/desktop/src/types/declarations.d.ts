declare module "html-to-docx" {
  const HTMLtoDOCX: (
    htmlString: string,
    headerHTML?: string | null,
    documentOptions?: Record<string, unknown>, // Fixed: Replaced 'any' with proper type
    footerHTML?: string | null
  ) => Promise<Buffer>;
  export default HTMLtoDOCX;
}
