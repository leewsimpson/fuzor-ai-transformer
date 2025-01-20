export interface ProgressEvent {
    type: 'execution' | 'editMode';
    subType: 'currentInput' | 'progress' | 'outputCreated';
    filePath?: string;
    outputUri?: string;
    message?: string;
}
