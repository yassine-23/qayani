# QAYANI Agent Templates

Pre-built agent configurations for common use cases.

## Available Templates

- **default** - A general-purpose helpful assistant
- **tesla** - Nikola Tesla, inventor and electrical engineer

## Using Templates

```bash
# Create agent from default template
qayani init my-agent

# Create agent from a specific template
qayani init my-agent --template tesla
```

## Creating Your Own Template

1. Create a directory under `templates/agents/your-template/`
2. Add an `AGENT.md` file with frontmatter config and system prompt
3. The template will be available via `--template your-template`

## AGENT.md Format

The agent configuration uses YAML frontmatter followed by a markdown system prompt:

```yaml
---
name: agent-name
version: "1.0"
description: What this agent does
model:
  provider: openai | anthropic | google
  name: model-name
  temperature: 0.0-1.0
  maxTokens: 1024-8192
memory:
  backend: local | none
  maxHistory: 50
persona:
  traits:
    trait-name: 0.0-1.0
  voice: "Description of speaking style"
  expertise:
    - domain 1
    - domain 2
---

System prompt goes here in markdown...
```
