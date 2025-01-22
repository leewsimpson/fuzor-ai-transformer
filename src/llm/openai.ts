import OpenAI from "openai"
import { LLMBase, LLMMessage } from "./llmBase"
import { logOutputChannel } from "../extension"

export class OpenAIClient extends LLMBase {
	private openai: OpenAI
	private maxTokens: number

	constructor(apiKey: string, model: string = "gpt-4", maxTokens = 4000, openai?: OpenAI) {
		super(model)
		if (!apiKey) {
			throw new Error("OpenAI API key is missing")
		}
		this.maxTokens = maxTokens
		this.openai = openai || new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
	}

	async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
		logOutputChannel.show(true)
		logOutputChannel.info(`Sending request to OpenAI with model: ${this.model}`)

		const messages = typeof promptOrMessages === "string" ? [{ role: "user", content: promptOrMessages }] : promptOrMessages

		try {
			logOutputChannel.info(`Preparing request payload...`)

			const response = await this.openai.chat.completions.create({
				model: options?.model || this.model,
				messages: messages as any,
				temperature: options?.temperature || 0.7,
				max_tokens: this.maxTokens || 1000,
				top_p: options?.topP || 0.9,
			})

			logOutputChannel.info(`Response received successfully.`)
			if (response.usage) {
				logOutputChannel.info(
					`Tokens Used - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}`,
				)
			}

			const result = response.choices[0]?.message?.content || ""
			return result
		} catch (error) {
			if (error instanceof Error) {
				logOutputChannel.error(`Error while sending request to llm: ${error.message}\nStack: ${error.stack}`)
			} else {
				logOutputChannel.error(`Unknown error sending request to llm: ${JSON.stringify(error)}`)
			}
			throw error
		}
	}
}
