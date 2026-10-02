import { describe, expect, it } from "vitest";

import { splitSentences } from "@/lib/text/split-sentences";

describe("splitSentences", () => {
  it("splits the hero heading into its two sentences without losing letters", () => {
    expect(
      splitSentences("Learn the basics. Earn proof that your skills are real."),
    ).toEqual(["Learn the basics.", "Earn proof that your skills are real."]);
  });

  it("keeps a single sentence whole", () => {
    expect(splitSentences("Just one sentence.")).toEqual(["Just one sentence."]);
  });

  it("never splits on the letter s or on a full stop inside a word", () => {
    expect(splitSentences("Basics and skills v1.2 matter.")).toEqual([
      "Basics and skills v1.2 matter.",
    ]);
  });

  it("trims and drops empty parts", () => {
    expect(splitSentences("  One.   Two.  ")).toEqual(["One.", "Two."]);
    expect(splitSentences("")).toEqual([]);
  });
});
