import test from "node:test";
import assert from "node:assert/strict";
import { BIBLE_BOOKS } from "./bibleCatalog.js";
import { parseBulkVerses, validateVerses } from "./bibleContent.js";

test("catalog contains each canonical Protestant Bible book once", () => {
  assert.equal(BIBLE_BOOKS.length, 66);
  assert.equal(new Set(BIBLE_BOOKS.map((book) => book.id)).size, 66);
  assert.equal(BIBLE_BOOKS.reduce((total, book) => total + book.chapterCount, 0), 1189);
});

test("parses unnumbered Hindi and Telugu verses without damaging Unicode", () => {
  const result = parseBulkVerses("परमेश्वर ने कहा।\nదేవుడు చెప్పెను.");
  assert.deepEqual(result.verses, [
    { number: 1, text: "परमेश्वर ने कहा।" },
    { number: 2, text: "దేవుడు చెప్పెను." },
  ]);
  assert.deepEqual(result.errors, []);
});

test("parses explicitly numbered verse lines", () => {
  const result = parseBulkVerses("1 | पहले पद का पाठ\n2 | రెండవ వచనము");
  assert.deepEqual(result.verses, [
    { number: 1, text: "पहले पद का पाठ" },
    { number: 2, text: "రెండవ వచనము" },
  ]);
  assert.deepEqual(result.errors, []);
});

test("reports empty text, duplicate numbers, and numbering gaps", () => {
  const result = validateVerses([
    { number: 1, text: "Verse one" },
    { number: 1, text: "Duplicate" },
    { number: 3, text: "" },
  ]);
  assert.ok(result.errors.some((error) => error.includes("Verse 1 is duplicated")));
  assert.ok(result.errors.some((error) => error.includes("Verse 3 has no text")));
  assert.deepEqual(result.missingNumbers, [2]);
  assert.equal(result.warnings.length, 1);
});

test("reports malformed or mixed numbered input rather than dropping lines", () => {
  const result = parseBulkVerses("1 | One\nnot numbered");
  assert.ok(result.errors.some((error) => error.includes("Line 2")));
});
