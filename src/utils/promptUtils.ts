import { TransformerConfig } from "../shared/transformerConfig"
import { readFileContents, getAbsolutePath } from "./fileUtils"
import * as fs from "fs"
import * as path from "path"
import { logOutputChannel } from "../extension"
import { TransformerValidationError } from "../types/errors"

export async function generatePrompt(config: TransformerConfig): Promise<string> {
	const placeholderRegex = /\{\{([^}]+)\}\}/g
	const placeholders = new Set<{ name: string; type: string; options: string | undefined }>()
	let match
	let processedPrompt = config.prompt
	while ((match = placeholderRegex.exec(config.prompt))) {
		const [inputName, inputType, inputOptions] = match[1].split("::")
		logOutputChannel.debug(
			`Found placeholder: ${match[1]} of type ${inputType} with name ${inputName} and options ${inputOptions}`,
		)
		placeholders.add({ name: inputName, type: inputType, options: inputOptions })

		const input = config.input.find((i) => i.name === inputName)
		if (!input) {
			throw new Error(`Input ${inputName} not found in config`)
		}

		const inputValue = input.value
		if (inputValue === undefined || inputValue === null) {
			return processedPrompt
		} else {
			switch (inputType) {
				case "text":
				case "textArea":
				case "string":
				case "select":
					processedPrompt = processedPrompt.replace("{{" + match[1] + "}}", inputValue)
					break
				case "file":
					const fileContent = await readFileContents(inputValue)
					// Replace placeholders in the prompt
					processedPrompt = processedPrompt.replace("{{" + match[1] + "}}", fileContent)
					break
				case "folder":
					if (config.processFormat === "joinFiles") {
						const absolutePath = getAbsolutePath(inputValue)
						if (!absolutePath || absolutePath === null) {
							throw new Error("Invalid folder path")
						}
						const files = fs.readdirSync(absolutePath)
						let joinedContent = ""
						for (const file of files) {
							const filePath = path.join(absolutePath, file)
							const fileStat = fs.lstatSync(filePath)
							if (fileStat.isFile() && !file.startsWith(".")) {
								const fileContent = await readFileContents(filePath)
								joinedContent += `FileName: ${file}\n${fileContent}\n\n`
							}
						}
						processedPrompt = processedPrompt.replace("{{" + match[1] + "}}", joinedContent)
					}
					break
			}
		}
	}
	return processedPrompt
}

export function validatePrompt(prompt: string): void {
	if (!prompt || typeof prompt !== "string") {
		throw new TransformerValidationError("Prompt cannot be empty")
	}

	// Extract placeholders from prompt
	const placeholderRegex = /\{\{([^}]+)\}\}/g
	const placeholders = new Set<{ name: string; type: string; options?: string }>()
	let match

	// Throw error if there are no placeholders
	if (!prompt.match(placeholderRegex)) {
		throw new TransformerValidationError("Prompt must contain at least one placeholder")
	}

	// Reset regex state
	placeholderRegex.lastIndex = 0

	// Validate placeholder types and names
	const validTypes = ["file", "folder", "string", "text", "textArea", "", "select"]
	const placeholderNames = new Set<string>()
	let folderCount = 0

	while ((match = placeholderRegex.exec(prompt)) !== null) {
		const parts = match[1].split("::")
		const name = parts[0]
		const type = parts[1] || "file"
		const options = parts[2] || undefined

		// Validate options if present
		if (options) {
			if (!options.startsWith("[") || !options.endsWith("]")) {
				throw new TransformerValidationError(`Placeholder options must be enclosed in square brackets: ${name}`)
			}
		}

		// Validate placeholder name
		if (!name || name.trim() === "" || name.match(/[^a-zA-Z0-9]/)) {
			throw new TransformerValidationError(`Invalid placeholder name: ${name}`)
		}

		// Validate placeholder type
		if (!validTypes.includes(type)) {
			throw new TransformerValidationError(`Invalid placeholder type: ${type}`)
		}

		// Check for duplicate names
		if (placeholderNames.has(name)) {
			throw new TransformerValidationError(`Duplicate placeholder name: ${name}`)
		}
		placeholderNames.add(name)

		// Count folder placeholders
		if (type === "folder") {
			folderCount++
			if (folderCount > 1) {
				throw new TransformerValidationError("A prompt can only have a maximum of 1 placeholder of type folder")
			}
		}
	}
}
