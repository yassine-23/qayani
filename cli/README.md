# @qayani/cli

> Build, configure, and deploy AI agents from your terminal.

Define agents in markdown. Run them with one command. No framework lock-in, no boilerplate -- just an `AGENT.md` file and an API key.

## Quick Start

```bash
npx @qayani/cli init my-agent
export OPENAI_API_KEY=sk-...
npx @qayani/cli run my-agent
```

That's it. You now have a conversational AI agent with function calling, memory, and a terminal UI.

## Features

- **Universal LLM Support** -- OpenAI, Anthropic Claude, Google Gemini with a unified interface
- **AGENT.md Configuration** -- Define agents in markdown with YAML frontmatter (like CLAUDE.md)
- **Built-in Tools** -- Web search, email, Telegram, file I/O, shell execution
- **Function Calling** -- Agents decide which tools to use autonomously
- **Fleet Mode** -- Coordinate multi-agent teams with FLEET.md workflow definitions
- **Memory** -- Local and Google Drive conversation persistence
- **Beautiful TUI** -- Minimal, readable terminal interface

## Installation

```bash
npm install -g @qayani/cli
```

Or run directly without installing:

```bash
npx @qayani/cli
```

## Commands

| Command | Description |
|---------|-------------|
| `qayani init <name>` | Scaffold a new agent with AGENT.md |
| `qayani run [name]` | Start a conversation with an agent |
| `qayani list` | List all configured agents |
| `qayani config` | View and set global configuration |

## AGENT.md Format

Agents are defined as markdown files with YAML frontmatter. The frontmatter controls model selection, persona, tools, and memory. The markdown body is the system prompt.

```markdown
---
name: code-reviewer
version: "1.0"
description: Reviews pull requests and suggests improvements
model:
  provider: openai
  name: gpt-4o
  temperature: 0.3
  maxTokens: 4096
memory:
  backend: local
  maxHistory: 100
persona:
  traits:
    helpfulness: 0.9
    creativity: 0.4
    formality: 0.8
  voice: "Direct, precise, and constructive"
  expertise:
    - code review
    - software architecture
    - security
---

You are a senior code reviewer. Analyze code for correctness,
readability, performance, and security. Be specific and cite
line numbers. Suggest concrete improvements, not vague advice.
```

## Supported Providers

| Provider | Models | Function Calling |
|----------|--------|-----------------|
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4-turbo | Yes |
| Anthropic | claude-opus-4, claude-sonnet-4, claude-haiku-4.5 | Yes |
| Google | gemini-2.0-flash, gemini-2.5-pro | Yes |

Set your API key as an environment variable:

```bash
export OPENAI_API_KEY=sk-...        # OpenAI
export ANTHROPIC_API_KEY=sk-ant-... # Anthropic
export GOOGLE_API_KEY=AI...         # Google
```

## Built-in Tools

| Tool | Description |
|------|-------------|
| `web-search` | Search the web and return results |
| `email` | Send emails via SMTP (Nodemailer) |
| `telegram` | Send and receive Telegram messages |
| `file-read` | Read files from the local filesystem |
| `file-write` | Write and create files |
| `shell` | Execute shell commands |

Agents invoke tools automatically through function calling. No manual wiring required.

## Fleet Mode (Multi-Agent)

Define agent teams in a `FLEET.md` file. Each agent has a role, and a workflow defines the execution order.

```markdown
---
name: content-pipeline
version: "1.0"
description: Research, write, and edit articles
communication: sequential

agents:
  - name: researcher
    role: Finds and summarizes source material
    agentPath: ./agents/researcher
  - name: writer
    role: Drafts the article from research
    agentPath: ./agents/writer
  - name: editor
    role: Reviews and polishes the draft
    agentPath: ./agents/editor

workflow:
  - agent: researcher
    task: "Research the topic and compile key findings"
    output: research-notes
  - agent: writer
    task: "Write a draft article based on the research"
    dependsOn: [researcher]
    output: draft
  - agent: editor
    task: "Edit the draft for clarity and accuracy"
    dependsOn: [writer]
    output: final-article
---

A three-stage content pipeline: research, write, edit.
```

Communication modes: `sequential`, `parallel`, `orchestrated`.

## Memory

Agents persist conversation history between sessions.

| Backend | Description |
|---------|-------------|
| `local` | Stores conversations in `~/.qayani/agents/<name>/memory/` |
| `google-drive` | Syncs conversation history to Google Drive |

Configure in AGENT.md:

```yaml
memory:
  backend: local
  maxHistory: 50
```

## Project Structure

```
~/.qayani/
  agents/
    my-agent/
      AGENT.md          # Agent definition
      memory/           # Conversation history
  config.json           # Global settings
```

## Requirements

- Node.js >= 18.0.0
- An API key for at least one supported provider

## License

MIT
