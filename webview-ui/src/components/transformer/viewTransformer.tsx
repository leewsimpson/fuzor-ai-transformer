import React, { useState, useEffect } from "react"
import * as path from "path"
import { TransformerConfig } from "../../../../src/shared/transformerConfig"
import { TokenCount } from "../shared/TokenCount"

interface ViewTransformerProps {
	config: TransformerConfig
	isExecuting: boolean
	validationResult: { isSuccess: boolean | undefined; message: string; tokenCount: number } | null
	onEdit: () => void
	onExecute: () => void
	onStop: () => void
	handleOpenFileDialogClick: (name: string, isOutput: boolean) => void
	onPreview: () => void
	onValidate: () => void
	setValidationResult: (result: { isSuccess: boolean | undefined; message: string; tokenCount: number } | null) => void
}

const ViewTransformer: React.FC<ViewTransformerProps> = ({
	config,
	isExecuting,
	validationResult,
	onEdit,
	onExecute,
	onStop,
	handleOpenFileDialogClick,
	onPreview,
	onValidate,
	setValidationResult,
}) => {
	const [inputValues, setInputValues] = useState<{ [key: string]: string }>({})
	const [outputFileName, setOutputFileName] = useState(config.outputFileName || "")

	const resetValidation = () => {
		setValidationResult({
			isSuccess: undefined,
			message: "",
			tokenCount: 0,
		})
	}
	console.log("config", config)

	useEffect(() => {
		// Initialize input values from config
		const initialValues = config.input?.reduce(
			(acc, input) => {
				if (input.type === "select" && input.options) {
					const options = JSON.parse(input.options)
					acc[input.name] = input.value || options[0] || ""
				} else {
					acc[input.name] = input.value || ""
				}
				return acc
			},
			{} as { [key: string]: string },
		)
		setInputValues(initialValues || {})
	}, [config])

	const handlePreview = () => {
		// Update config with current values
		const updatedInputs = config.input?.map((input) => ({
			...input,
			value: inputValues[input.name] || "",
		}))
		if (updatedInputs) {
			config.input = updatedInputs
		}
		onPreview()
	}

	const handleValidate = async () => {
		// Update config with current values
		const updatedInputs = config.input?.map((input) => ({
			...input,
			value: inputValues[input.name] || "",
		}))
		if (updatedInputs) {
			config.input = updatedInputs
		}
		onValidate()
	}

	const handleExecute = () => {
		// Update config with current values
		const updatedInputs = config.input?.map((input) => ({
			...input,
			value: inputValues[input.name] || "",
		}))
		if (updatedInputs) {
			config.input = updatedInputs
			config.outputFileName = outputFileName
		}
		onExecute()
	}

	const handleOpenDialogue = (fieldName: string, isOutput: boolean) => {
		// Update config with current values
		const updatedInputs = config.input?.map((input) => ({
			...input,
			value: inputValues[input.name] || "",
		}))
		if (updatedInputs) {
			config.input = updatedInputs
		}
		handleOpenFileDialogClick(fieldName, isOutput)
	}

	return (
		<div className="space-y-4">
			<div className="bg-[var(--vscode-editor-background)] p-4 rounded-lg shadow-md flex flex-col space-y-4">
				<div className="flex flex-col">
					<h3 className="text-xl font-semibold text-[var(--vscode-foreground)] mb-1">{config.name}</h3>
					<p className="text-sm text-[var(--vscode-descriptionForeground)]">{config.description}</p>
				</div>
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-2">
						<div
							className="flex items-center space-x-2 cursor-pointer group"
							onClick={isExecuting ? onStop : handleExecute}>
							<span
								className={`w-8 h-8 codicon ${
									isExecuting ? "codicon-stop-circle animate-spin" : "codicon-play"
								} text-xl ${
									isExecuting ? "text-red-500" : "text-[var(--vscode-foreground)]"
								} flex justify-center items-center p-2 rounded-full group-hover:text-[var(--vscode-button-hoverBackground)]`}
								title={isExecuting ? "Stop" : "Execute"}></span>
							<span className="text-sm text-[var(--vscode-foreground)] group-hover:text-[var(--vscode-button-hoverBackground)]">
								{isExecuting ? "Stop" : "Execute"}
							</span>
						</div>
					</div>
					<div className="flex items-center space-x-2">
						<div className="flex items-center space-x-2 cursor-pointer group" onClick={handlePreview}>
							<span
								className="w-8 h-8 codicon codicon-open-preview text-xl text-[var(--vscode-foreground)] flex justify-center items-center p-2 rounded-full group-hover:text-[var(--vscode-button-hoverBackground)]"
								title="Preview"></span>
							<span className="text-sm text-[var(--vscode-foreground)] group-hover:text-[var(--vscode-button-hoverBackground)]">
								Preview
							</span>
						</div>
					</div>
					<div className="flex items-center space-x-2">
						<div className="flex items-center space-x-2 cursor-pointer group" onClick={handleValidate}>
							<span
								className={`w-8 h-8 codicon ${
									validationResult?.isSuccess === true
										? "codicon-verified-filled text-green-500"
										: validationResult?.isSuccess === false
											? "codicon-error text-red-500"
											: "codicon-beaker"
								} text-xl text-[var(--vscode-foreground)] flex justify-center items-center p-2 rounded-full group-hover:text-[var(--vscode-button-hoverBackground)]`}
								title="Validate"></span>
							<div className="flex flex-col">
								<span
									className={`text-sm ${
										validationResult?.isSuccess === true
											? "text-green-500"
											: validationResult?.isSuccess === false
												? "text-red-500"
												: "text-[var(--vscode-foreground)]"
									} group-hover:text-[var(--vscode-button-hoverBackground)]`}>
									{validationResult?.isSuccess === true
										? "Valid"
										: validationResult?.isSuccess === false
											? "InValid"
											: "Validate"}
								</span>
								{validationResult?.isSuccess && (
									<span className="text-xs text-[var(--vscode-descriptionForeground)]">
										{validationResult.tokenCount} tokens
									</span>
								)}
							</div>
						</div>
					</div>

					<div className="flex items-center space-x-2">
						<div className="flex items-center space-x-2 cursor-pointer group" onClick={onEdit}>
							<span
								className="w-8 h-8 codicon codicon-edit text-xl text-[var(--vscode-foreground)] flex justify-center items-center p-2 rounded-full group-hover:text-[var(--vscode-button-hoverBackground)]"
								title="Edit"></span>
							<span className="text-sm text-[var(--vscode-foreground)] group-hover:text-[var(--vscode-button-hoverBackground)]">
								Edit
							</span>
						</div>
					</div>
				</div>
			</div>
			{/* Show validationResult.message if validationResult.isSuccess is false */}
			{validationResult?.isSuccess === false && (
				<div className="space-y-2 bg-[var(--vscode-editor-background)] p-4 rounded-lg shadow-md">
					<div className="flex items-center space-x-2">
						<span className="text-xs text-red-500">{validationResult.message}</span>
					</div>
				</div>
			)}
			<div className="space-y-2 bg-[var(--vscode-editor-background)] p-4 rounded-lg shadow-md">
				<h4 className="mb-2 text-lg font-semibold text-[var(--vscode-foreground)]">Inputs</h4>
				{config.input?.map((input) => (
					<div key={input.name} className="flex items-center justify-between w-full py-2">
						<div className="flex flex-col w-full space-y-2">
							{/* Render input based on type */}
							{input.type === "file" ||
							input.type === "folder" ||
							input.type === "FileBrowser" ||
							input.type === "string" ||
							input.type === "input" ? (
								<div className="flex items-center w-full">
									<label className="font-medium text-[var(--vscode-foreground)] w-[15%]">{input.name}:</label>
									<div className="w-[75%]">
										<input
											className="w-full px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
											type="text"
											value={inputValues[input.name] || ""}
											onChange={(e) => {
												setInputValues((prev) => ({
													...prev,
													[input.name]: e.target.value,
												}))
												resetValidation()
											}}
										/>
									</div>
									<span
										className="w-[10%] px-2 py-1 text-[var(--vscode-foreground)] hover:text-[var(--vscode-button-hoverBackground)] cursor-pointer flex items-center justify-center ml-2"
										onClick={() => handleOpenDialogue(input.name, false)}>
										<span className="text-xl codicon codicon-folder-opened"></span>
									</span>
								</div>
							) : input.type === "text" ? (
								<div className="flex items-center w-full">
									<label className="font-medium text-[var(--vscode-foreground)] w-[15%]">{input.name}:</label>
									<div className="w-[85%]">
										<input
											className="w-full px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
											type="text"
											value={inputValues[input.name] || ""}
											onChange={(e) => {
												setInputValues((prev) => ({
													...prev,
													[input.name]: e.target.value,
												}))
												resetValidation()
											}}
										/>
										<TokenCount text={inputValues[input.name] || ""} />
									</div>
								</div>
							) : input.type === "textarea" || input.type === "textArea" ? (
								<div className="flex items-center w-full">
									<label className="font-medium text-[var(--vscode-foreground)] w-[15%]">{input.name}:</label>
									<div className="w-[85%]">
										<textarea
											className="w-full px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
											value={inputValues[input.name] || ""}
											onChange={(e) => {
												setInputValues((prev) => ({
													...prev,
													[input.name]: e.target.value,
												}))
												resetValidation()
											}}
										/>
										<TokenCount text={inputValues[input.name] || ""} />
									</div>
								</div>
							) : input.type === "select" ? (
								<div className="flex items-center w-full">
									<label className="font-medium text-[var(--vscode-foreground)] w-[15%]">{input.name}:</label>
									<div className="w-[85%]">
										<select
											className="w-full px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
											value={inputValues[input.name] || ""}
											onChange={(e) =>
												setInputValues((prev) => ({
													...prev,
													[input.name]: e.target.value,
												}))
											}>
											{input.options &&
												JSON.parse(input.options).map((option: string) => (
													<option key={option} value={option}>
														{option}
													</option>
												))}
										</select>
										<TokenCount text={inputValues[input.name] || ""} />
									</div>
								</div>
							) : (
								<div className="flex items-center space-x-2">
									<label className="font-medium text-[var(--vscode-foreground)] w-[15%]">{input.name}:</label>
									<span className="text-[var(--vscode-foreground)]">Unsupported input type</span>
								</div>
							)}
						</div>
					</div>
				))}
			</div>

			<div className="space-y-2 bg-[var(--vscode-editor-background)] p-4 rounded-lg shadow-md">
				<h4 className="mb-2 text-lg font-semibold text-[var(--vscode-foreground)]">Outputs</h4>
				<div className="flex items-center justify-between w-full py-2">
					<div className="flex items-center w-full">
						<span className="font-medium text-[var(--vscode-foreground)] w-[15%]">Folder:</span>
						<input
							className="w-[75%] px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
							type="text"
							value={config.outputFolder || ""}
							onChange={(e) => {
								config.outputFolder = e.target.value
							}}
							placeholder="Enter relative path from workspace root"
						/>
						<span
							className="w-[10%] px-2 py-1 text-[var(--vscode-foreground)] hover:text-[var(--vscode-button-hoverBackground)] cursor-pointer flex items-center justify-center ml-2"
							onClick={() => handleOpenDialogue("outputFolder", true)}>
							<span className="text-xl codicon codicon-folder-opened"></span>
						</span>
					</div>
				</div>
				<div className="flex items-center justify-between w-full py-2">
					<div className="flex items-center w-full">
						<span className="font-medium text-[var(--vscode-foreground)] w-[15%]">File Name:</span>
						<input
							className="w-[85%] px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
							type="text"
							value={outputFileName}
							onChange={(e) => {
								setOutputFileName(e.target.value)
								resetValidation()
							}}
							placeholder="Use patterns like *.txt or *-output.md or leave blank for 'transformer-output'"
						/>
					</div>
				</div>
			</div>

			<div className="bg-[var(--vscode-editor-background)] p-4 rounded-lg shadow-md">
				<div className="flex items-center w-full space-x-4">
					<span className="font-medium text-[var(--vscode-foreground)] w-[15%]">Prompt:</span>
					<div className="w-[85%] text-[var(--vscode-foreground)] whitespace-pre-wrap bg-transparent h-64 overflow-y-auto p-2 px-2 py-1 border border-[var(--vscode-input-border)] rounded">
						{config.prompt.split(/(\{\{[^}]+\}\})/).map((part, i) => (
							<span key={i} className={part.startsWith("{{") && part.endsWith("}}") ? "text-green-600" : ""}>
								{part}
							</span>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}

export default ViewTransformer
