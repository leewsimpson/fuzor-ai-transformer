import { TransformerConfig } from "./transformerConfig"
import { TransformerLibrary } from "./transformerLibrary"

export interface WebViewCommand {
	type:
		| "editTransformer"
		| "viewTransformer"
		| "openPromptInEditor"
		| "updatePrompt"
		| "executionStarted"
		| "executionStopped"
		| "executionFinished"
		| "viewTransfomerLibrary"
		| "validationResult"
	config?: TransformerConfig
	prompt?: string
	library?: TransformerLibrary
	data?: string
}

export interface ExtensionCommand {
	type:
		| "ready"
		| "executeTransformer"
		| "openFileDialog"
		| "alert"
		| "selectTransformer"
		| "execute"
		| "stopExecution"
		| "save"
		| "enhancePrompt"
		| "previewLLMRequest"
		| "openPromptInEditor"
		| "saveTransformer"
		| "importTransformer"
		| "validateConfig"
	config?: TransformerConfig
	isOutput?: boolean
	fieldName?: string
	prompt?: string
	data?: string
}
