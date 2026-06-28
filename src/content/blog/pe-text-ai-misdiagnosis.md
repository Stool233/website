---
title: "Why Did .text Change When the Branch Name Changed?"
subtitle: "An AI Misdiagnosis and Engineering Fundamentals"
description: "A CI/CD infrastructure case study on why raw PE .text changes can be caused by relocation-covered address values rather than code logic changes, and why AI analysis still needs engineering validation."
date: "2026-06-29"
tags: ["ci-cd", "binary-analysis", "ai-engineering", "pe"]
---

We recently ran into a representative case while maintaining CI/CD infrastructure.

A product team was rolling code back and comparing build artifacts. From the source-code side, things looked as if they had returned to the stable production version. But in the Windows PE artifacts produced by the build, the raw bytes of the `.text` section still changed.

That observation by itself is not rare. The interesting part was what happened next.

The team asked AI to analyze the binary diff. The conclusion was roughly: the `.text` section contained byte differences that were not merely offset changes, so there was an actual code-logic change; `.rdata`, `.data`, and `.reloc` also changed, which suggested a mixture of code changes and address-offset changes.

A sanitized version of the AI output looked something like this:

```text
[Code functionality difference detected] FAIL
  * .text contains non-offset byte differences, with real code-logic change risk
  * The .text changes are small across all changed artifacts, but should not be ignored

  FAIL module-a
     Build time: old-build -> new-build
     .rdata   large change [address relocation / read-only data change]
     .data    small change [data change]
     .reloc   visible change [relocation table change]
     .rsrc    small change [version resource change]
     .text    small change FAIL [code change + offset change]

  FAIL module-b
     The .text diff contains many different delta values
     Conclusion: code changes and offset changes may be mixed;
     source or build logic differences should be investigated
```

The conclusion looked professional. It mentioned `.text`, `.rdata`, and `.reloc`, and it came with byte counts, ratios, and delta categories. For someone unfamiliar with PE files, assembly, and linking, it was easy to read this as a firm diagnosis: if `.text` changed, did the CI/CD infrastructure modify the business code during the build?

So the question landed on the infrastructure side.

This article records the conclusion of that investigation, but the broader point is more important: **AI can quickly produce a plausible technical judgment, but engineers still need to understand what evidence supports that judgment, where the evidence is weak, and how to validate it using lower-level mechanisms.**

## Raw `.text` Is Not Yet Code Logic

It is natural to equate `.text` with "code."

That is mostly correct. In PE files, `.text` usually stores machine instructions, and most function logic lives there. So when a raw `.text` hash changes, the first reaction is often: the machine code changed, so the logic changed.

But that reasoning skips an important distinction.

The `.text` section contains instructions, but instructions can also embed address values. In 32-bit x86 in particular, it is common for code to encode the absolute address of a global object, a string constant, or read-only data directly inside an instruction.

A simplified example:

```asm
push 0x10001000
call 0x10000100
```

Here `push` is the instruction, while `0x10001000` is an address value. It may point to a string in `.rdata`.

If that string later moves inside `.rdata`, the code is still doing the same thing: pushing the string address and then calling the same function. But the address embedded in `.text` may become:

```asm
push 0x10001008
call 0x10000100
```

From the raw bytes, `.text` changed. From the instruction skeleton, it is still the same `push`, the same call relationship, and only the referenced address moved.

So a raw `.text` byte difference proves that the binary bytes changed. It does not directly prove that business logic changed.

A safer approach is to identify relocation slots inside `.text`, remove those address values from the comparison, and then check whether the remaining instruction skeleton is still identical.

That was the key step in this investigation.

## The Change Was Concentrated in Address Values

To avoid mistaking address-value changes for code-logic changes, we performed a relocation-aware `.text` comparison.

Simplified, the comparison has three steps.

First, compare raw `.text`. This shows that there are differences. In practice, `objdump -h` can be used to inspect the `.text` size, VMA, and file offset; `dd` can extract the raw `.text` bytes; `shasum` or `cmp` can confirm that the raw bytes differ.

