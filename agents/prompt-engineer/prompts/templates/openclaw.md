# Goal
{{goal}}

# Context
You are an OpenClaw agent with the tools/skills listed below. Persist artifacts to the paths given.

# Available skills / tools
{{skills_and_tools}}

# Paths
{{paths}}

# Requirements
{{requirements}}

# Workflow
1. Confirm you have the needed skill/tool access.
2. Execute the work (tool use allowed: {{tool_execution_allowed}}).
3. Write persistent artifacts as specified.
4. Verify against success criteria.

# Constraints
{{constraints}}

# Verification
{{verification}}

# Failure behaviour
If blocked (missing auth, path, or skill): stop, report the blocker, and do not invent workarounds that exfiltrate data or weaken security.

# Deliverables
{{deliverables}}
