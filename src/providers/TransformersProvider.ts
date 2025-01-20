import * as vscode from "vscode"
import { TransformerManager } from "../transformers/transformerManager"
import { FuzorFolder, TransformerConfig } from "../shared/transformerConfig"
import { FuzorItem } from "../shared/transformerConfig"
import { logOutputChannel } from "../extension"

export class TransformerTreeItem extends vscode.TreeItem {
	public children: TransformerTreeItem[] = []

	constructor(
		public override readonly id: string,
		public override readonly label: string,
		public override readonly description: string | undefined,
		public override readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly fuzorItem: FuzorItem,
	) {
		super(label, collapsibleState)

		// Determine icon and context value based on whether this is a folder or a transformer
		this.contextValue = fuzorItem.type
		this.iconPath = fuzorItem.type === "transformer" ? new vscode.ThemeIcon("symbol-event") : new vscode.ThemeIcon("folder")

		if (fuzorItem.type === "transformer") {
			this.tooltip = `${description}`
			this.resourceUri = vscode.Uri.parse(`transformer://${id}`)
		} else {
			this.tooltip = `${label}`
			this.resourceUri = vscode.Uri.parse(`folder://${id}`)
		}
	}

	addChild(item: TransformerTreeItem) {
		this.children.push(item)
	}
}

