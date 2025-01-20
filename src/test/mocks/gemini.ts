import * as sinon from "sinon"

export function createGEMINIAIMock(sandbox: sinon.SinonSandbox) {
	return Promise.resolve({
		response: {
			candidates: [
				{
					content: {
						parts: [
							{
								text: "Mock response",
							},
						],
					},
				},
			],
			usageMetadata: {
				promptTokenCount: 10,
				candidatesTokenCount: 20,
				totalTokenCount: 30,
			},
		},
	})
}

export type GeminiMock = ReturnType<typeof createGEMINIAIMock>
