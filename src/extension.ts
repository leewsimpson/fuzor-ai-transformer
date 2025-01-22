import * as vscode from "vscode"
import { ViewEditTransformer } from "./webviews/ViewEditTransformer"
import { TransformerExistsError } from "./types/errors"
import { VSCodeTransformerStorage } from "./types/storage"
import { TransformersProvider, TransformerTreeItem } from "./providers/TransformersProvider"
import { TransformerManager } from "./transformers/transformerManager"
import { FuzorFolder, TransformerConfig } from "./shared/transformerConfig"
import { executeTransformers } from "./execution/executionEngine"
import { authenticateGitHub, getTransformerLibrary, createWebviewPanel } from "./viewTransfomerLibrary/transfomerLibraryManager"
import { count, log } from "console"
import { ConfigurationManager } from "./config/configurationManager"

// Create output channel for logging
export const outputChannel = vscode.window.createOutputChannel("AI Transformer Output")
export const logOutputChannel = vscode.window.createOutputChannel("AI Transformer Logs", { log: true })

export async function activate(context: vscode.ExtensionContext) {
	logOutputChannel.info("Activating Fuzor AI Transformer extension...")

	// Initialize the Transformer Manager with storage
	const transformerStorage = new VSCodeTransformerStorage(context)
	const transformerManager = await TransformerManager.create(transformerStorage)

	// Initialize the Tree Data Provider
	const transformersProvider = new TransformersProvider(transformerManager)

	// Initialize the Webview View Provider
	const viewEditTransformerProvider = new ViewEditTransformer(
		context.extensionUri,
		context,
		transformersProvider,
		transformerManager,
	)

	// Register the Webview View
	const webviewRegistration = vscode.window.registerWebviewViewProvider("viewEditTransformer", viewEditTransformerProvider, {
		webviewOptions: {
			retainContextWhenHidden: true,
		},
	})

	// Register the Tree View
	const treeViewRegistration = vscode.window.createTreeView("treeTransformer", {
		treeDataProvider: transformersProvider,
		canSelectMany: false,
		dragAndDropController: transformersProvider,
		showCollapseAll: true,
	})

	treeViewRegistration.onDidChangeSelection(async (e) => {
		if (e.selection.length > 0) {
			const selectedItem = e.selection[0]
			await vscode.commands.executeCommand("treeTransformer.selectItem", selectedItem)
		}
	})

	transformersProvider.setTreeView(treeViewRegistration)

	// Register all commands
	const commands = [
		vscode.commands.registerCommand("fuzor-ai-transformer.executeTransformer", (item: TransformerTreeItem) => {
			if (item?.fuzorItem.config !== undefined || item?.fuzorItem.config !== null) {
				executeTransformers(item.fuzorItem.config!)
			} else {
				logOutputChannel.info("Error: No transformer configuration found")
			}
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.exportTransformer", (item: TransformerTreeItem) => {
			if (item?.fuzorItem.config !== undefined || item?.fuzorItem.config !== null) {
				let updatedInput = item.fuzorItem.config!.input.map((input) => {
					if (input.type === "file" || input.type === "folder") {
						return {
							...input,
							value: "/",
						}
					}
					return input
				})
				let updatedConfig = {
					...item.fuzorItem.config,
					input: updatedInput,
					outputFolder: "/",
				}

				vscode.window
					.showSaveDialog({
						defaultUri:
							vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
								? vscode.Uri.file(
										`${vscode.workspace.workspaceFolders[0].uri.fsPath}/${updatedConfig.name}.fuzor`,
									)
								: vscode.Uri.file(`${updatedConfig.name}.fuzor`),
						filters: {
							"Fuzor Files": ["fuzor"],
						},
						saveLabel: "Export",
					})
					.then((uri) => {
						if (uri) {
							vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify([updatedConfig], null, 4)))
							logOutputChannel.info(`Exported transformer ${updatedConfig.name} to ${uri.fsPath}`)
							vscode.window.showInformationMessage(`Exported transformer ${updatedConfig.name} to ${uri.fsPath}`)
						}
					})
			} else {
				logOutputChannel.info("Error: No transformer configuration found")
			}
		}),
		vscode.commands.registerCommand("treeTransformer.selectItem", (item: TransformerTreeItem) => {
			if (item?.fuzorItem.config !== undefined || item?.fuzorItem.config !== null) {
				viewEditTransformerProvider.updateContent(item.fuzorItem.config!)
			} else {
				return
			}
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.refresh", () => transformersProvider.refresh()),
		vscode.commands.registerCommand("fuzor-ai-transformer.addTransformer", async () => {
			const { v4: uuidv4 } = require("uuid")
			const newConfig: TransformerConfig = {
				id: uuidv4(),
				name: "New Transformer",
				description: "Provide Description",
				prompt: "Write prompt for transforming the input files according to the following requirements: {{content::file}}",
				input: [
					{
						name: "content",
						description: "Input file",
						type: "file",
						value: "/",
						required: true,
					},
				],
				outputFolder: "outputfolder/",
				outputFileName: "",
				temperature: 0.7,
				processFormat: "eachFile",
			}
			await transformersProvider.addTransformer(newConfig)
			viewEditTransformerProvider.updateContent(newConfig, true)
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.editTransformer", async (item: TransformerTreeItem) => {
			if (item?.fuzorItem.config !== undefined || item?.fuzorItem.config !== null) {
				viewEditTransformerProvider.updateContent(item.fuzorItem.config!, true)
			}
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.deleteTransformer", async (item: TransformerTreeItem) => {
			if (item?.fuzorItem.config !== undefined || item?.fuzorItem.config !== null) {
				const answer = await vscode.window.showWarningMessage(
					`Are you sure you want to delete transformer "${item.label}"?`,
					"Yes",
					"No",
				)
				if (answer === "Yes") {
					await transformersProvider.removeTransformer(item.fuzorItem.config!.id)
				}
			}
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.duplicateTransformer", async (item: TransformerTreeItem) => {
			if (item?.fuzorItem.config !== undefined || item?.fuzorItem.config !== null) {
				const { v4: uuidv4 } = require("uuid")
				const copy = { ...item.fuzorItem.config!, id: uuidv4() }
				copy.name = `${copy.name} (Copy)`
				await transformersProvider.addTransformer(copy)
			}
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.openSettings", () => {
			vscode.commands.executeCommand("workbench.action.openSettings", "Fuzor AI Transformer")
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.importTransformer", async () => {
			const options: vscode.OpenDialogOptions = {
				canSelectMany: false,
				openLabel: "Select",
				filters: {
					"Fuzor Files": ["fuzor"],
				},
				defaultUri:
					vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
						? vscode.Uri.file(`${vscode.workspace.workspaceFolders[0].uri.fsPath}`)
						: vscode.Uri.file(""),
			}

			const fileUri = await vscode.window.showOpenDialog(options)
			if (fileUri && fileUri[0]) {
				try {
					const filePath = fileUri[0].fsPath
					logOutputChannel.info(`Selected .fuzor file: ${filePath}`)

					// Read and parse the file
					const fileContents = await vscode.workspace.fs.readFile(fileUri[0])
					const configs: TransformerConfig[] = JSON.parse(fileContents.toString())

					// Validate and import each config
					let count = 0
					for (const config of configs) {
						try {
							await transformerManager.createTransformer(config)
							count++
						} catch (error) {
							logOutputChannel.error(`Failed to import transformer ${config.name}: ${error}`)
							vscode.window.showErrorMessage(`Failed to import transformer ${config.name}: ${error}`)
						}
					}

					vscode.window.showInformationMessage(`Successfully imported ${count} of ${configs.length} transformers`)
					transformersProvider.refresh()
				} catch (error) {
					logOutputChannel.error(`Failed to import transformers: ${error}`)
					vscode.window.showErrorMessage(`Failed to import transformers: ${error}`)
				}
			}
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.searchTransformers", async () => {
			const transformers = transformerManager.getAllTransformers()

			const searchId = await vscode.window.showQuickPick(
				transformers.map((t) => ({
					id: t.id,
					label: t.name,
					detail: t.description?.substring(0, 100) || "",
				})),
				{
					placeHolder: "Search transformers by name",
					matchOnDescription: true,
					matchOnDetail: true,
					canPickMany: false,
				},
			)

			if (searchId) {
				transformersProvider.setSearchId(searchId.id)
			}
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.viewTransformerLibrary", async () => {
			const token = await authenticateGitHub()
			if (token) {
				const gitLibraryName = ConfigurationManager.getGitLibraryName()
				if (!gitLibraryName) {
					vscode.window.showErrorMessage("Git library name is not configured.")
					return
				}
				const library = await getTransformerLibrary(gitLibraryName, token.accessToken)

				// FOR TESTING
				// const libraryUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'testfuzor.json');
				// const libraryContents = await vscode.workspace.fs.readFile(libraryUri);
				// const library = JSON.parse(libraryContents.toString());

				createWebviewPanel(context, library, transformerManager, transformersProvider, gitLibraryName)
			}
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.createFolder", async () => {
			const folderName = await vscode.window.showInputBox({
				prompt: "Enter folder name",
				placeHolder: "New Folder",
			})

			if (folderName) {
				const { v4: uuidv4 } = require("uuid")
				const newFolder: FuzorFolder = {
					id: uuidv4(),
					name: folderName,
					parentFolderId: null,
				}
				await transformersProvider.addFolder(newFolder)
			}
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.deleteFolder", async (item: TransformerTreeItem) => {
			if (item?.fuzorItem.folder !== undefined || item?.fuzorItem.folder !== null) {
				const answer = await vscode.window.showWarningMessage(
					`WARNING: Are you sure you want to delete folder and all its transformers "${item.label}"?`,
					"Yes",
					"No",
				)
				if (answer === "Yes") {
					await transformersProvider.removeTransformer(item.fuzorItem.folder!.id)
				}
			}
		}),
		vscode.commands.registerCommand("fuzor-ai-transformer.renameFolder", async (item: TransformerTreeItem) => {
			if (item?.fuzorItem.folder !== undefined || item?.fuzorItem.folder !== null) {
				const newName = await vscode.window.showInputBox({
					prompt: "Enter new folder name",
					value: item.fuzorItem.folder!.name,
					validateInput: (value) => {
						if (!value || value.trim() === "") {
							return "Folder name cannot be empty"
						}
						return null
					},
				})

				if (newName) {
					try {
						await transformerManager.renameFolder(item.fuzorItem.folder!.id, newName)
						transformersProvider.refresh()
						vscode.window.showInformationMessage(`Folder renamed to "${newName}"`)
					} catch (error) {
						if (error instanceof TransformerExistsError) {
							vscode.window.showErrorMessage(`A folder with name "${newName}" already exists`)
						} else {
							vscode.window.showErrorMessage(`Failed to rename folder: ${error}`)
						}
					}
				}
			}
		}),
	]

	// Add everything to context subscriptions
	context.subscriptions.push(webviewRegistration, treeViewRegistration, ...commands)

	logOutputChannel.info("Fuzor AI Transformer extension activated successfully.")
}

export function deactivate() {
	logOutputChannel.info("Deactivating Fuzor AI Transformer extension...")
	logOutputChannel.dispose()
	outputChannel.dispose()
}
