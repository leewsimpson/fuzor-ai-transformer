import React, { useState, useEffect } from 'react';
import { TransformerConfig } from '../../../../src/shared/transformerConfig';

interface ViewTransformerProps {
  config: TransformerConfig;
  isExecuting: boolean;
  onEdit: () => void;
  onExecute: () => void;
  onStop: () => void;
  handleOpenFileDialogClick: (name: string, isOutput: boolean) => void;
  onPreview: () => void;
}

const ViewTransformer: React.FC<ViewTransformerProps> = ({
  config,
  isExecuting,
  onEdit,
  onExecute,
  onStop,
  handleOpenFileDialogClick,
  onPreview
}) => {
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});
console.log('config', config);
  useEffect(() => {
    // Initialize input values from config
    const initialValues = config.input?.reduce((acc, input) => {
      acc[input.name] = input.value || '';
      return acc;
    }, {} as { [key: string]: string });
    setInputValues(initialValues || {});
  }, [config]);

  const handlePreview = () => {
    // Update config with current values
    const updatedInputs = config.input?.map(input => ({
      ...input,
      value: inputValues[input.name] || ''
    }));
    if (updatedInputs) {
      config.input = updatedInputs;
    }
    onPreview();
  };
  const handleExecute = () => {
    // Update config with current values
    const updatedInputs = config.input?.map(input => ({
      ...input,
      value: inputValues[input.name] || ''
    }));
    if (updatedInputs) {
      config.input = updatedInputs;
    }
    onExecute();
  };
  const handleOpenDialogue = (fieldName: string, isOutput: boolean) => {
    // Update config with current values
    const updatedInputs = config.input?.map(input => ({
      ...input,
      value: inputValues[input.name] || ''
    }));
    if (updatedInputs) {
      config.input = updatedInputs;
    }
    handleOpenFileDialogClick(fieldName, isOutput);
  }
  return (
    <div className="space-y-4">
      <div className="bg-[var(--vscode-editor-background)] p-4 rounded-lg shadow-md flex flex-col space-y-4">
        <div className="flex flex-col">
          <h3 className="text-xl font-semibold text-[var(--vscode-foreground)] mb-1">
            {config.name}
          </h3>
          <p className="text-sm text-[var(--vscode-descriptionForeground)]">
            {config.description}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className="flex items-center space-x-2 cursor-pointer group"
              onClick={isExecuting ? onStop : handleExecute}
            >
              <span
                className={`w-8 h-8 codicon ${isExecuting ? 'codicon-stop-circle animate-spin' : 'codicon-play'
                  } text-xl ${isExecuting ? 'text-red-500' : 'text-[var(--vscode-foreground)]'
                  } flex justify-center items-center p-2 rounded-full group-hover:text-[var(--vscode-button-hoverBackground)]`}
                title={isExecuting ? "Stop" : "Execute"}
              ></span>
              <span className="text-sm text-[var(--vscode-foreground)] group-hover:text-[var(--vscode-button-hoverBackground)]">
                {isExecuting ? "Stop" : "Execute"}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="flex items-center space-x-2 cursor-pointer group"
              onClick={handlePreview}
            >
              <span
                className="w-8 h-8 codicon codicon-open-preview text-xl text-[var(--vscode-foreground)] flex justify-center items-center p-2 rounded-full group-hover:text-[var(--vscode-button-hoverBackground)]"
                title="Preview"
              ></span>
              <span className="text-sm text-[var(--vscode-foreground)] group-hover:text-[var(--vscode-button-hoverBackground)]">Preview</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="flex items-center space-x-2 cursor-pointer group"
            >
              <span
                className="w-8 h-8 codicon codicon-folder-opened text-xl text-[var(--vscode-foreground)] flex justify-center items-center p-2 rounded-full group-hover:text-[var(--vscode-button-hoverBackground)]"
                title="Test"
              ></span>
              <span className="text-sm text-[var(--vscode-foreground)] group-hover:text-[var(--vscode-button-hoverBackground)]">Test</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className="flex items-center space-x-2 cursor-pointer group"
              onClick={onEdit}
            >
              <span
                className="w-8 h-8 codicon codicon-edit text-xl text-[var(--vscode-foreground)] flex justify-center items-center p-2 rounded-full group-hover:text-[var(--vscode-button-hoverBackground)]"
                title="Edit"
              ></span>
              <span className="text-sm text-[var(--vscode-foreground)] group-hover:text-[var(--vscode-button-hoverBackground)]">Edit</span>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2 bg-[var(--vscode-editor-background)] p-4 rounded-lg shadow-md">
        <h4 className="mb-2 text-lg font-semibold text-[var(--vscode-foreground)]">Inputs</h4>
        {config.input?.map((input) => (
          <div key={input.name} className="flex items-center justify-between w-full py-2">
            <div className="flex flex-col w-full space-y-2">

              {/* Render input based on type */}
              {input.type === "file" || input.type === "folder" || input.type === "FileBrowser" || input.type === "string" || input.type === "input"  ? (
                <div className="flex items-center w-full">
                  <label className="font-medium text-[var(--vscode-foreground)] w-[15%]">{input.name}:</label>
                  <input
                    className="w-[75%] px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
                    type="text"
                    value={input.value || ""}
                    readOnly
                  />
                  <span
                    className="w-[10%] px-2 py-1 text-[var(--vscode-foreground)] hover:text-[var(--vscode-button-hoverBackground)] cursor-pointer flex items-center justify-center ml-2"
                    onClick={() => handleOpenDialogue(input.name, false)}
                  >
                    <span className="text-xl codicon codicon-folder-opened"></span>
                  </span>
                </div>
              ) : input.type === "text" ? (
                <div className="flex items-center w-full">
                  <label className="font-medium text-[var(--vscode-foreground)] w-[15%]">{input.name}:</label>
                  <input
                    className="w-[85%] px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
                    type="text"
                    value={inputValues[input.name] || ""}
                    onChange={(e) =>
                      setInputValues(prev => ({
                        ...prev,
                        [input.name]: e.target.value
                      }))
                    }
                  />
                </div>
              ) : input.type === "textarea" || input.type === "textArea" ? (
                <div className="flex items-center w-full">
                  <label className="font-medium text-[var(--vscode-foreground)] w-[15%]">{input.name}:</label>
                  <textarea
                    className="w-[85%] px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
                    value={inputValues[input.name] || ""}
                    onChange={(e) =>
                      setInputValues(prev => ({
                        ...prev,
                        [input.name]: e.target.value
                      }))
                    }
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <label className="font-medium text-[var(--vscode-foreground)] w-[15%]">{input.name}:</label>
                  <span className="text-[var(--vscode-foreground)]">Unsupported input type</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 bg-[var(--vscode-editor-background)] p-4 rounded-lg shadow-md">
        <h4 className="mb-2 text-lg font-semibold text-[var(--vscode-foreground)]">Outputs</h4>
        <div className="flex items-center justify-between w-full py-2">
          <div className="flex items-center w-full">
            <span className="font-medium text-[var(--vscode-foreground)] w-[15%]">Folder:</span>
            <input
              className="w-[75%] px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
              type="text"
              value={config.outputFolder || ""}
              readOnly
            />
            <span
              className="w-[10%] px-2 py-1 text-[var(--vscode-foreground)] hover:text-[var(--vscode-button-hoverBackground)] cursor-pointer flex items-center justify-center ml-2"
              onClick={() => handleOpenDialogue('outputFolder', true)}
            >
              <span className="text-xl codicon codicon-folder-opened"></span>
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[var(--vscode-editor-background)] p-4 rounded-lg shadow-md">
        <div className="flex items-center w-full space-x-4">
          <span className="font-medium text-[var(--vscode-foreground)] w-[15%]">Prompt:</span>
          <div
            className="w-[85%] text-[var(--vscode-foreground)] whitespace-pre-wrap bg-transparent h-64 overflow-y-auto p-2 px-2 py-1 border border-[var(--vscode-input-border)] rounded"
          >
            {config.prompt.split(/(\{\{[^}]+\}\})/).map((part, i) => (
              <span
                key={i}
                className={part.startsWith('{{') && part.endsWith('}}') ? 'text-green-600' : ''}
              >
                {part}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTransformer;
