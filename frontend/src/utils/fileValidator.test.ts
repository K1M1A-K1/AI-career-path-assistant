import { describe, expect, it } from "vitest";
import { MAX_RESUME_BYTES, validateResumeFile } from "./fileValidator";

const file = (bytes: number[], name: string, type = "") => new File([new Uint8Array(bytes)], name, { type });
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31];
const ZIP = [0x50, 0x4b, 0x03, 0x04, 0, 0];

describe("validateResumeFile", () => {
  it("requires privacy consent first", async () => {
    expect((await validateResumeFile(file(PDF, "a.pdf"), false)).valid).toBe(false);
  });
  it("accepts real pdf and docx signatures", async () => {
    expect((await validateResumeFile(file(PDF, "cv.pdf", "application/pdf"), true)).valid).toBe(true);
    expect((await validateResumeFile(file(ZIP, "cv.docx"), true)).valid).toBe(true);
  });
  it("rejects spoofed executables renamed to .pdf", async () => {
    const r = await validateResumeFile(file([0x4d, 0x5a, 0x90, 0x00], "invoice.pdf", "application/pdf"), true);
    expect(r.valid).toBe(false);
  });
  it("rejects legacy .doc by name and by OLE signature", async () => {
    expect((await validateResumeFile(file([0xd0, 0xcf, 0x11, 0xe0], "old.doc"), true)).valid).toBe(false);
    expect((await validateResumeFile(file([0xd0, 0xcf, 0x11, 0xe0], "old.docx"), true)).valid).toBe(false);
  });
  it("rejects empty, oversize and wrong extension", async () => {
    expect((await validateResumeFile(file([], "e.pdf"), true)).valid).toBe(false);
    const big = new File([new Uint8Array(MAX_RESUME_BYTES + 1)], "big.pdf");
    expect((await validateResumeFile(big, true)).valid).toBe(false);
    expect((await validateResumeFile(file(PDF, "x.txt"), true)).valid).toBe(false);
  });
});