Second, parse PE relocation information and identify which byte positions inside `.text` are relocation slots. A relocation slot is a location the loader knows how to adjust when the image is loaded. When drilling into a concrete difference, `dd | xxd` can show the raw bytes around it, and `objdump -d` can help check whether it is an address immediate such as `push imm32` or `mov reg, imm32`.

Third, zero or normalize those relocation slots, and compute the normalized `.text` again.

The final result looked like this:

```text
raw .text differs
normalized .text identical
diff_bytes == reloc_covered
```

These lines matter.

`raw .text differs` means the original `.text` bytes really are different. We are not denying the observation.

`normalized .text identical` means that after standardizing relocation slots, `.text` is identical.

`diff_bytes == reloc_covered` means every changed byte in raw `.text` is covered by a relocation slot that can explain it.

So the conclusion should be:

```text
There are raw .text byte differences.
All of those differences can be explained by relocation slots.
The current evidence does not support a code-logic change.
```

Once this relationship is visible, the investigation changes direction. Instead of first looking for business-code differences, we first explain why relocation slots changed.

There is one misleading signal worth calling out. If you only look at byte-by-byte deltas, you may see many different delta values. AI may interpret that as "code changes and offset changes are mixed."

But a 32-bit little-endian address occupies four bytes. When an address moves, different byte positions may have different deltas. Carries, alignment, and multiple moved data objects can make the byte-level pattern look noisy even when the change is still just an address-value change.

So "many delta values" does not prove that instruction logic changed. The more useful question is whether those differences are covered by relocation slots, and whether normalized `.text` still changes.

## How a Path String Can Affect `.text`

The next question is: if business code did not change, why did the addresses change?

The root cause in this case was that build paths or version-like identifiers entered the PE read-only data area.

In many C/C++ projects, source paths can enter the binary through `__FILE__`. Assertions, logging, error reporting, and check macros may compile the current source-file path and line number into the artifact.

The path may look roughly like this:

```text
<build-root>/<release-name>/<source-path>
```

When the build directory changes from:

```text
release_1.0.0
```

to:

```text
release_1.0.0_patch
```

the path string becomes longer.

This can be verified with simple command-line tools as well. For example, `grep -aob` can search the artifacts for the sanitized build-directory marker; `objdump -h` can show the `.rdata` section layout; and `dd | xxd` can extract a small range around a file offset when we want to inspect the bytes directly.

Those strings usually live in a read-only data section such as `.rdata`. Once the string becomes longer, later read-only data may move. The linker also needs to respect alignment, so the movement is not necessarily equal to the exact string-length increase.

The chain becomes:

```text
build path or version-like identifier changes
  -> path string enters .rdata
  -> .rdata layout shifts
  -> address values in .text that reference .rdata change
  -> raw .text hash changes
  -> normalized .text hash stays the same
```

Debug-info paths can have a similar effect.

Some Release builds still generate debug information, and the PE may contain records related to program database or symbol-file paths. If those paths include the build directory, branch name, or version name, they can also affect read-only data layout.

From the linker's perspective, none of this is mysterious. Some string constants became longer, some data objects moved, and some instructions referencing those objects had to receive updated address values.

But if we only compare final binaries as raw bytes, and do not account for relocation, it is easy to read "address value updated" as "code logic changed."

## Why AI Misread This

The AI conclusion was not baseless.

It saw `.text` differences. It saw changes in `.rdata`, `.data`, and `.reloc`. It tried to categorize the diff using ratios and delta values. These are real signals in a binary comparison.

The problem is that it turned insufficient signals into an overly strong conclusion.

There were at least three mistakes.

First, it jumped from raw `.text` differences to code-logic differences.

That ignores the fact that `.text` may contain relocation-covered address values. In PE/x86, address immediates inside `.text` are normal.

Second, it interpreted many delta values as a mixture of code changes and offset changes.

That ignores little-endian encoding, alignment, carries, and the combined effect of multiple moved target addresses. Pure address movement can still produce a noisy byte-level diff.

Third, it missed the decisive check: normalized `.text`.

