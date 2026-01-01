import { describe, expect, it } from "vitest"
import { parse, parseOrThrow } from "./parse.js"

describe("parse", () => {
	describe("minimal manifest", () => {
		it("parses a minimal valid manifest", () => {
			const result = parse(`
[package]
name = "test"
version = "1.0.0"

[agents]
claude-code = true
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			expect(result.value.package?.name).toBe("test")
			expect(result.value.package?.version).toBe("1.0.0")
			expect(result.value.agents.get("claude-code")).toBe(true)
		})

		it("allows empty agents section", () => {
			const result = parse(`
[agents]
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")
			expect(result.value.agents.size).toBe(0)
		})
	})

	describe("agents section", () => {
		it("parses all known agents", () => {
			const result = parse(`
[agents]
claude-code = true
codex = false
opencode = true
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			expect(result.value.agents.get("claude-code")).toBe(true)
			expect(result.value.agents.get("codex")).toBe(false)
			expect(result.value.agents.get("opencode")).toBe(true)
		})

		it("ignores unknown agents for forward compatibility", () => {
			const result = parse(`
[agents]
claude-code = true
future-agent = true
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			expect(result.value.agents.get("claude-code")).toBe(true)
			// biome-ignore lint/suspicious/noExplicitAny: Testing unknown agent handling
			expect(result.value.agents.has("future-agent" as any)).toBe(false)
		})
	})

	describe("dependencies", () => {
		it("parses registry shorthand", () => {
			const result = parse(`
[agents]

[dependencies]
superpowers = "superpowers@1.0.0"
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			const dep = result.value.dependencies.get("superpowers")
			expect(dep?.type).toBe("registry")
			if (dep?.type !== "registry") throw new Error("Expected registry")
			expect(dep.name).toBe("superpowers")
			expect(dep.version).toBe("1.0.0")
		})

		it("parses registry with org", () => {
			const result = parse(`
[agents]

[dependencies]
myskill = "@myorg/skill@2.0.0"
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			const dep = result.value.dependencies.get("myskill")
			expect(dep?.type).toBe("registry")
			if (dep?.type !== "registry") throw new Error("Expected registry")
			expect(dep.org).toBe("myorg")
			expect(dep.name).toBe("skill")
			expect(dep.version).toBe("2.0.0")
		})

		it("parses GitHub dependency with tag", () => {
			const result = parse(`
[agents]

[dependencies.sensei]
gh = "sensei-marketplace/sensei"
tag = "v2.0.0"
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			const dep = result.value.dependencies.get("sensei")
			expect(dep?.type).toBe("github")
			if (dep?.type !== "github") throw new Error("Expected github")
			expect(dep.owner).toBe("sensei-marketplace")
			expect(dep.repo).toBe("sensei")
			expect(dep.ref).toEqual({ type: "tag", value: "v2.0.0" })
		})

		it("parses GitHub dependency with branch and path", () => {
			const result = parse(`
[agents]

[dependencies.feature-dev]
gh = "org/repo"
branch = "main"
path = "packages/core"
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			const dep = result.value.dependencies.get("feature-dev")
			expect(dep?.type).toBe("github")
			if (dep?.type !== "github") throw new Error("Expected github")
			expect(dep.ref).toEqual({ type: "branch", value: "main" })
			expect(dep.path).toBe("packages/core")
		})

		it("parses git dependency", () => {
			const result = parse(`
[agents]

[dependencies.gitlab-skills]
git = "https://gitlab.com/org/repo.git"
rev = "abc123"
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			const dep = result.value.dependencies.get("gitlab-skills")
			expect(dep?.type).toBe("git")
			if (dep?.type !== "git") throw new Error("Expected git")
			expect(dep.url).toBe("https://gitlab.com/org/repo") // .git removed
			expect(dep.ref).toEqual({ type: "rev", value: "abc123" })
		})

		it("normalizes SSH git URLs to HTTPS", () => {
			const result = parse(`
[agents]

[dependencies.ssh-dep]
git = "git@github.com:org/repo.git"
tag = "v1"
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			const dep = result.value.dependencies.get("ssh-dep")
			if (dep?.type !== "git") throw new Error("Expected git")
			expect(dep.url).toBe("https://github.com/org/repo")
		})

		it("parses local dependency", () => {
			const result = parse(`
[agents]

[dependencies.local]
path = "../my-skills"
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			const dep = result.value.dependencies.get("local")
			expect(dep?.type).toBe("local")
			if (dep?.type !== "local") throw new Error("Expected local")
			expect(dep.path).toBe("../my-skills")
		})

		it("parses claude-plugin dependency", () => {
			const result = parse(`
[agents]

[dependencies.playwright]
type = "claude-plugin"
plugin = "playwright"
marketplace = "anthropics/claude-plugins"
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			const dep = result.value.dependencies.get("playwright")
			expect(dep?.type).toBe("claude-plugin")
			if (dep?.type !== "claude-plugin") throw new Error("Expected claude-plugin")
			expect(dep.plugin).toBe("playwright")
			expect(dep.marketplace).toBe("anthropics/claude-plugins")
		})

		it("rejects multiple git refs", () => {
			const result = parse(`
[agents]

[dependencies.bad]
gh = "org/repo"
tag = "v1"
branch = "main"
`)
			expect(result.ok).toBe(false)
			if (result.ok) throw new Error("Expected failure")
			expect(result.error.message).toContain("tag")
		})
	})

	describe("exports section", () => {
		it("parses auto_discover.skills", () => {
			const result = parse(`
[agents]

[exports]
auto_discover.skills = "skills"
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			expect(result.value.exports?.auto_discover?.skills).toBe("skills")
		})

		it("allows false for auto_discover.skills", () => {
			const result = parse(`
[agents]

[exports]
auto_discover.skills = false
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")

			expect(result.value.exports?.auto_discover?.skills).toBe(false)
		})
	})

	describe("error handling", () => {
		it("returns error for invalid TOML", () => {
			const result = parse("this is not valid [toml")
			expect(result.ok).toBe(false)
			if (result.ok) throw new Error("Expected failure")
			expect(result.error.type).toBe("invalid_toml")
		})

		it("returns error for unknown top-level keys", () => {
			const result = parse(`
[agents]
[unknown_section]
foo = "bar"
`)
			expect(result.ok).toBe(false)
			if (result.ok) throw new Error("Expected failure")
			expect(result.error.type).toBe("invalid_manifest")
		})

		it("trims whitespace from strings", () => {
			const result = parse(`
[package]
name = "  test  "
version = "1.0.0"

[agents]
`)
			expect(result.ok).toBe(true)
			if (!result.ok) throw new Error("Expected success")
			expect(result.value.package?.name).toBe("test")
		})

		it("rejects empty strings after trimming", () => {
			const result = parse(`
[package]
name = "   "
version = "1.0.0"

[agents]
`)
			expect(result.ok).toBe(false)
			if (result.ok) throw new Error("Expected failure")
			expect(result.error.type).toBe("invalid_manifest")
		})
	})

	describe("parseOrThrow", () => {
		it("returns value on success", () => {
			const manifest = parseOrThrow(`
[package]
name = "test"
version = "1.0.0"

[agents]
claude-code = true
`)
			expect(manifest.package?.name).toBe("test")
		})

		it("throws on error", () => {
			expect(() => parseOrThrow("invalid")).toThrow()
		})
	})
})
