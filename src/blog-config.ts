export const topicIds = ["agent-engineering", "ai-infrastructure", "software-engineering", "ai-coding", "formal-methods"] as const;
export type BlogTopic = (typeof topicIds)[number];

export const blogTopics: Record<BlogTopic, { label: string; description: string }> = {
  "agent-engineering": {
    label: "Agent Engineering",
    description: "Harnesses, context, tools, and the systems that help agents work well.",
  },
  "ai-infrastructure": {
    label: "AI Infrastructure",
    description: "Sandboxes, observability, and the infrastructure behind AI applications.",
  },
  "software-engineering": {
    label: "Software Engineering",
    description: "Code quality, formal methods, and lessons from engineering practice.",
  },
  "ai-coding": {
    label: "AI Coding",
    description: "AI-assisted coding, code review, debugging, and engineering validation.",
  },
  "formal-methods": {
    label: "Formal Methods",
    description: "Specifications, model checking, and reasoning about system correctness.",
  },
};

export function topicHref(topic?: BlogTopic, query = "") {
  const path = topic ? `/blog/topics/${topic}/` : "/blog";
  return query.trim() ? `${path}?q=${encodeURIComponent(query.trim())}` : path;
}
