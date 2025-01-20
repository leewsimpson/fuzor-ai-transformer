import { LLMBase, LLMMessage } from "./llmBase"
import { logOutputChannel } from "../extension"
import { log } from "console"

export class GeminiClient extends LLMBase {
	private apiKey: string

	constructor(apiKey: string, model: string) {
		super(model)

		if (!apiKey) {
			throw new Error("Gemini API key is missing")
		}
		if (!model) {
			throw new Error("Gemini model is missing")
		}

		this.apiKey = apiKey
	}

	async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
		const { GoogleGenerativeAI } = require("@google/generative-ai")
		const genAI = new GoogleGenerativeAI(`${this.apiKey}`)
		const model = genAI.getGenerativeModel({ model: this.model })

		logOutputChannel.show(true)
		logOutputChannel.info(`Sending request to Gemini with model: ${this.model}`)

		logOutputChannel.info(`Preparing request payload...`)
		const messages =
			typeof promptOrMessages === "string"
				? promptOrMessages
				: promptOrMessages.map((msg) => `${msg.role}: ${msg.content}`).join("\n")

		try {
			// JSON stringify and parse response
			logOutputChannel.info(`Paylod sent: ${messages}`)
			const response = await model.generateContent(messages)
			const responseJSON = JSON.stringify(response)
			logOutputChannel.info(`Response received: ${responseJSON}`)

			const parsedResponse = JSON.parse(responseJSON)
			const text = parsedResponse.response.candidates[0].content.parts[0].text
			logOutputChannel.info(`Response received successfully.`)

			// Log token counts
			if (parsedResponse.response.usageMetadata.promptTokenCount) {
				logOutputChannel.info(`Prompt Token Count: ${parsedResponse.response.usageMetadata.promptTokenCount}`)
			}
			if (parsedResponse.response.usageMetadata.candidatesTokenCount) {
				logOutputChannel.info(`Candidates Token Count: ${parsedResponse.response.usageMetadata.candidatesTokenCount}`)
			}
			if (parsedResponse.response.usageMetadata.totalTokenCount) {
				logOutputChannel.info(`Total Token Count: ${parsedResponse.response.usageMetadata.totalTokenCount}`)
			}
			return text
		} catch (error) {
			if (error instanceof Error) {
				logOutputChannel.error(`Error while sending request to Gemini: ${error.message}\nStack: ${error.stack}`)
			} else {
				logOutputChannel.error(`Unknown error sending request to Gemini: ${JSON.stringify(error)}`)
			}
			throw error
		}
	}
}
