// src/config/configurationManager.ts
import * as vscode from "vscode"

export enum AIProvider {
	OpenAI = "OpenAI",
	AzureOpenAI = "Azure OpenAI",
	GoogleGemini = "Google Gemini",
	DeepSeek = "DeepSeek",
	GithubCopilot = "Github Copilot",
}

export class ConfigurationManager {
	private static readonly SECTION = "fuzorAiTransformer"
	private static readonly PROVIDER_KEY = "aiProvider"
	private static readonly API_KEY = "apiKey"
	private static readonly MODEL_NAME_KEY = "modelName"
	private static readonly MODEL_ENDPOINT = "modelEndpoint"
	private static readonly API_VERSION = "apiVersion"
	private static readonly ACCEPT_TERMS = "acceptTerms"
	private static readonly GIT_LIBRARY_NAME = "gitLibraryName"
	private static readonly TOKEN_LIMIT = 4000

	static getAcceptTerms(): boolean {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.get<boolean>(this.ACCEPT_TERMS, false)
	}

	static getGitLibraryName(): string | undefined {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.get<string>(this.GIT_LIBRARY_NAME)
	}

	static setGitLibraryName(gitLibraryName: string): Thenable<void> {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.update(this.GIT_LIBRARY_NAME, gitLibraryName, vscode.ConfigurationTarget.Global)
	}

	static setAcceptTerms(accepted: boolean): Thenable<void> {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.update(this.ACCEPT_TERMS, accepted, vscode.ConfigurationTarget.Global)
	}

	static getModelName(): string | undefined {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.get<string>(this.MODEL_NAME_KEY)
	}

	static setModelName(modelName: string): Thenable<void> {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.update(this.MODEL_NAME_KEY, modelName, vscode.ConfigurationTarget.Global)
	}

	static getAIProvider(): AIProvider {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.get<AIProvider>(this.PROVIDER_KEY, AIProvider.OpenAI)
	}

	static setAIProvider(provider: AIProvider): Thenable<void> {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.update(this.PROVIDER_KEY, provider, vscode.ConfigurationTarget.Global)
	}

	static getAPIKey(): string | undefined {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.get<string>(this.API_KEY)
	}

	static setAPIKey(apiKey: string): Thenable<void> {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.update(this.API_KEY, apiKey, vscode.ConfigurationTarget.Global)
	}

	static getModelEndpoint(): string | undefined {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.get<string>(this.MODEL_ENDPOINT)
	}

	static setModelEndpoint(apiKey: string): Thenable<void> {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.update(this.MODEL_ENDPOINT, apiKey, vscode.ConfigurationTarget.Global)
	}

	static getApiVersion(): string | undefined {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.get<string>(this.API_VERSION)
	}

	static setApiVersion(apiVersion: string): Thenable<void> {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.update(this.API_VERSION, apiVersion, vscode.ConfigurationTarget.Global)
	}

	static getTokenLimit(): number {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		const tokenLimit = config.get<number>(this.TOKEN_LIMIT.toString())
		const validTokenLimit = tokenLimit ?? ConfigurationManager.TOKEN_LIMIT
		return validTokenLimit
	}

	static setTokenLimit(tokenLimit: number): Thenable<void> {
		this.validateTokenLimit(tokenLimit)
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return config.update(this.TOKEN_LIMIT.toString(), tokenLimit, vscode.ConfigurationTarget.Global)
	}

	static getGlobalModelConfig(): any {
		const config = vscode.workspace.getConfiguration(this.SECTION)
		return {
			tokenLimit: 4000,
			temperature: 0.7,
			topP: 0.9,
		}
	}

	static validateTokenLimit(tokenLimit: any): void {
		if (typeof tokenLimit !== "number" || tokenLimit <= 0) {
			throw new Error("Token limit must be a positive number")
		}
	}

	static async promptForAPIKey(): Promise<void> {
		const apiKey = await vscode.window.showInputBox({
			prompt: "Enter your API key",
			password: true,
			ignoreFocusOut: true,
		})

		if (apiKey) {
			await this.setAPIKey(apiKey)
		}
	}
}
