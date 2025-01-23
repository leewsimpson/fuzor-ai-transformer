import React, { useEffect, useState } from "react"
import { TransformerConfig } from "../../../../src/shared/transformerConfig"
import { WebViewCommand } from "../../../../src/shared/commands"
import ViewTransformer from "./viewTransformer"
import EditTransformer from "./editTransformer"
import { vscode } from "../../utils/vscode"

const ManageTransformerView: React.FC = () => {
	const [config, setConfig] = useState<TransformerConfig | null>(null)
	const [isExecuting, setIsExecuting] = useState(false)
	const [isEditing, setIsEditing] = useState(false)
	const [validationResult, setValidationResult] = useState<{
		isSuccess: boolean | undefined
		message: string
		tokenCount: number
	} | null>({ isSuccess: undefined, message: "Not validated", tokenCount: 0 })

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message: WebViewCommand = event.data
			console.log("Received message in manageTransformerView:", message)
			switch (message.type) {
				case "viewTransformer":
					setConfig(message.config || null)
					setIsEditing(false)
					setValidationResult({ isSuccess: undefined, message: "Not validated", tokenCount: 0 })
					break
				case "editTransformer":
					setConfig(message.config || null)
					setIsEditing(true)
					setValidationResult({ isSuccess: undefined, message: "Not validated", tokenCount: 0 })
					break
				case "executionStarted":
					setIsExecuting(true)
					break
				case "executionStopped":
				case "executionFinished":
					setIsExecuting(false)
					break
				case "updatePrompt":
					setConfig((prevConfig) => {
						if (!prevConfig) return null
						return {
							...prevConfig,
							name: message.config!.name || prevConfig.name,
							description: message.config!.description || prevConfig.description,
							prompt: message.prompt || prevConfig.prompt,
						}
					})
					setValidationResult({ isSuccess: undefined, message: "Not validated", tokenCount: 0 })
					setIsEditing(true)
					break
				case "validationResult":
					let val = JSON.parse(message.data!)
					setValidationResult({ isSuccess: val.isSuccess, message: val.message, tokenCount: val.tokenCount })
					break
				default:
					break
			}
		}

		window.addEventListener("message", handleMessage)
		return () => window.removeEventListener("message", handleMessage)
	}, [])

	const handleEdit = () => {
		if (!config) return
		console.log("handleEdit invoked")
		setIsEditing(true)
	}

	const handleExecute = () => {
		if (!config) return
		console.log("handleExecute invoked")
		vscode.postMessage({ type: "executeTransformer", config })
	}

	const handleStop = () => {
		console.log("handleStop invoked")
		vscode.postMessage({
			type: "stopExecution",
		})
	}

	const handlePreview = () => {
		if (!config) return
		console.log("handlePreview invoked")
		vscode.postMessage({
			type: "previewLLMRequest",
			config,
		})
	}

	const handleOpenFileDialogClick = (name: string, isOutput: boolean) => {
		if (!config) return
		console.log("handleOpenFileDialogClick invoked")
		vscode.postMessage({ type: "openFileDialog", config, isOutput, fieldName: name })
	}

	const handleEnhancePrompt = (name: string, description: string, prompt: string) => {
		if (!config) return
		let data = { name, description, prompt }
		vscode.postMessage({ type: "enhancePrompt", config, data: JSON.stringify(data) })
	}

	const handleOpenInEditor = (name: string, description: string, prompt: string) => {
		if (!config) return
		let data = { name, description, prompt }
		vscode.postMessage({ type: "openPromptInEditor", data: JSON.stringify(data) })
	}

	const handleValidate = () => {
		if (!config) return
		console.log("handleValidate invoked")
		vscode.postMessage({ type: "validateConfig", config })
	}

	if (!config) {
		return (
			<div className="p-10 flex flex-col items-center justify-center min-h-[300px]">
				<div className="animate-pulse">
					<span className="codicon codicon-arrow-up" style={{ fontSize: "48px" }}></span>
				</div>
				<h2 className="mb-4 text-3xl font-bold text-white">Welcome to Fuzor!!</h2>
				<p className="mb-8 text-xl text-white/90">Select a Fuzor Transformer to Begin!!</p>
			</div>
		)
	}

	return isEditing ? (
		<EditTransformer
			config={config!}
			onSave={(updatedConfig) => {
				setValidationResult({ isSuccess: undefined, message: "Not validated", tokenCount: 0 })
				vscode.postMessage({ type: "saveTransformer", config: updatedConfig })
			}}
			onCancel={() => setIsEditing(false)}
			handleEnhancePrompt={handleEnhancePrompt}
			handleOpenInEditor={handleOpenInEditor}
		/>
	) : (
		<ViewTransformer
			config={config}
			isExecuting={isExecuting}
			validationResult={validationResult}
			onEdit={handleEdit}
			onExecute={handleExecute}
			onStop={handleStop}
			handleOpenFileDialogClick={handleOpenFileDialogClick}
			onPreview={handlePreview}
			onValidate={handleValidate}
			setValidationResult={setValidationResult}
		/>
	)
}

export default ManageTransformerView
