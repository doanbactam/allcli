export interface DecompositionOptions {
  maxDepth?: number;
  requireApproval?: boolean;
}

export interface SubtaskPlan {
  title: string;
  description: string;
  priority: number;
  blockedBy: string[];
}

export interface DecompositionResult {
  subtasks: SubtaskPlan[];
  strategy: string;
}

const DEFAULT_MAX_DEPTH = 3;

export class TaskDecomposer {
  constructor(private readonly options?: DecompositionOptions) {}

  decompose(taskTitle: string, taskDescription?: string): DecompositionResult {
    const maxDepth = this.options?.maxDepth ?? DEFAULT_MAX_DEPTH;
    const text = [taskTitle, taskDescription].filter((part): part is string => typeof part === "string" && part.length > 0).join(" ");

    const numbered = splitNumberedItems(taskDescription ?? taskTitle);
    if (numbered.length > 1) {
      return this.buildResult(numbered, "Split by numbered list items", maxDepth);
    }

    const structural = splitStructural(text);
    if (structural.length > 1) {
      return this.buildResult(structural, "Split by conjunction and punctuation separators", maxDepth);
    }

    const filesOrModules = extractFilesAndModules(text);
    if (filesOrModules.length > 1) {
      return this.buildResult(filesOrModules, "Split by files/modules referenced in the task", maxDepth);
    }

    const features = extractFeatureList(text);
    if (features.length > 1) {
      return this.buildResult(features, "Split by features referenced in the task", maxDepth);
    }

    const generic = ["Research requirements and constraints", "Implement the solution", "Test and validate outcomes"];
    return this.buildResult(generic, "Applied generic research → implement → test decomposition", maxDepth);
  }

  private buildResult(parts: string[], strategy: string, maxDepth: number): DecompositionResult {
    const limited = parts.slice(0, Math.max(1, maxDepth));
    const size = limited.length;
    const subtasks = limited.map<SubtaskPlan>((part, index) => {
      const cleanPart = part.trim();
      const title = toTitle(cleanPart, index);

      return {
        title,
        description: cleanPart,
        priority: size - index,
        blockedBy: index === 0 ? [] : [String(index - 1)]
      };
    });

    return {
      subtasks,
      strategy
    };
  }
}

function splitStructural(input: string): string[] {
  const hasStructuralHints = /\band\b|,|;/.test(input);
  if (!hasStructuralHints) {
    return [];
  }

  return input
    .split(/\s*(?:,|;|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function splitNumberedItems(input: string): string[] {
  const matches = [...input.matchAll(/(?:^|\s)(\d+[.)]\s+)([^\n]+?)(?=(?:\s\d+[.)]\s+)|$)/g)];
  if (matches.length < 2) {
    return [];
  }

  return matches
    .map((match) => match[2]?.trim() ?? "")
    .filter((part) => part.length > 0);
}

function extractFilesAndModules(input: string): string[] {
  const fileMatches = [...input.matchAll(/(?:[\w-]+[\\/])*[\w-]+\.(?:ts|tsx|js|jsx|json|md)\b/gi)].map((match) => match[0]);
  if (fileMatches.length > 1) {
    return unique(fileMatches);
  }

  const moduleMatch = input.match(/\bmodules?\s+([^.;]+)/i);
  if (!moduleMatch || !moduleMatch[1]) {
    return [];
  }

  return moduleMatch[1]
    .split(/\s*(?:,|;|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function extractFeatureList(input: string): string[] {
  const featureMatch = input.match(/\bfeatures?\s+([^.;]+)/i);
  if (!featureMatch || !featureMatch[1]) {
    return [];
  }

  return featureMatch[1]
    .split(/\s*(?:,|;|\band\b)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function toTitle(part: string, index: number): string {
  if (part.length === 0) {
    return `Subtask ${index + 1}`;
  }

  const first = part.charAt(0).toUpperCase();
  return `${first}${part.slice(1)}`;
}
