export function countTokens(text: string): number {
	return Math.ceil(text.length / 4)
	//TODO change to tiktoken if someone requests it
}
