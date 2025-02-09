# Design Document for VS Code AI Transformers Plugin

## Introduction

The **VS Code AI Transformers Plugin** is an extension that enables AI-powered file transformations directly within Visual Studio Code. It provides a customizable interface for processing files using various AI models, automating complex workflows, and enhancing productivity. This document outlines the architecture, components, and data flow of the plugin to assist new developers in understanding the solution.

## Technology Stack

The plugin is built using the following technologies:

- **TypeScript**: The project is written in TypeScript, with the configuration set to `"module": "Node16"` and `"target": "ES2022"`. This ensures compatibility with modern JavaScript features and Node.js module resolution.

- **React**: The webview UI is built using React, providing a modern and responsive user interface for managing transformers.

- **Mocha and Chai**: The testing framework used is Mocha, with Chai for assertions. Tests focus on high-level behavior and use mocks for VS Code modules.

## Architecture Overview

The plugin is structured into several key components that work together to provide a seamless experience:

### Extension Core (Backend)

- **Extension Host**: Managed by `src/extension.ts`, which contains the `activate` and `deactivate` functions. These functions initialize and clean up resources when the extension is activated or deactivated in VS Code.

- **Configuration Management**: Handled by `src/config/configurationManager.ts`, which manages settings like model names, AI providers, and API keys.

- **Execution Architecture**:

    - **Base Executer**: Abstract implementation in `src/execution/baseExecuter.ts`
    - **Default Executer**: Concrete implementation in `src/execution/defaultExecuter.ts`
    - **Executer Loader**: Dynamic loading system in `src/execution/executerLoader.ts`
    - **Execution Engine**: Main coordinator in `src/execution/executionEngine.ts` handling validation and processing

- **Language Model Integration**: Managed through `src/llm/` directory, providing abstract and concrete implementations for different AI providers (OpenAI, Azure, Gemini, etc.).

### Webview Interface (Frontend)

- **Webview Provider**: Implemented in `src/webviews/ViewEditTransformer.ts`, manages the communication between the extension and the React-based UI.

- **React Components**: Located in `webview-ui/src/components/`:
    - Core Interfaces:
        - `manageTransformerView.tsx` - Main management dashboard
        - `editTransformer.tsx` - Configuration editor
        - `viewTransformer.tsx` - Read-only visualization
    - Library Components:
        - `transformerLibrary/explorer.tsx` - File system style browser
        - `transformerList.tsx` - Grid/list view of transformers
    - Utilities:
        - `Tooltip.tsx` - Contextual help system
    - State Management:
        - `transformerLibraryView.tsx` - Central library coordinator

### Communication Layer

- **Message Passing**: Utilizes VS Code's webview messaging system for bidirectional communication between the extension and UI.
- **Command Types**: Defined in `src/shared/commands.ts`, establishing a typed protocol for extension-webview communication.

## Component Communication

### Extension to Webview

1. **Configuration Updates**:

    - Extension sends transformer configurations to the webview
    - Updates UI state through messages like `viewTransformer` or `editTransformer`
    - Sends execution status updates during transformer processing

2. **Execution Feedback**:
    - Notifies UI about execution states (started, finished, error)
    - Provides real-time feedback during transformer execution
    - Updates UI elements based on the current execution state

### Webview to Extension

1. **User Actions**:

    - File selection through custom dialog
    - Transformer execution requests
    - Configuration saving and updating
    - Prompt enhancement requests

2. **UI State Management**:
    - Manages editing states
    - Handles execution states
    - Controls view/edit mode switching

## Key Features and Implementation

### Transformer Management

1. **Configuration**:

    - Users configure transformers via the UI
    - Settings include input patterns, AI prompts, and output configurations
    - Configurations are validated and stored by `TransformerManager`

2. **Execution**:
    - Transformers are executed through the execution engine
    - Progress feedback is provided through VS Code's progress API
    - Results are managed by the output file manager

### Prompt Engineering

1. **Enhanced Editing**:

    - **Syntax Systems**:
        - Fuzor language support (`syntaxes/fuzor.tmLanguage.json`)
        - Prompt syntax highlighting (`syntaxes/fuzorprompt.tmLanguage.json`)
    - **Validation Features**:
        - Context-aware syntax checking
        - AI-assisted prompt improvement suggestions
    - **Editor Capabilities**:
        - Smart autocompletion for transformer variables
        - Integrated documentation tooltips

2. **Preview System**:
    - Real-time preview of processed prompts
    - Variable substitution visualization
    - Input validation feedback

## Security and Performance

1. **Content Security**:

    - Implements Content Security Policy (CSP) for webview
    - Secures script execution through nonce generation
    - Restricts resource loading to approved sources

2. **Resource Management**:
    - Efficient file handling through VS Code's API
    - Proper cleanup of temporary files and resources
    - Cancellable transformer executions

## Configuration and Setup

1. **API Keys**:

    - Secure storage of API keys in VS Code settings
    - Support for multiple AI providers
    - Environment-based configuration options

2. **Transformer Setup**:
    - User-friendly interface for transformer creation
    - Template-based configuration
    - Input/output path management

## Testing Strategy

1. **Unit Tests**:

    - **Execution System**:
        - `baseExecuter.test.ts` - Abstract class validation
        - `executer.test.ts` - Concrete implementation checks
        - `executionEngine.test.ts` - Integration points
    - **LLM Integration**:
        - `llmClient.test.ts` - Provider contract verification
    - **VS Code Mocks**:
        - Full mock environment in `src/test/mocks/vscode.ts`
        - Behavior verification through mocked APIs
    - **Test Principles**:
        - Zero Jest dependencies - pure Mocha/Chai
        - Focus on public API contracts
        - Validate error handling scenarios

2. **Integration Tests**:
    - End-to-end testing of transformer execution
    - Webview interaction testing
    - Configuration management verification

## Extension Points

The plugin provides several extension points for future enhancements:

1. **New AI Providers**:

## Appendix: Core Types

Key interfaces from `src/shared/transformerConfig.ts`:

```typescript
interface TransformerConfig {
	id: string
	name: string
	inputPattern: string
	prompt: string
	outputSettings: {
		extension: string
		namingStrategy: "append" | "replace"
	}
}

interface ExecutionResult {
	success: boolean
	outputPath?: string
	error?: TransformerError
}
```

    - Abstract base class for language models
    - Pluggable provider architecture
    - Standardized interface for AI interactions

2. **Custom Transformers**:
    - Support for user-defined transformers
    - Template system for common transformations
    - Library management for sharing transformers
