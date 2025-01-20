import { logOutputChannel } from '../extension';
import { TransformerConfig } from '../shared/transformerConfig';
import { ExecuterLoader } from "./executerLoader";
import { DefaultExecuter } from "./defaultExecuter";
import { ConfigurationManager } from '../config/configurationManager';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * Validates if a file path exists.
 * 
 * @param filePath - The path to validate
 * @returns true if the path exists and is a file, false otherwise
 */
export function isValidFilePath(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Validates if a folder path exists.
 * 
 * @param folderPath - The path to validate
 * @returns true if the path exists and is a directory, false otherwise
 */
export function isValidFolderPath(folderPath: string): boolean {
  try {
    return fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Validates the transformer configuration.
 * 
 * @param config - The transformer configuration to validate
 * @throws Error if validation fails
 */
function validateConfig(config: TransformerConfig): void {
  // Validate read and write access
  function hasReadWriteAccess(filePath: string): boolean {
    try {
      fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  // Validate presence of files in a directory
  function hasValidFiles(folderPath: string): boolean {
    try {
      const files = fs.readdirSync(folderPath);
      return files.length > 0;
    } catch {
      return false;
    }
  }

  if(ConfigurationManager.getAcceptTerms() === false) {
    throw new Error('Validation failed: You must accept the terms of service to use this extension. Accept terms in Settings');
  }

  // First check if input array is empty
  if (!config.input || config.input.length === 0) {
    throw new Error('Validation failed: At least one valid input is required');
  }

  // Then validate each input
  for (const input of config.input) {
    if (!input.value || input.value.trim() === '') {
      throw new Error(`Validation failed: Input "${input.name}" is empty: ${input.value}`);
    }

    if(process.env.TEST = 'test') {

    if(input.type === 'file' || input.type === 'folder') {
      if (!isValidFilePath(input.value) && !isValidFolderPath(input.value)) {
        throw new Error(`Validation failed: Input "${input.name}" path does not exist or is invalid: ${input.value}`);
      }
      
      if (!hasReadWriteAccess(input.value)) {
        throw new Error(`Validation failed: No read/write access to input "${input.name}" path: ${input.value}`);
      }

      if (isValidFolderPath(input.value) && !hasValidFiles(input.value)) {
        throw new Error(`Validation failed: Input folder "${input.name}" is empty: ${input.value}`);
      }
    }
  }
  }

  // Validate output folder
  if (!config.outputFolder || config.outputFolder.trim() === '') {
    throw new Error('Validation failed: Output folder location is required');
  }

  if (!isValidFolderPath(config.outputFolder)) {
    throw new Error(`Validation failed: Output folder path is invalid or does not exist: ${config.outputFolder}`);
  }

  if (!hasReadWriteAccess(config.outputFolder)) {
    throw new Error(`Validation failed: No read/write access to output folder path: ${config.outputFolder}`);
  }
}

// interface TransformerEntry {
//   id: string;     // Unique identifier for the transformer
//   name: string;   // Name of the transformer
//   folder: string; // Folder path where the transformer's script is located
// }

// /**
//  * Retrieves the transformer entry for a given transformer name from the transformer library.
//  * 
//  * @param transformerName - The name of the transformer to be executed.
//  * @returns The corresponding TransformerEntry object or undefined if not found.
//  */
// function getTransformerEntry(transformerName: string): TransformerEntry | undefined {
//   const transformerLibrary: { transformers: TransformerEntry[] } = require('../media/transformerLibrary/transformerLibrary.json');

//   return transformerLibrary.transformers.find(entry => entry.name === transformerName);
// }

/**
 * Opens the specified file in VS Code.
 * 
 * @param filePath - The path of the file to open.
 */
async function openInVSCode(filePath: string): Promise<void> {
  try {
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);
  } catch (error) {
    logOutputChannel.info(`Failed to open file in VS Code: ${filePath}. Error: ${error}`);
  }
}

/**
 * Executes the specified transformer using its configuration.
 * 
 * @param config - The configuration object containing settings and parameters for the transformer.
 * @returns A promise that resolves when the transformer execution completes successfully or rejects on error.
 */
let currentExecuter: DefaultExecuter | null = null;

export function stopExecution(): void {
    if (currentExecuter) {
        currentExecuter.stop();
        currentExecuter = null;
    }
}

export async function executeTransformers(config: TransformerConfig): Promise<void> {
  const { name: transformerName } = config;

  logOutputChannel.show(true);
  
  // Validate configuration before proceeding
  try {
    validateConfig(config);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logOutputChannel.error(`Validation failed for transformer "${transformerName}": ${errorMessage}`);
    throw new Error(errorMessage);
  }

  logOutputChannel.info(`Starting transformer execution for "${transformerName}"...`);

    try {
        currentExecuter = new DefaultExecuter();
        
        // Setup progress logging
        currentExecuter.onProgress((event) => {
            switch (event.type) {
                case 'execution':
                  switch (event.subType) {
                      case 'currentInput':
                          logOutputChannel.info(`Current input: ${event.message}`);
                          break;
                      case 'progress':
                          logOutputChannel.info(event.message!);
                          break;
                      case 'outputCreated':
                          logOutputChannel.info(`Output file created: ${event.outputUri}`);
                          openInVSCode(event.outputUri!);
                          logOutputChannel.info(`Opened file: ${event.outputUri}`);
                          break;
                  }
                  break;
            }
        });

        const outputFiles = await currentExecuter.execute(config);

    // if (!transformerEntry) {
    //   logOutputChannel.info(`Transformer folder not found. Using default executer.`);
    //   const executer = new DefaultExecuter();
    //   outputFiles = await executer.execute(config);
    // } else {
    //   const scriptPath = path.resolve(__dirname, '/media/transformerLibrary', transformerEntry.folder);
    //   logOutputChannel.info(`Loading transformer script from: ${scriptPath}`);

    //   const loader = new ExecuterLoader();
    //   const executer = await loader.loadExecuters(scriptPath);
    //   outputFiles = await executer.execute(config);
    // }

    logOutputChannel.info(`Transformer "${transformerName}" executed successfully.`);

    if (outputFiles?.length) {
      // logOutputChannel.info(`Generated ${outputFiles.length} output file(s):`);
      // for (const filePath of outputFiles) {
      //   await openInVSCode(filePath);
      //   logOutputChannel.info(`Opened file: ${filePath}`);
      // }
    } else {
      logOutputChannel.warn('No output files were generated by this transformer.');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logOutputChannel.error(`Error executing transformer "${transformerName}": ${errorMessage}`);
    throw new Error(`Failed to execute transformer "${transformerName}": ${errorMessage}`);
  } finally {
    logOutputChannel.info("Transformer execution process completed.");
  }
}
