---
name: "research-team"
version: "1.0"
description: "A research and writing team that produces high-quality content"
communication: orchestrated
agents:
  - name: researcher
    role: "Research specialist who finds and analyzes information"
    agentPath: ./researcher
    capabilities:
      - information gathering
      - analysis
      - fact checking
  - name: writer
    role: "Content writer who creates clear, well-structured text"
    agentPath: ./writer
    capabilities:
      - writing
      - summarization
      - formatting
  - name: reviewer
    role: "Quality reviewer who checks for accuracy and clarity"
    agentPath: ./reviewer
    capabilities:
      - review
      - editing
      - quality assurance
workflow:
  - agent: researcher
    task: "Research the given topic thoroughly. Gather key facts, data, and insights."
    output: research_data
  - agent: writer
    task: "Write a well-structured article based on the research data provided."
    dependsOn: [researcher]
    output: draft
  - agent: reviewer
    task: "Review the draft for accuracy, clarity, and completeness. Provide the final improved version."
    dependsOn: [writer]
    output: final
---

## Fleet Instructions

This team researches topics, writes articles, and reviews them for quality.

### Workflow

1. **Researcher** - Gathers comprehensive information on the given topic, organizing findings into clear categories with key facts and insights.

2. **Writer** - Transforms the research data into a well-structured, readable article with clear headings and logical flow.

3. **Reviewer** - Reviews the draft for accuracy, clarity, and completeness, producing the final polished version.

### Communication Mode

This fleet uses **orchestrated** communication, meaning:
- Steps with no dependencies can run in parallel
- Steps with `dependsOn` wait for their dependencies to complete
- The writer waits for research, and the reviewer waits for the draft
