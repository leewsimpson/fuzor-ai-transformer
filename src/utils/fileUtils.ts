import * as path from "path"
import * as vscode from "vscode"
import * as fs from "fs"
import * as mammoth from "mammoth"

export function isValidFilePath(filePath: string): boolean {
	try {
		let absolutePath = getAbsolutePath(filePath)
		if (!absolutePath || absolutePath === null) {
			return false
		}
		return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()
	} catch {
		return false
	}
}

/**
 * Validates if a folder path exists.
 *
 * @param folderPath - The path to validate
 * @returns true if the path exists and is a directory, false otherwise
 */
export function isValidFolderPath(folderPath: string): boolean {
	try {
		if (!folderPath || folderPath === null) {
			return false
		}

		let absolutePath = getAbsolutePath(folderPath)
		if (!absolutePath || absolutePath === null) {
			return false
		}
		return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isDirectory()
	} catch {
		return false
	}
}

export function getAbsolutePath(filePath: string): string | null {
	if (path.isAbsolute(filePath)) {
		return filePath
	} else {
		// get the workspaceroot and check if the folder exists
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath
		if (!workspaceRoot) {
			return null
		}
		return path.join(workspaceRoot!, filePath)
	}
}

export async function readFileContents(filePath: string): Promise<string> {
	var absolutePath = getAbsolutePath(filePath)
	if (!absolutePath || absolutePath === null) {
		throw new Error("Invalid file path")
	}
	if (!isValidFilePath(absolutePath)) {
		throw new Error(`File ${filePath} does not exist`)
	}
	if (!fs.existsSync(absolutePath)) {
		throw new Error("Input file does not exist")
	}
	const stat = fs.lstatSync(absolutePath)
	if (stat.isDirectory()) {
		throw new Error("Input is a directory. Preview only supports file now")
	}

	// Read the input file content
	const fileExtension = path.extname(filePath).toLowerCase()
	if (fileExtension === ".docx") {
		const result = await mammoth.extractRawText({ path: absolutePath })
		return result.value
	}
	// Read the input file content for other file types
	return fs.readFileSync(absolutePath, "utf8")
}
