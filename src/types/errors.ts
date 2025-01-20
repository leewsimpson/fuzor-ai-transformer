/**
 * Custom error types for the Fuzor AI Transformer extension
 */

export class TransformerError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "TransformerError"
	}
}

export class TransformerNotFoundError extends TransformerError {
	constructor(name: string) {
		super(`Transformer "${name}" not found`)
		this.name = "TransformerNotFoundError"
	}
}

export class TransformerExistsError extends TransformerError {
	constructor(name: string) {
		super(`Transformer "${name}" already exists`)
		this.name = "TransformerExistsError"
	}
}

export class TransformerValidationError extends TransformerError {
	constructor(message: string) {
		super(`Transformer validation failed: ${message}`)
		this.name = "TransformerValidationError"
	}
}
