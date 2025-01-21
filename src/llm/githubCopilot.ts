import { LLMBase, LLMMessage } from "./llmBase"
import { logOutputChannel } from "../extension"
import * as vscode from "vscode"

export class GithubCopilot extends LLMBase {
	constructor(model: string = "copilot") {
		super(model)
	}

	async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
		logOutputChannel.show(true)
		logOutputChannel.info(`Sending request to Github Copilot with model: ${this.model}`)

		let models = await vscode.lm.selectChatModels()

		const MODEL_SELECTOR: vscode.LanguageModelChatSelector = { vendor: "copilot", family: "gpt-4o" }
		const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR)

		if (model) {
			logOutputChannel.info(`Model found in Github Copilot: ${model.name}`)
		} else {
			logOutputChannel.error(
				`No models found in Github Copilot. Check if Github Copilot is enabled in your VSCode settings`,
			)
			throw new Error("No models found in Github Copilot. Check if Github Copilot is enabled in your VSCode settings.")
		}

		// init the chat message
		const messages =
			typeof promptOrMessages === "string"
				? [vscode.LanguageModelChatMessage.User(promptOrMessages)]
				: [vscode.LanguageModelChatMessage.User("Test Prompt")]

		try {
			logOutputChannel.info(`Preparing request payload...`)

			logOutputChannel.error(`Model found in Github Copilot: ${model.name}`)
			// send the messages array to the model and get the response
			let chatResponse = await model.sendRequest(
				messages,
				{
					justification: "Fuzor uses your Github Copilot model as LLM Provider",
				},
				new vscode.CancellationTokenSource().token,
			)

			let accumulatedResponse = ""

			for await (const fragment of chatResponse.text) {
				accumulatedResponse += fragment
			}
			return accumulatedResponse
		} catch (error) {
			if (error instanceof Error) {
				logOutputChannel.error(`Error while sending request to Github Copilot: ${error.message}\nStack: ${error.stack}`)
			} else {
				logOutputChannel.error(`Unknown error sending request to Github Copilot: ${JSON.stringify(error)}`)
			}
			throw error
		}
	}
}
