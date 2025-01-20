import React, { useEffect, useState } from 'react';
import { TransformerConfig } from '../../../../src/shared/transformerConfig';
import { WebViewCommand } from '../../../../src/shared/commands';
import ViewTransformer from './viewTransformer';
import EditTransformer from './editTransformer';
import { vscode } from '../../utils/vscode';

const ManageTransformerView: React.FC = () => {
  const [config, setConfig] = useState<TransformerConfig | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message: WebViewCommand = event.data;
      console.log('Received message in manageTransformerView:', message);
      switch (message.type) {
        case 'viewTransformer':
          setConfig(message.config || null);
          setIsEditing(false);
          break;
        case 'editTransformer':
          setConfig(message.config || null);
          setIsEditing(true);
          break;
        case 'executionStarted':
          setIsExecuting(true);
          break;
        case 'executionStopped':
        case 'executionFinished':
          setIsExecuting(false);
          break;
        case 'updatePrompt':
          setConfig(prevConfig => {
            if (!prevConfig) return null;
            return {
              ...prevConfig,
              prompt: message.prompt || '',
            };
          });
          setIsEditing(true);
          break;  
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleEdit = () => {
    if (!config) return;
    console.log('handleEdit invoked');
    setIsEditing(true);
  };

  const handleExecute = () => {
    if (!config) return;
    console.log('handleExecute invoked');
    vscode.postMessage({ type: 'executeTransformer', config});
  };

  const handleStop = () => {
    console.log('handleStop invoked');
    vscode.postMessage({ 
      type: 'stopExecution'
    });
  };

  const handlePreview = () => {
    if (!config) return;
    console.log('handlePreview invoked');
    vscode.postMessage({ 
      type: 'previewLLMRequest',
      config
    });
  };

  const handleOpenFileDialogClick = (name: string, isOutput: boolean) => {
    if (!config) return;
    console.log('handleOpenFileDialogClick invoked');
    vscode.postMessage({ type: 'openFileDialog', config, isOutput, fieldName: name });
  };

  const handleEnhancePrompt = (name:string,description:string,prompt:string) => {
    if (!config) return;
    let data = {name,description,prompt};
    vscode.postMessage({ type: 'enhancePrompt', config, data: JSON.stringify(data) });
  };

  const handleOpenInEditor = (prompt: string) => {
    if (!config) return;
    vscode.postMessage({ type: 'openPromptInEditor', config, prompt });
  };

  if (!config) {
    return (
      <div className="p-10">
        <p className="text-xl font-semibold text-white/80">
          Waiting for transformer configuration...
        </p>
      </div>
    );
  }

  return isEditing ? (
    <EditTransformer
      config={config!}
      onSave={(updatedConfig) => {
        vscode.postMessage({ type: 'saveTransformer', config: updatedConfig });
      }}
      onCancel={() => setIsEditing(false)}
      handleEnhancePrompt={handleEnhancePrompt}
      handleOpenInEditor={handleOpenInEditor}
    />
  ) : (
    <ViewTransformer
      config={config}
      isExecuting={isExecuting}
      onEdit={handleEdit}
      onExecute={handleExecute}
      onStop={handleStop}
      handleOpenFileDialogClick={handleOpenFileDialogClick}
      onPreview={handlePreview}
    />
  );
};

export default ManageTransformerView;
