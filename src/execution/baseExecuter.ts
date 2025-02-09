import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"
import { EventEmitter } from "vscode"
import { LLMClient } from "../llm/llmClient"
import { ProgressEvent } from "../types"
import { TransformerConfig } from "../shared/transformerConfig"
import { logOutputChannel } from "../extension"
import { getAbsolutePath } from "../utils/fileUtils"

export interface BaseExecuter {
	// Configuration Methods
	getInputFileBrowserOption(config: TransformerConfig): vscode.OpenDialogOptions
	getOutputFileName(config: TransformerConfig, inputFilePath: string): string

	// Input Handling Methods
	validateInput(config: TransformerConfig): boolean
	sortInput(dataList: string[]): string[]
	preProcessInput(data: string): string

	// Execution Methods
	generateUserMessage(config: TransformerConfig, data: string): string
	execute(config: TransformerConfig): Promise<string[]>
	sendToLLM(prompt: string, config: TransformerConfig): Promise<string>

	// Output Handling Methods
	validateOutput(config: TransformerConfig, data: string): boolean
	writeOutput(data: string, filePathUri: vscode.Uri, config: TransformerConfig): Promise<vscode.Uri>
}

export abstract class AbstractBaseExecuter implements BaseExecuter {
	private shouldStop = false
	private progressEmitter = new EventEmitter<ProgressEvent>()

	/**
	 * Registers a progress event handler
	 * @param handler - Callback function to handle progress events
	 */
	onProgress(handler: (event: ProgressEvent) => void) {
		this.progressEmitter.event(handler)
	}

	/**
	 * Stops the current execution
	 */
	stop(): void {
		this.shouldStop = true
	}

	/**
	 * Provides options for the input file browser dialog.
	 * Override this method in derived classes to customize the behaviour.
	 */
	getInputFileBrowserOption(config: TransformerConfig): vscode.OpenDialogOptions {
		return {
			canSelectFiles: true,
			canSelectFolders: true,
			canSelectMany: false,
			openLabel: "Select Input File",
			filters: {
				"All Files": ["*"],
			},
		}
	}

	/**
	 * Provides the output file name based on the configuration.
	 * Override this method in derived classes to customize the behaviour.
	 */
	getOutputFileName(config: TransformerConfig, inputFilePath: string | undefined): string {
		// If outputFileName contains a wildcard, find the first file input
		if (config.outputFileName?.includes("*")) {
			const fileInput = config.input.find((input) => input.type === "file")
			if (fileInput?.value) {
				const inputFileNameWithoutExtension = path.basename(fileInput.value, path.extname(fileInput.value))
				return config.outputFileName.replace("*", inputFileNameWithoutExtension)
			}

			// Fallback if no file input found
			let outputFileName = config.outputFileName.replace("*", "transformer_output")
			if (outputFileName.startsWith(".")) {
				outputFileName = outputFileName.replace(".", "transformer_output.")
			}
			return outputFileName
		}

		// If outputFileName is not specified, use default name
		if (!config.outputFileName) {
			return "transformer_output.txt"
		}
		if (config.outputFileName.startsWith(".")) {
			return config.outputFileName.replace(".", "transformer_output.")
		}

		// Use the specified outputFileName as-is
		return config.outputFileName
	}

	/**
	 * Validates the input based on the provided configuration.
	 * Override to implement specific validation logic.
	 */
	validateInput(config: TransformerConfig): boolean {
		return true
	}

	/**
	 * Sorts the input data alphabetically. Override to customize sorting logic.
	 */
	sortInput(dataList: string[]): string[] {
		return dataList.sort()
	}

	/**
	 * Preprocesses the input data by trimming whitespace. Override for custom logic.
	 */
	preProcessInput(data: string): string {
		return data.trim()
	}

