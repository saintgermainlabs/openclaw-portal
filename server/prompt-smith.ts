/** Compatibility re-export — prefer `./prompt-engineer.js`. */
export {
  PROMPT_ENGINEER_AGENT_ID as PROMPT_SMITH_AGENT_ID,
  PROMPT_ENGINEER_MODEL as PROMPT_SMITH_MODEL,
  PROMPT_ENGINEER_AGENT_ID,
  PROMPT_ENGINEER_MODEL,
  compilePromptLocally,
  buildPromptEngineerInstruction as buildPromptSmithInstruction,
  buildPromptEngineerInstruction,
  extractTargetAndBrief,
  parseTarget,
} from './prompt-engineer.js'
export type { CompiledPrompt, PromptTarget } from './prompt-engineer.js'
