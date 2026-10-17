import { test } from "node:test";
import assert from "node:assert/strict";
import { filterPosts, sortByDate, sortForDisplay, summarizePost } from "../src/utils/blog.ts";
import { topicHref } from "../src/blog-config.ts";

function post(id, date, { order, tags = ["agent-engineering"], title = id, description = "" } = {}) {
  return { id, data: { title, date, tags, description, ...(order === undefined ? {} : { order }) } };
}

const posts = [
  post("recent", "2026-08-07", { title: "Sandbox boundaries", tags: ["ai-infrastructure"] }),
  post("ordered-old", "2025-01-01", { order: 1, title: "Building a Lab", description: "Harness performance experiments" }),
  post("ordered-new", "2026-07-12", { order: 2, title: "Agent tools" }),
  post("regular", "2026-06-21", { title: "Context engineering" }),
];

test("ordered articles come first by ascending order, then the rest by date", () => {
  assert.deepEqual([...posts].sort(sortForDisplay).map((p) => p.id), ["ordered-old", "ordered-new", "recent", "regular"]);
});

test("chronological feeds ignore order", () => {
  assert.deepEqual([...posts].sort(sortByDate).map((p) => p.id), ["recent", "ordered-new", "regular", "ordered-old"]);
});

test("topic filtering excludes unrelated ordered articles and never duplicates articles", () => {
  assert.deepEqual(filterPosts(posts, "", "ai-infrastructure").map((p) => p.id), ["recent"]);
  const multipleTopics = post("shared", "2026-01-01", { tags: ["ai-infrastructure", "agent-engineering"] });
  assert.equal(filterPosts([multipleTopics], "").length, 1);
  assert.equal(filterPosts([multipleTopics], "", "agent-engineering").length, 1);
});

test("search matches all words across title and summary, ignoring case and whitespace", () => {
  assert.deepEqual(filterPosts(posts, "  LAB   performance  ").map((p) => p.id), ["ordered-old"]);
  assert.equal(filterPosts(posts, "lab performance", "ai-infrastructure").length, 0);
  assert.equal(filterPosts(posts, "no-such-article").length, 0);
  assert.equal(filterPosts(posts, "   ").length, posts.length);
});

test("readable topic labels are searchable and source lists remain unchanged", () => {
  const original = structuredClone(posts);
  assert.deepEqual(filterPosts(posts, "AI Infrastructure").map((p) => p.id), ["recent"]);
  assert.deepEqual(posts, original);
  assert.deepEqual(filterPosts([], ""), []);
});

test("equal order values fall back to date order", () => {
  const tied = [post("old", "2025-01-01", { order: 1 }), post("new", "2026-01-01", { order: 1 })];
  assert.deepEqual(tied.sort(sortForDisplay).map((p) => p.id), ["new", "old"]);
});

test("equal dates sort deterministically", () => {
  const equal = [post("z", "2026-01-01"), post("a", "2026-01-01")];
  assert.deepEqual(equal.sort(sortForDisplay).map((p) => p.id), ["a", "z"]);
});

test("topic links preserve searches and encode special characters", () => {
  assert.equal(topicHref(), "/blog");
  assert.equal(topicHref("agent-engineering"), "/blog/topics/agent-engineering/");
  assert.equal(topicHref("ai-infrastructure", "  tools & context  "), "/blog/topics/ai-infrastructure/?q=tools%20%26%20context");
});

test("client summaries omit article bodies and collection internals", () => {
  const source = { ...posts[0], body: "A very long article", rendered: { html: "..." }, filePath: "/private/path" };
  assert.deepEqual(summarizePost(source), posts[0]);
});
