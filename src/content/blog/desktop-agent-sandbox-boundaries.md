---
title: "Sandbox Boundaries for Desktop Agents"
seoTitle: "Sandbox Boundaries for Desktop Agents: Lessons from an Internal System Call"
subtitle: "Lessons from an Internal System Call"
description: "How desktop agents implement sandboxing, how enterprises can set practical boundaries for non-technical workflows, and where FDEs add value."
date: "2026-08-07"
tags: ["desktop-agents", "agent-sandbox", "security", "enterprise-ai"]
---

Recently, we started introducing desktop agents such as Codex to colleagues in HR, administration, finance, and other non-technical business functions.

These users work very differently from developers. They usually do not have a code repository, and they have little reason to care about shells, proxies, or file permissions. Their goals are concrete: read a local document, query an internal system, organize the result, and perhaps update a business record.

From the perspective of an agent, that sounds like little more than reading a file and calling an API. On a real enterprise endpoint, however, even a short task crosses local files, process execution, network access, employee identity, business authorization, and user approval. If any one of those layers is incomplete, the user sees the same outcome: the task does not finish.

While investigating one internal system call, we encountered a particularly revealing signal. The agent inspected its environment and found:

```text
HTTP_PROXY=http://127.0.0.1:9
```

A model can easily interpret this as a local proxy that has not started yet. It may inspect the port, clear the environment variable, or look for another route to the network. To the user, it looks like an ordinary connectivity problem. In reality, this address comes from a network-denial path in the Codex Windows sandbox.

Following that clue led us to a broader conclusion. Enterprise deployment of desktop agents cannot be solved with a single “allow network access” switch. Network boundaries, authentication, business actions, and approval UX have to be designed together. That investigation prompted us to study how current desktop agents implement sandboxing and how their official guidance recommends drawing boundaries.

The product behavior and configuration discussed below reflect official documentation and source code available in August 2026. This area is moving quickly, so any production configuration should be checked again before deployment.

## `127.0.0.1:9` Is a Policy Clue

Let us start with the unusual proxy address.

In the Codex source revision we examined, the Windows legacy / unelevated network-denial path calls `apply_no_network_to_env`. When the user has not already configured proxy variables, the function points `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, and the Git proxy variables at `http://127.0.0.1:9`. It also enables offline modes for tools such as pip, npm, and Cargo. The implementation is visible in the OpenAI Codex [`env.rs`](https://github.com/openai/codex/blob/e58d9ef447785d4e81718dc11c2bcce14782fa8a/codex-rs/windows-sandbox-rs/src/env.rs#L126-L171) source file.

There is normally no enterprise proxy waiting at that address. This dead proxy makes clients that honor proxy environment variables fail quickly, and it prevents many tools from spending a long time waiting for a network path that has already been disabled. It is a useful compatibility-level failure signal.

