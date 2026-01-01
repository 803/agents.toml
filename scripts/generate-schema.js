#!/usr/bin/env node

import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { zodToJsonSchema } from "zod-to-json-schema"
import { ManifestSchema } from "../dist/index.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

const jsonSchema = zodToJsonSchema(ManifestSchema, {
	$refStrategy: "none",
	name: "agents.toml",
})

// Add metadata
const schema = {
	$id: "https://github.com/803/agents.toml/schema.json",
	$schema: "http://json-schema.org/draft-07/schema#",
	description: "Manifest file for AI agent skill packages",
	title: "agents.toml",
	...jsonSchema,
}

const outputPath = join(__dirname, "..", "schema.json")
writeFileSync(outputPath, JSON.stringify(schema, null, 2))

console.log(`Generated schema.json at ${outputPath}`)
