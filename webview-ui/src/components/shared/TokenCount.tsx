import React, { useMemo } from "react"

interface TokenCountProps {
	text: string
}

export const TokenCount: React.FC<TokenCountProps> = ({ text }) => {
	const tokenCount = useMemo(() => Math.ceil(text.length / 4), [text])

	return (
		// Return nothing if token count is 0
		tokenCount === 0 ? null : (
			<div className="flex items-center justify-end gap-1 text-xs">
				<span className="italic text-[var(--vscode-descriptionForeground)]">Tokens:</span>
				<span className="font-medium text-[var(--vscode-button-foreground)]">~{tokenCount}</span>
			</div>
		)
	)
}