Its security boundary is also clear. Environment variables only influence programs that choose to honor them. A process that ignores the proxy and opens a direct connection must be constrained by operating-system mechanisms such as a firewall, WFP, or a network namespace. The current OpenAI [Windows sandbox documentation](https://learn.chatgpt.com/docs/windows/windows-sandbox) distinguishes two native paths: the elevated sandbox uses dedicated low-privilege users, filesystem permissions, and firewall rules; the unelevated fallback uses a restricted token derived from the current user, ACLs, and environment-level offline controls. OpenAI recommends elevated mode when the environment permits it.

The address therefore exposes two separate problems.

First, the enforcement layer knows that network access was denied, but that fact reaches the agent as an ordinary connection failure. Without the policy reason, the model troubleshoots it like any other networking issue.

Second, a user who only wants to finish the task may reach for broad network access or Full Access. The task usually needs much less: one internal API, one authentication endpoint, and access limited to the current workflow.

A better error would tell the agent which destination was denied, which policy caused the denial, which sandbox backend is active, and which compliant recovery paths are available. The agent could narrow the request, switch to an approved internal tool, or request one-time access to a specific domain. At that point, the sandbox boundary becomes part of the runtime interface the agent can understand.

## One Internal API Call Crosses Multiple Boundaries

The business-function task from the introduction crosses at least five control points.

The first is the **local execution boundary**. It determines which files the agent can read, which directories it can modify, which programs it can launch, and whether child processes inherit the same restrictions.

The second is the **network boundary**. This decides whether commands can reach the network at all, whether they can access the public internet, the corporate network, or only a small set of destinations, and whether loopback, private addresses, and Unix sockets are available.

The third is **enterprise identity**. Even after the network works, the request still needs an answer to three questions: which employee initiated the task, which agent session is executing it, and which delegated identity the downstream system will accept.

The fourth is the **business action**. Inside a single corporate domain, reading an organization chart, updating an employee field, exporting a large dataset, and submitting a payment carry very different risks. A domain allowlist cannot represent those differences.

The fifth is **approval and feedback**. The system has to decide which actions may continue automatically and which require temporary authorization. When it denies an action, it also has to explain the event differently to the model, the user, and the security team.

One distinction matters throughout the article. A sandbox policy defines which resources a command can technically reach. An approval policy defines when the agent must stop and ask a person. The [Codex security documentation](https://learn.chatgpt.com/docs/agent-approvals-security) treats them as separate layers. Disabling approvals inside `workspace-write` does not grant network access, and enabling the network does not automatically approve every high-risk action.

Some failures also belong to a different diagnostic path. A missing device code, a browser that never opens, or blocked stdin may originate in PTY / ConPTY behavior, OAuth, a localhost callback, or UI output handling. These failures often appear next to sandbox problems on Windows, but they occur at different layers. Treating every login failure as a sandbox denial usually leads to unrelated permissions being widened.

## How Desktop Agents Implement Sandboxing Today

A simplified comparison of Codex, Claude Code, Cursor, and Gemini CLI looks like this:

| Product | Main enforcement approach | Recommended or default boundary | Boundary expansion | Windows path |
| --- | --- | --- | --- | --- |
| Codex | macOS Seatbelt, Linux bubblewrap, Windows restricted tokens / ACLs / Firewall | `workspace-write + on-request` for version-controlled folders; network off by default; `read-only` for safe browsing | Approvals, rules, writable roots, and network policy | Native elevated preferred, unelevated fallback |
| Claude Code / SRT | Claude Code uses Seatbelt on macOS and bubblewrap on Linux / WSL2; SRT is also available as a standalone runtime | Bash can auto-run inside the configured workspace sandbox; domains are approved as needed; enterprises can fail closed | Permission rules, filesystem and domain settings, and controlled unsandboxed fallback | Claude Code uses WSL2; native Windows support in SRT remains alpha |
| Cursor | macOS Seatbelt, Linux Landlock + seccomp, Windows through WSL2 | Workspace and `/tmp` by default, with network disabled | Skip the command or rerun outside the sandbox; enterprise controls for network and Git | Linux sandbox through WSL2 |
| Gemini CLI | Seatbelt, Docker / Podman, native Windows, gVisor, LXC, and other selectable backends | Sandbox explicitly enabled; workspace mounted; use the most restrictive profile that still supports the task | Sandbox expansion, extra mounts, or a different profile | Native mode or containers |

### Codex: Autonomy Inside the Workspace, Approval at the Boundary

The current Codex recommendation is straightforward. A version-controlled directory is a good fit for Auto, meaning `workspace-write + on-request`. The agent can read and modify files, run tests, and use routine tools inside the workspace. It asks for approval when it needs to write elsewhere or access the network. A non-version-controlled directory is a better place to start in `read-only` mode.

Filesystem and network access remain separate controls. Network access is disabled by default in `workspace-write`. When a task needs it, network access can be enabled independently and constrained with `network_proxy` domain rules. With `network_proxy` enabled, loopback, link-local, and private destinations are blocked by default unless an explicit local exception is configured. For multi-directory tasks, writable roots and rules provide narrower expansion than Full Access.

Windows is an important branch of the Codex design. The native elevated sandbox creates a stronger boundary, but it requires administrator-approved setup for local sandbox users, filesystem permissions, and firewall rules. Enterprise GPO, EDR, local account policy, or logon rights can block that setup. The unelevated fallback can keep work moving, but its weaker isolation and its failure semantics should be visible in endpoint diagnostics.

### Claude Code and SRT: Predefined Boundaries Instead of Per-Command Bash Approval

The [Claude Code sandbox documentation](https://code.claude.com/docs/en/sandboxing) describes the goal clearly: define the files and network destinations Bash may access, then allow commands inside that boundary to run automatically. Claude Code uses Seatbelt on macOS and bubblewrap on Linux and WSL2. Native Windows sandboxing is not currently supported in Claude Code, so Windows users run it through WSL2.

Permissions and sandboxing still need to be separated. Claude Code permission rules cover Bash, Read, Edit, WebFetch, MCP, and other tools. The OS sandbox primarily constrains Bash and its child processes. With auto-allow enabled, Bash commands inside the sandbox require fewer prompts, while explicit deny rules continue to apply. Enterprises can configure `failIfUnavailable` so that missing dependencies or an unsupported platform cause a hard failure instead of silently running without a sandbox. The official [permissions documentation](https://code.claude.com/docs/en/permissions) describes the full rule model.

Anthropic also open-sourced [Sandbox Runtime](https://github.com/anthropic-experimental/sandbox-runtime). SRT can wrap an arbitrary process or a local MCP server with similar filesystem and network controls. It is currently labeled a Beta Research Preview, and its native Windows support remains alpha.

Two SRT directions are especially relevant to enterprise deployment. The first is `deniedDomainReasons`, which lets policy return a model-visible explanation and a sanctioned alternative. The second is credential masking: a sandboxed process sees a per-session sentinel, while a host-side proxy injects the real credential only when the request is sent to an approved destination. TLS termination, platform differences, and corporate certificates all affect this feature, so it is best viewed as an emerging design pattern rather than a uniformly mature capability.

### Cursor: Uniform Product Semantics with OS-Specific Enforcement

In its article on [agent sandboxing](https://cursor.com/blog/agent-sandboxing), Cursor describes a representative architecture: a uniform sandbox API at the product layer, with Seatbelt on macOS, Landlock plus seccomp on Linux, and WSL2 on Windows. Policies are generated dynamically from the workspace, administrator settings, and `.cursorignore`.

When Cursor introduced its enterprise [Sandbox Mode](https://cursor.com/blog/enterprise), it described the default boundary as the workspace plus `/tmp`, with network access disabled. When a command fails at the boundary, the user can skip it or choose to rerun it outside the sandbox.

The changes Cursor made to the agent harness are just as interesting. The Shell tool description tells the model which filesystem, Git, and network capabilities are available, and command failures explicitly surface the sandbox reason. Cursor observed that agents without this feedback tended to repeat the same failing command. Once the boundary was made visible, agents recovered more effectively by requesting escalation or choosing another path. That is the same design problem exposed by `127.0.0.1:9`.

### Gemini CLI: Multiple Backends and Dynamic Expansion

The [Gemini CLI sandboxing documentation](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/sandbox.md) offers a wider choice of backends: macOS Seatbelt, Docker, Podman, native Windows, gVisor on Linux, and experimental LXC. Users can select an isolation method for the platform and workflow, or build a custom sandbox image for a project.

The advantage is flexibility. A container can provide a complete Linux toolchain, while gVisor can add a stronger syscall boundary. Gemini CLI also supports sandbox expansion: when a command fails because it needs another path or network permission, the agent can make a one-time expansion request.

The deployment team inherits the corresponding operational work. Images, dependencies, UID / GID mapping, mount paths, and Windows file permissions can all affect the experience. Gemini CLI therefore recommends the most restrictive profile that still supports the task. Extra directories default to read-only mounts, with write access added only where needed.

## The Recommendations Are Converging

The four products differ in defaults, tool coverage, and platform strategy, but their recommended usage is converging around a few stable ideas.

**Start the boundary at the task directory.** A coding agent usually treats a Git workspace as the natural unit of work. It can modify files and run tools there, while the home directory, shell configuration, credentials, Git hooks, and agent configuration remain protected. When a second directory is needed, add an explicit read-only or writable path.

**Constrain files and network together.** Restricting filesystem writes alone can still leave local credentials readable and exfiltratable. Restricting network access alone can still allow persistent changes to shell configuration. Claude Code and SRT both emphasize that effective sandboxing requires both layers.

**Provide autonomy inside the boundary.** Approving every Bash command appears cautious, but sustained use produces approval fatigue. A more useful model defines an acceptable workspace and network boundary in advance, then lets low-risk operations continue inside it. Approval becomes meaningful when the agent actually crosses the boundary.

**Bind exceptions to specific resources.** Adding one directory, one domain, or one command rule is usually easier to audit than permanent Full Access. One-time authorization fits a temporary action, session authorization fits repeated access within a task, and enterprise-managed policy defines the stable boundary.

**Teach the agent about the boundary.** Tool descriptions should state the current filesystem, network, and command permissions. Failure results should include the policy reason, the restricted resource, and a next step. Clear feedback reduces futile retries and reduces pressure on users to widen every permission.

**Move high-risk work into a stronger execution environment.** Tasks that run untrusted dependencies, process large amounts of sensitive data, or create irreversible side effects may belong in a remote runner, container, or microVM. Stronger execution isolation still needs identity, business authorization, and auditing.

These points lead to a simple operating principle: establish the smallest stable boundary that supports the task, let the agent work autonomously inside it, and enter an explicit escalation flow when the resource, identity, or business risk changes.

## Business Functions Need a Different Definition of “Workspace”

Developers have Git repositories, and code changes come with diffs, tests, and rollback paths. Inputs for non-technical business functions are distributed across Downloads, Office documents, email attachments, browsers, and internal systems. Business writes often affect live records immediately.

A simple “current directory is writable” rule therefore leaves too much undefined. The enterprise first needs to create a clear unit of work for the task.

A practical configuration can look like this:

- **Filesystem boundary:** Copy or mount user-selected material into a task directory, and write output into a separate destination. Keep the personal home directory, browser data, and unrelated departmental files isolated.
- **Network boundary:** Allow only the internal gateway, authentication endpoints, and explicit dependencies. Avoid opening the entire corporate network. Validate enterprise proxies, root certificates, and mTLS under the sandbox identity.
- **Identity boundary:** Distinguish the employee who initiated the task, the current agent session, and the short-lived delegation used by the downstream API. Link all three in the audit record.
- **Tool boundary:** Expose reads and writes through typed tools, an MCP gateway, or internal APIs with explicit actions. Keep the shell as a controlled execution capability rather than the universal interface to every business system.
- **Approval boundary:** Let scoped reads run automatically. Use one-time or session authorization for a single reversible write. Require step-up approval, dual control, and limits for bulk, irreversible, or high-value actions.
- **Feedback boundary:** Return different error types for policy denial, authentication failure, terminal compatibility, and business validation so the model does not debug the wrong layer.

The network allowlist answers “where may this process connect?” The internal business system still answers “which identity may perform which action?” Allowing `internal.example.com` does not naturally constrain a tenant, API path, data field, or batch size.

Credentials should follow the same boundary. Putting a long-lived employee token or service key into environment variables, prompts, or shell history increases both leakage and misuse risk. A safer design keeps the real credential in a host-side Credential Broker or Gateway and issues short-lived delegation based on the employee, agent session, tool, and data scope.

Approval UX should present business semantics to the user: which identity the agent will use, which records it will read or change, how many objects are affected, and how long the authorization lasts. Approving one explicit action is easier to understand than approving `curl`, PowerShell, or an entire domain.

## Windows Exposes the Ecosystem Gaps Most Clearly

Desktop agent sandboxing does not yet have one cross-platform enforcement backend. macOS, Linux, WSL2, and native Windows rely on different OS primitives. Two products can expose the same permissions control while providing different isolation strength and compatibility underneath it.

Codex has invested in a native elevated Windows sandbox. Claude Code and Cursor currently rely primarily on WSL2. Gemini CLI offers both native and container paths. SRT is experimenting with a dedicated local user, WFP, and ACLs in its alpha Windows implementation. Each path carries a different engineering cost.

On an enterprise endpoint, a strong boundary often requires creating local users, modifying Firewall or WFP configuration, writing ACLs, or receiving one UAC approval. GPO, AppLocker / WDAC, EDR, and local account policy can block setup. The sandbox user may also have a different profile, certificate store, proxy configuration, browser state, and set of per-user tools from the employee.

Interactive authentication follows another path. Teams need to verify TTY detection, stdin, resize behavior, Ctrl-C, device-code and hyperlink rendering, and any dependency on a default browser or localhost OAuth callback. Fixing network access does not fix ConPTY, and fixing terminal interaction does not grant the correct API scope.

“Windows sandbox support” is therefore only a starting point. Enterprises need an operating matrix that covers Windows version, sandbox backend, MDM / GPO, EDR, proxy, certificates, shell, login method, and internal tools. When a failure occurs, the system must identify which layer produced it.

## FDEs Connect the Missing Pieces

This is where Forward Deployed Engineers, or FDEs, are particularly valuable in desktop-agent deployment.

A product team can provide generic sandbox modes, approval policies, and network settings. It cannot anticipate every enterprise certificate chain, endpoint policy, internal identity model, or business action. A security team may understand IAM, DLP, and endpoint policy while still having little visibility into how a particular agent harness retries after a denial.

The first FDE responsibility is to **translate a business task into technical boundaries**. The FDE walks through the complete workflow with the user: where input files live, which domains are required, whose identity is used, and which actions create side effects. Those answers determine the sandbox and approval configuration.

The second responsibility is to **build endpoint preflight checks and a diagnostic matrix**. Windows sandbox installation, enterprise proxies, root certificates, browser login, ConPTY, and the local toolchain can all be checked before a task starts. Errors can be classified as network policy, filesystem permission, authentication, business authorization, or terminal interaction.

The third responsibility is to **turn field fixes into reusable assets**. A successful integration should produce managed configuration, workload profiles, internal API adapters, Credential Broker integration, an error protocol, and regression tests. The next group of users should start from the same profile instead of widening permissions again.

The fourth responsibility is to **create a product feedback loop**. Approval frequency, retries after denial, abandonment rate, platform differences, and user confusion can all become signals for the agent product and enterprise infrastructure teams.

The FDE exit criteria should be equally concrete: similar users can run with the same profile, similar failures return stable errors, temporary permissions have converged into minimal capabilities, the security team can verify execution records, and the product team can see which boundary most affects task completion.

As these conditions improve, field support decreases and reusable product capability grows. During the ecosystem transition, the FDE connects the agent runtime, the operating system, enterprise identity, internal applications, and the user task.

## Conclusion

Return to the internal system call from the beginning. The practical sequence is to determine whether the failure comes from sandboxing, authentication, or terminal interaction; open the minimum filesystem and network scope required by the task; use the enterprise identity system to provide short-lived delegation; separate read-only queries from business writes; and make denial results understandable to both the model and the user.

Across the products we studied, a clear direction is emerging. The product layer unifies workspace, network, approval, and feedback semantics, while enforcement remains specific to each operating system. The agent works continuously inside the boundary and asks for explicit authorization when it needs to cross it.

For non-technical business functions, security quality ultimately shows up in whether the agent can keep completing real work. The OS sandbox protects local resources. Network policy limits reachable destinations. Enterprise identity and tool mediation govern business actions. Approval manages changes in risk. Structured feedback helps the agent and the user move forward.

The ecosystem is still evolving, especially around Windows, credential injection, cross-tool permissions, and enterprise-managed configuration. At this stage, FDEs turn field differences into reusable product interfaces. As those interfaces stabilize, desktop agents can move from experiments used by a small group into the daily work of a much broader set of business functions.

## References

- [OpenAI: Agent approvals & security](https://learn.chatgpt.com/docs/agent-approvals-security)
- [OpenAI: Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox)
- [OpenAI Codex: Windows dead-proxy implementation](https://github.com/openai/codex/blob/e58d9ef447785d4e81718dc11c2bcce14782fa8a/codex-rs/windows-sandbox-rs/src/env.rs#L126-L171)
- [Anthropic: Claude Code sandboxing](https://code.claude.com/docs/en/sandboxing)
- [Anthropic: Claude Code permissions](https://code.claude.com/docs/en/permissions)
- [Anthropic Experimental: Sandbox Runtime](https://github.com/anthropic-experimental/sandbox-runtime)
- [Cursor: Implementing a secure sandbox for local agents](https://cursor.com/blog/agent-sandboxing)
- [Cursor: Introducing Cursor for Enterprise](https://cursor.com/blog/enterprise)
- [Gemini CLI: Sandboxing](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/sandbox.md)
