import { z } from "zod"

// =============================================================================
// Primitives
// =============================================================================

/** Non-empty string after trimming */
export const NonEmptyString = z
	.string()
	.transform((s) => s.trim())
	.pipe(z.string().min(1, "String cannot be empty"))

/** Alias for dependencies - no special characters */
export const Alias = z
	.string()
	.transform((s) => s.trim())
	.pipe(
		z
			.string()
			.min(1, "Alias cannot be empty")
			.refine((s) => !s.includes("/"), "Alias cannot contain '/'")
			.refine((s) => !s.includes("\\"), "Alias cannot contain '\\'")
			.refine((s) => !s.includes("."), "Alias cannot contain '.'")
			.refine((s) => !s.includes(":"), "Alias cannot contain ':'"),
	)

/** GitHub reference: owner/repo */
export const GithubRef = z
	.string()
	.regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, "Must be in format 'owner/repo'")

/** Known agent identifiers */
export const AgentId = z.enum(["claude-code", "codex", "opencode"])
export type AgentId = z.infer<typeof AgentId>

// =============================================================================
// Package Section
// =============================================================================

export const PackageSchema = z
	.object({
		description: NonEmptyString.optional(),
		license: NonEmptyString.optional(),
		name: NonEmptyString,
		org: NonEmptyString.optional(),
		version: NonEmptyString,
	})
	.strict()

export type Package = z.infer<typeof PackageSchema>

// =============================================================================
// Agents Section
// =============================================================================

export const AgentsSchema = z.record(z.string(), z.boolean())

export type Agents = z.infer<typeof AgentsSchema>

// =============================================================================
// Dependencies Section
// =============================================================================

/** Registry package: [@org/]name@version */
const RegistryPattern = /^(@[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+@.+$/

export const RegistryDependency = z
	.string()
	.regex(RegistryPattern, "Must be in format '[@org/]name@version'")

/** GitHub dependency */
export const GithubDependency = z
	.object({
		branch: NonEmptyString.optional(),
		gh: GithubRef,
		path: NonEmptyString.optional(),
		rev: NonEmptyString.optional(),
		tag: NonEmptyString.optional(),
	})
	.strict()
	.refine(
		(d) => {
			const refs = [d.tag, d.branch, d.rev].filter(Boolean).length
			return refs <= 1
		},
		{ message: "Only one of 'tag', 'branch', or 'rev' can be specified" },
	)

/** Generic git dependency */
export const GitDependency = z
	.object({
		branch: NonEmptyString.optional(),
		git: NonEmptyString,
		path: NonEmptyString.optional(),
		rev: NonEmptyString.optional(),
		tag: NonEmptyString.optional(),
	})
	.strict()
	.refine(
		(d) => {
			const refs = [d.tag, d.branch, d.rev].filter(Boolean).length
			return refs <= 1
		},
		{ message: "Only one of 'tag', 'branch', or 'rev' can be specified" },
	)

/** Local filesystem dependency */
export const LocalDependency = z
	.object({
		path: NonEmptyString,
	})
	.strict()

/** Claude plugin dependency */
export const ClaudePluginDependency = z
	.object({
		marketplace: NonEmptyString,
		plugin: NonEmptyString,
		type: z.literal("claude-plugin"),
	})
	.strict()

/** Any dependency declaration */
export const DependencyDeclaration = z.union([
	RegistryDependency,
	GithubDependency,
	GitDependency,
	LocalDependency,
	ClaudePluginDependency,
])

export type DependencyDeclaration = z.infer<typeof DependencyDeclaration>

export const DependenciesSchema = z.record(Alias, DependencyDeclaration)

export type Dependencies = z.infer<typeof DependenciesSchema>

// =============================================================================
// Exports Section
// =============================================================================

export const ExportsSchema = z
	.object({
		auto_discover: z
			.object({
				skills: z.union([NonEmptyString, z.literal(false)]).optional(),
			})
			.strict()
			.optional(),
	})
	.strict()

export type Exports = z.infer<typeof ExportsSchema>

// =============================================================================
// Full Manifest
// =============================================================================

export const ManifestSchema = z
	.object({
		agents: AgentsSchema.optional().default({}),
		dependencies: DependenciesSchema.optional().default({}),
		exports: ExportsSchema.optional(),
		package: PackageSchema.optional(),
	})
	.strict()

export type Manifest = z.infer<typeof ManifestSchema>

// =============================================================================
// Validated/Processed Types
// =============================================================================

export interface ValidatedGithubDependency {
	type: "github"
	gh: string
	ref?: { type: "tag" | "branch" | "rev"; value: string }
	path?: string
}

export interface ValidatedGitDependency {
	type: "git"
	url: string
	ref?: { type: "tag" | "branch" | "rev"; value: string }
	path?: string
}

export interface ValidatedRegistryDependency {
	type: "registry"
	name: string
	org?: string
	version: string
}

export interface ValidatedLocalDependency {
	type: "local"
	path: string
}

export interface ValidatedClaudePluginDependency {
	type: "claude-plugin"
	plugin: string
	marketplace: string
}

export type ValidatedDependency =
	| ValidatedGithubDependency
	| ValidatedGitDependency
	| ValidatedRegistryDependency
	| ValidatedLocalDependency
	| ValidatedClaudePluginDependency

export interface ValidatedManifest {
	package?: Package
	agents: Map<AgentId, boolean>
	dependencies: Map<string, ValidatedDependency>
	exports?: Exports
}
