import React from 'react';
import { TransformerLibrary } from '../../../../src/shared/transformerLibrary';
import { TransformerConfig } from '../../../../src/shared/transformerConfig';
import { vscode } from '../../utils/vscode';

const TransformerList: React.FC<{ transformers: TransformerLibrary }> = ({ transformers }) => {
  const transformerConfigs: TransformerConfig[] = [];

  Object.entries(transformers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (typeof item === 'object' && 'id' in item) {
          transformerConfigs.push(item as TransformerConfig);
        }
      });
    } else if (typeof value === 'object' && 'id' in value) {
      transformerConfigs.push(value as TransformerConfig);
    }
  });

  const handleImport = (transformer: TransformerConfig) => {
    vscode.postMessage({
      type: 'importTransformer',
      config: transformer,
    });
  };

  return (
    <div className="w-full p-4">
      {transformerConfigs.length === 0 ? (
        <div className="p-4 text-center text-gray-500">Select a folder</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {transformerConfigs.map((transformer: TransformerConfig) => (
            <div
              key={transformer.id}
              className="flex flex-col h-full p-4 transition-shadow bg-white rounded-lg shadow-sm dark:bg-gray-800 hover:shadow-md"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[var(--vscode-foreground)] codicon codicon-symbol-event"></span>
                <h3 className="font-semibold text-[var(--vscode-foreground)]">
                  {transformer.name}
                </h3>
              </div>
              <div className="flex-1 mb-4 overflow-y-auto">
                <p className="text-sm text-[var(--vscode-descriptionForeground)]">
                  {transformer.description}
                </p>
              </div>
              <div className="mt-auto">
                <button
                  className="flex items-center justify-center w-full gap-2 px-4 py-2 text-[var(--vscode-button-foreground)] transition-colors bg-[var(--vscode-button-background)] rounded-md hover:bg-[var(--vscode-button-hoverBackground)]"
                  onClick={() => handleImport(transformer)}
                >
                  <span className="codicon codicon-cloud-download"></span>
                  <span>Import</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransformerList;
