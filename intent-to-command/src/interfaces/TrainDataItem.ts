import { MultiLingualPrompts } from './PromptInterfaces.js';
import { InternalCommand } from './InternalCommand.js';

export interface TrainDataItem {
  userPrompts: MultiLingualPrompts[]; // all this prompts need to be mapped 
  inouCommand: InternalCommand;       // to a single inouCommand 
}