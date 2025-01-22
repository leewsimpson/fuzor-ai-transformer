import { LLMBase, LLMMessage } from "./llmBase"
import { logOutputChannel } from "../extension"

interface CustomApiResponse {
	id: string
	object: string
	created: number
	model: string
	choices: {
		message: {
			content: string
		}
	}[]
	usage?: {
		prompt_tokens: number
		completion_tokens: number
		total_tokens: number
	}
}

export class Custom extends LLMBase {
	private apiKey: string
	private apiUrl: string

	constructor(apiKey: string, apiUrl: string) {
		super("default-model") // Model is not used but required by LLMBase constructor
		this.apiKey = apiKey
		this.apiUrl = apiUrl
	}

	async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
		logOutputChannel.show(true)
		logOutputChannel.info(`Sending request to Custom API with model: ${this.model}`)

		const messages = typeof promptOrMessages === "string" ? [{ role: "user", content: promptOrMessages }] : promptOrMessages

		try {
			logOutputChannel.info(`Preparing request payload... ${this.apiUrl}`)

			const response = await fetch(this.apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"api-key": this.apiKey,
				},
				body: JSON.stringify({
					messages,
					temperature: options?.temperature || 0.7,
					max_tokens: options?.maxTokens || 1000,
					top_p: options?.topP || 0.9,
				}),
			})

			if (!response.ok) {
				const errorBody = await response.text()
				logOutputChannel.error(`Custom API error response: ${errorBody}`)
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const data = (await response.json()) as CustomApiResponse // Corrected type definition
			logOutputChannel.info(`Response received successfully.`)

			return data.choices[0]?.message?.content || ""
		} catch (error) {
			logOutputChannel.error(`Error while sending request to Custom API: ${error.message}`)
			throw error
		}
	}
}
