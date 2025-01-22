import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"
import { logOutputChannel } from "../extension"
import { TransformerConfig } from "../shared/transformerConfig"
import { TransformerManager } from "../transformers/transformerManager"
import { TransformersProvider } from "../providers/TransformersProvider"
import { LLMClient } from "../llm/llmClient"
import { ExtensionCommand, WebViewCommand } from "../shared/commands"
import { readFileContents, getAbsolutePath } from "../utils/fileUtils"

export class ViewEditTransformer implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView
	private currentExecution: Promise<void> | null = null

	private transformerManager: TransformerManager
	private transformersProvider: TransformersProvider

	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly context: vscode.ExtensionContext,
		transformersProvider: TransformersProvider,
		transformerManager: TransformerManager,
	) {
		this.transformerManager = transformerManager
		this.transformersProvider = transformersProvider
		this.extensionUri = extensionUri
		this.context = context

		logOutputChannel.info("ViewEditTransformer initialized.")
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		logOutputChannel.info("Resolving webview view...")
		try {
			this._view = webviewView

			webviewView.webview.options = {
				enableScripts: true,
				localResourceRoots: [this.extensionUri],
			}

			logOutputChannel.info("Setting webview HTML content...")
			webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)

			// Handle messages from the webview
			webviewView.webview.onDidReceiveMessage(async (message: ExtensionCommand) => {
				logOutputChannel.info(`Received message: Command - "${message.type}"`)
				switch (message.type) {
					case "alert":
						vscode.window.showInformationMessage(message.fieldName || "Alert from webview")
						break
					case "selectTransformer":
						vscode.window.showInformationMessage(`Selected Transformer: ${message.config?.name}`)
						break
					case "openFileDialog":
						const config = message.config as TransformerConfig
						const isOutput = message.isOutput
						const options: vscode.OpenDialogOptions = {
							canSelectMany: false,
							openLabel: "Select File",
							filters: {
								"All Files": ["*"],
							},
							defaultUri:
								vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
									? vscode.Uri.file(`${vscode.workspace.workspaceFolders[0].uri.fsPath}`)
									: vscode.Uri.file(""),
						}

						if (message.isOutput) {
							options.canSelectFiles = false
							options.canSelectFolders = true
							options.openLabel = "Select Folder"
						} else {
							let matchingInput = config.input.find((i) => i.name === message.fieldName)

							options.canSelectFiles = matchingInput?.type === "file"
							options.canSelectFolders = matchingInput?.type === "folder"
							options.openLabel = "Select " + (options.canSelectFiles ? "File" : "Folder")
						}

						const fileUri = await vscode.window.showOpenDialog(options)
						if (fileUri && fileUri[0]) {
							const filePath = fileUri[0].fsPath
							let relativePathFromWorkspaceRoot = filePath
							//get relative path from the current workspace root if workspace is open
							if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
								const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath
								const relativePath = path.relative(workspaceRoot, filePath)
								if (relativePath) {
									relativePathFromWorkspaceRoot = relativePath
								}
							}

							if (isOutput) {
								config.outputFolder = relativePathFromWorkspaceRoot
								await this.transformerManager.updateTransformer(config)
							} else {
								const updatedInput = config.input.map((i) => {
									if (i.name === message.fieldName) {
										return {
											...i,
											value: relativePathFromWorkspaceRoot,
										}
									}
									return i
								})
								config.input = updatedInput
							}
							await this.transformerManager.updateTransformer(config)
							await this.transformersProvider.refresh()
							vscode.window.showInformationMessage("Transformer configuration saved")
							this.updateContent(config, false)
						}
						break
					case "executeTransformer":
						try {
							const config = message.config as TransformerConfig
							logOutputChannel.debug(`Saving Config ${JSON.stringify(config)}`)

							// Notify webview that execution started
							this.sendCommandToWebView({ type: "executionStarted" })

							const execution = this.transformerManager.executeTransformer(config)

							// Store the execution promise for potential cancellation
							this.currentExecution = execution

							await execution

							// Notify webview that execution completed
							this.sendCommandToWebView({ type: "executionFinished" })

							vscode.window.showInformationMessage("Transformer executed successfully")
						} catch (error) {
							this.sendCommandToWebView({ type: "executionFinished" })

							if (error instanceof Error) {
								vscode.window.showErrorMessage(`Failed to execute transformer: ${error.message}`)
								logOutputChannel.error(`Error executing transformer: ${error.stack}`)
							} else {
								vscode.window.showErrorMessage("An unknown error occurred while executing the transformer.")
								logOutputChannel.error(`Unknown error: ${JSON.stringify(error)}`)
							}
						}
						break
					case "stopExecution":
						if (this.currentExecution) {
							try {
								await this.transformerManager.stopExecution()
								this.currentExecution = null
								this.sendCommandToWebView({ type: "executionStopped" })

								vscode.window.showInformationMessage("Execution stopped")
							} catch (error) {
								if (error instanceof Error) {
									vscode.window.showErrorMessage(`Failed to stop execution: ${error.message}`)
									logOutputChannel.error(`Error stopping execution: ${error.stack}`)
								} else {
									vscode.window.showErrorMessage("An unknown error occurred while stopping execution.")
									logOutputChannel.error(`Unknown error: ${JSON.stringify(error)}`)
								}
							}
						}
						break
					case "saveTransformer":
						try {
							const config = message.config as TransformerConfig
							logOutputChannel.debug(`Saving Config ${JSON.stringify(config)}`)
							// Validate config structure
							if (!config.id || typeof config.id !== "string") {
								throw new Error("Invalid transformer config: missing or invalid id")
							}
							if (!config.name || typeof config.name !== "string") {
								throw new Error("Invalid transformer config: missing or invalid name")
							}

							// Print only id and name
							logOutputChannel.info(`Saving transformer: id=${config.id}, name=${config.name}`)

							// Update the config structure to match the TransformerConfig type
							config.input = config.input || []
							config.outputFolder = config.outputFolder || ""

							await this.transformerManager.updateTransformer(config)
							await this.transformersProvider.refresh()
							vscode.window.showInformationMessage("Transformer configuration saved")
							this.updateContent(config, false)
						} catch (error) {
							if (error instanceof Error) {
								vscode.window.showErrorMessage(`Failed to save transformer configuration: ${error.message}`)
								logOutputChannel.error(`Error saving transformer configuration: ${error.stack}`)
							} else {
								vscode.window.showErrorMessage(
									"An unknown error occurred while saving the transformer configuration.",
								)
								logOutputChannel.error(`Unknown error: ${JSON.stringify(error)}`)
							}
						}
						break
					case "enhancePrompt":
						try {
							const { name, description, prompt } = JSON.parse(message.data || "{}")
							const config = message.config as TransformerConfig
							const llm = new LLMClient()

							const enhancementPrompt = `

                                You are prompt engineer working for a company which transforms file from one format to another format.

                                The prompt can have inputs of type text, textArea, file, or folder. The prompt can have multiple inputs.
                                inputs are defined using placeholders of the form {{inputName::inputType}}. For example, {{content::file}}.
                                
                                Using the provided details: Name: ${name}, Description: ${description}, and Current Prompt: ${prompt},
                                enhance the given prompt to be more clear, specific, and effective for its intended transformation. 
                                Ensure the improved prompt is concise and includes at least one placeholder like {{content::file}} for dynamic input replacement. 
                                Do not repeat the provided details in the enhanced prompt. Do not repeat same placeholder multiple times. 
                                By default place the placeholder at the end of the prompt in a new line
                                
                                Generate an enhanced version of this prompt (reply with only the enhanced prompt - no conversation, explanations, lead-in, bullet points, placeholders, or surrounding quotes):

                                `

							const llmResponse = await llm.sendRequest(enhancementPrompt)
							let updatedConfig = { ...config, name: name, description: description }
							this.sendCommandToWebView({ type: "updatePrompt", config: updatedConfig, prompt: llmResponse })

							logOutputChannel.info("Prompt enhancement completed")
						} catch (error) {
							if (error instanceof Error) {
								logOutputChannel.error(`Error enhancing prompt: ${error.message}`)
							} else {
								logOutputChannel.error(`Unknown error enhancing prompt: ${JSON.stringify(error)}`)
							}
						}
						break
					case "previewLLMRequest":
						try {
							const config = message.config as TransformerConfig

							// validate prompt
							this.transformerManager.validatePrompt(config.prompt)

							const placeholderRegex = /\{\{([^}]+)\}\}/g
							const placeholders = new Set<{ name: string; type: string; options: string | undefined }>()
							let match
							let processedPrompt = config.prompt
							while ((match = placeholderRegex.exec(config.prompt))) {
								const [inputName, inputType, inputOptions] = match[1].split("::")
								logOutputChannel.debug(
									`Found placeholder: ${match[1]} of type ${inputType} with name ${inputName} and options ${inputOptions}`,
								)
								placeholders.add({ name: inputName, type: inputType, options: inputOptions })

								const input = config.input.find((i) => i.name === inputName)
								if (!input) {
									throw new Error(`Input ${inputName} not found in config`)
								}

								const inputValue = input.value
								if (inputValue === undefined || inputValue === null) {
								} else {
									switch (inputType) {
										case "text":
										case "textArea":
										case "string":
										case "select":
											processedPrompt = processedPrompt.replace("{{" + match[1] + "}}", inputValue)
											break
										case "file":
											const fileContent = await readFileContents(inputValue)
											// Replace placeholders in the prompt
											processedPrompt = processedPrompt.replace("{{" + match[1] + "}}", fileContent)
											break
										case "folder":
											if (config.processFormat === "joinFiles") {
												const absolutePath = getAbsolutePath(inputValue)
												if (!absolutePath || absolutePath === null) {
													throw new Error("Invalid folder path")
												}
												const files = fs.readdirSync(absolutePath)
												let joinedContent = ""
												for (const file of files) {
													const filePath = path.join(absolutePath, file)
													const fileStat = fs.lstatSync(filePath)
													if (fileStat.isFile() && !file.startsWith(".")) {
														const fileContent = await readFileContents(filePath)
														joinedContent += `FileName: ${file}\n${fileContent}\n\n`
													}
												}
												processedPrompt = processedPrompt.replace("{{" + match[1] + "}}", joinedContent)
											}
											break
									}
								}
							}
							// Create a temporary file to show the preview
							await fs.promises.mkdir(this.context.globalStorageUri.fsPath, { recursive: true })
							const tempFile = path.join(this.context.globalStorageUri.fsPath, "preview_llm_request.txt")

							await fs.promises.writeFile(tempFile, processedPrompt)

							// Open the preview in a new editor
							const doc = await vscode.workspace.openTextDocument(tempFile)
							await vscode.window.showTextDocument(doc, { preview: false })

							// Clean up when editor is closed
							const closeDisposable = vscode.window.onDidChangeVisibleTextEditors((editors) => {
								if (!editors.some((e) => e.document.uri.fsPath === tempFile)) {
									closeDisposable.dispose()
									fs.promises.unlink(tempFile).catch((err) => {
										logOutputChannel.error(`Error deleting preview file: ${err.message}`)
									})
								}
							})
						} catch (error) {
							if (error instanceof Error) {
								logOutputChannel.error(`Error previewing LLM request: ${error.message}`)
								vscode.window.showErrorMessage(`Failed to preview LLM request: ${error.message}`)
							} else {
								logOutputChannel.error(`Unknown error previewing LLM request: ${JSON.stringify(error)}`)
								vscode.window.showErrorMessage("Failed to preview LLM request due to an unknown error")
							}
						}
						break
					case "openPromptInEditor":
						try {
							const { name, description, prompt } = JSON.parse(message.data || "{}")
							const config = message.config as TransformerConfig
							// Create a temporary file
							// Ensure global storage directory exists
							await fs.promises.mkdir(this.context.globalStorageUri.fsPath, { recursive: true })

							const tempFile = path.join(this.context.globalStorageUri.fsPath, "temp_prompt.fuzorprompt")
							try {
								await fs.promises.writeFile(tempFile, prompt || "")
							} catch (error) {
								if (error instanceof Error) {
									throw new Error(`Failed to create temp prompt file: ${error.message}`)
								}
								throw new Error("Failed to create temp prompt file")
							}

							// Open the temporary file with word wrap enabled
							const doc = await vscode.workspace.openTextDocument(tempFile)
							const editor = await vscode.window.showTextDocument(doc, {
								viewColumn: vscode.ViewColumn.One,
								preserveFocus: false,
								preview: false,
							})
							await vscode.workspace
								.getConfiguration()
								.update("editor.wordWrap", "on", vscode.ConfigurationTarget.Global)

							// Watch for changes
							const watcher = vscode.workspace.createFileSystemWatcher(tempFile)
							const saveDisposable = vscode.workspace.onDidSaveTextDocument((savedDoc) => {
								if (savedDoc.uri.fsPath === tempFile) {
									const newContent = savedDoc.getText()
									try {
										this.transformerManager.validatePrompt(newContent)
										let updatedConfig = {
											...config,
											name: name,
											description: description,
											prompt: newContent,
										}
										this.sendCommandToWebView({
											type: "updatePrompt",
											config: updatedConfig,
											prompt: newContent,
										})
									} catch (error) {
										if (error instanceof Error) {
											logOutputChannel.error(`Error validating prompt: ${error.message}`)
											vscode.window.showErrorMessage(`Failed to validate prompt: ${error.message}`)
										} else {
											logOutputChannel.error(`Unknown error validating prompt: ${JSON.stringify(error)}`)
											vscode.window.showErrorMessage("Failed to validate prompt due to an unknown error")
										}
										return
									}
								}
							})

							// Clean up when editor is closed
							const closeDisposable = vscode.window.onDidChangeVisibleTextEditors((editors) => {
								if (!editors.some((e) => e.document.uri.fsPath === tempFile)) {
									watcher.dispose()
									saveDisposable.dispose()
									closeDisposable.dispose()
									fs.promises.unlink(tempFile).catch((err) => {
										logOutputChannel.error(`Error deleting temp file: ${err.message}`)
									})
								}
							})
						} catch (error) {
							if (error instanceof Error) {
								logOutputChannel.error(`Error opening prompt in editor: ${error.message}`)
							} else {
								logOutputChannel.error(`Unknown error opening prompt in editor: ${JSON.stringify(error)}`)
							}
						}
						break
				}
			})

			// Register command for opening prompt in editor
			this.context.subscriptions.push(
				vscode.commands.registerCommand("fuzor-ai-transformer.openPromptInEditor", async () => {
					this.sendCommandToWebView({ type: "openPromptInEditor" })
				}),
			)

			logOutputChannel.info("ViewEditTransformer view successfully resolved.")
		} catch (error) {
			if (error instanceof Error) {
				logOutputChannel.error(`Error resolving webview: ${error.message}\nStack: ${error.stack}`)
				vscode.window.showErrorMessage(`Failed to load view: ${error.message}`)
			} else {
				logOutputChannel.error(`Unknown error resolving webview: ${JSON.stringify(error)}`)
				vscode.window.showErrorMessage("Failed to load view due to an unknown error.")
			}
		}
	}

	private getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
		return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList))
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		const nonce = this._getNonce()

		// Get URIs for React build assets
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "webview-ui", "dist", "index.js"))
		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "webview-ui", "dist", "index.css"))

		// The codicon font from the React build output
		// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-codicons-sample/src/extension.ts
		// we installed this package in the extension so that we can access it how its intended from the extension (the font file is likely bundled in vscode), and we just import the css fileinto our react app we don't have access to it
		// don't forget to add font-src ${webview.cspSource};
		const codiconsUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css"),
		)

		return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
			<meta http-equiv="Content-Security-Policy" 
            content="default-src 'none'; 
                font-src ${webview.cspSource}; 
                    style-src ${webview.cspSource} 'unsafe-inline'; 
                        script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <link href="${codiconsUri}" rel="stylesheet" />
            <title>Fuzor AI Transformer</title>
        </head>
        <body>
            <noscript>You need to enable JavaScript to run this app.</noscript>
            <div id="root"></div>
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`
	}

	private _getNonce() {
		let text = ""
		const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length))
		}
		return text
	}

	public updateContent(content: TransformerConfig, showEditForm: boolean = false) {
		this.sendCommandToWebView({ type: showEditForm ? "editTransformer" : "viewTransformer", config: content })
	}

	public sendCommandToWebView(message: WebViewCommand) {
		if (this._view) {
			this._view.webview.postMessage(message)
		} else {
			logOutputChannel.error(`Failed to send message to webview: Webview not found`)
		}
	}
}
function replace(arg0: RegExp, nonce: string) {
	throw new Error("Function not implemented.")
}
