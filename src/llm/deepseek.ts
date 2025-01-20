import { LLMBase, LLMMessage } from './llmBase';
import { logOutputChannel } from '../extension';

interface DeepSeekResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        message: {
            content: string;
        };
    }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class DeepSeekClient extends LLMBase {
    private apiKey: string;
    private apiUrl = 'https://api.deepseek.com/chat/completions';

    constructor(apiKey: string, model: string = 'deepseek-chat') {
        super(model);
        if (!apiKey) {
            throw new Error('DeepSeek API key is missing');
        }
        this.apiKey = apiKey;
    }

    async sendRequest(promptOrMessages: LLMMessage[] | string, options?: any): Promise<string> {
        logOutputChannel.show(true);
        logOutputChannel.info(`Sending request to DeepSeek with model: ${this.model}`);

        const messages =
            typeof promptOrMessages === 'string'
                ? [{ role: 'user', content: promptOrMessages }]
                : promptOrMessages;

        try {
            logOutputChannel.info(`Preparing request payload...`);

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: options?.model || this.model,
                    messages,
                    temperature: options?.temperature || 0.7,
                    max_tokens: options?.maxTokens || 1000,
                    top_p: options?.topP || 0.9
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                if (errorBody) {
                    logOutputChannel.error(`DeepSeek API error response: ${errorBody}`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as DeepSeekResponse;
            logOutputChannel.info(`Response received successfully.`);

            if (data.usage) {
                logOutputChannel.info(`Tokens Used - Prompt: ${data.usage.prompt_tokens}, Completion: ${data.usage.completion_tokens}, Total: ${data.usage.total_tokens}`);
            }

            return data.choices[0]?.message?.content || '';

        } catch (error) {
            if (error instanceof Error) {
                logOutputChannel.error(`Error while sending request to DeepSeek: ${error.message}\nStack: ${error.stack}`);
            } else {
                logOutputChannel.error(`Unknown error sending request to DeepSeek: ${JSON.stringify(error)}`);
            }
            throw error;
        }
    }
}
