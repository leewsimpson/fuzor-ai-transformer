# VS Code 'Fuzor-AI Transformer' Extension

The **VS Code 'Fuzor-AI Transformer' Extension** is a powerful extension that enables AI-powered file transformations directly within Visual Studio Code. This Extension provides a customisable interface for processing files using various AI models, making it easy to automate complex workflows and enhance productivity.

This allows for saving and maintaining advanced prompts and templates, as well as the ability to work with files directly - instead of having to copy/paste with a chat interface.

## Features

- **Modern React-based UI**: Intuitive interface for managing transformers with:
    - Real-time preview capabilities
    - Enhanced prompt editing with syntax highlighting
    - Validation and feedback
- **Customisable Transformers**: Create and manage transformers with:
    - Wildcard file matching
    - Custom prompt templates with placeholder support
    - Dedicated prompt editor with syntax highlighting    
    - Configurable output file naming and structure
    - Create, duplicate, edit, and delete transformers
    - Folder support
- **Smart Prompt Engineering**:
    - AI-powered prompt enhancement
- **Online transformer library**
    - for sharing and discovering transformers
- **Multiple AI Model Support**: Integrates with multiple AI providers:
    - OpenAI
    - Azure OpenAI
    - GitHub CoPilot :) 
    - Google Gemini
    - DeepSeek    

## Use Cases

The VS Code 'Fuzor-AI Transformer' Extension can be used for various scenarios, including:

1. **Source Code Documentation**:
    - Automatically generate documentation for code files
    - Create API references from source code
    - Generate inline comments for complex functions

2. **Code Refactoring**:
    - Automate code style improvements
    - Convert code between different patterns or paradigms
    - Optimise code for performance or readability

3. **Code Conversions**:
    - Convert from one language to another

4. **Data Transformation**:
    - Convert between different data formats (JSON, XML, CSV)
    - Normalise data structures
    - Generate sample data from schemas

5. **Localisation**:
    - Translate documentation and UI strings
    - Generate localised versions of code comments
    - Create multilingual documentation sets

6. **Testing**:
    - Generate unit tests for files / folders
    - Generate test automations

## [Design](design.md)

## Installation from Package

1. Download from the GitHub packages
2. In VS Code, add the extension directly using "Install from VSIX..."
3. Configure your API keys in the settings:
    - Open VS Code settings
    - Navigate to 'Fuzor-AI Transformer' section
    - Enter API keys for your preferred AI providers
4. Create your first transformer using the UI or via the command palette (`Ctrl+Shift+P` -> "Create Transformer")
5. Configure:
    - Input file patterns (e.g., `*.txt`, `src/**/*.js`)
    - AI prompt template with placeholders
    - Output file naming and location
6. Run the transformer and view results in the output panel

## Installation from Source

1. Ensure you have the prerequisites:
    - Node.js (latest LTS version recommended)
    - Git
    - VS Code
2. Clone the repository
3. Install extension dependencies:
    ```bash
    npm install
    ```
4. Install webview UI dependencies:
    ```bash
    cd webview-ui
    npm install
    ```
5. Start the webview UI development server:
    ```bash
    npm start
    ```
6. Open the project in VS Code:
    - Press F5 to start debugging
    - The extension will automatically reload when you make changes
    - Webview UI changes are hot-reloaded

For more details on VS Code extension development, visit: https://code.visualstudio.com/api

### Running Tests

- Use the VS Code Extension Test Runner extension
- Or run tests from the command line:
    ```bash
    npm test
    ```
- Tests use Mocha and Chai (not Jest)
- Ensure proper mocking of VS Code modules using `src/test/mocks/vscode.ts`

## Roadmap
- Integration with additional AI providers
- Advanced error handling and retry mechanisms
- Batch processing and parallel execution support
- More use case support ie: One transformer to many files.
- Multiple step execution, with outputs of one transformer as input to the next, and sharing of inputs.

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature/bugfix
3. Follow the project's coding standards:
    - Use TypeScript
    - Follow existing patterns and practices
    - Include appropriate tests
4. Submit a pull request with a detailed description of changes
