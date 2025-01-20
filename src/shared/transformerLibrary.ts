import { TransformerConfig } from "./transformerConfig"

// export interface TransformerLibrary {
//     library: Array<TransformerConfig>;
// }

export type TransformerLibrary = TransformerConfig | { [key: string]: TransformerLibrary }
