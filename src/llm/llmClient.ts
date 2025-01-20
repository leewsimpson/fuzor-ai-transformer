import { ConfigurationManager, AIProvider } from "../config/configurationManager"
import { LLMBase, LLMMessage } from "./llmBase"
import { logOutputChannel } from "../extension"
import { OpenAIClient } from "./openai"
import { DeepSeekClient } from "./deepseek"
import { AzureOpenAiClient } from "./azureOpenAi"
import { GeminiClient } from "./gemini"

export class LLMClient {
	private client: LLMBase

	constructor() {
		const provider = ConfigurationManager.getAIProvider()

		switch (provider) {
			case AIProvider.OpenAI:
				this.client = new OpenAIClient(ConfigurationManager.getAPIKey()!, ConfigurationManager.getModelName())
				break
			case AIProvider.DeepSeek:
				this.client = new DeepSeekClient(ConfigurationManager.getAPIKey()!, ConfigurationManager.getModelName())
				break
			case AIProvider.AzureOpenAI:
				this.client = new AzureOpenAiClient(
					ConfigurationManager.getAPIKey()!,
					ConfigurationManager.getModelName(),
					ConfigurationManager.getModelEndpoint()!,
					ConfigurationManager.getApiVersion()!,
				)
				break
			case AIProvider.GoogleGemini:
				this.client = new GeminiClient(ConfigurationManager.getAPIKey()!, ConfigurationManager.getModelName()!)
				break
			default:
				throw new Error(`Unsupported provider: ${provider}`)
		}
	}

	async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
		logOutputChannel.info(`Initializing request...`)
		const result = await this.client.sendRequest(promptOrMessages, options)
		logOutputChannel.info(`Request completed successfully.`)
		return result
	}

	async getSupportedAiProviders(): Promise<AIProvider[]> {
		return [AIProvider.OpenAI, AIProvider.DeepSeek, AIProvider.AzureOpenAI, AIProvider.GoogleGemini]
	}

	async getSelectedAiProvider(): Promise<AIProvider> {
		return ConfigurationManager.getAIProvider()
	}
}