	/**
	 * Generates a user message based on the input data and configuration.
	 * Replaces placeholders in the format {{name}} with values from config.input.
	 * If the value is a path, reads the file content. Otherwise uses the value directly.
	 * The special placeholder {{content::file}} is replaced with the data parameter.
	 */
	generateUserMessage(config: TransformerConfig): string {
		const placeholderRegex = /\{\{([^}]+)\}\}/g
		const placeholders = new Set<{ template: string; name: string; type: string; options?: string | undefined }>()
		let match
		let processedPrompt = config.prompt
		while ((match = placeholderRegex.exec(config.prompt))) {
			const [inputName, inputType, options] = match[1].split("::")
			logOutputChannel.debug(
				`Found placeholder: ${match[1]} of type ${inputType} with name ${inputName} and options ${options}`,
			)
			placeholders.add({ template: match[1], name: inputName, type: inputType, options: options })

			let input = config.input.find((i) => i.name === inputName)
			if (!input) {
				throw new Error(`Input ${inputName} not found in config`)
			}
		}
		config.input.forEach((input) => {
			//Find matching placeholder from placeholders set
			const placeholder = Array.from(placeholders).find((p) => p.name === input.name)

			if (!placeholder) {
				return
			}

			const inputValue = input.value
			if (inputValue === undefined || inputValue === null) {
			} else {
				switch (input.type) {
					case "text":
					case "textArea":
					case "string":
					case "select":
						processedPrompt = processedPrompt.replace("{{" + placeholder.template + "}}", inputValue)
						break
					case "file":
						let absFilePath = getAbsolutePath(inputValue)
						if (!absFilePath || absFilePath === null) {
							throw new Error("Input file must either be an absolute path or be relative to the workspace root")
						}
						if (!fs.existsSync(absFilePath)) {
							throw new Error("Input file does not exist")
						}
						const stat = fs.lstatSync(absFilePath)
						if (stat.isDirectory()) {
							throw new Error("Input is a directory. Preview only supports file now")
						}
						// Read the input file content
						const fileContent = fs.readFileSync(absFilePath, "utf-8")

						// Replace placeholders in the prompt
						processedPrompt = processedPrompt.replace("{{" + placeholder.template + "}}", fileContent)
						break
					case "folder":
						let absFolderPath = getAbsolutePath(inputValue)
						if (!absFolderPath || absFolderPath === null) {
							throw new Error("Input file must either be an absolute path or be relative to the workspace root")
						}
						if (!fs.existsSync(absFolderPath)) {
							throw new Error("Input folder does not exist")
						}
						const folderStat = fs.lstatSync(absFolderPath)
						if (!folderStat.isDirectory()) {
							throw new Error("Input is not a directory")
						}

						// Handle based on processFormat
						if (config.processFormat === "joinFiles") {
							const files = fs.readdirSync(absFolderPath)
							let joinedContent = ""
							for (const file of files) {
								const filePath = path.join(absFolderPath, file)
								const fileStat = fs.lstatSync(filePath)
								if (fileStat.isFile() && !file.startsWith(".")) {
									const fileContent = fs.readFileSync(filePath, "utf-8")
									joinedContent += `FileName: ${file}\n${fileContent}\n\n`
								}
							}
							processedPrompt = processedPrompt.replace("{{" + placeholder.template + "}}", joinedContent.trim())
						} else {
							// For eachFile mode, we'll process files individually in the execute method
							processedPrompt = processedPrompt.replace("{{" + placeholder.template + "}}", inputValue)
						}
						break
				}
			}
		})

		const promptPostFix = `### Additional LLM Instructions \n The output will be written to a file with an extension matching ${config.outputFileName}. Respond with only the content intended for the file. Do not include any conversation, explanations, lead-ins, bullet points, placeholders, input instructions, or additional notes in your response.`

		processedPrompt = processedPrompt + "\n\n" + promptPostFix

