# Claude Code Tools and Skills

Status: 2026-11-11. **Nothing has been installed.** Repository facts (stars, licence, last activity) were read from GitHub on this date.
Marking: **[V]** verified from the repository or official page; **[S]** secondary; **[U]** unverified.

## Main finding

Epic now ships its own route for AI assistants. UE 5.8 includes an experimental `ModelContextProtocol` plugin, and Epic publishes a matching Claude Code plugin. This makes most community Unreal connectors unnecessary. [V] ([repo](https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin))

Every such connector needs a **running editor**, which the current laptop cannot provide. So the starting toolset is command-line only.

## How an assistant can help most

Published experiments agree [S]:
- Assistants are strong at C++ (text that can be compiled and tested) and weak at Blueprints (binary files that get messy under automated edits).
- Small, scoped tasks with frequent commits work; broad "build the system" requests do not.
- One hands-on test with Epic's plugin built a greybox level in minutes but broke player input and could not fix it. Its conclusion: it speeds up iteration, it does not replace understanding.

Hence TD-03: gameplay logic in C++, verified by headless automated tests.

## Verdicts

| Tool | Maintainer, licence, activity | What it does | Risk | Verdict |
|---|---|---|---|---|
| **Epic MCP plugin + Claude Code plugin** | Epic Games; MIT; active (last push 2026-10-27) [V] | 30+ toolsets inside the editor: actors, Blueprint graphs, materials, PCG, tests, logs, screenshots. Local port 8000 | Can run arbitrary Python in the editor. Epic's own README warns that localhost is not a security boundary and advises against skipping permission prompts | **Use later**, on the GPU machine with UE 5.8 |
| ChiR24/Unreal_mcp | Individual; MIT; active [V] | Similar; supports UE 5.0–5.8; has capability tokens and path allow-lists | Single maintainer; still runs Python | Fallback only |
| runreal/unreal-mcp | MIT; last push 2025-06 [V] | Uses Unreal's Python remote execution | Stale; setup advice can expose the editor to the local network | Reference only |
| chongdashu/unreal-mcp, kvick-games/UnrealMCP | Individuals; stale since 2025 [V] | Basic actor spawning | Unauthenticated local socket; abandoned | **Avoid** |
| flopperam/unreal-engine-mcp | Now commercial; advanced mode is a hosted service [V] | — | Sends project data to a third party | **Avoid** |
| **Blender Lab `blender_mcp`** (official) | Blender Foundation; needs Blender 5.1+ [V] | Natural-language control of Blender | blender.org warns it runs generated code "without any guards" and suggests a VM | Later, when Blender work starts |
| ahujasid Blender MCP | Individual; MIT; very popular; active [V] | Same, plus asset downloads and AI model generation | Arbitrary code; anonymous usage telemetry on by default; downloaded models carry mixed licences | Later, with integrations and telemetry off |
| **quodsoler/unreal-engine-skills** | Individual; MIT; active [V] | 31 text-only skills on Unreal C++ conventions; author claims they were checked against 5.8 headers [U] | Low; text only. Read before adopting | **Use now** (after reading) |
| **Context7** | Upstash; MIT [V] | Looks up current Unreal documentation | Queries go to a third party; keep project details out of them | **Use now** |
| Claude-Code-Game-Studios | Individual; MIT [V] | 49 agents and 72 skills imitating a studio hierarchy | Heavy process and cost; installs hooks | Reference only |
| ue4cli | Unmaintained since 2024 [V] | — | — | Avoid; call Unreal's own tools |

## Command-line workflow (works without a GPU)

Flags are from general knowledge and must be checked against the installed engine [U].

| Task | Tool |
|---|---|
| Compile | `Build.sh` / `Build.bat` (UnrealBuildTool) |
| Cook and package | `RunUAT BuildCookRun` |
| Automated tests | `UnrealEditor-Cmd <project> -ExecCmds="Automation RunTests <filter>; Quit" -nullrhi -unattended` |
| Catch broken Blueprints | `-run=CompileAllBlueprints` |
| Code navigation | VS Code + clangd with a generated compile database |
| Profiling | Unreal Insights (later) |

This is the feedback loop: write C++, compile, run tests headlessly, fix.

## AI-generated assets

Current text-to-3D tools produce blockout and background-prop quality, not photoreal hero assets. Licences vary and some exclude regions or commercial use; Steam requires disclosure of AI-generated content. [S/U] Use only for placeholders, with a manifest entry each time.

## Starting toolset and permissions

| # | Tool | Permission it needs |
|---|---|---|
| 1 | Git + Git LFS | Run `git`; network to your remote only |
| 2 | Unreal command-line tools (once an engine is installed) | Run those specific executables; read/write the project folder; no network ports |
| 3 | Project `CLAUDE.md` with conventions + the Unreal C++ skills | None (text) |
| 4 | Context7 | Outbound web requests |
| 5 | clangd | Local only |

Deferred: Epic MCP plugin (GPU machine, permission prompts left on, commit before each session); Blender MCP (ideally in a VM).

## Security rules

- No tool is installed without your approval and a manifest entry.
- Never disable permission prompts for a tool that can run code in the editor.
- Commit before any assistant-driven editor session so changes can be undone.
- No API keys, tokens or account details in the repository.
