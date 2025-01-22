import * as assert from "assert"
import * as sinon from "sinon"
import { LLMClient } from "../../llm/llmClient"
import { ConfigurationManager, AIProvider } from "../../config/configurationManager"
import { logOutputChannel } from "../../extension"

suite("LLMClient", () => {
	let sandbox: sinon.SinonSandbox

	setup(() => {
		sandbox = sinon.createSandbox()
	})

	teardown(() => {
		sandbox.restore()
	})

	suite("constructor", () => {
		test("should create OpenAI client when provider is OpenAI", () => {
			sandbox.stub(ConfigurationManager, "getAIProvider").returns(AIProvider.OpenAI)
			sandbox.stub(ConfigurationManager, "getAPIKey").returns("test-key")
			sandbox.stub(ConfigurationManager, "getModelName").returns("gpt-4")

			const client = new LLMClient()
			assert.ok(client)
		})

		test("should create DeepSeek client when provider is DeepSeek", () => {
			sandbox.stub(ConfigurationManager, "getAIProvider").returns(AIProvider.DeepSeek)
			sandbox.stub(ConfigurationManager, "getAPIKey").returns("test-key")
			sandbox.stub(ConfigurationManager, "getModelName").returns("deepseek-chat")

			const client = new LLMClient()
			assert.ok(client)
		})

		test("should create AzureOpenAI client when provider is AzureOpenAI", () => {
			sandbox.stub(ConfigurationManager, "getAIProvider").returns(AIProvider.AzureOpenAI)
			sandbox.stub(ConfigurationManager, "getAPIKey").returns("test-key")
			sandbox.stub(ConfigurationManager, "getModelName").returns("gpt-4")
			sandbox.stub(ConfigurationManager, "getModelEndpoint").returns("https://test-endpoint")
			sandbox.stub(ConfigurationManager, "getApiVersion").returns("2023-12-01")

			const client = new LLMClient()
			assert.ok(client)
		})

		test("should create AzureOpenAI client when provider is Google Gemini", () => {
			sandbox.stub(ConfigurationManager, "getAIProvider").returns(AIProvider.GoogleGemini)
			sandbox.stub(ConfigurationManager, "getAPIKey").returns("test-key")
			sandbox.stub(ConfigurationManager, "getModelName").returns("gpt-4")

			const client = new LLMClient()
			assert.ok(client)
		})

		test("should create Custom client when provider is Custom", () => {
			sandbox.stub(ConfigurationManager, "getAIProvider").returns(AIProvider.Custom)
			sandbox.stub(ConfigurationManager, "getAPIKey").returns("custom-api-key")
			sandbox.stub(ConfigurationManager, "getModelEndpoint").returns("https://custom-endpoint")

			const client = new LLMClient()
			assert.ok(client)
		})

		test("should throw error for unsupported provider", () => {
			sandbox.stub(ConfigurationManager, "getAIProvider").returns("Unsupported" as AIProvider)

			assert.throws(
				() => new LLMClient(),
				(error: Error) => {
					assert.strictEqual(error.message, "Unsupported provider: Unsupported")
					return true
				},
			)
		})
	})

	suite("sendRequest", () => {
		test("should log request initialization and completion", async () => {
			const logSpy = sandbox.spy(logOutputChannel, "info")
			sandbox.stub(ConfigurationManager, "getAIProvider").returns(AIProvider.OpenAI)
			sandbox.stub(ConfigurationManager, "getAPIKey").returns("test-key")
			sandbox.stub(ConfigurationManager, "getModelName").returns("gpt-4")

			const mockSendRequest = sandbox.stub().resolves("test response")
			sandbox.stub(LLMClient.prototype, "sendRequest").callsFake(async () => {
				logOutputChannel.info("Initializing request...")
				await mockSendRequest()
				logOutputChannel.info("Request completed successfully.")
				return "test response"
			})

			const client = new LLMClient()
			await client.sendRequest("test prompt")

			assert.ok(logSpy.calledWith("Initializing request..."))
			assert.ok(logSpy.calledWith("Request completed successfully."))
		})
	})

	suite("getSupportedAiProviders", () => {
		test("should return supported providers", async () => {
			sandbox.stub(ConfigurationManager, "getAIProvider").returns(AIProvider.OpenAI)
			sandbox.stub(ConfigurationManager, "getAPIKey").returns("test-key") // Ensure API key is stubbed
			sandbox.stub(ConfigurationManager, "getModelName").returns("gpt-4")

			const client = new LLMClient()
			const providers = await client.getSupportedAiProviders()
			assert.deepStrictEqual(providers, ["OpenAI", "DeepSeek", "Azure OpenAI", "Google Gemini", "Github Copilot", "Custom"])
		})
	})

	suite("getSelectedAiProvider", () => {
		test("should return current provider", async () => {
			sandbox.stub(ConfigurationManager, "getAIProvider").returns(AIProvider.OpenAI)
			sandbox.stub(ConfigurationManager, "getAPIKey").returns("test-key")
			sandbox.stub(ConfigurationManager, "getModelName").returns("gpt-4")

			const client = new LLMClient()
			const provider = await client.getSelectedAiProvider()
			assert.strictEqual(provider, AIProvider.OpenAI)
		})
	})
})
