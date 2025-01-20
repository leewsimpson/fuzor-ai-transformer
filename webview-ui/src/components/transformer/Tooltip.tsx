import React from 'react';

interface TooltipProps {
  description: string;
}

const Tooltip: React.FC<TooltipProps> = ({ description }) => {
  return (
    <span className="relative group" >
      <span className="codicon codicon-info text-[var(--vscode-foreground)] cursor-pointer hover:text-[var(--vscode-button-hoverBackground)]" />
      <span className="absolute left-full ml-2 hidden group-hover:block px-2 py-1 text-sm text-[var(--vscode-foreground)] bg-[var(--vscode-editor-background)] rounded shadow break-words whitespace-normal" style={{ width: 300 }}>
        {description}
      </span>
    </span>
  );
};

export default Tooltip;
