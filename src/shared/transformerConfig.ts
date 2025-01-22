import { Transform } from "stream"

export interface Input {
	name: string
	description: string
	type: string
	value: string
	required: boolean
	options?: string | null
}

export interface FuzorItem {
	type: "transformer" | "folder"
	folder?: FuzorFolder
	config?: TransformerConfig
}

export interface FuzorFolder {
	id: string
	name: string
	description?: string
	parentFolderId?: string | null
}

export interface TransformerConfig {
	id: string
	name: string
	description: string
	prompt: string
	input: Input[]
	outputFolder: string
	outputFileName: string | null
	temperature: number
	processFormat: "eachFile" | "joinFiles"
	parentFolderId?: string | null
}
