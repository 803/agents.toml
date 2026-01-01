# @skills-supply/agents-toml

Parser and validator for `agents.toml` manifest files.

## Installation

```bash
npm install @skills-supply/agents-toml
```

## Usage

```typescript
import { parse, parseOrThrow } from "@skills-supply/agents-toml"

const result = parse(`
[package]
name = "my-skills"
version = "1.0.0"

[agents]
claude-code = true

[dependencies]
superpowers = "superpowers@1.0.0"
`)

if (result.ok) {
  console.log(result.value.package?.name) // "my-skills"
  console.log(result.value.agents.get("claude-code")) // true
  console.log(result.value.dependencies.get("superpowers"))
  // { type: "registry", name: "superpowers", version: "1.0.0" }
}

// Or throw on error:
const manifest = parseOrThrow(tomlString)
```

## What is agents.toml?

A TOML-based manifest file that lets you:

- **Declare agent compatibility** — specify which AI agents (Claude Code, Codex, etc.) can use your skills
- **Manage dependencies** — pull skills from registries, GitHub, generic git, or local paths
- **Configure exports** — control what your package exposes

## Quick Example

```toml
[package]
name = "my-skills"
version = "1.0.0"

[agents]
claude-code = true

[dependencies]
superpowers = "superpowers-marketplace/superpowers@1.0.0"
local-tools = { path = "../my-local-tools" }
```

## Documentation

- **[SPEC.md](./SPEC.md)** — Full specification

## Dependency Types

| Type | Syntax | Example |
|------|--------|---------|
| Registry | `"[@org/]name@version"` | `"superpowers@1.0.0"` |
| GitHub | `{ gh = "owner/repo", tag = "v1.0" }` | `{ gh = "user/skills", branch = "main" }` |
| Git | `{ git = "https://...", rev = "abc" }` | `{ git = "https://gitlab.com/o/r", tag = "v1" }` |
| Local | `{ path = "..." }` | `{ path = "../local-skills" }` |
| Plugin | `{ type = "claude-plugin", ... }` | `{ type = "claude-plugin", plugin = "x", marketplace = "o/r" }` |

## JSON Schema

Access the generated JSON schema:

```typescript
import schema from "@skills-supply/agents-toml/schema.json"
```

## API

### `parse(contents: string): ParseResult<ValidatedManifest>`

Parses and validates an agents.toml string. Returns a result object:

```typescript
type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ParseError }
```

### `parseOrThrow(contents: string): ValidatedManifest`

Same as `parse`, but throws on error.

### Schemas (Zod)

All Zod schemas are exported for custom validation:

```typescript
import {
  ManifestSchema,
  PackageSchema,
  AgentsSchema,
  DependenciesSchema,
  // ...
} from "@skills-supply/agents-toml"
```

## License

[MIT](./LICENSE)
