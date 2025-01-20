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
	config?: TransformerConfig
	prompt?: string
	library?: TransformerLibrary
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
	config?: TransformerConfig
	isOutput?: boolean
	fieldName?: string
	prompt?: string
	data?: string
}