If `.text` still differs after relocation slots are normalized, then it is reasonable to inspect opcodes, control flow, call targets, non-address immediates, and other real code changes. But if normalized `.text` is identical, we should not casually claim an actual code-logic change.

This is a common failure mode in engineering use of AI. It can assemble many technical terms into a professional-looking report, but it may not build a reliable decision chain.

When the user is not familiar with the domain, the risk becomes larger. A judgment that should have been treated as a hypothesis can look like a completed diagnosis.

## What This Means for Infrastructure Engineers

From a CI/CD infrastructure perspective, this kind of issue can quickly become costly.

Once a product team sees an AI report saying "code functionality difference," the natural follow-up is: did the build system modify the code? Did the pipeline inject something? Did packaging, signing, version processing, or compiler flags introduce a problem?

If the infrastructure side also stays at the surface-diff level, the work becomes repetitive: rebuild, diff, narrow the range, change one variable, diff again. Sometimes this works, but it is slow and easily turns into experience-driven debugging.

A more effective path is to return to the underlying mechanisms:

- What information does the compiler put into object files?
- How does the linker lay out `.text`, `.rdata`, and `.data`?
- Why do absolute addresses appear in x86 instructions?
- What does PE relocation actually record?
- What do raw hashes and normalized hashes each prove?

Once these questions are clear, the investigation becomes much shorter.

We do not need to start by assuming that CI/CD changed business code. We also do not need to assume that business code really changed. A better first question is: can this `.text` difference be explained by address relocation? If it can, is the evidence chain closed? If it cannot, then continue toward real code-logic differences.

That is engineering first principles in practice.

Do not rush to trust a tool's conclusion, and do not rush to trust a team's intuition. First go back to how the system works, and ask whether the observed phenomenon is expected, explainable, and falsifiable.

## Engineering Fundamentals Matter More in the AI Era

One thing this case reinforced for me is that AI does not reduce the importance of engineering fundamentals. It amplifies it.

Before AI, most users would not casually suspect that CI/CD infrastructure had modified business code. That claim has a high bar and usually requires strong evidence.

Now AI can quickly generate a plausible binary-analysis report. It contains section names, percentages, diff categories, and risk levels. It can look more professional than an ordinary human description. As a result, an insufficiently supported judgment may enter cross-team collaboration faster and create real investigation pressure.

This does not mean AI is not useful.

AI is useful in cases like this. It can organize observations, list possible causes, generate comparison scripts, explain PE basics, and even help build relocation-aware checking tools.

But AI output is better treated as a hypothesis and supporting material, not as final fact.

The engineer's job is to bring that judgment back into a professional validation process:

- What evidence does this conclusion depend on?
- Are there alternative explanations for the same evidence?
- Is there a stronger decision signal?
- Does the tool output match the underlying mechanism?
- Is the wording stronger than the evidence supports?

This is why we should not stop learning compilation, linking, assembly, operating systems, and binary formats just because AI exists.

Many hard engineering problems are not solved by having a fluent assistant alone. They need someone who can connect symptoms to mechanisms. AI can offer many possible answers, but deciding which answer stands up still depends on the engineer's own knowledge structure.

## Conclusion

Back to the original question: why can `.text` change when the branch name or version-like identifier changes?

In this case, the answer was not complicated.

Build paths or version-like identifiers entered read-only data. The data layout shifted. Address values in `.text` that referenced that data changed. Raw `.text` changed, but relocation-normalized `.text` stayed identical, so the current evidence did not support a code-logic change.

The specific conclusion matters less than the way we handled the problem.

When reading an AI analysis report, do not only look at how many technical terms it uses, or how confident the conclusion sounds. Look at the evidence chain. Did it distinguish raw bytes from normalized bytes? Did it explain relocation? Did it turn "possible" into "certain"? Did it close the loop with a lower-level mechanism?

AI will make technical judgments easier to produce. It will also make weak judgments easier to inject into collaboration workflows.

That is why engineering fundamentals are not obsolete in the AI era. They matter more. The faster tools can produce answers, the more we need people who can tell which answers merely look plausible, and which ones survive contact with how the system actually works.
