import * as vscode from "vscode"
import { randomUUID } from "crypto"
import { TransformerConfig } from "../shared/transformerConfig"
import { FuzorItem } from "../shared/transformerConfig"

/**
 * Interface for transformer storage operations
 */
export interface ITransformerStorage {
	/**
	 * Load all transformers from storage
	 * @returns Promise resolving to a map of transformer configurations
	 */
	loadTransformers(): Promise<Map<string, FuzorItem>>

	/**
	 * Save all transformers to storage
	 * @param transformers Map of transformer configurations to save
	 * @returns Promise that resolves when save is complete
	 */
	saveTransformers(transformers: Map<string, FuzorItem>): Promise<void>

	/**
	 * Get the base path of the extension
	 * @returns The extension's base path
	 */
	getBasePath(): string
}

/**
 * Default implementation using VS Code's globalState
 */
export class VSCodeTransformerStorage implements ITransformerStorage {
	private static readonly STORAGE_KEY = "transformers"
	private context: vscode.ExtensionContext

	constructor(context: vscode.ExtensionContext) {
		this.context = context
	}

	async loadTransformers(): Promise<Map<string, FuzorItem>> {
		const storedData = this.context.globalState.get<FuzorItem[] | { [key: string]: FuzorItem }>(
			VSCodeTransformerStorage.STORAGE_KEY,
		)
		const FuzorItemMap = new Map<string, FuzorItem>()

		if (Array.isArray(storedData)) {
			// New format: array of transformers
			storedData.forEach((node) => {
				if (node.type === "transformer" && node.config) {
					if (this.isValidTransformer(node.config)) {
						FuzorItemMap.set(node.config!.id, node)
					}
				} else if (node.type === "folder" && node.folder) {
					FuzorItemMap.set(node.folder.id, node)
				}
			})
		}

		return FuzorItemMap
	}

	private isValidTransformer(config: any): boolean {
		return (
			config &&
			typeof config === "object" &&
			(config.id || config.name) &&
			typeof config.name === "string" &&
			typeof config.prompt === "string"
		)
	}

	async saveTransformers(transformers: Map<string, FuzorItem>): Promise<void> {
		const transformersArray = Array.from(transformers.values())
		await this.context.globalState.update(VSCodeTransformerStorage.STORAGE_KEY, transformersArray)
	}

	getBasePath(): string {
		return this.context.extensionPath
	}
}
