import { parse as parseToml } from "smol-toml"
import { ZodError } from "zod"
import {
	AgentId,
	type DependencyDeclaration,
	type Manifest,
	ManifestSchema,
	type ValidatedDependency,
	type ValidatedManifest,
} from "./schema.js"

// =============================================================================
// Error Types
// =============================================================================

export type ParseErrorType = "invalid_toml" | "invalid_manifest" | "invalid_dependency"

export interface ParseError {
	type: ParseErrorType
	message: string
	cause?: unknown
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: ParseError }

// =============================================================================
// Dependency Parsing
// =============================================================================

const REGISTRY_PATTERN = /^(?:@([a-zA-Z0-9_-]+)\/)?([a-zA-Z0-9_-]+)@(.+)$/

function parseRegistryString(value: string): ValidatedDependency | null {
	const match = value.match(REGISTRY_PATTERN)
	if (!match) return null

	const [, org, name, version] = match
	return {
		name,
		type: "registry",
		version,
		...(org && { org }),
	}
}

function extractGitRef(dep: {
	tag?: string
	branch?: string
	rev?: string
}): { type: "tag" | "branch" | "rev"; value: string } | undefined {
	if (dep.tag) return { type: "tag", value: dep.tag }
	if (dep.branch) return { type: "branch", value: dep.branch }
	if (dep.rev) return { type: "rev", value: dep.rev }
	return undefined
}

function parseDependency(
	alias: string,
	decl: DependencyDeclaration,
): ParseResult<ValidatedDependency> {
	// String = registry shorthand
	if (typeof decl === "string") {
		const parsed = parseRegistryString(decl)
		if (!parsed) {
			return {
				error: {
					message: `Invalid registry dependency format for '${alias}': ${decl}`,
					type: "invalid_dependency",
				},
				ok: false,
			}
		}
		return { ok: true, value: parsed }
	}

	// Object with 'gh' = GitHub
	if ("gh" in decl) {
		return {
			ok: true,
			value: {
				gh: decl.gh,
				ref: extractGitRef(decl),
				type: "github",
				...(decl.path && { path: decl.path }),
			},
		}
	}

	// Object with 'git' = generic git
	if ("git" in decl) {
		return {
			ok: true,
			value: {
				ref: extractGitRef(decl),
				type: "git",
				url: decl.git,
				...(decl.path && { path: decl.path }),
			},
		}
	}

	// Object with 'type: claude-plugin'
	if ("type" in decl && decl.type === "claude-plugin") {
		return {
			ok: true,
			value: {
				marketplace: decl.marketplace,
				plugin: decl.plugin,
				type: "claude-plugin",
			},
		}
	}

	// Object with 'path' = local
	if ("path" in decl) {
		return {
			ok: true,
			value: {
				path: decl.path,
				type: "local",
			},
		}
	}

	return {
		error: {
			message: `Unknown dependency format for '${alias}'`,
			type: "invalid_dependency",
		},
		ok: false,
	}
}

// =============================================================================
// Main Parser
// =============================================================================

const KNOWN_AGENTS = new Set(AgentId.options)

/**
 * Parse and validate an agents.toml string
 */
export function parse(contents: string): ParseResult<ValidatedManifest> {
	// Step 1: Parse TOML
	let raw: unknown
	try {
		raw = parseToml(contents)
	} catch (err) {
		return {
			error: {
				cause: err,
				message: err instanceof Error ? err.message : "Invalid TOML syntax",
				type: "invalid_toml",
			},
			ok: false,
		}
	}

	// Step 2: Validate against schema
	let manifest: Manifest
	try {
		manifest = ManifestSchema.parse(raw)
	} catch (err) {
		if (err instanceof ZodError) {
			const issues = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
			return {
				error: {
					cause: err,
					message: `Invalid manifest: ${issues}`,
					type: "invalid_manifest",
				},
				ok: false,
			}
		}
		throw err
	}

	// Step 3: Process agents (filter to known IDs)
	const agents = new Map<AgentId, boolean>()
	for (const [id, enabled] of Object.entries(manifest.agents)) {
		if (KNOWN_AGENTS.has(id as AgentId)) {
			agents.set(id as AgentId, enabled)
		}
		// Unknown agents silently ignored for forward compatibility
	}

	// Step 4: Process dependencies
	const dependencies = new Map<string, ValidatedDependency>()
	for (const [alias, decl] of Object.entries(manifest.dependencies)) {
		const result = parseDependency(alias, decl)
		if (!result.ok) {
			return result
		}
		dependencies.set(alias, result.value)
	}

	// Step 5: Build validated manifest
	const validated: ValidatedManifest = {
		agents,
		dependencies,
		...(manifest.package && { package: manifest.package }),
		...(manifest.exports && { exports: manifest.exports }),
	}

	return { ok: true, value: validated }
}

/**
 * Parse agents.toml, throwing on error
 */
export function parseOrThrow(contents: string): ValidatedManifest {
	const result = parse(contents)
	if (!result.ok) {
		throw new Error(result.error.message)
	}
	return result.value
}
