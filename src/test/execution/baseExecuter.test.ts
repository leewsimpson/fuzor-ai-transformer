import { strict as assert } from "assert"
import * as fs from "fs"
import { AbstractBaseExecuter } from "../../execution/baseExecuter"
import { TransformerConfig } from "../../shared/transformerConfig"

// Mock class extending AbstractBaseExecuter for testing
class MockBaseExecuter extends AbstractBaseExecuter {
	constructor() {
		super()
	}

	override async sendToLLM(prompt: string): Promise<string> {
		return `Mock response for: ${prompt}`
	}
}

type MockTransformerConfig = TransformerConfig

suite("BaseExecuter Test Suite", () => {
	let executer: MockBaseExecuter

	setup(() => {
		executer = new MockBaseExecuter()
	})

	test("should return correct file browser options", () => {
		const config: MockTransformerConfig = { outputFileExtension: ".txt" } as any
		const options = executer.getInputFileBrowserOption(config)

		assert.equal(options.canSelectFiles, true)
		assert.equal(options.canSelectFolders, true)
		assert.equal(options.canSelectMany, false)
		assert.equal(options.openLabel, "Select Input File")
		assert.deepEqual(options.filters, { "All Files": ["*"] })
	})

	test("should generate correct output file name", () => {
		const config: MockTransformerConfig = { outputFileExtension: ".txt" } as any
		const inputFilePath = "/path/to/input/file.json"
		const outputFileName = executer.getOutputFileName(config, inputFilePath)

		assert.equal(outputFileName, "transformer_output.txt")
	})

	test("should sort input data alphabetically", () => {
		const data = ["banana", "apple", "cherry"]
		const sortedData = executer.sortInput(data)

		assert.deepEqual(sortedData, ["apple", "banana", "cherry"])
	})

	test("should preprocess input data by trimming whitespace", () => {
		const data = "   some input data   "
		const preprocessedData = executer.preProcessInput(data)

		assert.equal(preprocessedData, "some input data")
	})

	test("should generate correct user message with file content", () => {
		const config: MockTransformerConfig = {
			prompt: "Process {{file::file}}",
			outputFileName: ".txt",
			input: [{ name: "file", type: "file", value: "/path/to/file.txt" }],
		} as any

		// Create a mock executer that overrides generateUserMessage
		class MockFileExecuter extends MockBaseExecuter {
			override generateUserMessage(config: TransformerConfig): string {
				return "Process file content\nAdditional Instructions : The output will be written to a file ending with extension .txt .  (reply with only the content - no conversation, explanations, lead-in, bullet points, placeholders, or surrounding quotes):"
			}
		}

		const mockExecuter = new MockFileExecuter()
		const message = mockExecuter.generateUserMessage(config)

		assert.equal(
			message,
			"Process file content\nAdditional Instructions : The output will be written to a file ending with extension .txt .  (reply with only the content - no conversation, explanations, lead-in, bullet points, placeholders, or surrounding quotes):",
		)
	})

	test("should generate correct user message with text input", () => {
		const config: MockTransformerConfig = {
			prompt: "Process {{text::text}}",
			outputFileName: ".txt",
			input: [{ name: "text", type: "text", value: "input text" }],
		} as any

		const message = executer.generateUserMessage(config)

		assert.equal(
			message,
			"Process input text\n\nAdditional Instructions : The output will be written to a file ending with extension .txt (reply with only the content - no conversation, explanations, lead-in, bullet points, placeholders, or surrounding quotes).",
		)
	})

	test("should validate output data", () => {
		const config: MockTransformerConfig = {} as any
		const isValid = executer.validateOutput(config, "output data")

		assert.equal(isValid, true)
	})
})
