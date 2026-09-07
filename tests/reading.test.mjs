import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { filterReading, formatSavedDate, isArticleUrl, isReadingDate, readingSource } from "../src/utils/reading.ts";

const items = JSON.parse(readFileSync(new URL("./fixtures/reading.json", import.meta.url), "utf8"));

test("article URLs support HTTP(S) but reject executable or credential-bearing links", () => {
  assert.equal(isArticleUrl("https://example.com/a?q=hello#part"), true);
  assert.equal(isArticleUrl("http://example.com/a"), true);
  for (const url of ["javascript:alert(1)", "data:text/html,hello", "/relative", "https://user:secret@example.com", "not a URL"]) {
    assert.equal(isArticleUrl(url), false, url);
  }
});

test("saved dates are real calendar dates and display without timezone shifts", () => {
  assert.equal(isReadingDate("2024-02-29"), true);
  for (const date of ["2026-02-29", "2026-04-31", "2026-13-01", "09/08/2026", "2026-09-08T12:00:00Z"]) {
    assert.equal(isReadingDate(date), false, date);
  }
  assert.equal(formatSavedDate("2026-09-08"), "Sep 8, 2026");
});

test("sources identify the original publisher without URL paths or tracking queries", () => {
  assert.equal(readingSource("https://www.example.org/article?utm_source=x#intro"), "example.org");
});

test("saves sort newest first without changing the input or duplicating multi-topic entries", () => {
  const shuffled = [items[2], items[0], items[1]];
  const original = structuredClone(shuffled);
  assert.deepEqual(filterReading(shuffled).map((item) => item.id), items.map((item) => item.id));
  assert.deepEqual(shuffled, original);
  assert.equal(filterReading(items).length, 3);
});

test("search combines words across source, title, author, notes, and readable topics", () => {
  assert.equal(filterReading(items, " EXAMPLE.ORG correctness ")[0].id, "example-system-correctness");
  assert.equal(filterReading(items, "reason original", "formal-methods").length, 1);
  assert.equal(filterReading(items, "another example author").length, 1);
  assert.equal(filterReading(items, "AI Coding").length, 1);
  assert.equal(filterReading(items, "system", "ai-coding").length, 0);
  assert.deepEqual(filterReading([], "test"), []);
  assert.equal(filterReading(items, "   ").length, 3);
});
