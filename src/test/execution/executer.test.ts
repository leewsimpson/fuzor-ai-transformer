import * as assert from "assert"
import { AbstractBaseExecuter } from "../../execution/baseExecuter"
import { TransformerConfig } from "../../shared/transformerConfig"

class TestExecuter extends AbstractBaseExecuter {}

suite("Executer Test Suite", () => {
	let executer: TestExecuter

	setup(() => {
		executer = new TestExecuter()
	})

	test("should handle wildcard in output filename", () => {
		const config: TransformerConfig = {
			id: "test-transformer",
			name: "Test Transformer",
			description: "Test description",
			prompt: "Test prompt {{content::file}}",
			input: [
				{
					name: "fileInput",
					type: "file",
					value: "/path/to/input/abc.txt",
					description: "Test input file",
					required: true,
				},
			],
			outputFolder: "output/",
			outputFileName: "*_out.md",
			temperature: 0.7,
			processFormat: "eachFile",
		}

		const result = executer.getOutputFileName(config, "/path/to/input/abc.txt")
		assert.strictEqual(result, "abc_out.md")
	})

	test("should handle wildcard with no file input", () => {
		const config: TransformerConfig = {
			id: "test-transformer",
			name: "Test Transformer",
			description: "Test description",
			prompt: "Test prompt {{content::file}}",
			input: [],
			outputFolder: "output/",
			outputFileName: "*_out.md",
			temperature: 0.7,
			processFormat: "eachFile",
		}

		const result = executer.getOutputFileName(config, "/path/to/input/abc.txt")
		assert.strictEqual(result, "transformer_output_out.md")
	})

	test("should fallback to default filename when no wildcard", () => {
		const config: TransformerConfig = {
			id: "test-transformer",
			name: "Test Transformer",
			description: "Test description",
			prompt: "Test prompt {{content::file}}",
			input: [],
			outputFolder: "output/",
			outputFileName: "output.txt",
			temperature: 0.7,
			processFormat: "eachFile",
		}

		const result = executer.getOutputFileName(config, "/path/to/input/abc.txt")
		assert.strictEqual(result, "output.txt")
	})

	test("should handle filename starting with dot", () => {
		const config: TransformerConfig = {
			id: "test-transformer",
			name: "Test Transformer",
			description: "Test description",
			prompt: "Test prompt {{content::file}}",
			input: [],
			outputFolder: "output/",
			outputFileName: ".txt",
			temperature: 0.7,
			processFormat: "eachFile",
		}

		const result = executer.getOutputFileName(config, "/path/to/input/abc.txt")
		assert.strictEqual(result, "transformer_output.txt")
	})

	test("should handle empty outputFileName", () => {
		const config: TransformerConfig = {
			id: "test-transformer",
			name: "Test Transformer",
			description: "Test description",
			prompt: "Test prompt {{content::file}}",
			input: [],
			outputFolder: "output/",
			outputFileName: "",
			temperature: 0.7,
			processFormat: "eachFile",
		}

		const result = executer.getOutputFileName(config, "/path/to/input/abc.txt")
		assert.strictEqual(result, "transformer_output.txt")
	})

	test("should handle undefined outputFileName", () => {
		const config: TransformerConfig = {
			id: "test-transformer",
			name: "Test Transformer",
			description: "Test description",
			prompt: "Test prompt {{content::file}}",
			input: [],
			outputFolder: "output/",
			outputFileName: null,
			temperature: 0.7,
			processFormat: "eachFile",
		}

		const result = executer.getOutputFileName(config, "/path/to/input/abc.txt")
		assert.strictEqual(result, "transformer_output.txt")
	})
})
