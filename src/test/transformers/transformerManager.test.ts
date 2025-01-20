import * as assert from "assert"
import { TransformerManager } from "../../transformers/transformerManager"
import { TransformerExistsError, TransformerNotFoundError, TransformerValidationError } from "../../types/errors"
import type { FuzorItem, TransformerConfig } from "../../shared/transformerConfig"
import type { ITransformerStorage } from "../../types/storage"

// Mock storage implementation
class MockStorage implements ITransformerStorage {
	private transformers = new Map<string, FuzorItem>()

	constructor() {
		this.clear()
	}

	async saveTransformers(transformers: Map<string, FuzorItem>): Promise<void> {
		// Clear and repopulate the instance map
		this.transformers.clear()
		transformers.forEach((value, key) => {
			this.transformers.set(key, value)
		})
	}

	async loadTransformers(): Promise<Map<string, FuzorItem>> {
		// Return a new Map with the current values
		return new Map(this.transformers)
	}

	clear(): void {
		this.transformers.clear()
	}

	getBasePath(): string {
		return "/mock/path"
	}
}

suite("TransformerManager Behavior Tests", () => {
	let manager: TransformerManager
	let storage: MockStorage

	const baseConfig: TransformerConfig = {
		id: "test-transformer",
		name: "Test Transformer",
		description: "Test description",
		prompt: "Test prompt {{content::file}}",
		input: [
			{
				name: "content",
				description: "Test input",
				value: "/",
				type: "file",
				required: true,
			},
		],
		outputFolder: "outputfolder/",
		outputFileName: "output",
		temperature: 0.7,
		processFormat: "eachFile",
		parentFolderId: null,
	}

	suiteSetup(() => {
		process.env.TEST = "true"
		storage = new MockStorage()
	})

	setup(async () => {
		storage.clear()
		manager = await TransformerManager.create(storage)
	})

	test("should allow creating a new transformer with valid configuration", async () => {
		await manager.createTransformer(baseConfig)
		const result = manager.getTransformer(baseConfig.id)
		assert.deepStrictEqual(result, baseConfig)
		const fuzorItems = manager.getAllFuzorItems()
		assert.strictEqual(fuzorItems.length, 1)
		assert.deepStrictEqual(fuzorItems[0], {
			type: "transformer",
			config: baseConfig,
		})
	})

	test("should prevent creating duplicate transformers", async () => {
		await manager.createTransformer(baseConfig)
		await assert.rejects(() => manager.createTransformer(baseConfig), TransformerExistsError)
	})

	test("should validate required fields when creating transformer", async () => {
		const invalidConfig = { ...baseConfig, name: "" }
		await assert.rejects(() => manager.createTransformer(invalidConfig), TransformerValidationError)
	})

	test("should retrieve transformer by ID or name", async () => {
		await manager.createTransformer(baseConfig)

		const byId = manager.getTransformer(baseConfig.id)
		assert.deepStrictEqual(byId, baseConfig)

		const byName = manager.getTransformer(baseConfig.name)
		assert.deepStrictEqual(byName, baseConfig)
	})

	test("should return undefined for non-existent transformer", () => {
		const result = manager.getTransformer("non-existent")
		assert.strictEqual(result, undefined)
	})

	test("should list all available transformers", async () => {
		await manager.createTransformer(baseConfig)
		const secondConfig = { ...baseConfig, id: "test-2", name: "Test 2" }
		await manager.createTransformer(secondConfig)

		const all = manager.getAllTransformers()
		assert.strictEqual(all.length, 2)
		assert.deepStrictEqual(all, [baseConfig, secondConfig])
	})

	test("should update existing transformer configuration", async () => {
		await manager.createTransformer(baseConfig)
		const updatedConfig = { ...baseConfig, description: "Updated description" }

		await manager.updateTransformer(updatedConfig)
		const result = manager.getTransformer(baseConfig.id)
		assert.deepStrictEqual(result, updatedConfig)
	})

	test("should prevent updating non-existent transformer", async () => {
		const nonExistentConfig = { ...baseConfig, id: "non-existent" }
		await assert.rejects(() => manager.updateTransformer(nonExistentConfig), TransformerNotFoundError)
	})

	test("should validate configuration when updating transformer", async () => {
		await manager.createTransformer(baseConfig)
		const invalidConfig = { ...baseConfig, name: "" }

		await assert.rejects(() => manager.updateTransformer(invalidConfig), TransformerValidationError)
	})

	test("should delete transformer by ID or name", async () => {
		await manager.createTransformer(baseConfig)

		// Delete by ID
		await manager.deleteTransformer(baseConfig.id)
		assert.strictEqual(manager.getTransformer(baseConfig.id), undefined)

		// Recreate and delete by name
		await manager.createTransformer(baseConfig)
	})

	test("should throw error when deleting non-existent transformer", async () => {
		await assert.rejects(() => manager.deleteTransformer("non-existent"), TransformerNotFoundError)
	})

	test("should persist transformers to storage", async () => {
		await manager.createTransformer(baseConfig)
		const saved = await storage.loadTransformers()
		const result = saved.get(baseConfig.id)

		assert.deepStrictEqual(result?.config, baseConfig)
	})

	test("should load transformers from storage on initialization", async () => {
		// Create initial manager and save transformer
		const initialManager = await TransformerManager.create(storage)
		await initialManager.createTransformer(baseConfig)

		// Create new manager instance with same storage
		const newManager = await TransformerManager.create(storage)
		const result = newManager.getTransformer(baseConfig.id)
		assert.deepStrictEqual(result, baseConfig)
	})

	test("should maintain data integrity after multiple operations", async () => {
		// Create initial transformer
		await manager.createTransformer(baseConfig)

		// Update transformer
		const updatedConfig = { ...baseConfig, description: "Updated" }
		await manager.updateTransformer(updatedConfig)

		// Create second transformer
		const secondConfig = { ...baseConfig, id: "test-2", name: "Test 2" }
		await manager.createTransformer(secondConfig)

		// Delete first transformer
		await manager.deleteTransformer(baseConfig.id)

		// Verify final state
		const all = manager.getAllTransformers()
		assert.strictEqual(all.length, 1)
		assert.deepStrictEqual(all[0], secondConfig)
	})

	suite("Additional Validation Tests", () => {
		test("should validate prompt content", async () => {
			const invalidConfig = { ...baseConfig, prompt: "" }
			await assert.rejects(() => manager.createTransformer(invalidConfig), TransformerValidationError)
		})

		test("should validate prompt placeholders", async () => {
			// Test missing placeholder
			const noPlaceholder = { ...baseConfig, prompt: "No placeholder" }
			await assert.rejects(() => manager.createTransformer(noPlaceholder), TransformerValidationError)

			// Test invalid placeholder name
			const invalidName = { ...baseConfig, prompt: "{{bad name}}" }
			await assert.rejects(() => manager.createTransformer(invalidName), TransformerValidationError)

			// Test invalid placeholder type
			const invalidType = { ...baseConfig, prompt: "{{test::invalid}}" }
			await assert.rejects(() => manager.createTransformer(invalidType), TransformerValidationError)

			// Test duplicate placeholder names
			const duplicateNames = { ...baseConfig, prompt: "{{test}} {{test}}" }
			await assert.rejects(() => manager.createTransformer(duplicateNames), TransformerValidationError)

			// Test multiple folder placeholders
			const multipleFolders = {
				...baseConfig,
				prompt: "{{folder1::folder}} {{folder2::folder}}",
			}
			await assert.rejects(() => manager.createTransformer(multipleFolders), TransformerValidationError)
		})

		test("should validate input/output configuration", async () => {
			const invalidInput = { ...baseConfig, input: [] }

			await assert.rejects(() => manager.createTransformer(invalidInput), TransformerValidationError)
		})

		test("should validate temperature range", async () => {
			// Test valid temperature
			const validTemp = { ...baseConfig, temperature: 0.7 }
			await manager.createTransformer(validTemp)

			// Test high temperature
			const highTemp = { ...baseConfig, id: "high-temp", temperature: 2.1 }
			await assert.rejects(async () => {
				try {
					await manager.createTransformer(highTemp)
				} catch (error) {
					assert.strictEqual(error.name, "TransformerValidationError")
					throw error
				}
			}, TransformerValidationError)

			// Test low temperature
			const lowTemp = { ...baseConfig, id: "low-temp", temperature: -1.0 }
			await assert.rejects(async () => {
				try {
					await manager.createTransformer(lowTemp)
				} catch (error) {
					assert.strictEqual(error.name, "TransformerValidationError")
					throw error
				}
			}, TransformerValidationError)
		})

		test("should validate input/output array elements", async () => {
			// Test invalid input array element
			const invalidInput = {
				...baseConfig,
				input: [
					{
						name: "",
						description: "Test",
						type: "file",
						value: "Content",
						required: true,
					},
				],
			}
			await assert.rejects(() => manager.createTransformer(invalidInput), TransformerValidationError)
		})

		test("should update input configuration based on prompt placeholders", async () => {
			// First create transformer with minimal config
			const initialConfig = {
				...baseConfig,
				prompt: "{{test1::file}}",
				input: [
					{
						name: "test1",
						description: "Test 1",
						type: "file",
						value: "Content",
						required: true,
					},
				],
			}

			await manager.createTransformer(initialConfig)

			// Then update with full config containing multiple placeholders
			const updatedConfig = {
				...initialConfig,
				prompt: "{{test1::text}} {{test2::file}} {{test3::folder}}",
			}

			await manager.updateTransformer(updatedConfig)
			const updated = manager.getTransformer(updatedConfig.id)!

			assert.strictEqual(updated.input.length, 3)
			assert.deepStrictEqual(
				updated.input.map((i) => i.name),
				["test1", "test2", "test3"],
			)
			assert.deepStrictEqual(
				updated.input.map((i) => i.type),
				["text", "file", "folder"],
			)
			assert.deepStrictEqual(
				updated.input.map((i) => i.description),
				["Input for test1", "Input for test2", "Input for test3"],
			)
			assert.deepStrictEqual(
				updated.input.map((i) => i.required),
				[true, true, true],
			)
		})

		test("should preserve existing input configurations when updating", async () => {
			const initialConfig = {
				...baseConfig,
				prompt: "{{test1}} {{test2}}",
				input: [
					{
						name: "test1",
						description: "Test 1",
						type: "file",
						value: "Content",
						required: true,
					},
				],
			}

			await manager.createTransformer(initialConfig)

			const updatedConfig = {
				...initialConfig,
				prompt: "{{test1}} {{test2}} {{test3}}",
			}

			await manager.updateTransformer(updatedConfig)
			const result = manager.getTransformer(updatedConfig.id)!

			assert.strictEqual(result.input.length, 3)
			assert.deepStrictEqual(result.input[0], initialConfig.input[0])
		})
	})

	suite("Folder Operations", () => {
		test("should create new folder", async () => {
			const folder = {
				id: "test-folder",
				name: "Test Folder",
				description: "Test folder description",
			}

			await manager.createFolder(folder)
			const result = manager.getAllFuzorItems()

			assert.strictEqual(result.length, 1)
			assert.deepStrictEqual(result[0], {
				type: "folder",
				folder,
			})
		})

		test("should prevent creating duplicate folders", async () => {
			const folder = {
				id: "test-folder",
				name: "Test Folder",
				description: "Test folder description",
			}

			await manager.createFolder(folder)
			await assert.rejects(() => manager.createFolder(folder), TransformerExistsError)
		})

		test("should validate folder configuration", async () => {
			const invalidFolder = {
				id: "",
				name: "",
				description: "",
			}

			await assert.rejects(() => manager.createFolder(invalidFolder), TransformerValidationError)
		})
	})

	suite("Execution Operations", () => {
		test("should validate transformer before execution", async () => {
			const invalidConfig = { ...baseConfig, prompt: "" }
			await assert.rejects(() => manager.executeTransformer(invalidConfig), TransformerValidationError)
		})

		test("should stop execution", async () => {
			await assert.doesNotReject(() => manager.stopExecution())
		})
	})

	suite("Fuzor Items Management", () => {
		test("should return all Fuzor items", async () => {
			const transformer = baseConfig
			const folder = {
				id: "test-folder",
				name: "Test Folder",
				description: "Test folder description",
			}

			await manager.createTransformer(transformer)
			await manager.createFolder(folder)

			const result = manager.getAllFuzorItems()
			assert.strictEqual(result.length, 2)
			assert.deepStrictEqual(result, [
				{
					type: "transformer",
					config: transformer,
				},
				{
					type: "folder",
					folder,
				},
			])
		})
	})
})