export class TransformersProvider
	implements vscode.TreeDataProvider<TransformerTreeItem>, vscode.TreeDragAndDropController<TransformerTreeItem>
{
	private items: TransformerTreeItem[] = []
	public dropMimeTypes = ["application/vnd.code.tree.treeTransformer", "text/uri-list"]
	public dragMimeTypes = ["application/vnd.code.tree.treeTransformer", "text/uri-list"]
	private _onDidChangeTreeData: vscode.EventEmitter<TransformerTreeItem | undefined | null | void> = new vscode.EventEmitter<
		TransformerTreeItem | undefined | null | void
	>()
	readonly onDidChangeTreeData: vscode.Event<TransformerTreeItem | undefined | null | void> = this._onDidChangeTreeData.event
	private treeView: vscode.TreeView<TransformerTreeItem> | undefined
	private searchId: string = ""

	constructor(public transformerManager: TransformerManager) {}

	public async setTreeView(treeView: vscode.TreeView<TransformerTreeItem>) {
		this.treeView = treeView
	}

	public async handleDrag(
		source: TransformerTreeItem[],
		dataTransfer: vscode.DataTransfer,
		token: vscode.CancellationToken,
	): Promise<void> {
		dataTransfer.set("application/vnd.code.tree.treeTransformer", new vscode.DataTransferItem(source))
	}

	public async handleDrop(
		target: TransformerTreeItem | undefined,
		dataTransfer: vscode.DataTransfer,
		token: vscode.CancellationToken,
	): Promise<void> {
		console.log("Drop event triggered")
		console.log("Target:", target?.label || "root")

		const transferItem = dataTransfer.get("application/vnd.code.tree.treeTransformer")
		if (!transferItem) {
			console.log("No valid transfer item found")
			return
		}
		console.log("Transfer item found:", transferItem.value)

		const draggedItems: TransformerTreeItem[] = transferItem.value
		const targetFolder = target?.fuzorItem.type === "folder" ? target : undefined

		for (const item of draggedItems) {
			// Remove from current parent
			this.items.forEach((folder) => {
				folder.children = folder.children.filter((child) => child.id !== item.id)
			})

			// Add to new folder
			if (targetFolder) {
				targetFolder.addChild(item)
				// Update the config hierarchy
				if (item.fuzorItem.type === "transformer") {
					item.fuzorItem.config!.parentFolderId = targetFolder.id
				} else {
					item.fuzorItem.folder!.parentFolderId = targetFolder.id
				}
				// Send updated transformer configs for save
				await this.transformerManager.handleDragAndDrop(item.fuzorItem)
			} else {
				// If dropped outside a folder, add to root
				const existing = this.items.flatMap((f) => f.children).find((c) => c.id === item.id)
				if (!existing) {
					this.items.push(item)
					if (item.fuzorItem.type === "transformer") {
						item.fuzorItem.config!.parentFolderId = null
					} else {
						item.fuzorItem.folder!.parentFolderId = null
					}
					await this.transformerManager.handleDragAndDrop(item.fuzorItem)
				}
			}
		}
		// Refresh view and wait for updates
		await this.refresh()
		console.log("Drop operation completed successfully")
	}

	async refresh(): Promise<void> {
		this.setSearchId("")
		await this.transformerManager.loadTransformers()
		this._onDidChangeTreeData.fire()

		return new Promise<void>((resolve) => {
			this._onDidChangeTreeData.fire(undefined)
			setTimeout(resolve, 100)
		})
	}

	getTreeItem(element: TransformerTreeItem): vscode.TreeItem {
		return element
	}

	getChildren(element?: TransformerTreeItem): Thenable<TransformerTreeItem[]> {
		if (element) {
			return Promise.resolve(element.children)
		}

		// Create a map of all items by ID for quick lookup
		const itemsMap = new Map<string, TransformerTreeItem>()
		const allItems = this.transformerManager.getAllFuzorItems().map((t) => {
			const item =
				t.type === "transformer"
					? new TransformerTreeItem(
							t.config!.id,
							t.config!.name,
							t.config!.description,
							vscode.TreeItemCollapsibleState.None,
							t,
						)
					: new TransformerTreeItem(
							t.folder!.id,
							t.folder!.name,
							"Fuzor Transformer Collection",
							vscode.TreeItemCollapsibleState.Collapsed,
							t,
						)

			itemsMap.set(item.id, item)
			return item
		})

		// Build the hierarchy
		const rootItems: TransformerTreeItem[] = []

		for (const item of allItems) {
			const parentId =
				item.fuzorItem.type === "transformer"
					? item.fuzorItem.config?.parentFolderId
					: item.fuzorItem.folder?.parentFolderId

			if (parentId) {
				const parent = itemsMap.get(parentId)
				if (parent) {
					parent.addChild(item)
				} else {
					rootItems.push(item)
				}
			} else {
				rootItems.push(item)
			}
		}

		// Recursive function to sort all levels of children
		const sortTree = (items: TransformerTreeItem[]) => {
			// Sort current level
			items.sort((a, b) => {
				if (a.fuzorItem.type === "folder" && b.fuzorItem.type === "transformer") {
					return -1
				} else if (a.fuzorItem.type === "transformer" && b.fuzorItem.type === "folder") {
					return 1
				} else {
					return a.label.localeCompare(b.label)
				}
			})

			// Recursively sort children
			items.forEach((item) => {
				if (item.children.length > 0) {
					sortTree(item.children)
				}
			})
		}

		// Sort entire tree starting from root
		sortTree(rootItems)

		let items = rootItems
		// Apply search filter if present
		if (this.searchId) {
			// First try exact ID match
			const matchingItem = this.findItemById(rootItems, this.searchId)
			if (matchingItem && this.treeView) {
				// Reveal the matching item
				this.treeView.reveal(matchingItem, {
					select: true,
					focus: true,
					expand: true,
				})
			}
		}

		return Promise.resolve(items)
	}

	private findItemById(items: TransformerTreeItem[], id: string): TransformerTreeItem | undefined {
		for (const item of items) {
			if (item.id === id) {
				return item
			}
			if (item.children.length > 0) {
				const found = this.findItemById(item.children, id)
				if (found) {
					return found
				}
			}
		}
		return undefined
	}

	setSearchId(id: string) {
		this.searchId = id
		this._onDidChangeTreeData.fire(undefined)
	}

	getParent(element: TransformerTreeItem): vscode.ProviderResult<TransformerTreeItem> {
		for (const folder of this.items) {
			if (folder.children.some((child) => child.id === element.id)) {
				return folder
			}
		}
		return null
	}

	async addFolder(fuzorFolder: FuzorFolder) {
		this.transformerManager.createFolder(fuzorFolder)
		this.refresh()
		this._onDidChangeTreeData.fire(undefined)

		// Wait a bit for the tree view to fully update
		await new Promise((resolve) => setTimeout(resolve, 100))

		const treeItems = await this.getChildren()
		const newFuzorFolder = treeItems.find((t) => t.id === fuzorFolder.id)

		try {
			if (this.treeView) {
				await this.treeView.reveal(newFuzorFolder!, {
					select: true,
					focus: true,
					expand: true,
				})
			}
		} catch (error) {
			console.error("Failed to reveal folder:", error)
		}
	}

	async addTransformer(config: TransformerConfig) {
		await this.transformerManager.createTransformer(config)
		await this.refresh()

		// Wait a bit for the tree view to fully update
		await new Promise((resolve) => setTimeout(resolve, 100))

		const transformers = await this.getChildren()
		const newTransformer = transformers.find((t) => t.id === config.id)

		if (newTransformer) {
			try {
				if (this.treeView) {
					await this.treeView.reveal(newTransformer, {
						select: true,
						focus: true,
						expand: true,
					})
				}
			} catch (error) {
				console.error("Failed to reveal transformer:", error)
			}
		}
	}

	async updateTransformer(config: TransformerConfig) {
		await this.transformerManager.updateTransformer(config)
		this.refresh()
	}

	async removeTransformer(id: string) {
		await this.transformerManager.deleteTransformer(id)
		this.refresh()
	}

	getTransformer(id: string): TransformerConfig | undefined {
		return this.transformerManager.getTransformer(id)
	}
}
