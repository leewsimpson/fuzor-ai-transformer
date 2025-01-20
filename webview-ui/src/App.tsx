import React, { useEffect, useState } from "react"
import { TransformerConfig } from "../../src/shared/transformerConfig"
import { WebViewCommand } from "../../src/shared/commands"
import ManageTransformerView from "./components/transformer/manageTransformerView"
import TransformerLibraryView from "./components/transformerLibrary/transformerLibraryView"
import { TransformerLibrary } from "../../src/shared/transformerLibrary"
import { vscode } from "./utils/vscode"
import { ExtensionCommand } from "../../src/shared/commands"

function App() {
	const [config, setConfig] = useState<TransformerConfig | null>(null)
	const [transformerLibrary, setTransformerLibrary] = useState<TransformerLibrary | null>(null)

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message: WebViewCommand = event.data
			console.log("Received message in App.tsx:", message)
			switch (message.type) {
				case "viewTransformer":
				case "editTransformer":
					if (!message.config) {
						console.error("No config provided in message")
						return
					}
					setConfig(message.config || null)
					break
				case "viewTransfomerLibrary":
					if (!message.library) {
						console.error("No library provided in message")
						return
					}
					setTransformerLibrary(message.library)
					break
				default:
					break
			}
		}

		window.addEventListener("message", handleMessage)
		console.log("webview-ui ready to receive messages")
		vscode.postMessage({ type: "ready" })
		console.log("posted ready message")

		return () => {
			window.removeEventListener("message", handleMessage)
			console.log("webview-ui not ready to receive messages, listener removed")
		}
	}, [])

	return (
		<div className="p-2">
			{transformerLibrary ? <TransformerLibraryView library={transformerLibrary} /> : <ManageTransformerView />}
		</div>
	)
}

export default App
