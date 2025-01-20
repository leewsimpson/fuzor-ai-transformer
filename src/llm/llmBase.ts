import fs from "fs"

export interface LLMMessage {
	role: "user" | "assistant" | "system"
	content: string
}

export interface LLMResponse {
	content?: string
	model: string
	usage?: {
		prompt_tokens: number
		completion_tokens: number
		total_tokens: number
	}
}

export abstract class LLMBase {
	protected model: string

	constructor(model: string) {
		this.model = model
	}

	abstract sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string>

	protected static getTimestamp(): { date: string; time: string } {
		const now = new Date()
		const date = now.toISOString().split("T")[0]
		const time = now.toTimeString().split(" ")[0].replace(/:/g, "-")
		return { date, time }
	}

	protected static ensureDirectoryExists(directory: string): void {
		if (!fs.existsSync(directory)) {
			fs.mkdirSync(directory, { recursive: true })
		}
	}
}
