import { ITransformerStorage, VSCodeTransformerStorage } from "../types/storage"
import { FuzorFolder, TransformerConfig } from "../shared/transformerConfig"
import { executeTransformers, stopExecution } from "../execution/executionEngine"
import { FuzorItem } from "../shared/transformerConfig"
import { TransformerError, TransformerNotFoundError, TransformerExistsError, TransformerValidationError } from "../types/errors"

/**
 * Manages transformer configurations and operations
 */
export class TransformerManager {
	private storage: ITransformerStorage
	private fuzorItems: Map<string, FuzorItem>

	/**
	 * Creates a new TransformerManager instance
	 * @param storage Storage implementation for transformer configurations
	 */
	private constructor(storage: ITransformerStorage) {
		this.storage = storage
		this.fuzorItems = new Map()
	}

	/**
	 * Creates a new TransformerManager instance asynchronously
	 * @param storage Storage implementation for transformer configurations
	 * @returns Promise that resolves to initialized TransformerManager
	 */
	static async create(storage: ITransformerStorage): Promise<TransformerManager> {
		const manager = new TransformerManager(storage)
		await manager.loadTransformers()
		return manager
	}

	/**
	 * Load transformers from storage
	 * @private
	 */
	public async loadTransformers(): Promise<void> {
		try {
			const stored = await this.storage.loadTransformers()
			if (stored.size > 0) {
				// Load from storage if available
				for (const [key, value] of stored) {
					this.fuzorItems.set(key, value)
				}
			} else {
				if (!process.env.TEST) {
					// Load from filesystem
					const fs = require("fs")
					const path = require("path")

					const transformerLibraryPath = path.join(
						this.storage.getBasePath(),
						"media/transformerLibrary/transformerLibrary.json",
					)
					const transformerLibraryData = fs.readFileSync(transformerLibraryPath, "utf-8")
					const transformerLibrary = JSON.parse(transformerLibraryData)

					for (const transformer of transformerLibrary.transformers) {
						const configPath = path.join(
							this.storage.getBasePath(),
							`media/transformerLibrary/${transformer.folder}/_config.json`,
						)
						const configData = fs.readFileSync(configPath, "utf-8")
						const config = JSON.parse(configData) as TransformerConfig
						this.fuzorItems.set(config.id, {
							type: "transformer",
							config,
						})
					}

					await this.saveTransformers()
				}
			}
		} catch (error) {
			if (error instanceof Error) {
				console.error("Error loading transformers:", error.stack || error.message)
				throw error
			} else {
				console.error("Unknown error loading transformers:", error)
				throw new Error("Unknown error occurred while loading transformers")
			}
		}
	}

	/**
	 * Save transformers to storage
	 * @private
	 */
	private async saveTransformers(): Promise<void> {
		await this.storage.saveTransformers(this.fuzorItems)
	}

	/**
	 * Create a new transformer configuration
	 * @param config Transformer configuration
	 * @throws {TransformerExistsError} If a transformer with the same name already exists
	 * @throws {TransformerValidationError} If the configuration is invalid
	 */
	public async createTransformer(config: TransformerConfig): Promise<void> {
		if (this.fuzorItems.has(config.id)) {
			throw new TransformerExistsError(config.name)
		}
		this.validateTransformerConfig(config)
		this.fuzorItems.set(config.id, {
			type: "transformer",
			config,
		})
		await this.saveTransformers()
	}

	/**
	 * Update an existing transformer configuration
	 * @param config Transformer configuration
	 * @throws {TransformerNotFoundError} If the transformer doesn't exist
	 * @throws {TransformerValidationError} If the configuration is invalid
	 */
	async updateTransformer(config: TransformerConfig): Promise<void> {
		// Validate ID exists and is a string
		if (!config.id || typeof config.id !== "string") {
			throw new TransformerValidationError("Transformer ID is required and must be a string")
		}

		// Check if transformer exists
		if (!this.fuzorItems.has(config.id)) {
			throw new TransformerNotFoundError(config.id)
		}

		// Validate the rest of the config
		this.validateTransformerConfig(config)

		// Extract placeholders from prompt
		const placeholderRegex = /\{\{([^}]+)\}\}/g
		const placeholders = new Set<{ name: string; type: string }>()
		let match

