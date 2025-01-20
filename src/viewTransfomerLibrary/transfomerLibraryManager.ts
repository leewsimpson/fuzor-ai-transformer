import * as vscode from "vscode"
import axios from "axios"
import { TransformerLibrary } from "../shared/transformerLibrary"
import { ExtensionCommand, WebViewCommand } from "../shared/commands"
import { logOutputChannel } from "../extension"
import { TransformerManager } from "../transformers/transformerManager"
import { TransformersProvider } from "../providers/TransformersProvider"

export async function authenticateGitHub(): Promise<vscode.AuthenticationSession | null> {
	try {
		const session = await vscode.authentication.getSession("github", ["repo"], { createIfNone: true })

		if (!session) {
			vscode.window.showErrorMessage("GitHub authentication failed: No session returned")
			return null
		}

		vscode.window.showInformationMessage("Successfully authenticated with GitHub")
		return session
	} catch (error: Error | any) {
		console.error("GitHub authentication error:", error)
		vscode.window.showErrorMessage(`Failed to authenticate with GitHub: ${error.message}`)
		return null
	}
}

export async function fetchFileContent(repo: string, path: string, token: string): Promise<string> {
	try {
		if (!path.endsWith(".json")) {
			return ""
		}

		const url = `https://api.github.com/repos/${repo}/contents/${path}`
		const headers = { Authorization: `Bearer ${token}` }

		const response = await axios.get(url, { headers })
		return Buffer.from(response.data.content, "base64").toString("utf-8")
	} catch (error: Error | any) {
		console.error("GitHub API error:", error)
		vscode.window.showErrorMessage(`Failed to fetch file content from git: ${error.message}`)
		return ""
	}
}

export async function getTransformerLibrary(repo: string, token: string): Promise<TransformerLibrary> {
	const session = await authenticateGitHub()
	if (!session) {
		throw new Error("GitHub authentication failed")
	}

	const libraryContent = await fetchFileContent(repo, "fuzor.json", token)
	if (libraryContent) {
		const library: TransformerLibrary = JSON.parse(libraryContent)
		return library
	} else {
		throw new Error("Failed to fetch transformer library")
	}
}

export function createWebviewPanel(
	context: vscode.ExtensionContext,
	library: TransformerLibrary,
	transformerManager: TransformerManager,
	transformersProvider: TransformersProvider,
	repo: string,
): vscode.WebviewPanel {
	const panel = vscode.window.createWebviewPanel("folderView", `Library - ${repo}`, vscode.ViewColumn.One, {
		enableScripts: true,
	})

	panel.webview.html = getHtmlForWebview(context, panel.webview)

	// Wait for the webview to send a "ready" message
	const webviewReady = new Promise<void>((resolve) => {
		panel.webview.onDidReceiveMessage(async (message: ExtensionCommand) => {
			if (message.type === "ready") {
				resolve()
			}
		})
	})

	webviewReady.then(() => {
		const message: WebViewCommand = {
			type: "viewTransfomerLibrary",
			library: library,
		}
		panel.webview.postMessage(message)
		console.log("Sent message to Transformer Library webview:", message)
	})

	panel.webview.onDidReceiveMessage(
		async (message: ExtensionCommand) => {
			logOutputChannel.info(`Received message: Command - "${message.type}"`)
			switch (message.type) {
				case "importTransformer":
					if (message.config) {
						try {
							console.log(message.config)
							await transformerManager.createTransformer(message.config) //TODO: Handle updating existing transformer
							vscode.window.showInformationMessage("Successfully imported ", message.config.name)
							transformersProvider.refresh()
						} catch (error: Error | any) {
							vscode.window.showErrorMessage("Import failed due to ", error.message)
						}
					} else {
						vscode.window.showErrorMessage("Config is undefined")
					}
					break
				default:
					console.warn(`Unknown command: ${message.type}`)
			}
		},
		undefined,
		context.subscriptions,
	)

	return panel
}

function _getNonce() {
	let text = ""
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length))
	}
	return text
}

function getHtmlForWebview(context: vscode.ExtensionContext, webview: vscode.Webview): string {
	const nonce = _getNonce()

	// Get URIs for React build assets
	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "webview-ui", "dist", "index.js"))
	const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "webview-ui", "dist", "index.css"))

	// The codicon font from the React build output
	// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-codicons-sample/src/extension.ts
	// we installed this package in the extension so that we can access it how its intended from the extension (the font file is likely bundled in vscode), and we just import the css fileinto our react app we don't have access to it
	// don't forget to add font-src ${webview.cspSource};
	const codiconsUri = webview.asWebviewUri(
		vscode.Uri.joinPath(context.extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css"),
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
