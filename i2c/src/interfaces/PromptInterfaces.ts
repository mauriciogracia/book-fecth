
export interface SinglePrompt {
  prompt: string; //natural language prompt
  language: string; ///"en" for English, "es" for Spanish, etc. 
}

export interface MultiLingualPrompts {
  prompts: SinglePrompt[];
}