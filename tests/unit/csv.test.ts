import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("quotes every cell and emits a header row", () => {
    const csv = toCsv([{ a: "1", b: "two" }], ["a", "b"]);
    expect(csv).toBe('﻿"a","b"\r\n"1","two"\r\n');
  });

  it("doubles embedded quotes rather than breaking the row", () => {
    const csv = toCsv([{ note: 'she said "hi"' }], ["note"]);
    expect(csv).toContain('"she said ""hi"""');
  });

  it("keeps commas and newlines inside a single cell", () => {
    const csv = toCsv([{ note: "a,b\nc" }], ["note"]);
    expect(csv).toContain('"a,b\nc"');
  });

  it("neutralises formula injection", () => {
    // =HYPERLINK(...) in an exported cell executes when Excel opens it.
    const csv = toCsv([{ name: "=HYPERLINK(\"http://evil\")" }], ["name"]);
    expect(csv).toContain("\"'=HYPERLINK");
  });

  it("writes empty strings for missing and null values", () => {
    const csv = toCsv([{ a: null }], ["a", "missing"]);
    expect(csv).toBe('﻿"a","missing"\r\n"",""\r\n');
  });
});
