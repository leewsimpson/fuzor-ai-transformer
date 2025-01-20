import React, { useState, useEffect } from 'react';
import { TransformerConfig } from '../../../../src/shared/transformerConfig';
import Tooltip from './Tooltip';

interface EditTransformerProps {
  config: TransformerConfig;
  onSave: (config: TransformerConfig) => void;
  onCancel: () => void;
  handleEnhancePrompt: (name:string,description:string,prompt:string) => void;
  handleOpenInEditor: (prompt: string) => void;
}

const EditTransformer: React.FC<EditTransformerProps> = ({ config, onSave, onCancel, handleEnhancePrompt, handleOpenInEditor }) => {
  const [name, setName] = useState(config.name || '');
  const [description, setDescription] = useState(config.description || '');
  const [prompt, setPrompt] = useState(config.prompt || '');

  // Update states when config prop changes
  useEffect(() => {
    setName(config.name || '');
    setDescription(config.description || '');
    setPrompt(config.prompt || '');
    setTemperature(config.temperature || 0.7);
    setProcessFormat(config.processFormat || 'eachFile');
    setOutputFileName(config.outputFileName || '');
  }, [config]);

  const [temperature, setTemperature] = useState(config.temperature || 0.7);
  const [processFormat, setProcessFormat] = useState(config.processFormat || 'eachFile');
  const [outputFileName, setOutputFileName] = useState(config.outputFileName || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...config,
      name,
      description,
      prompt,
      temperature,
      processFormat,
      outputFileName
    });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="bg-[var(--vscode-editor-background)] p-4 rounded-lg shadow-md">
        <h4 className="text-xl font-semibold text-[var(--vscode-foreground)] mb-4">Edit Transformer</h4>

        <div className="mb-4 form-group">
          <div className="flex items-center gap-1 mb-1">
            <Tooltip description="The name of the transformer that will be displayed in the UI" />
            <label className="block text-sm font-medium text-[var(--vscode-foreground)]">Name:</label>
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
            required
          />
        </div>

        <div className="mb-4 form-group">
          <div className="flex items-center gap-1 mb-1">
            <Tooltip description="A brief description of what this transformer does" />
            <label className="block text-sm font-medium text-[var(--vscode-foreground)]">Description:</label>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
            rows={3}
          />
        </div>

        <div className="mb-4 form-group">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Tooltip description="The AI prompt that will be used to transform the input files. Must include placeholders in format {{name}} or {{name::type}}. Valid types: file, folder, string, text, textArea. Placeholder names must be unique, alphanumeric, and cannot contain spaces. Maximum 1 folder placeholder allowed." />
              <label className="text-sm font-medium text-[var(--vscode-foreground)]">Prompt:</label>
            </div>
            <div className="flex gap-2">
            <span
              className="codicon codicon-editor-layout text-xl text-[var(--vscode-foreground)] hover:text-[var(--vscode-button-hoverBackground)] cursor-pointer p-1 rounded relative group"
              title="Preview"
              onClick={() => handleOpenInEditor(prompt)}
            >
              <span className="absolute bottom-full mb-2 hidden group-hover:block px-2 py-1 text-sm text-[var(--vscode-foreground)] bg-[var(--vscode-editor-background)] rounded shadow">
                Open in Editor
              </span>
            </span>
            <span
              className="codicon codicon-sparkle text-xl text-[var(--vscode-foreground)] hover:text-[var(--vscode-button-hoverBackground)] cursor-pointer p-1 rounded relative group"
              title="Preview"
              onClick={() => handleEnhancePrompt(name,description,prompt)}
            >
              <span className="absolute bottom-full mb-2 hidden group-hover:block px-2 py-1 text-sm text-[var(--vscode-foreground)] bg-[var(--vscode-editor-background)] rounded shadow">
              Enhance Prompt
              </span>
            </span>
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
            rows={6}
          />
        </div>

        <div className="mb-4 form-group">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Tooltip description="Controls the randomness of the AI's output (0 = deterministic, 2 = very random)" />
              <label className="text-sm font-medium text-[var(--vscode-foreground)]">Temperature:</label>
            </div>
            <div className="text-sm text-[var(--vscode-foreground)]">
              {temperature.toFixed(1)}
            </div>
          </div>
          <input
            type="range"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            min="0"
            max="2"
            step="0.1"
            className="w-full px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
          />
        </div>

        <div className="hidden mb-4 form-group">
          <label className="block text-sm font-medium text-[var(--vscode-foreground)] mb-1">Process Format:</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="eachFile"
                checked={processFormat === 'eachFile'}
                onChange={() => setProcessFormat('eachFile')}
                className="mr-2"
              />
              <span className="text-[var(--vscode-foreground)]">Each File</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="joinFiles"
                checked={processFormat === 'joinFiles'}
                onChange={() => setProcessFormat('joinFiles')}
                className="mr-2"
              />
              <span className="text-[var(--vscode-foreground)]">Join Files</span>
            </label>
          </div>
        </div>

        <div className="mb-4 form-group">
          <div className="flex items-center gap-1 mb-1">
            <Tooltip description="The name of the output file (leave blank to use input file name)" />
            <label className="block text-sm font-medium text-[var(--vscode-foreground)]">Output File Name:</label>
          </div>
          <input
            type="text"
            value={outputFileName}
            onChange={(e) => setOutputFileName(e.target.value)}
            className="w-full px-2 py-1 text-[var(--vscode-foreground)] bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] rounded"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[var(--vscode-foreground)] bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm text-[var(--vscode-foreground)] bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)] rounded"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTransformer;
