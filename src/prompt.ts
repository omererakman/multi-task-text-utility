import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function loadPromptTemplate(): string {
  const promptPath = join(__dirname, '..', 'prompts', 'main_prompt.md');
  return readFileSync(promptPath, 'utf-8');
}

export function buildPrompt(question: string): string {
  const template = loadPromptTemplate();
  return template.replace('{{QUESTION}}', question);
}
