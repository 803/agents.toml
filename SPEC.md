# agents.toml Specification

**Version:** 0.1.0
**Status:** Draft

## Overview

`agents.toml` is a manifest file for declaring AI agent skill packages. It specifies package metadata, agent compatibility, dependencies, and export configuration.

The file uses [TOML](https://toml.io/en/) format.

## File Location

An `agents.toml` file can be placed in:
- Project root (discovered via current working directory)
- Parent directories (walked up from cwd)
- User home directory (`~/.agents.toml` or `~/agents.toml`)
- Global config directory

## Structure

```toml
[package]      # Package metadata (optional)
[agents]       # Agent eligibility (required, can be empty)
[dependencies] # Skill dependencies (optional)
[exports]      # Export configuration (optional)
```

---

## [package]

Package metadata. Optional section.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Package name |
| `version` | string | Yes | Package version (semver recommended) |
| `description` | string | No | Human-readable description |
| `license` | string | No | SPDX license identifier |
| `org` | string | No | Organization/namespace |

All string fields must be non-empty after trimming whitespace.

### Example

```toml
[package]
name = "my-skills"
version = "1.0.0"
description = "Custom skills for my workflow"
license = "MIT"
org = "myorg"
```

---

## [agents]

Declares which AI agents can use this package. Required section (can be empty).

Keys are agent identifiers. Values are booleans.

### Known Agent IDs

| ID | Agent |
|----|-------|
| `claude-code` | [Claude Code](https://claude.com/claude-code) |
| `codex` | OpenAI Codex CLI |
| `opencode` | OpenCode |

Unknown agent IDs are silently ignored for forward compatibility.

### Example

```toml
[agents]
claude-code = true
codex = true
opencode = false
```

---

## [dependencies]

Declares skill package dependencies. Optional section.

Each dependency has an **alias** (the key) and a **declaration** (the value).

### Alias Constraints

Aliases must:
- Be non-empty after trimming
- Not contain: `/` `\` `.` `:`

### Dependency Types

#### 1. Registry Package (String Shorthand)

```toml
[dependencies]
alias = "[@org/]name@version"
```

Format: `name@version` or `@org/name@version`

Examples:
```toml
[dependencies]
superpowers = "superpowers@1.0.0"
feature-dev = "@claude-plugins/feature-dev@2.0.0"
```

#### 2. GitHub Package

```toml
[dependencies.alias]
gh = "owner/repo"
tag = "v1.0.0"    # exactly one of: tag, branch, rev
# branch = "main"
# rev = "abc123"
path = "subdir"   # optional: subdirectory within repo
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `gh` | string | Yes | GitHub reference (`owner/repo`) |
| `tag` | string | One of | Git tag |
| `branch` | string | One of | Git branch |
| `rev` | string | One of | Git commit SHA |
| `path` | string | No | Subdirectory path |

Exactly one of `tag`, `branch`, or `rev` must be specified.

Example:
```toml
[dependencies.sensei]
gh = "sensei-marketplace/sensei"
tag = "v2.0.0"

[dependencies.feature-dev]
gh = "claude-plugins-official/feature-dev"
branch = "main"
path = "packages/core"
```

#### 3. Git Package

For non-GitHub git repositories.

```toml
[dependencies.alias]
git = "https://gitlab.com/org/repo.git"
tag = "v1.0.0"    # exactly one of: tag, branch, rev
path = "subdir"   # optional
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `git` | string | Yes | Git URL (https or SSH) |
| `tag` | string | One of | Git tag |
| `branch` | string | One of | Git branch |
| `rev` | string | One of | Git commit SHA |
| `path` | string | No | Subdirectory path |

Git URLs are normalized:
- SSH (`git@host:path`) → `https://host/path`
- `.git` suffix removed
- `http://` upgraded to `https://`

Example:
```toml
[dependencies.custom-skills]
git = "https://gitlab.com/myorg/custom-skills.git"
rev = "abc123def"
```

#### 4. Local Package

For local filesystem dependencies.

```toml
[dependencies.alias]
path = "../local-skills"
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | Relative or absolute path |

Relative paths are resolved from the manifest file's directory.

Example:
```toml
[dependencies.local-dev]
path = "../my-local-skills"
```

#### 5. Claude Plugin

For Claude Code marketplace plugins.

```toml
[dependencies.alias]
type = "claude-plugin"
plugin = "plugin-name"
marketplace = "owner/repo"  # or full git URL
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"claude-plugin"` | Yes | Discriminator |
| `plugin` | string | Yes | Plugin identifier |
| `marketplace` | string | Yes | GitHub ref or git URL |

Example:
```toml
[dependencies.my-plugin]
type = "claude-plugin"
plugin = "playwright"
marketplace = "anthropics/claude-plugins"
```

---

## [exports]

Configures what the package exports. Optional section.

### Auto-Discovery

```toml
[exports.auto_discover]
skills = "skills"  # directory name, or false to disable
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `skills` | string \| false | — | Directory to scan for skills |

When set to a string, the directory is scanned for skill files. Set to `false` to disable auto-discovery.

Example:
```toml
[exports]
auto_discover.skills = "skills"
```

---

## Complete Example

```toml
[package]
name = "my-workflow-skills"
version = "1.0.0"
description = "Custom skills for my development workflow"
license = "MIT"
org = "myorg"

[agents]
claude-code = true
codex = true
opencode = false

[dependencies]
# Registry shorthand
superpowers = "superpowers-marketplace/superpowers@1.0.0"

# GitHub with tag
sensei = { gh = "sensei-marketplace/sensei", tag = "v2.0.0" }

# GitHub with branch
feature-dev = { gh = "claude-plugins-official/feature-dev", branch = "main" }

# GitHub with subdirectory
elements = { gh = "superpowers-marketplace/elements-of-style", tag = "v1.0.0", path = "packages/core" }

# Generic git
gitlab-skills = { git = "https://gitlab.com/myorg/skills.git", rev = "abc123" }

# Local path
local-dev = { path = "../local-skills" }

# Claude plugin
playwright = { type = "claude-plugin", plugin = "playwright", marketplace = "anthropics/claude-plugins" }

[exports]
auto_discover.skills = "skills"
```

## Minimal Example

```toml
[package]
name = "minimal"
version = "1.0.0"

[agents]
claude-code = true
```

---

## Validation Rules

### String Fields
- All string fields are trimmed of leading/trailing whitespace
- Empty strings after trimming are invalid

### Strict Schema
- Unknown keys at any level are rejected
- This prevents typos from being silently ignored

### Dependency Constraints
- Registry format must match: `name@version` or `@org/name@version`
- GitHub `gh` must match: `owner/repo` (alphanumeric, `-`, `_`, `.`)
- Git refs: exactly ONE of `tag`, `branch`, `rev` must be specified
- Aliases cannot contain: `/` `\` `.` `:`

---

## MIME Type

Recommended: `application/toml`

## File Extensions

- `agents.toml` (standard)
- `.agents.toml` (hidden variant)

---

## Changelog

### 0.1.0 (Draft)
- Initial specification
