export class Uri {
	scheme = "file"
	authority = ""
	path: string
	query = ""
	fragment = ""
	fsPath: string

	static file(path: string): Uri {
		return new Uri(path)
	}

	constructor(path: string) {
		this.path = path
		this.fsPath = path
	}

	toString(): string {
		return this.path
	}

	with(change: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): Uri {
		return this
	}

	toJSON(): any {
		return {
			scheme: this.scheme,
			authority: this.authority,
			path: this.path,
			query: this.query,
			fragment: this.fragment,
		}
	}
}

export enum ExtensionMode {
	Production = 1,
	Development = 2,
	Test = 3,
}

export enum ExtensionKind {
	UI = 1,
	Workspace = 2,
}

export class CancellationToken {
	isCancellationRequested = false
	onCancellationRequested = () => ({ dispose: () => {} })
}

export class WebviewViewResolveContext {
	state = {}
}

export class Webview {
	html = ""
	options = {}
	onDidReceiveMessage = () => ({ dispose: () => {} })
	postMessage = async (message: any) => true
	asWebviewUri = (uri: Uri): Uri => uri
	cspSource = "default-src"
}

export class WebviewView {
	webview = new Webview()
	viewType = "test-view"
	title = "Test View"
	description = ""
	visible = true
	show = () => {}
	onDidDispose = () => ({ dispose: () => {} })
	onDidChangeVisibility = () => ({ dispose: () => {} })
}

export interface LanguageModelChat {
	name: string
}

export interface LanguageModelAccessInformation {
	keyType: string
	subscriptionId: string
	onDidChange: () => { dispose: () => void }
	canSendRequest: (chat: LanguageModelChat) => boolean | undefined
}

export class ExtensionContext {
	languageModelAccessInformation: LanguageModelAccessInformation = {
		keyType: "test",
		subscriptionId: "test",
		onDidChange: () => ({ dispose: () => {} }),
		canSendRequest: () => true,
	}
	extensionUri: Uri
	subscriptions: any[] = []
	workspaceState = {
		get: () => undefined,
		update: () => Promise.resolve(),
		keys: () => [],
	}
	globalState = {
		get: () => undefined,
		update: () => Promise.resolve(),
		setKeysForSync: () => {},
		keys: () => [],
	}
	secrets = {
		get: () => Promise.resolve(undefined),
		store: () => Promise.resolve(),
		delete: () => Promise.resolve(),
		onDidChange: () => ({ dispose: () => {} }),
	}
	extensionPath: string
	asAbsolutePath = (path: string) => path
	storagePath: string
	globalStoragePath: string
	logPath: string
	extensionMode = ExtensionMode.Test
	environmentVariableCollection = {
		persistent: false,
		append: () => {},
		clear: () => {},
		delete: () => {},
		forEach: () => {},
		get: () => undefined,
		prepend: () => {},
		replace: () => {},
		getScoped: () => ({
			persistent: false,
			append: () => {},
			clear: () => {},
			delete: () => {},
			forEach: () => {},
			get: () => undefined,
			prepend: () => {},
			replace: () => {},
			description: "Test Scoped Environment Variables",
			[Symbol.iterator]: function* () {
				yield* []
			},
		}),
		description: "Test Environment Variables",
		[Symbol.iterator]: function* () {
			yield* []
		},
	}
	storageUri: Uri
	globalStorageUri: Uri
	logUri: Uri
	extension = {
		id: "test-extension",
		extensionUri: Uri.file(""),
		extensionPath: "",
		isActive: true,
		packageJSON: {},
		exports: undefined,
		activate: () => Promise.resolve(),
		extensionKind: ExtensionKind.UI,
	}

	constructor(basePath: string) {
		this.extensionUri = Uri.file(basePath)
		this.extensionPath = basePath
		this.storagePath = basePath + "/storage"
		this.globalStoragePath = basePath + "/globalStorage"
		this.logPath = basePath + "/logs"
		this.storageUri = Uri.file(this.storagePath)
		this.globalStorageUri = Uri.file(this.globalStoragePath)
		this.logUri = Uri.file(this.logPath)
	}
}

export const window = {
	showInformationMessage: () => Promise.resolve(),
	showErrorMessage: () => Promise.resolve(),
	createWebviewPanel: () => ({
		webview: new Webview(),
		reveal: () => {},
		dispose: () => {},
	}),
	createOutputChannel: () => ({
		show: () => {},
		appendLine: () => {},
		clear: () => {},
	}),
}

export const commands = {
	registerCommand: () => ({ dispose: () => {} }),
	executeCommand: () => Promise.resolve(),
}

export const workspace = {
	fs: {
		readFile: () => Promise.resolve(Buffer.from("")),
		writeFile: () => Promise.resolve(),
		delete: () => Promise.resolve(),
	},
}
