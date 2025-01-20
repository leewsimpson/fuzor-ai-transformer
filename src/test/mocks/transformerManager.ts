import { TransformerConfig, FuzorFolder, FuzorItem } from '../../shared/transformerConfig';
import { 
  TransformerExistsError,
  TransformerNotFoundError,
  TransformerValidationError
} from '../../types/errors';

export class MockTransformerManager {
  private fuzorItems: Map<string, FuzorItem> = new Map();

  async createTransformer(config: TransformerConfig): Promise<void> {
    if (this.fuzorItems.has(config.id)) {
      throw new TransformerExistsError(config.name);
    }
    this.fuzorItems.set(config.id, {
      type: 'transformer',
      config
    });
  }

  async createFolder(folder: FuzorFolder): Promise<void> {
    if (this.fuzorItems.has(folder.id)) {
      throw new TransformerExistsError(folder.name);
    }
    this.fuzorItems.set(folder.id, {
      type: 'folder',
      folder
    });
  }

  async handleDragAndDrop(item: FuzorItem): Promise<void> {
    const id = item.type === 'transformer' ? item.config?.id! : item.folder?.id!;
    this.fuzorItems.set(id, item);
  }

  async updateTransformer(config: TransformerConfig): Promise<void> {
    if (!this.fuzorItems.has(config.id)) {
      throw new TransformerNotFoundError(config.id);
    }
    this.fuzorItems.set(config.id, {
      type: 'transformer',
      config
    });
  }

  async deleteTransformer(id: string): Promise<void> {
    if (!this.fuzorItems.has(id)) {
      throw new TransformerNotFoundError(id);
    }
    this.fuzorItems.delete(id);
  }

  getTransformer(id: string): TransformerConfig | undefined {
    return this.fuzorItems.get(id)?.config;
  }

  getAllTransformers(): TransformerConfig[] {
    return Array.from(this.fuzorItems.values())
      .filter(item => item.type === 'transformer')
      .map(item => item.config!);
  }

  getAllFuzorItems(): FuzorItem[] {
    return Array.from(this.fuzorItems.values());
  }

  async executeTransformer(config: TransformerConfig): Promise<void> {
    if (!this.fuzorItems.has(config.id)) {
      throw new TransformerNotFoundError(config.id);
    }
    // Mock execution - just validate the config
    this.validateTransformerConfig(config);
  }

  async stopExecution(): Promise<void> {
    // Mock stop - no operation needed
  }

  validateTransformerConfig(config: TransformerConfig): void {
    if (!config.id || typeof config.id !== 'string') {
      throw new TransformerValidationError('Invalid transformer ID');
    }
    if (!config.name || typeof config.name !== 'string') {
      throw new TransformerValidationError('Invalid transformer name');
    }
    if (!config.prompt || typeof config.prompt !== 'string') {
      throw new TransformerValidationError('Invalid prompt');
    }
  }
}
