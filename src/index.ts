// Schema exports

export type { ParseError, ParseErrorType, ParseResult } from "./parse.js"
// Parser
export { parse, parseOrThrow } from "./parse.js"
// Types
export type {
	Agents,
	Dependencies,
	Exports,
	Manifest,
	Package,
	ValidatedClaudePluginDependency,
	ValidatedDependency,
	ValidatedGitDependency,
	ValidatedGithubDependency,
	ValidatedLocalDependency,
	ValidatedManifest,
	ValidatedRegistryDependency,
} from "./schema.js"
export {
	AgentId,
	AgentsSchema,
	Alias,
	ClaudePluginDependency,
	DependenciesSchema,
	DependencyDeclaration,
	ExportsSchema,
	GitDependency,
	GithubDependency,
	GithubRef,
	LocalDependency,
	// Full manifest
	ManifestSchema,
	// Primitives
	NonEmptyString,
	// Section schemas
	PackageSchema,
	// Dependency schemas
	RegistryDependency,
} from "./schema.js"
