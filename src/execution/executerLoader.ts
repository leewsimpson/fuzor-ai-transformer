import { BaseExecuter } from "./baseExecuter";

export class ExecuterLoader {
    private executers: Map<string, BaseExecuter> = new Map();

    async loadExecuters(filePath: string): Promise<BaseExecuter> {
        // Extract transformer ID from filepath (e.g. T001-JsonToXml)
        const transformerId = filePath.split('/').find(part => part.startsWith('T'))!;
        
        if (!this.executers.has(transformerId)) {
            try {
                // Dynamically import the transformer script
                const module = await import(`../media/transformerLibrary/${transformerId}/_script`);
                
                // Assert that the default export is a constructable class
                const ExecuterClass = module.default as { new (): BaseExecuter };

                // Instantiate the executer
                const executerInstance = new ExecuterClass();
                
                // Cache the instance for reuse
                this.executers.set(transformerId, executerInstance);
            } catch (error) {
                throw new Error(`Failed to load transformer '${transformerId}': ${error}`);
            }
        }
        return this.executers.get(transformerId)!;
    }
}
