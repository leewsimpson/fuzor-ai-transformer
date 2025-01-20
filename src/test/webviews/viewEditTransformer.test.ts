import * as assert from "assert"
import * as vscode from "../mocks/vscode"
import { ViewEditTransformer } from "../../webviews/ViewEditTransformer"
import { TransformerManager } from "../../transformers/transformerManager"
import { TransformersProvider } from "../../providers/TransformersProvider"
import type { ITransformerStorage } from "../../types/storage"
import type { TransformerConfig } from "../../shared/transformerConfig"
import path from "path"
import { FuzorItem } from "../../shared/transformerConfig"

suite("ViewEditTransformer Tests", () => {
	let webview: ViewEditTransformer
	let manager: TransformerManager
	// Mock storage implementation
	class MockStorage implements ITransformerStorage {
		private transformers = new Map<string, FuzorItem>()

		constructor() {
			this.clear()
		}

		async saveTransformers(transformers: Map<string, FuzorItem>): Promise<void> {
			this.transformers.clear()
			transformers.forEach((value, key) => {
				this.transformers.set(key, value)
			})
		}

		async loadTransformers(): Promise<Map<string, FuzorItem>> {
			return new Map(this.transformers)
		}

		clear(): void {
			this.transformers.clear()
		}

		getBasePath(): string {
			return __dirname
		}
	}

	let storage: MockStorage
	let provider: TransformersProvider
	let extensionContext: vscode.ExtensionContext
	let webviewView: vscode.WebviewView
	let messageHandler: (message: any) => Promise<void>

	const baseConfig: TransformerConfig = {
		id: "test-transformer",
		name: "Test Transformer",
		description: "Test description",
		prompt: "Test prompt {{content::file}}",
		input: [
			{
				name: "content",
				description: "Test input",
				type: "input",
				value: "Content",
				required: true,
			},
		],
		outputFolder: "outputfolder/",
		outputFileName: "output",
		temperature: 0.7,
		processFormat: "eachFile",
	}

	setup(async () => {
		const extensionRoot = path.resolve(__dirname, "../")

		// Mock the extension context
		extensionContext = {
			extensionUri: vscode.Uri.file(extensionRoot),
			subscriptions: [],
			workspaceState: {
				get: () => undefined,
				update: () => Promise.resolve(),
			},
			globalState: {
				get: () => undefined,
				update: () => Promise.resolve(),
				setKeysForSync: () => {},
			},
			secrets: {
				get: () => Promise.resolve(undefined),
				store: () => Promise.resolve(),
				delete: () => Promise.resolve(),
			},
			extensionPath: extensionRoot,
			asAbsolutePath: (relativePath: string) => __dirname + "/" + relativePath,
			storagePath: __dirname + "/storage",
			globalStoragePath: __dirname + "/globalStorage",
			logPath: __dirname + "/logs",
			extensionMode: vscode.ExtensionMode.Test,
			environmentVariableCollection: {
				persistent: false,
				append: () => {},
				clear: () => {},
				delete: () => {},
				forEach: () => {},
				get: () => undefined,
				prepend: () => {},
				replace: () => {},
			},
			storageUri: vscode.Uri.file(__dirname + "/storage"),
			globalStorageUri: vscode.Uri.file(__dirname + "/globalStorage"),
			logUri: vscode.Uri.file(__dirname + "/logs"),
			extension: {
				id: "test-extension",
				extensionUri: vscode.Uri.file(__dirname),
				extensionPath: __dirname,
				isActive: true,
				packageJSON: {},
				exports: undefined,
				activate: () => Promise.resolve(),
			},
		} as unknown as vscode.ExtensionContext

		// Set test environment
		process.env.TEST = "true"

		// Create storage and manager
		storage = new MockStorage()
		manager = await TransformerManager.create(storage)

		// Create provider
		provider = new TransformersProvider(manager)

		// Create webview
		webview = new ViewEditTransformer(extensionContext.extensionUri, extensionContext, provider, manager)

		// Initialize webview view with message handler tracking
		webviewView = {
			webview: {
				html: "",
				options: {},
				onDidReceiveMessage: (handler: (message: any) => Promise<void>) => {
					messageHandler = handler
					return { dispose: () => {} }
				},
				postMessage: async (message: any) => true,
			},
		} as unknown as vscode.WebviewView
	})

	suite("View Transformer Tests", () => {
		test("should initialize webview correctly", async () => {
			await manager.createTransformer(baseConfig)

			// Mock webview HTML generation
			webviewView.webview.html = "<html></html>"

			webview.resolveWebviewView(webviewView, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken)

			// Verify webview was initialized
			assert.ok(webviewView.webview.html)
			assert.strictEqual(webviewView.webview.html, "<html></html>")
		})

		test("should update content when transformer changes", async () => {
			await manager.createTransformer(baseConfig)
			webview.resolveWebviewView(webviewView, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken)

			// Mock postMessage to capture updates
			let lastMessage: any
			webviewView.webview.postMessage = async (message: any) => {
				lastMessage = message
				return true
			}

			// Update content
			webview.updateContent(baseConfig)

			// Wait for message to be processed
			await new Promise((resolve) => setTimeout(resolve, 100))

			// Verify update was sent
			assert.ok(lastMessage)
			assert.strictEqual(lastMessage.type, "viewTransformer")
			assert.strictEqual(lastMessage.config.name, baseConfig.name)
			assert.strictEqual(lastMessage.config.description, baseConfig.description)
		})
	})

	suite("Message Handling Tests", () => {
		setup(() => {
			webview.resolveWebviewView(webviewView, {} as vscode.WebviewViewResolveContext, {} as vscode.CancellationToken)
		})

		test("should validate data before saving", async () => {
			await manager.createTransformer(baseConfig)

			const invalidConfig = {
				...baseConfig,
				name: "", // Invalid: empty name
			}

			// Simulate save message with invalid data using tracked handler
			try {
				await messageHandler({
					type: "saveTransformer",
					config: invalidConfig,
				})
				assert.fail("Should reject invalid transformer config")
			} catch (error) {
				assert.ok(error instanceof Error)
			}
		})
	})
})
