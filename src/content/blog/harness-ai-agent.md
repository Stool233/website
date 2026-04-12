---
title: "Harnessing AI Agents: The Design and Evolution of Harness Engineering"
description: "A comparative analysis of seven AI Agent projects, examining the Harness design space across loops, tools, sub-agents, context management, permissions, and enterprise adoption."
date: "2026-04-12"
tags: ["ai-agents", "agent-harness", "developer-tools", "mcp"]
---

## 1. Introduction: Starting from Source Code Leaks

Claude Code has experienced two source code leaks ([April 2025](https://github.com/github/dmca/blob/master/2025/04/2025-04-28-anthropic.md), [March 2026](https://github.com/github/dmca/blob/master/2026/03/2026-03-31-anthropic.md)), providing us with a rare window into the internal engineering design of a commercial-grade AI Agent.

From the first leak, we gained valuable insights and initiated targeted practices within our company:

- **MCP adoption**: Claude Code's deep integration with MCP (Model Context Protocol) strengthened our resolve to build MCP-related platforms (such as MCP Gateway) within our organization
- **SubAgent as a Tool**: Its lightweight sub-agent design meant we didn't need to investigate protocols like A2A (Agent-to-Agent) that emerged around the same time
- **Automatic context compression**: The implementation of this mechanism provided direct reference for our long-conversation scenarios

In the second leak, we found that Claude Code's core architecture hadn't fundamentally changed — it still follows the paradigm described by [LangChain DeepAgents](https://docs.langchain.com/oss/python/deepagents/overview): ReAct loops, tool calling, middleware around LLM calls, automatic context compression, etc. However, there were substantial refinements in engineering details: context optimization for tool calls, new sub-agent designs, streaming tool execution, and more. Most importantly, we observed **effective mutual feedback between model training and Harness engineering** — as models grew stronger, prompt designs became increasingly streamlined.

This led us to realize that in the world of AI Agents, the model itself is only half the story. The other half — the **Harness** — is equally critical.

To gain a more comprehensive understanding of the Harness design space, we conducted a horizontal analysis of seven open-source/leaked AI Agent projects, seeking to extract common patterns, differentiated designs, and innovations worth adopting.

---

## 2. What Is an Agent Harness?

According to LangChain's definition, **Agent = Model + Harness**. If the model is the engine, then the Harness is the entire chassis, drivetrain, and cockpit — it encompasses all engineering infrastructure beyond the model itself.

A mature Agent Harness typically includes the following capability dimensions:

| Capability Dimension | Description |
|---------------------|-------------|
| **Main Loop (ReAct Loop)** | The core orchestration loop: LLM call → tool execution → result feedback |
| **System Prompt** | Instruction assembly and dynamic injection to guide model behavior |
| **Tool System** | Tool definition, registration, execution, and permission control |
| **Sub-Agent** | Task delegation, context isolation, parallel execution |
| **Context Management** | Token budget, automatic compression, summary generation |
| **Middleware/Hooks** | Interception and processing before/after LLM and tool calls |
| **Memory/State** | Session persistence, cross-session memory |
| **Permission System** | Approval and security control for tool execution |
| **Error Handling** | Retry, fallback, context overflow recovery |

We analyzed the following seven projects:

| Project | Language | Positioning | Model Binding |
|---------|----------|------------|---------------|
| **Claude Code (2025.04)** | TypeScript | Anthropic's official CLI Agent | Claude series |
| **Claude Code (2026.03)** | TypeScript | Claude Code evolved version | Claude series |
| **Goose** | Rust | Block's open-source CLI Agent | Multi-model |
| **Kimi CLI** | Python | Moonshot AI's official CLI Agent | Kimi series |
| **Gemini CLI** | TypeScript | Google's official CLI Agent | Gemini series |
| **Hermes Agent** | Python | NousResearch multi-platform Agent | Multi-model |
| **PI Agent** | TypeScript | Lightweight Agent framework | Multi-model |

These seven projects span three mainstream languages, range from product-level to framework-level positioning, and cover strategies from single-model binding to multi-model support. Let's dive into the design comparison across each core dimension.

---

## 3. In-Depth Core Architecture Comparison

### 3.1 Main Loop (ReAct Loop)

All projects implement the ReAct (Reasoning + Acting) loop pattern — the heartbeat of an Agent. However, significant differences exist in orchestration details.

| Project | Loop Pattern | Tool Concurrency | Streaming Execution |
|---------|-------------|-------------------|-------------------|
| **Claude Code (2025)** | Recursive calls | Read-only tools concurrent (max 10), write tools serial | No |
| **Claude Code (2026)** | while loop + state machine | Read/write partitioned concurrency (max 10) | **Yes** |
| **Goose** | while loop (max 1000 turns) | `select_all` parallel | Yes |
| **Kimi CLI** | while True + step iteration | No (sequential execution) | No |
| **Gemini CLI** | while loop (max 30 turns, 10min timeout) | Via Scheduler | Yes |
| **Hermes Agent** | for turn in max_turns | Thread pool concurrency (128 workers) | No |
| **PI Agent** | Outer loop (follow-up) + inner loop (tool calls) | Supports parallel/serial modes | Yes |

**The evolution from Claude Code 2025 to 2026 is most noteworthy.** The main loop evolved from a recursive `query()` to a state-machine-based `queryLoop()`, and the biggest innovation is the **StreamingToolExecutor** — tools begin executing during the LLM's streaming response, rather than waiting for the complete response:

```text
2025: Complete LLM response → parse tool_use → execute tools → recursive call
2026: Streaming LLM response → parse while streaming → execute while parsing → state machine drives next round
```

This change significantly reduces end-to-end latency — imagine the LLM deciding to call 3 tools simultaneously; in streaming mode, the first tool can start executing as soon as its parameters are parsed, without waiting for all three tools' parameters to be fully generated.

**Goose**, built on Rust's async/await + Tokio, uses `select_all` for truly parallel tool execution with `CancellationToken` for graceful cancellation — a natural advantage of systems programming languages in the Agent domain.

**Gemini CLI** introduces `DeadlineTimer` for timeout management and an inter-turn injection mechanism for injecting user prompts and background task completion notifications between loop iterations — a design well-suited for interactive scenarios.

---

### 3.2 System Prompt Design

The system prompt is the "soul" of Agent behavior. How it's assembled and managed directly affects Agent performance and cost.

| Project | Assembly Method | Prompt Cache | Special Design |
|---------|----------------|-------------|----------------|
| **Claude Code (2025)** | Multi-segment concatenation + `<context>` tags | Ephemeral cache control | Separate agent/main prompt sets |
| **Claude Code (2026)** | Section registry + caching | **Fork sub-agents share rendered prompt bytes** | `systemPromptSection()` on-demand compute + cache |
| **Goose** | Jinja2 templates + Builder | None | Template variable injection |
| **Kimi CLI** | Jinja2 templates + variable substitution | Persisted after first run | Sub-agents reuse persisted prompts |
| **Gemini CLI** | Modular Builder | None | `renderFinalShell()` wrapper layer |
| **Hermes Agent** | 8-layer pipeline assembly | Via session ID | **Prompt injection detection** |
| **PI Agent** | Raw strings | Via provider session | Minimalist design, fully delegated to application layer |

**Claude Code (2026)'s Section registry** is an elegant design. By registering cacheable sections via `systemPromptSection(name, compute)`, each part can be independently updated and cached, avoiding unnecessary prompt cache invalidation. Furthermore, Fork sub-agents directly receive the parent agent's rendered system prompt bytes, ensuring prompt cache sharing with the parent agent and dramatically reducing sub-agent API costs.

**Hermes Agent** is the only project that implements prompt injection protection at the Harness level — scanning context files for injection patterns (such as "ignore instructions", invisible Unicode characters, HTML comment injection, curl exfiltration attempts, etc.) and sanitizing before injection. In enterprise scenarios, this kind of protection layer deserves serious consideration.

---

### 3.3 Tool System

Tools are the Agent's arms for interacting with the external world. The tool system's design determines the Agent's capability boundaries and resource efficiency.

| Project | Tool Count | MCP Support | Tool Result Handling | Lazy Loading |
|---------|-----------|------------|---------------------|-------------|
| **Claude Code (2025)** | ~18 | Yes | Direct return | No |
| **Claude Code (2026)** | ~40 | Yes | **Large results written to disk + on-demand reading** | **Yes** |
| **Goose** | ~20+ | Yes (rmcp) | Large response handling | No |
| **Kimi CLI** | ~15 + MCP | Yes (fastmcp) | Direct return | MCP tools lazy-loaded |
| **Gemini CLI** | ~18 + MCP | Yes | Large output truncated + saved to file | Wildcard matching |
| **Hermes Agent** | ~40+ | Yes (self-implemented) | `max_result_size_chars` limit | No |
| **PI Agent** | App-layer defined | No | Structured `details` data | No |

**Claude Code (2026)'s tool result optimization** is a highly practical innovation. When a tool returns overly long results:

```text
Tool returns a very long result
  ↓
Exceeds per-message token budget?
  ↓ Yes
Save to temporary file, return summary + file path
  ↓
Subsequent Agent reads file on demand for full results
```

This directly addresses the pain point of context bloat caused by long responses from external tools like MCP. In practice, a database query tool returning thousands of rows is common — if all of it is stuffed into the context, it quickly exhausts the token budget.

Additionally, the **ToolSearchTool + defer_loading** mechanism allows infrequently used tools to be lazy-loaded. Tools are indexed by `searchHint` keywords; when the Agent needs one, it searches first then loads, preventing dozens of tool schemas from permanently occupying context. When tool count grows from 18 to 40, this optimization becomes critical.

**MCP has become the de facto standard.** All projects except PI Agent support MCP, but implementation depth varies: Goose uses Rust's `rmcp` for full protocol implementation (including resources, prompts, sampling), Hermes Agent supports server-initiated MCP sampling (LLM callbacks), and Kimi CLI supports MCP OAuth authentication.

---

### 3.4 Sub-Agent Design

Sub-agents show the greatest variation across projects and best reflect architectural philosophy.

| Project | Sub-Agent Model | Context Isolation | Parallel Execution | Recursion Depth |
|---------|----------------|-------------------|-------------------|-----------------|
| **Claude Code (2025)** | SubAgent as a Tool | Independent message history | No | Unlimited |
| **Claude Code (2026)** | **Fork SubAgent** | Shared parent context + isolated execution | **Yes** | Anti-recursive fork |
| **Goose** | `summon` tool | Independent session | No | Non-recursive |
| **Kimi CLI** | Agent tool + background tasks | Persisted state + independent context | Via background tasks | Not explicitly limited |
| **Gemini CLI** | `LocalSubagentInvocation` | Independent Registry | Yes | Supports definition |
| **Hermes Agent** | `delegate_tool` | Fully isolated | Max 3 concurrent | MAX_DEPTH=2 |
| **PI Agent** | No built-in | — | — | — |

**Claude Code (2026)'s Fork SubAgent is one of the biggest architectural innovations.** Its core idea: sub-agents don't start from scratch but fork from the parent agent's context.

```text
Parent Agent's assistant message (containing multiple tool_use)
  ↓
Build messages for each fork child:
  [Full history, assistant(all tool_use), user(placeholder results..., subtask instructions)]
  ↓
Key optimization: Only the last text block differs → maximize prompt cache hits
  ↓
Anti-recursion mechanism: <fork_boilerplate> tag detection prevents sub-agents from forking again
```

The elegance of this design lies in the fact that multiple concurrent sub-agents share the vast majority of the context prefix, differing only in the task instructions at the end. This maximizes utilization of the API's prompt cache mechanism, dramatically reducing API costs.

Sub-agents have strict output format requirements — Scope, Result, Key files, Files changed, Issues — this structured output enables the parent agent to efficiently integrate results from multiple subtasks.

**Hermes Agent's `delegate_tool`** is also noteworthy. It explicitly defines `DELEGATE_BLOCKED_TOOLS` — prohibiting recursive delegation, user interaction, writing to shared memory, and cross-platform side effects — achieving secure sub-agent isolation. This "whitelist-open, blacklist-deny" design approach is a necessary security safeguard in enterprise scenarios.

---

### 3.5 Context Management

Context management is the core challenge for long-running agents. User-Agent conversations can last for hours, generating massive amounts of tool calls and results. Without proper management, the context window quickly overflows.

| Project | Auto Compression | Compression Strategy | Trigger Condition | Special Mechanism |
|---------|-----------------|---------------------|-------------------|-------------------|
| **Claude Code (2025)** | No (manual `/compact`) | LLM summary | User-triggered | Prompt caching |
| **Claude Code (2026)** | **Yes (5 layers)** | Multi-layer progressive | Token threshold + API error | **Circuit breaker** |
| **Goose** | Yes | LLM summary + tool-pair batch summaries | 80% context | Continuation messages |
| **Kimi CLI** | Yes | LLM summary + checkpoint | Ratio threshold | **D-Mail time travel** |
| **Gemini CLI** | Yes | Reverse token budget + truncation | 50% model limit | Large tool output truncated to file |
| **Hermes Agent** | Yes | Structured LLM summary | 50% context window | Can use cheaper model for summaries |
| **PI Agent** | No (via hook) | Application-layer implementation | Application-layer decision | `transformContext` hook |

**Claude Code (2026)'s 5-layer context compression is currently the most complex and mature design:**

```text
1. Snip (HISTORY_SNIP)
   │  Delete old messages, preserve protected tail
   ↓
2. Microcompact (apiMicrocompact)
   │  Deduplicate cached tool results by tool_use_id
   ↓
3. Autocompact (autoCompact)
   │  LLM summary compresses history
   │  Circuit breaker: stops after 3 consecutive failures
   ↓
4. Reactive Compact (REACTIVE_COMPACT)
   │  Responds to API prompt-too-long errors
   │  Emergency compression + retry
   ↓
5. Context Collapse (CONTEXT_COLLAPSE)
   │  Message groups collapsed into summaries
   │  Read-time projection (doesn't modify original messages)
```

These five layers form a complete system from lightweight to heavyweight, from routine to emergency. The circuit breaker mechanism is particularly noteworthy — if automatic compression fails 3 consecutive times, the system stops trying, preventing infinite loops caused by compression failures. Context Collapse's "read-time projection" design is also elegant — it doesn't modify the original messages but dynamically generates compressed views when reading, preserving the possibility of backtracking.

**Kimi CLI's D-Mail (time travel)** is a unique innovation. It creates checkpoints at each step, and through the `SendDMail` tool, it can "travel" back to a previous checkpoint, rolling back the context to a prior state. This is particularly useful for exploratory tasks — for example, trying approach A and finding it doesn't work, you can roll back directly to the branching point rather than continuing forward with the failed context.

**Hermes Agent's structured summaries** are also worth learning from. Summaries aren't free-form text but structured (Goal, Progress, Decisions, Files, Next Steps), and support iterative updates — preserving core information from previous summaries during multiple compressions, preventing information from gradually being lost through repeated compression.

---

### 3.6 Middleware, Hooks, and Permissions

Middleware and hook systems determine the Agent's extensibility and security boundaries.

#### Hook System

| Project | Tool Pre/Post Hooks | LLM Pre/Post Hooks | User Configurable |
|---------|-------------------|-------------------|-------------------|
| **Claude Code (2025)** | Permission checks, input validation | Binary feedback | No |
| **Claude Code (2026)** | Pre/Post ToolUse + Failure | Post-Sampling + Stop Hooks | Partial |
| **Goose** | 5 Inspectors in series | No | No |
| **Kimi CLI** | PreToolUse/PostToolUse/Failure | Notification | **Yes (Wire subscription)** |
| **Gemini CLI** | BeforeToolSelection | BeforeModel/AfterModel/PreCompress | **Yes** |
| **Hermes Agent** | tool_progress/start/complete | thinking/stream_delta | Via plugins |
| **PI Agent** | beforeToolCall/afterToolCall | None | Yes |

**Goose's Inspector pipeline** is a paradigm of security-oriented design:

```text
Tool request → SecurityInspector (pattern matching)
             → EgressInspector (network egress validation)
             → AdversaryInspector (LLM adversarial review)
             → PermissionInspector (permission check)
             → RepetitionInspector (loop detection)
             → approved / needs_approval / denied
```

The `AdversaryInspector` uses another LLM to review whether tool calls exhibit adversarial behavior — using AI to defend against AI, an additional security layer. The `RepetitionInspector` detects the Agent repeatedly performing the same operations, preventing infinite loops from wasting resources.

**Gemini CLI** has the most complete hook system, including components like HookSystem, HookRegistry, and HookRunner, supporting rich hook points such as BeforeModel (can block/modify config/inject synthetic responses) and AfterModel (can modify responses).

#### Permission System

| Project | Permission Model | Special Design |
|---------|-----------------|----------------|
| **Claude Code (2026)** | Rule engine + classifier | **Bash command speculative classification, safe commands auto-approved** |
| **Goose** | GooseMode tiers | Auto/SmartApprove/Approve/Chat four levels |
| **Gemini CLI** | Policy Engine | Tool name wildcards + parameter regex + annotation matching |
| **Kimi CLI** | ApprovalState | YOLO mode + unified approval runtime |

**Claude Code (2026)'s BASH_CLASSIFIER** is a pragmatic innovation — speculatively classifying Bash commands, auto-approving high-confidence safe commands (like `ls`, `cat`), avoiding frequent "allow" clicks during daily use. This embodies an important design principle: **security mechanisms should not become a burden on user experience, otherwise users will ultimately choose to bypass them.**

**Goose's SmartApprove** mode uses an LLM to judge whether operations are read-only, only prompting users for operations with side effects. This is similar in concept to Claude Code's Bash classifier — both use intelligent means to reduce approval noise.

**Gemini CLI's Policy Engine** supports the finest-grained permission configuration — tool name matching (exact/wildcard/MCP patterns), parameter regex matching, tool annotation matching, sub-agent scope matching — suitable for enterprise scenarios with strict security requirements.

---

### 3.7 Error Handling and Recovery

In production environments, Agents frequently encounter API rate limiting, context overflow, tool execution failures, and other issues. The quality of error handling directly determines Agent reliability.

| Project | Retry Strategy | Context Overflow Recovery | Special Design |
|---------|---------------|--------------------------|----------------|
| **Claude Code (2025)** | Exponential backoff (max 10) | Error message prompt | Retry-After header |
| **Claude Code (2026)** | Same as above | **Reactive Compact + auto compression** | **Circuit breaker (stops after 3 failures)** |
| **Goose** | Exponential backoff | Auto compression (max 2) | Credits exhausted URL |
| **Kimi CLI** | tenacity exponential backoff (max 5) | Auto compression + connection recovery | **D-Mail rollback** |
| **Gemini CLI** | Timeout + grace period (60s) | Compression | Last chance turn |
| **Hermes Agent** | **Error classifier** | Compression + model fallback | **15 error types + recovery strategies** |
| **PI Agent** | Application layer | Application layer | Errors encoded as stream events |

**Hermes Agent's error classifier** is the most granular design, categorizing API errors into 15 `FailoverReason` types, each with a corresponding recovery strategy:

```python
ClassifiedError:
  reason: FailoverReason  # auth, billing, rate_limit, overloaded, context_overflow...
  retryable: bool         # whether retryable
  should_compress: bool   # whether context compression is needed
  should_rotate_credential: bool  # whether credential rotation is needed
  should_fallback: bool   # whether model fallback is needed
```

This structured error handling cleanly separates "what went wrong" from "how to recover," offering better observability and recovery effectiveness compared to simple try-catch + retry.

---

## 4. Design Philosophy and Trade-offs

### Co-evolution of Model and Harness

The changes between Claude Code's two versions reveal an important design philosophy: **there is effective bidirectional feedback between model training and Harness engineering.**

| Dimension | 2025 | 2026 | Direction of Change |
|-----------|------|------|-------------------|
| Main loop | Recursive async generator | State machine + while loop | More controllable |
| Tool execution | Execute after response complete | **Streaming execute-while-receiving** | Lower latency |
| Context compression | Manual /compact | **5-layer auto compression** | More reliable |
| Sub-agent | AgentTool (independent context) | **Fork SubAgent (shared cache)** | Lower cost |
| Tool results | Direct return | **Large results to disk + on-demand reading** | More context-efficient |
| Tool loading | Full loading | **Lazy loading + ToolSearch** | More context-efficient |
| Permissions | Simple whitelist | **Rule engine + Bash classifier** | Less intrusive |

As models grow stronger, prompt designs become increasingly streamlined, and the engineering focus shifts toward efficiency optimization — cache utilization, concurrency capabilities, and context compression granularity. This demonstrates that Harness is not a one-time static system design but requires continuous iteration alongside the evolution of model capabilities.

### Product-Level vs. Framework-Level

| Positioning | Projects | Characteristics |
|------------|----------|-----------------|
| **Product-level** | Claude Code, Goose, Kimi CLI, Gemini CLI, Hermes Agent | Packed with built-in tools and strategies, ready out of the box |
| **Framework-level** | PI Agent | Minimal core + hook extensions, maximum flexibility |

PI Agent's design philosophy is distinctly different — it provides only 3 core hooks (`beforeToolCall`, `afterToolCall`, `transformContext`), with all strategies decided by the application layer. This "no built-in opinions" design suits scenarios requiring deep customization but also means more application-layer engineering is needed.

### Security Depth

Security is the most scrutinized dimension during enterprise adoption. The security depth varies significantly across projects:

```text
PI Agent        ████░░░░░░  (beforeToolCall hook)
Claude Code '25 ██████░░░░  (permission whitelist + command parsing)
Kimi CLI        ██████░░░░  (approval system + YOLO mode)
Hermes Agent    ███████░░░  (toolset filtering + prompt injection detection)
Claude Code '26 ████████░░  (rule engine + Bash classifier)
Gemini CLI      ████████░░  (Policy Engine + Hook system)
Goose           ██████████  (5-layer Inspector + LLM adversarial review)
```

Goose's 5-layer Inspector pipeline (including LLM adversarial review) sets the current security benchmark, while Hermes Agent's prompt injection detection fills a gap in another security dimension. When designing their own Harness, enterprises should prioritize the security pipeline.

---

## 5. From Harness to Managed Agents — A New Distribution Paradigm

Anthropic recently launched [Claude Managed Agents](https://www.anthropic.com/engineering/managed-agents), representing a new Agent distribution paradigm.

### From Skills to Managed Agents

In Claude Code, Skills are packages of "domain-specific prompts (SOPs, workflows, etc.) + scripts." However, Skills can only be used within an AI Agent environment and are not first-class citizens compared to the Agent's own system prompt + tool sets. Skills distribution is simple file distribution.

Managed Agents, on the other hand, package a complete AI Agent in the cloud and expose it as a service via API. It represents true Agent-level encapsulation and distribution, enabling flexible integration into various business systems through APIs.

### Comparison with Similar Approaches

This "platform-defined Agent + API-as-a-service" model isn't entirely new:

- **Google AI Studio** also offers custom Agent capabilities, but these Agents can only be used within its platform (primarily the frontend interface), lacking API-level flexibility
- **Dify Agent mode** has similar support, but the degree of customization isn't as refined as Managed Agents, and it lacks the deeply optimized Harness design that Claude offers
- **LangSmith Studio** is the closest in positioning — both provide deployment and hosting support for Agents, elevating LangChain's pure-code approach to a platform-level service

The core advantage of Managed Agents over these alternatives: it's backed by the mature Harness engineering accumulated from Claude Code (streaming tool execution, 5-layer compression, Fork SubAgent, etc.), along with Anthropic's expertise in model-Harness co-optimization.

### Ecosystem Gaps to Fill

For API-based offerings like Managed Agents, we'd still like to see:

- **UI-level ecosystem support**: Such as support for the [ag-ui](https://github.com/ag-ui-protocol/ag-ui) protocol, or a [UI component library](https://docs.langchain.com/oss/python/langchain/ui) similar to the LangChain ecosystem, for rapid frontend interaction deployment
- **API design completeness**: Avoid hiding useful details, and be mindful of abstraction leakage
- **Operability and observability**: Support for enterprise-grade operational capabilities like logging, tracing, and metrics

---

## 6. Unique Contributions and Enterprise Adoption Recommendations

### Unique Innovations per Project

| Project | Unique Contributions |
|---------|---------------------|
| **Claude Code** | Streaming tool execution, Fork SubAgent prompt cache sharing, 5-layer context compression, tool result disk offloading, ToolSearch lazy loading |
| **Goose** | Rust high-performance implementation, 5-layer Inspector security pipeline (with LLM adversarial review), SmartApprove mode |
| **Kimi CLI** | D-Mail time travel (checkpoint rollback), Wire protocol hooks, unified approval runtime |
| **Gemini CLI** | Complete Hook system (6 components), Policy Engine (fine-grained policies), DeadlineTimer timeout management |
| **Hermes Agent** | 15-type error classifier, multi-platform unification (CLI/Telegram/Discord/Slack...), Prompt injection detection |
| **PI Agent** | Minimalist Hook design (3 core hooks), declarative custom message types, opinionless framework-level design |

### Common Patterns

Despite varying implementations, all projects follow these common patterns:

1. **ReAct loop is the core**: Every project's main loop follows LLM → tool → result → next round
2. **Tool concurrency partitioning**: Read operations concurrent, write operations serial (or requiring approval)
3. **Context compression is essential**: Nearly all projects implement some form of automatic context compression
4. **MCP is standard**: All except PI Agent support the MCP protocol
5. **Permission layering**: All distinguish between "safe operations" and "dangerous operations"
6. **Sub-agent isolation**: Sub-agents all have some form of context isolation and tool restrictions

### Enterprise Adoption Priority Reference

**First priority:**
- **Claude Code (2026)**: The most mature commercial-grade Harness; streaming tool execution and 5-layer compression strategy are core competitive advantages
- **Goose**: Security pipeline design is the best reference for enterprise-grade security

**Second priority:**
- **Gemini CLI**: Hook system and Policy Engine suit scenarios requiring high customizability
- **Kimi CLI**: D-Mail time travel and Wire protocol are interesting innovation directions
- **Hermes Agent**: Error classifier and multi-platform architecture suit multi-channel deployment scenarios

**Specific scenarios:**
- **PI Agent**: The best starting point for building lightweight, highly customizable Agent frameworks

---

## 7. Conclusion

The competition in AI Agents is not just about model capabilities — it's equally about Harness engineering. From the evolution between Claude Code's two versions, we can clearly see this — models are getting stronger, but the Harness is evolving rapidly as well, forming a virtuous bidirectional feedback loop between the two.

Through our horizontal analysis of seven projects, we've distilled key design dimensions and innovations worth adopting. This analysis serves not only as a survey of existing approaches but also as a technical reference for building AI Agents within enterprises.

With the emergence of new paradigms like Claude Managed Agents, Agent distribution and servitization are becoming the next important battleground. We will continue to follow developments in this space and pursue corresponding practical explorations within our organization.

---

## References

- [LangChain DeepAgents](https://docs.langchain.com/oss/python/deepagents/overview) — The ReAct loop paradigm referenced throughout this article
- [Claude Managed Agents](https://www.anthropic.com/engineering/managed-agents) — Anthropic's new Agent distribution paradigm discussed in Section 5
- [ag-ui Protocol](https://github.com/ag-ui-protocol/ag-ui) — Agent UI protocol mentioned in the ecosystem discussion
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) — Protocol for extending external tools, adopted by the vast majority of projects analyzed in this article

### Analyzed Projects

- [Goose](https://github.com/aaif-goose/goose) — Block's open-source Rust CLI Agent
- [Kimi CLI](https://github.com/MoonshotAI/kimi-cli) — Moonshot AI's official CLI Agent
- [Gemini CLI](https://github.com/google-gemini/gemini-cli) — Google's official CLI Agent
- [Hermes Agent](https://github.com/nousresearch/hermes-agent) — NousResearch multi-platform Agent
- [PI Agent](https://github.com/badlogic/pi-mono/tree/main/packages/agent) — Lightweight Agent framework