		while ((match = placeholderRegex.exec(config.prompt)) !== null) {
			const parts = match[1].split("::")
			placeholders.add({
				name: parts[0], // Use the first part as the name
				type: parts[1] || "file", // Default to "file" if no type is provided
			})
		}

		// Update input configuration based on placeholders
		const newInput = []
		for (const placeholder of placeholders) {
			// Find existing input with matching name
			const existingInput = config.input.find((input) => input.name === placeholder.name && input.type === placeholder.type)

			// Create new input if it doesn't exist
			newInput.push(
				existingInput || {
					name: placeholder.name,
					description: `Input for ${placeholder.name}`,
					required: true,
					type: placeholder.type, // Use type from placeholder or default
					value: "", // Default empty value
				},
			)
		}

		// Remove any inputs that don't have corresponding placeholders
		config.input = newInput.filter((input) =>
			Array.from(placeholders).some((placeholder) => placeholder.name === input.name && placeholder.type === input.type),
		)

		// Update the transformer
		this.fuzorItems.set(config.id, {
			type: "transformer",
			config,
		})
		await this.saveTransformers()
	}

	public async handleDragAndDrop(item: FuzorItem): Promise<void> {
		this.fuzorItems.set(item.type === "transformer" ? item.config?.id! : item.folder?.id!, {
			type: item.type,
			config: item.type === "transformer" ? item.config : undefined,
			folder: item.type === "folder" ? item.folder : undefined,
		})
		await this.saveTransformers()
	}

	/**
	 * Delete a transformer configuration
	 * @param id ID of the transformer to delete
	 * @throws {TransformerNotFoundError} If the transformer doesn't exist
	 */
	async deleteTransformer(id: string): Promise<void> {
		if (!this.fuzorItems.has(id)) {
			throw new TransformerNotFoundError(id)
		}

		var item = this.fuzorItems.get(id)
		if (item?.type === "folder") {
			this.fuzorItems.forEach((value, key) => async () => {
				if (value.folder?.parentFolderId === id) {
					await this.deleteTransformer(key)
				}
			})
		}
		this.fuzorItems.delete(id)
		await this.saveTransformers()
	}

	private currentExecution: { cancel: () => void } | null = null

	/**
	 * Execute a transformer configuration
	 * @param config Transformer configuration to execute
	 * @throws {TransformerError} If execution fails
	 */
	public async executeTransformer(config: TransformerConfig): Promise<void> {
		try {
			// Validate config before execution
			this.validateTransformerConfig(config)
			this.updateTransformer(config)
			// Execute the transformers
			await executeTransformers(config)
		} catch (error) {
			if (error instanceof TransformerValidationError) {
				throw error
			}
			throw new TransformerError("Unknown error occurred during transformer execution")
		}
	}

	/**
	 * Stop current transformer execution
	 */
	public async stopExecution(): Promise<void> {
		stopExecution()
	}

	/**
	 * Get a transformer configuration by ID or name
	 * @param id ID or name of the transformer
	 * @returns Transformer configuration or undefined if not found
	 */
	getTransformer(id: string): TransformerConfig | undefined {
		let config = this.fuzorItems.get(id)?.config
		if (!config) {
			// Fallback to name lookup for backward compatibility
			config = Array.from(this.fuzorItems.values()).find((t) => t.config?.name === id)?.config
		}
		return config
	}

	/**
	 * Get all transformer configurations
	 * @returns Array of transformer configurations
	 */
	getAllTransformers(): TransformerConfig[] {
		// return all items.config from this.fuzorItems where config is not null
		return Array.from(this.fuzorItems.values())
			.map((item) => item.config)
			.filter((config) => !!config)
	}

	getAllFuzorItems(): FuzorItem[] {
		return Array.from(this.fuzorItems.values())
	}

	public validatePrompt(prompt: string): void {
		if (!prompt || typeof prompt !== "string") {
			throw new TransformerValidationError("Prompt cannot be empty")
		}

		// Extract placeholders from prompt
		const placeholderRegex = /\{\{([^}]+)\}\}/g
		const placeholders = new Set<{ name: string; type: string }>()
		let match

		// Throw error if there are no placeholders
		if (!prompt.match(placeholderRegex)) {
			throw new TransformerValidationError("Prompt must contain at least one placeholder")
		}

		// Reset regex state
		placeholderRegex.lastIndex = 0

		// Validate placeholder types and names
		const validTypes = ["file", "folder", "string", "text", "textArea", ""]
		const placeholderNames = new Set<string>()
		let folderCount = 0

		while ((match = placeholderRegex.exec(prompt)) !== null) {
			const parts = match[1].split("::")
			const name = parts[0]
			const type = parts[1] || "file"

			// Validate placeholder name
			if (!name || name.trim() === "" || name.match(/[^a-zA-Z0-9]/)) {
				throw new TransformerValidationError(`Invalid placeholder name: ${name}`)
			}

			// Validate placeholder type
			if (!validTypes.includes(type)) {
				throw new TransformerValidationError(`Invalid placeholder type: ${type}`)
			}

			// Check for duplicate names
			if (placeholderNames.has(name)) {
				throw new TransformerValidationError(`Duplicate placeholder name: ${name}`)
			}
			placeholderNames.add(name)

			// Count folder placeholders
			if (type === "folder") {
				folderCount++
				if (folderCount > 1) {
					throw new TransformerValidationError("A prompt can only have a maximum of 1 placeholder of type folder")
				}
			}
		}
	}

	/**
	 * Validate transformer configuration
	 * @param config Transformer configuration to validate
	 * @throws {TransformerValidationError} If the configuration is invalid
	 */
	public validateTransformerConfig(config: TransformerConfig): void {
		// Basic required fields
		if (!config.id || typeof config.id !== "string") {
			throw new TransformerValidationError("Transformer ID is required")
		}
		if (!config.name || typeof config.name !== "string") {
			throw new TransformerValidationError("Transformer name is required")
		}
		if (!config.description || typeof config.description !== "string") {
			throw new TransformerValidationError("Transformer description is required")
		}
		if (!config.prompt || typeof config.prompt !== "string") {
			throw new TransformerValidationError("Transformer prompt is required")
		}

		this.validatePrompt(config.prompt)

		// Temperature validation
		if (typeof config.temperature !== "number" || isNaN(config.temperature)) {
			throw new TransformerValidationError("Temperature must be a valid number")
		}
		if (config.temperature < 0) {
			throw new TransformerValidationError("Temperature must be greater than or equal to 0")
		}
		if (config.temperature > 2) {
			throw new TransformerValidationError("Temperature must be less than or equal to 2")
		}

		// Input configuration validation
		if (!Array.isArray(config.input) || config.input.length === 0) {
			throw new TransformerValidationError("At least one input is required")
		}

		for (const input of config.input) {
			if (!input.name || typeof input.name !== "string" || input.name.trim() === "") {
				throw new TransformerValidationError("Input name is required and cannot be empty")
			}
			if (typeof input.required !== "boolean") {
				throw new TransformerValidationError("Input required flag must be a boolean")
			}
		}
	}

	public async createFolder(fuzorFolder: FuzorFolder): Promise<void> {
		if (!fuzorFolder.id || typeof fuzorFolder.id !== "string" || !fuzorFolder.name || typeof fuzorFolder.name !== "string") {
			throw new TransformerValidationError("Folder ID and name are required and must be strings")
		}

		if (this.fuzorItems.has(fuzorFolder.id)) {
			throw new TransformerExistsError(fuzorFolder.name)
		}

		this.fuzorItems.set(fuzorFolder.id, {
			type: "folder",
			folder: fuzorFolder,
		})
		await this.saveTransformers()
	}

	/**
	 * Rename an existing folder
	 * @param folderId ID of the folder to rename
	 * @param newName New name for the folder
	 * @throws {TransformerNotFoundError} If the folder doesn't exist
	 * @throws {TransformerExistsError} If a folder with the new name already exists
	 * @throws {TransformerValidationError} If the new name is invalid
	 */
	public async renameFolder(folderId: string, newName: string): Promise<void> {
		if (!folderId || typeof folderId !== "string") {
			throw new TransformerValidationError("Folder ID is required and must be a string")
		}

		if (!newName || typeof newName !== "string" || newName.trim() === "") {
			throw new TransformerValidationError("New folder name is required and cannot be empty")
		}

		const folderItem = this.fuzorItems.get(folderId)
		if (!folderItem || folderItem.type !== "folder") {
			throw new TransformerNotFoundError(folderId)
		}

		// Update folder name
		const updatedFolder = {
			...folderItem.folder!,
			name: newName,
		}

		this.fuzorItems.set(folderId, {
			type: "folder",
			folder: updatedFolder,
		})

		await this.saveTransformers()
	}
}
