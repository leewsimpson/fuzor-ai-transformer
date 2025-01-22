import { strict as assert } from "assert"
import * as vscode from "vscode"
import { TransformersProvider, TransformerTreeItem } from "../../providers/TransformersProvider"
import { TransformerManager } from "../../transformers/transformerManager"
import { FuzorFolder, TransformerConfig, FuzorItem } from "../../shared/transformerConfig"
import { ITransformerStorage } from "../../types/storage"

// Mock VSCode TreeView
class MockTreeView implements vscode.TreeView<TransformerTreeItem> {
	onDidExpandElement = new vscode.EventEmitter<vscode.TreeViewExpansionEvent<TransformerTreeItem>>().event
	onDidCollapseElement = new vscode.EventEmitter<vscode.TreeViewExpansionEvent<TransformerTreeItem>>().event
	onDidChangeSelection = new vscode.EventEmitter<vscode.TreeViewSelectionChangeEvent<TransformerTreeItem>>().event
	onDidChangeVisibility = new vscode.EventEmitter<vscode.TreeViewVisibilityChangeEvent>().event
	onDidChangeCheckboxState = new vscode.EventEmitter<vscode.TreeCheckboxChangeEvent<TransformerTreeItem>>().event
	visible = true
	selection: readonly TransformerTreeItem[] = []
	description?: string
	message?: string
	title = "Test View"

	reveal(): Thenable<void> {
		return Promise.resolve()
	}

	dispose(): void {}
}

// Mock VSCode DataTransferFile
class MockDataTransferFile implements vscode.DataTransferFile {
	name: string
	uri?: vscode.Uri
	private fileData: Uint8Array

	constructor(data: Uint8Array) {
		this.name = "mock-file"
		this.fileData = data
	}

	data(): Thenable<Uint8Array> {
		return Promise.resolve(this.fileData)
	}
}

// Mock VSCode DataTransferItem
class MockDataTransferItem implements vscode.DataTransferItem {
	constructor(public value: any) {}

	asString(): Thenable<string> {
		return Promise.resolve(JSON.stringify(this.value))
	}

	asFile(): vscode.DataTransferFile | undefined {
		return new MockDataTransferFile(new Uint8Array())
	}
}

// Mock Storage Implementation
class MockStorage implements ITransformerStorage {
	private items = new Map<string, FuzorItem>()

	async loadTransformers(): Promise<Map<string, FuzorItem>> {
		return this.items
	}

	async saveTransformers(items: Map<string, FuzorItem>): Promise<void> {
		this.items = new Map(items)
	}

	getBasePath(): string {
		return "/test/path"
	}
}

suite("TransformersProvider Test Suite", () => {
	let provider: TransformersProvider
	let manager: TransformerManager
	let mockTreeView: MockTreeView

	setup(async () => {
		manager = await TransformerManager.create(new MockStorage())
		provider = new TransformersProvider(manager)
		mockTreeView = new MockTreeView()
		provider.setTreeView(mockTreeView as unknown as vscode.TreeView<TransformerTreeItem>)
	})

	test("should create tree items with correct hierarchy", async () => {
		const folder: FuzorFolder = {
			id: "folder1",
			name: "Folder 1",
			parentFolderId: null,
		}

		const transformer: TransformerConfig = {
			id: "transformer1",
			name: "Transformer 1",
			description: "Test transformer",
			parentFolderId: "folder1",
			prompt: "test {{test::text}}",
			input: [
				{
					name: "test",
					description: "test input",
					type: "text",
					value: "",
					required: true,
				},
			],
			outputFolder: "output",
			outputFileName: "output.txt",
			temperature: 0.7,
			processFormat: "eachFile",
		}

		await manager.createFolder(folder)
		await manager.createTransformer(transformer)

		const items = await provider.getChildren()

		assert.equal(items.length, 1, "Should have one root folder")
		assert.equal(items[0].children.length, 1, "Folder should have one child")
		assert.equal(items[0].children[0].label, "Transformer 1", "Child should be the transformer")
	})

	test("should handle drag and drop operations", async () => {
		const folder1: FuzorFolder = { id: "folder1", name: "Folder 1", parentFolderId: null }
		const folder2: FuzorFolder = { id: "folder2", name: "Folder 2", parentFolderId: null }
		const transformer: TransformerConfig = {
			id: "transformer1",
			name: "Transformer 1",
			description: "Test transformer",
			parentFolderId: "folder1",
			prompt: "test {{test::text}}",
			input: [{ name: "test", description: "test", type: "text", value: "", required: true }],
			outputFolder: "output",
			outputFileName: "output.txt",
			temperature: 0.7,
			processFormat: "eachFile",
		}

		await manager.createFolder(folder1)
		await manager.createFolder(folder2)
		await manager.createTransformer(transformer)

		const sourceItem = new TransformerTreeItem(
			transformer.id,
			transformer.name,
			transformer.description,
			vscode.TreeItemCollapsibleState.None,
			{ type: "transformer", config: transformer },
		)

		// Create target folder item
		const targetFolder = new TransformerTreeItem(
			folder2.id,
			folder2.name,
			undefined,
			vscode.TreeItemCollapsibleState.Collapsed,
			{ type: "folder", folder: folder2 },
		)

		// Mock data transfer operation
		const transferItem = new MockDataTransferItem([sourceItem])
		provider.handleDrop(
			targetFolder,
			{ get: () => transferItem } as any,
			{ isCancellationRequested: false } as vscode.CancellationToken,
		)

		// Get updated items
		const items = await provider.getChildren()
		const folder2Item = items.find((item) => item.id === folder2.id)

		assert.ok(folder2Item, "Target folder should exist")
		assert.equal(folder2Item.children.length, 1, "Target folder should have one child")
		assert.equal(folder2Item.children[0].id, transformer.id, "Transformer should be moved to folder2")
	})

	test("should add and remove transformers", async () => {
		const transformer: TransformerConfig = {
			id: "transformer1",
			name: "Test Transformer",
			description: "Test Description",
			prompt: "test {{test::text}}",
			input: [{ name: "test", description: "test", type: "text", value: "", required: true }],
			outputFolder: "output",
			outputFileName: "output.txt",
			temperature: 0.7,
			processFormat: "eachFile",
			parentFolderId: null,
		}

		await provider.addTransformer(transformer)
		const items = await provider.getChildren()
		assert.equal(items.length, 1, "Should have one transformer")
		assert.equal(items[0].label, "Test Transformer", "Transformer name should match")

		await provider.removeTransformer("transformer1")
		const updatedItems = await provider.getChildren()
		assert.equal(updatedItems.length, 0, "Should have no transformers")
	})

	test("should update transformer", async () => {
		const transformer: TransformerConfig = {
			id: "transformer1",
			name: "Original Name",
			description: "Original Description",
			prompt: "test {{test::text}}",
			input: [{ name: "test", description: "test", type: "text", value: "", required: true }],
			outputFolder: "output",
			outputFileName: "output.txt",
			temperature: 0.7,
			processFormat: "eachFile",
			parentFolderId: null,
		}

		await provider.addTransformer(transformer)

		const updatedTransformer = {
			...transformer,
			name: "Updated Name",
			description: "Updated Description",
		}

		await provider.updateTransformer(updatedTransformer)

		const items = await provider.getChildren()
		assert.equal(items.length, 1, "Should have one transformer")
		assert.equal(items[0].label, "Updated Name", "Transformer name should be updated")
		assert.equal(items[0].description, "Updated Description", "Transformer description should be updated")
	})
})
