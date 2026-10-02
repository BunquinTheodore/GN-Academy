import { describe, expect, it } from "vitest";

import {
  ELLIPSIS,
  fitSingleLine,
  fitWrapped,
  formatIssueDate,
  toVerifyLabel,
  wrapLines,
} from "@/components/certificate-3d/certificate-face-layout";

/** Every character is `size` px wide: simple, deterministic metrics. */
const measure = (text: string, size: number) => Array.from(text).length * size;

describe("fitSingleLine", () => {
  it("keeps the start size when the text already fits", () => {
    expect(fitSingleLine("Ana Cruz", measure, 10, 200, 4)).toEqual({
      text: "Ana Cruz",
      size: 10,
    });
  });

  it("shrinks the font before touching the text", () => {
    const result = fitSingleLine("a".repeat(20), measure, 20, 100, 4);
    expect(result.text).toBe("a".repeat(20));
    expect(result.size).toBe(5);
  });

  it("ellipsizes a 120 character name that cannot fit at the floor", () => {
    const name = "Maria ".repeat(20).trim().slice(0, 120);
    const result = fitSingleLine(name, measure, 40, 300, 10);
    expect(result.size).toBe(10);
    expect(result.text.endsWith(ELLIPSIS)).toBe(true);
    expect(measure(result.text, result.size)).toBeLessThanOrEqual(300);
  });

  it("never returns a size below the floor", () => {
    expect(fitSingleLine("x".repeat(500), measure, 30, 50, 12).size).toBe(12);
  });

  it("handles an empty string", () => {
    expect(fitSingleLine("", measure, 10, 100, 4).text).toBe("");
  });
});

describe("wrapLines", () => {
  it("wraps on word boundaries", () => {
    const { lines, truncated } = wrapLines("aa bb cc dd", measure, 1, 5, 4);
    expect(lines).toEqual(["aa bb", "cc dd"]);
    expect(truncated).toBe(false);
  });

  it("breaks a single over-long word", () => {
    const { lines } = wrapLines("abcdefgh", measure, 1, 3, 5);
    expect(lines).toEqual(["abc", "def", "gh"]);
  });

  it("truncates with an ellipsis past maxLines", () => {
    const { lines, truncated } = wrapLines("aa bb cc dd ee", measure, 1, 5, 2);
    expect(truncated).toBe(true);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith(ELLIPSIS)).toBe(true);
    expect(measure(lines[1], 1)).toBeLessThanOrEqual(5);
  });

  it("collapses repeated whitespace", () => {
    expect(wrapLines("a   b", measure, 1, 10, 2).lines).toEqual(["a b"]);
  });
});

describe("fitWrapped", () => {
  it("shrinks until the title fits in the allowed lines", () => {
    const text = "Applied AI for Business Operations";
    const result = fitWrapped(text, measure, 20, 6, 120, 2);
    expect(result.lines.length).toBeLessThanOrEqual(2);
    expect(result.lines.join(" ")).toBe(text);
    for (const line of result.lines) {
      expect(measure(line, result.size)).toBeLessThanOrEqual(120);
    }
  });

  it("truncates at the floor when nothing else works", () => {
    const result = fitWrapped("word ".repeat(200), measure, 20, 8, 80, 2);
    expect(result.size).toBe(8);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[1].endsWith(ELLIPSIS)).toBe(true);
  });
});

describe("formatIssueDate", () => {
  it("matches the credential card format in Manila time", () => {
    expect(formatIssueDate("2026-03-05T10:00:00Z")).toBe("5 March 2026");
  });

  it("returns null for missing or invalid dates", () => {
    expect(formatIssueDate(null)).toBeNull();
    expect(formatIssueDate("not a date")).toBeNull();
  });
});

describe("toVerifyLabel", () => {
  it("drops the protocol and trailing slash", () => {
    expect(toVerifyLabel("https://gnacademy.ph/verify/CAVA-2026-000001/")).toBe(
      "gnacademy.ph/verify/CAVA-2026-000001",
    );
  });
});
