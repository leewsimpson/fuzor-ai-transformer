import { strict as assert } from "assert"
import * as sinon from "sinon"
import * as vscode from "vscode"
import { isValidFilePath, isValidFolderPath, getAbsolutePath, readFileContents } from "../../utils/fileUtils"

suite("FileUtils Test Suite", () => {
	let sandbox: sinon.SinonSandbox

	setup(() => {
		sandbox = sinon.createSandbox()
	})

	teardown(() => {
		sandbox.restore()
	})

	test("isValidFilePath should return false for null or empty path", () => {
		assert.equal(isValidFilePath(""), false)
		assert.equal(isValidFilePath(null as unknown as string), false)
	})

	test("isValidFilePath should return false when file does not exist", () => {
		sandbox.stub(require("fs"), "existsSync").returns(false)
		assert.equal(isValidFilePath("/test/path"), false)
	})

	test("isValidFilePath should return false when path is a directory", () => {
		sandbox.stub(require("fs"), "existsSync").returns(true)
		sandbox.stub(require("fs"), "statSync").returns({ isFile: () => false })
		assert.equal(isValidFilePath("/test/path"), false)
	})

	test("isValidFilePath should return true for valid file path", () => {
		sandbox.stub(require("fs"), "existsSync").returns(true)
		sandbox.stub(require("fs"), "statSync").returns({ isFile: () => true })
		assert.equal(isValidFilePath("/test/path"), true)
	})

	test("isValidFolderPath should return false for null or empty path", () => {
		assert.equal(isValidFolderPath(""), false)
		assert.equal(isValidFolderPath(null as unknown as string), false)
	})

	test("isValidFolderPath should return false when folder does not exist", () => {
		sandbox.stub(require("fs"), "existsSync").returns(false)
		assert.equal(isValidFolderPath("/test/path"), false)
	})

	test("isValidFolderPath should return false when path is a file", () => {
		sandbox.stub(require("fs"), "existsSync").returns(true)
		sandbox.stub(require("fs"), "statSync").returns({ isDirectory: () => false })
		assert.equal(isValidFolderPath("/test/path"), false)
	})

	test("isValidFolderPath should return true for valid folder path", () => {
		sandbox.stub(require("fs"), "existsSync").returns(true)
		sandbox.stub(require("fs"), "statSync").returns({ isDirectory: () => true })
		assert.equal(isValidFolderPath("/test/path"), true)
	})

	test("getAbsolutePath should return input path if already absolute", () => {
		sandbox.stub(require("path"), "isAbsolute").returns(true)
		assert.equal(getAbsolutePath("/absolute/path"), "/absolute/path")
	})

	test("getAbsolutePath should return null when no workspace folders", () => {
		sandbox.stub(require("path"), "isAbsolute").returns(false)
		sandbox.stub(vscode.workspace, "workspaceFolders").value(undefined)
		assert.equal(getAbsolutePath("relative/path"), null)
	})

	test("getAbsolutePath should join workspace root with relative path", () => {
		sandbox.stub(require("path"), "isAbsolute").returns(false)
		sandbox.stub(require("path"), "join").returns("/workspace/root/relative/path")
		sandbox.stub(vscode.workspace, "workspaceFolders").value([{ uri: { fsPath: "/workspace/root" } }])
		assert.equal(getAbsolutePath("relative/path"), "/workspace/root/relative/path")
	})

	test("readFileContents should throw error for invalid absolute path", async () => {
		sandbox.stub(require("path"), "isAbsolute").returns(false)
		sandbox.stub(require("fs"), "existsSync").returns(false)

		await assert.rejects(readFileContents("/invalid/path"), { message: "Invalid file path" })
	})

	test("readFileContents should return file contents for valid file", async () => {
		const expectedContent = "file contents"
		sandbox.stub(require("path"), "isAbsolute").returns(true)
		sandbox.stub(require("fs"), "existsSync").returns(true)
		sandbox.stub(require("fs"), "statSync").returns({ isFile: () => true })
		sandbox.stub(require("fs"), "lstatSync").returns({ isDirectory: () => false })
		sandbox.stub(require("fs"), "readFileSync").resolves(expectedContent)

		const content = await readFileContents("/valid/file.txt")
		assert.equal(content, expectedContent)
	})
})