		return processedPrompt
	}

	/**
	 * Executes the entire transformation process based on the configuration.
	 * Override in derived classes to customize execution logic.
	 */
	async execute(config: TransformerConfig): Promise<string[]> {
		this.shouldStop = false // Reset stop flag at start of execution
		vscode.window.showInformationMessage("Executing process...")

		// Resolve relative path against workspace root
		let absoluteOutputPath = getAbsolutePath(config.outputFolder)
		if (!absoluteOutputPath || absoluteOutputPath === null) {
			throw new Error("Output folder must either be an absolute path or be relative to the workspace root")
		}

		const outputFolderUri = vscode.Uri.file(absoluteOutputPath)
		await vscode.workspace.fs.createDirectory(outputFolderUri)

		const outputFileUris: string[] = []

		const processDirectory = async (dirPath: string, relativePath: string = "") => {
			const items = fs.readdirSync(dirPath)

			if (config.processFormat === "joinFiles") {
				await this.processFileWithSubdirectoryStructure(config, outputFolderUri, outputFileUris)
			} else {
				for (const item of items) {
					if (this.shouldStop) {
						vscode.window.showInformationMessage("Execution stopped")
						return
					}

					const itemPath = path.join(dirPath, item)
					const itemStats = fs.statSync(itemPath)

					if (itemStats.isDirectory()) {
						// Recursively process subdirectory
						const newRelativePath = path.join(relativePath, item)
						await processDirectory(itemPath, newRelativePath)
					} else {
						// Process file
						const relativeFilePath = path.join(relativePath, item)
						if (item.startsWith(".")) {
							continue // Skip hidden files
						}

						// Process each file individually for eachFile mode
						if (config.processFormat === "eachFile") {
							const updatedInput = config.input.map((input) => {
								if (input.type === "folder") {
									return { ...input, type: "file", value: itemPath }
								}
								return input
							})
							const updatedConfig = { ...config, input: updatedInput }
							await this.processFileWithSubdirectoryStructure(updatedConfig, outputFolderUri, outputFileUris)
						}
					}
				}
			}
		}
		const folderInput = config.input.find((input) => input.type === "folder")
		try {
			if (folderInput) {
				let inputLocation = getAbsolutePath(folderInput.value)
				if (!inputLocation || inputLocation === null) {
					throw new Error("Input folder must either be an absolute path or be relative to the workspace root")
				}
				let inputStats = fs.statSync(inputLocation)
				if (inputStats.isDirectory()) {
					await processDirectory(inputLocation)
				} else {
					await this.processFileWithSubdirectoryStructure(config, outputFolderUri, outputFileUris)
				}
			} else {
				await this.processFileWithSubdirectoryStructure(config, outputFolderUri, outputFileUris)
			}
		} catch (error) {
			vscode.window.showErrorMessage(
				`Error processing input ${folderInput?.value || ""}: ${error instanceof Error ? error.message : String(error)}`,
			)
		}

		if (!this.shouldStop) {
			vscode.window.showInformationMessage("Transformation complete.")
		}
		return outputFileUris
	}

	async processFileWithSubdirectoryStructure(config: TransformerConfig, outputFolderUri: vscode.Uri, outputFileUris: string[]) {
		try {
			this.progressEmitter.fire({
				type: "execution",
				subType: "currentInput",
				filePath: outputFolderUri.toString(),
				message: `Processing file: ${outputFolderUri}`,
			})

			if (!this.validateInput(config)) {
				vscode.window.showErrorMessage(`Invalid input: ${config.name}`)
				return
			}

			const message = this.generateUserMessage(config)
			const response = await this.sendToLLM(message, config)

			const outputFileName = this.getOutputFileName(config, undefined)
			const outputDirUri = vscode.Uri.joinPath(outputFolderUri)

			await vscode.workspace.fs.createDirectory(outputDirUri)
			const outputFileUri = vscode.Uri.joinPath(outputDirUri, outputFileName)

			await this.writeOutput(response, outputFileUri, config)
			outputFileUris.push(outputFileUri.path)

			this.progressEmitter.fire({
				type: "execution",
				subType: "outputCreated",
				outputUri: outputFileUri.path,
				message: `Created output file: ${path.basename(outputFileUri.path)}`,
			})
		} catch (error) {
			vscode.window.showErrorMessage(`Error processing file ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	/**
	 * Validates the output data. Override to implement custom validation logic.
	 */
	validateOutput(config: TransformerConfig, data: string): boolean {
		return true
	}

	/**
	 * Writes the processed data to the specified file path.
	 * Override to customize the writing process.
	 */
	async writeOutput(data: string, filePathUri: vscode.Uri, config: TransformerConfig): Promise<vscode.Uri> {
		await vscode.workspace.fs.writeFile(filePathUri, Buffer.from(data))
		return filePathUri
	}

	/**
	 * Sends the prompt to the LLM client and retrieves the response.
	 */
	async sendToLLM(prompt: string, config: TransformerConfig): Promise<string> {
		const llmClient = new LLMClient()
		logOutputChannel.info("Sending request to LLM:", (await llmClient.getSelectedAiProvider()).toString())
		try {
			var options = {
				temperature: config.temperature,
			}
			return await llmClient.sendRequest(prompt, options)
		} catch (error) {
			console.error("Error sending request to LLM:", error)
			return `Error sending request to LLM: ${error instanceof Error ? error.message : String(error)}`
		}
	}
}
