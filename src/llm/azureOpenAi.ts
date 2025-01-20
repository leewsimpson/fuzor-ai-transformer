import { LLMBase, LLMMessage } from "./llmBase"
import { logOutputChannel } from "../extension"

interface AzureOpenAiResponse {
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

export class AzureOpenAiClient extends LLMBase {
	private apiKey: string
	private apiUrl: string

	constructor(apiKey: string, model: string = "gpt-4o", endpoint: string, version: string) {
		super(model)

		if (!apiKey) {
			throw new Error("Azure OpenAI API key is missing")
		}
		if (!endpoint) {
			throw new Error("Azure OpenAI endpoint is missing")
		}
		let mod = model ?? "gpt-4o"
		let ver = version === "" ? "2024-06-01" : version

		this.apiKey = apiKey
		this.apiUrl = `${endpoint}/openai/deployments/${mod}/chat/completions?api-version=${ver}`
	}

	async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
		logOutputChannel.show(true)
		logOutputChannel.info(`Sending request to Azure OpenAI with model: ${this.model}`)

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
					model: this.model,
					messages,
					temperature: options?.temperature || 0.7,
					max_tokens: options?.maxTokens || 1000,
					top_p: options?.topP || 0.9,
				}),
			})

			if (!response.ok) {
				const errorBody = await response.text()
				if (errorBody) {
					logOutputChannel.error(`Azure OpenAI API error response: ${errorBody}`)
				}
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const data = (await response.json()) as AzureOpenAiResponse
			logOutputChannel.info(`Response received successfully.`)

			if (data.usage) {
				logOutputChannel.info(
					`Tokens Used - Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}, Total: ${data.usage.total_tokens}`,
				)
			}

			return data.choices[0]?.message?.content || ""
		} catch (error) {
			if (error instanceof Error) {
				logOutputChannel.error(`Error while sending request to Azure OpenAI: ${error.message}\nStack: ${error.stack}`)
			} else {
				logOutputChannel.error(`Unknown error sending request to Azure OpenAI: ${JSON.stringify(error)}`)
			}
			throw error
		}
	}
}
