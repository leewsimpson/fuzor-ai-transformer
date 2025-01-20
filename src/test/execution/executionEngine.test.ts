import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import * as mockVSCode from '../mocks/vscode';
import { executeTransformers, isValidFilePath, isValidFolderPath } from '../../execution/executionEngine';
import { DefaultExecuter } from '../../execution/defaultExecuter';
import { ConfigurationManager } from '../../config/configurationManager';
import { TransformerConfig } from '../../shared/transformerConfig';
import { logOutputChannel } from '../../extension';

suite('executeTransformers', () => {
  let sandbox: sinon.SinonSandbox;
  ConfigurationManager.setAcceptTerms(true);

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  const validConfig: TransformerConfig = {
    id: 'test-transformer',
    name: 'Test Transformer',
    description: 'Test transformer description',
    prompt: 'Test prompt {{content::file}}',
    input: [{
      name: 'input1',
      description: 'Test input',
      type: 'file',
      required: true,
      value: 'valid-file.txt'
    }],
    outputFolder: 'valid-folder',
    outputFileName: null,
    temperature: 0.7,
    processFormat: 'eachFile',
  };

  suite('with valid configuration', () => {
    test('should execute transformer successfully', async () => {
      const mockExecuter = {
        execute: () => Promise.resolve(['output/file1.txt'])
      } as unknown as DefaultExecuter;
      
      sandbox.stub(DefaultExecuter.prototype, 'execute').callsFake(mockExecuter.execute);
      sandbox.stub(require('fs'), 'existsSync').returns(true);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);
      sandbox.stub(require('fs'), 'readdirSync').returns(['file1.txt']);
      sandbox.stub(require('fs'), 'statSync').callsFake((...args: unknown[]) => {
        const path = args[0] as string;
        if (path.includes('valid-file')) {
          return { isFile: () => true, isDirectory: () => false };
        }
        if (path.includes('valid-folder')) {
          return { isFile: () => false, isDirectory: () => true };
        }
        throw new Error('Path does not exist');
      });

      await executeTransformers(validConfig);
      assert.ok(mockExecuter.execute);
    });
  });

  suite('with invalid configuration', () => {
    test('should throw error for missing input', async () => {
      const invalidConfig = { ...validConfig, input: [] };
      await assert.rejects(
        () => executeTransformers(invalidConfig),
        (error: Error) => {
          assert.strictEqual(error.message, 'Validation failed: At least one valid input is required');
          return true;
        }
      );
    });

    test('should throw error for invalid input path', async () => {
      const invalidConfig = { 
        ...validConfig, 
        input: [{
          name: 'input1',
          description: 'Test input',
          type: 'file',
          required: true,
          value: 'invalid-path'
        }]
      };
      sandbox.stub(require('fs'), 'existsSync').withArgs('invalid-path').returns(false);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);

      await assert.rejects(
        () => executeTransformers(invalidConfig),
        (error: Error) => {
          assert.strictEqual(error.message, 'Validation failed: Input "input1" path does not exist or is invalid: invalid-path');
          return true;
        }
      );
    });

    test('should throw error for empty output folder', async () => {
      const invalidConfig = { ...validConfig, outputFolder: '' };
      sandbox.stub(require('fs'), 'existsSync')
        .withArgs('valid-file.txt').returns(true)
        .withArgs('valid-folder').returns(true);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);
      sandbox.stub(require('fs'), 'readdirSync').returns(['file1.txt']);
      sandbox.stub(require('fs'), 'statSync')
        .withArgs('valid-file.txt').returns({ isFile: () => true })
        .withArgs('valid-folder').returns({ isDirectory: () => true });

      await assert.rejects(
        () => executeTransformers(invalidConfig),
        (error: Error) => {
          assert.strictEqual(error.message, 'Validation failed: Output folder location is required');
          return true;
        }
      );
    });

    test('should throw error for invalid output folder path', async () => {
      const invalidConfig = { ...validConfig, outputFolder: 'invalid-folder' };
      sandbox.stub(require('fs'), 'existsSync')
        .withArgs('invalid-folder').returns(false)
        .withArgs('valid-file.txt').returns(true);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);
      sandbox.stub(require('fs'), 'statSync')
        .withArgs('valid-file.txt').returns({ isFile: () => true });

      await assert.rejects(
        () => executeTransformers(invalidConfig),
        (error: Error) => {
          assert.strictEqual(error.message, 'Validation failed: Output folder path is invalid or does not exist: invalid-folder');
          return true;
        }
      );
    });
  });

  suite('execution scenarios', () => {
    test('should handle executer failure', async () => {
      const mockExecuter = {
        execute: () => Promise.reject(new Error('Executer failed'))
      } as unknown as DefaultExecuter;
      sandbox.stub(DefaultExecuter.prototype, 'execute').callsFake(mockExecuter.execute);
      sandbox.stub(require('fs'), 'existsSync')
        .withArgs('valid-file.txt').returns(true)
        .withArgs('valid-folder').returns(true);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);
      sandbox.stub(require('fs'), 'readdirSync').returns(['file1.txt']);
      sandbox.stub(require('fs'), 'statSync')
        .withArgs('valid-file.txt').returns({ isFile: () => true })
        .withArgs('valid-folder').returns({ isDirectory: () => true });

      await assert.rejects(
        () => executeTransformers(validConfig),
        (error: Error) => {
          assert.strictEqual(error.message, 'Failed to execute transformer "Test Transformer": Executer failed');
          return true;
        }
      );
    });

    test('should handle file opening failure', async () => {
      const mockExecuter = {
        execute: () => Promise.resolve(['output/file1.txt'])
      } as unknown as DefaultExecuter;
      sandbox.stub(DefaultExecuter.prototype, 'execute').callsFake(mockExecuter.execute);
      sandbox.stub(vscode.workspace, 'openTextDocument').rejects(new Error('Failed to open file'));
      sandbox.stub(require('fs'), 'existsSync')
        .withArgs('valid-file.txt').returns(true)
        .withArgs('valid-folder').returns(true);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);
      sandbox.stub(require('fs'), 'statSync')
        .withArgs('valid-file.txt').returns({ isFile: () => true })
        .withArgs('valid-folder').returns({ isDirectory: () => true });

      await executeTransformers(validConfig);
      assert.ok(mockExecuter.execute);
    });

    test('should log when no output files are generated', async () => {
      const mockExecuter = {
        execute: () => Promise.resolve([])
      } as unknown as DefaultExecuter;
      const logSpy = sandbox.spy(logOutputChannel, 'warn');
      const infoSpy = sandbox.spy(logOutputChannel, 'info');
      sandbox.stub(logOutputChannel, 'show').returns();
      sandbox.stub(DefaultExecuter.prototype, 'execute').callsFake(mockExecuter.execute);
      sandbox.stub(require('fs'), 'existsSync')
        .withArgs('valid-file.txt').returns(true)
        .withArgs('valid-folder').returns(true);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);
      sandbox.stub(require('fs'), 'statSync')
        .withArgs('valid-file.txt').returns({ isFile: () => true })
        .withArgs('valid-folder').returns({ isDirectory: () => true });

      await executeTransformers(validConfig);
      assert.ok(infoSpy.calledWith('Starting transformer execution for "Test Transformer"...'));
      assert.ok(infoSpy.calledWith('Transformer "Test Transformer" executed successfully.'));
      assert.ok(infoSpy.calledWith('Transformer execution process completed.'));
      assert.ok(logSpy.calledOnceWith('No output files were generated by this transformer.'));
    });
  });

  suite('helper functions', () => {
    test('isValidFilePath should return true for valid file', () => {
      sandbox.stub(require('fs'), 'existsSync').returns(true);
      sandbox.stub(require('fs'), 'statSync').returns({ isFile: () => true });
      assert.strictEqual(isValidFilePath('valid-file.txt'), true);
    });

    test('isValidFilePath should return false for invalid file', () => {
      sandbox.stub(require('fs'), 'existsSync').returns(false);
      assert.strictEqual(isValidFilePath('invalid-file.txt'), false);
    });

    test('isValidFolderPath should return true for valid folder', () => {
      sandbox.stub(require('fs'), 'existsSync').returns(true);
      sandbox.stub(require('fs'), 'statSync').returns({ isDirectory: () => true });
      assert.strictEqual(isValidFolderPath('valid-folder'), true);
    });

    test('isValidFolderPath should return false for invalid folder', () => {
      sandbox.stub(require('fs'), 'existsSync').returns(false);
      assert.strictEqual(isValidFolderPath('invalid-folder'), false);
    });
  });

  suite('input handling', () => {
    test('should handle single file input', async () => {
      const singleFileConfig = {
        ...validConfig,
        input: [{
          name: 'input1',
          description: 'Test input',
          type: 'file',
          required: true,
          value: 'valid-file.txt'
        }]
      };
      const mockExecuter = {
        execute: () => Promise.resolve(['output/file1.txt'])
      } as unknown as DefaultExecuter;
      sandbox.stub(DefaultExecuter.prototype, 'execute').callsFake(mockExecuter.execute);
      sandbox.stub(require('fs'), 'existsSync')
        .withArgs('valid-file.txt').returns(true)
        .withArgs('valid-folder').returns(true);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);
      sandbox.stub(require('fs'), 'statSync')
        .withArgs('valid-file.txt').returns({ isFile: () => true })
        .withArgs('valid-folder').returns({ isDirectory: () => true });

      await executeTransformers(singleFileConfig);
      assert.ok(mockExecuter.execute);
    });

    test('should handle multiple file inputs', async () => {
      const multiFileConfig = {
        ...validConfig,
        input: [
          {
            name: 'input1',
            description: 'Test input 1',
            type: 'file',
            required: true,
            value: 'valid-file1.txt'
          },
          {
            name: 'input2',
            description: 'Test input 2',
            type: 'file',
            required: true,
            value: 'valid-file2.txt'
          }
        ]
      };
      const mockExecuter = {
        execute: () => Promise.resolve(['output/file1.txt', 'output/file2.txt'])
      } as unknown as DefaultExecuter;
      sandbox.stub(DefaultExecuter.prototype, 'execute').callsFake(mockExecuter.execute);
      sandbox.stub(require('fs'), 'existsSync')
        .withArgs('valid-file1.txt').returns(true)
        .withArgs('valid-file2.txt').returns(true)
        .withArgs('valid-folder').returns(true);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);
      sandbox.stub(require('fs'), 'readdirSync').returns(['file1.txt']);
      sandbox.stub(require('fs'), 'statSync')
        .withArgs('valid-file1.txt').returns({ isFile: () => true })
        .withArgs('valid-file2.txt').returns({ isFile: () => true })
        .withArgs('valid-folder').returns({ isDirectory: () => true });

      await executeTransformers(multiFileConfig);
      assert.ok(mockExecuter.execute);
    });

    test('should handle folder input', async () => {
      const folderConfig = {
        ...validConfig,
        input: [{
          name: 'input1',
          description: 'Test input',
          type: 'file',
          required: true,
          value: 'valid-folder'
        }]
      };
      const mockExecuter = {
        execute: () => Promise.resolve(['output/file1.txt'])
      } as unknown as DefaultExecuter;
      sandbox.stub(DefaultExecuter.prototype, 'execute').callsFake(mockExecuter.execute);
      sandbox.stub(require('fs'), 'existsSync')
        .withArgs('valid-folder').returns(true)
        .withArgs('valid-folder').returns(true);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);
      sandbox.stub(require('fs'), 'readdirSync').returns(['file1.txt']);
      sandbox.stub(require('fs'), 'statSync')
        .withArgs('valid-folder').returns({ isDirectory: () => true });

      await executeTransformers(folderConfig);
      assert.ok(mockExecuter.execute);
    });
  });

  suite('output handling', () => {
    test('should handle multiple output files', async () => {
      const outputFiles = ['output/file1.txt', 'output/file2.txt'];
      const mockExecuter = {
        execute: () => Promise.resolve(outputFiles)
      } as unknown as DefaultExecuter;
      const logSpy = sandbox.spy(logOutputChannel, 'warn');
      const infoSpy = sandbox.spy(logOutputChannel, 'info');
      sandbox.stub(logOutputChannel, 'show').returns();
      sandbox.stub(DefaultExecuter.prototype, 'execute').callsFake(mockExecuter.execute);
      sandbox.stub(require('fs'), 'existsSync')
        .withArgs('valid-file.txt').returns(true)
        .withArgs('valid-folder').returns(true);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);
      sandbox.stub(require('fs'), 'readdirSync').returns(['file1.txt']);
      sandbox.stub(require('fs'), 'statSync')
        .withArgs('valid-file.txt').returns({ isFile: () => true })
        .withArgs('valid-folder').returns({ isDirectory: () => true });

      await executeTransformers(validConfig);
      assert.ok(infoSpy.calledWith('Starting transformer execution for "Test Transformer"...'));
      assert.ok(infoSpy.calledWith('Transformer "Test Transformer" executed successfully.'));
      assert.ok(infoSpy.calledWith('Transformer execution process completed.'));
    });

    test('should handle empty output files array', async () => {
      const mockExecuter = {
        execute: () => Promise.resolve([])
      } as unknown as DefaultExecuter;
      const logSpy = sandbox.spy(logOutputChannel, 'warn');
      const infoSpy = sandbox.spy(logOutputChannel, 'info');
      sandbox.stub(logOutputChannel, 'show').returns();
      sandbox.stub(DefaultExecuter.prototype, 'execute').callsFake(mockExecuter.execute);
      sandbox.stub(require('fs'), 'existsSync')
        .withArgs('valid-file.txt').returns(true)
        .withArgs('valid-folder').returns(true);
      sandbox.stub(require('fs'), 'accessSync').returns(undefined);
      sandbox.stub(require('fs'), 'readdirSync').returns(['file1.txt']);
      sandbox.stub(require('fs'), 'statSync')
        .withArgs('valid-file.txt').returns({ isFile: () => true })
        .withArgs('valid-folder').returns({ isDirectory: () => true });

      await executeTransformers(validConfig);
      assert.ok(infoSpy.calledWith('Starting transformer execution for "Test Transformer"...'));
      assert.ok(infoSpy.calledWith('Transformer "Test Transformer" executed successfully.'));
      assert.ok(infoSpy.calledWith('Transformer execution process completed.'));
      assert.ok(logSpy.calledOnceWith('No output files were generated by this transformer.'));
    });
  });

});
