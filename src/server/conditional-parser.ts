/**
 * Server-side conditional parser for blog content
 * Evaluates conditional blocks and returns processed HTML
 */

/**
 * Get safe environment variables for conditional evaluation
 * Only exposes non-sensitive variables that are safe to use in content conditionals
 */
export function getSafeEnvVariables(): Record<string, string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV
    // Add other safe, non-sensitive env vars here as needed
    // DO NOT expose API keys, secrets, database URLs, etc.
  };
}

export interface ConditionalContext {
  isAuthenticated: boolean;
  privilegeLevel: "admin" | "user" | "anonymous";
  userId: string | null;
  currentDate: Date;
  featureFlags: Record<string, boolean>;
  env: Record<string, string | undefined>;
}

interface ConditionalBlock {
  fullMatch: string;
  conditionType: string;
  conditionValue: string;
  showWhen: string;
  content: string;
}

/**
 * Parse HTML and evaluate conditional blocks (both block and inline)
 * @param html - Raw HTML from database
 * @param context - Evaluation context (user, date, features)
 * @returns Processed HTML with conditionals evaluated
 */
export function parseConditionals(
  html: string,
  context: ConditionalContext
): string {
  if (!html) return html;

  let processedHtml = html;

  // First, process block-level conditionals (div elements)
  processedHtml = processBlockConditionals(processedHtml, context);

  // Then, process inline conditionals (span elements)
  processedHtml = processInlineConditionals(processedHtml, context);

  return processedHtml;
}

/**
 * Process block-level conditional divs
 */
function processBlockConditionals(
  html: string,
  context: ConditionalContext
): string {
  // Regex to match conditional blocks
  // Matches: <div class="conditional-block" data-condition-type="..." data-condition-value="..." data-show-when="...">...</div>
  const conditionalRegex =
    /<div\s+[^>]*class="[^"]*conditional-block[^"]*"[^>]*data-condition-type="([^"]+)"[^>]*data-condition-value="([^"]+)"[^>]*data-show-when="(true|false)"[^>]*>([\s\S]*?)<\/div>/gi;

  let processedHtml = html;
  let match: RegExpExecArray | null;

  // Reset regex lastIndex
  conditionalRegex.lastIndex = 0;

  // Collect all matches first to avoid regex state issues
  const matches: ConditionalBlock[] = [];
  while ((match = conditionalRegex.exec(html)) !== null) {
    matches.push({
      fullMatch: match[0],
      conditionType: match[1],
      conditionValue: match[2],
      showWhen: match[3],
      content: match[4]
    });
  }

  // Process each conditional block
  for (const block of matches) {
    const shouldShow = evaluateCondition(
      block.conditionType,
      block.conditionValue,
      block.showWhen === "true",
      context
    );

    if (shouldShow) {
      // Keep content, but remove conditional wrapper
      // Extract content from inner <div class="conditional-content">
      const innerContentRegex =
        /<div\s+class="conditional-content">([\s\S]*?)<\/div>/i;
      const innerMatch = block.fullMatch.match(innerContentRegex);
      const innerContent = innerMatch ? innerMatch[1] : block.content;

      processedHtml = processedHtml.replace(block.fullMatch, innerContent);
    } else {
      // Remove entire block
      processedHtml = processedHtml.replace(block.fullMatch, "");
    }
  }

  return processedHtml;
}

/**
 * Process inline conditional spans
 */
function processInlineConditionals(
  html: string,
  context: ConditionalContext
): string {
  // Regex to match inline conditionals
  // Matches: <span class="conditional-inline" data-condition-type="..." data-condition-value="..." data-show-when="...">...</span>
  const inlineRegex =
    /<span\s+[^>]*class="[^"]*conditional-inline[^"]*"[^>]*data-condition-type="([^"]+)"[^>]*data-condition-value="([^"]+)"[^>]*data-show-when="(true|false)"[^>]*>([\s\S]*?)<\/span>/gi;

  let processedHtml = html;
  let match: RegExpExecArray | null;

  // Reset regex lastIndex
  inlineRegex.lastIndex = 0;

  // Collect all matches first
  const matches: ConditionalBlock[] = [];
  while ((match = inlineRegex.exec(html)) !== null) {
    matches.push({
      fullMatch: match[0],
      conditionType: match[1],
      conditionValue: match[2],
      showWhen: match[3],
      content: match[4]
    });
  }

  // Process each inline conditional
  for (const inline of matches) {
    const shouldShow = evaluateCondition(
      inline.conditionType,
      inline.conditionValue,
      inline.showWhen === "true",
      context
    );

    if (shouldShow) {
      // Keep content, remove span wrapper
      processedHtml = processedHtml.replace(inline.fullMatch, inline.content);
    } else {
      // Remove entire inline span
      processedHtml = processedHtml.replace(inline.fullMatch, "");
    }
  }

  return processedHtml;
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  conditionType: string,
  conditionValue: string,
  showWhen: boolean,
  context: ConditionalContext
): boolean {
  let conditionMet = false;

  switch (conditionType) {
    case "auth":
      conditionMet = evaluateAuthCondition(conditionValue, context);
      break;
    case "privilege":
      conditionMet = evaluatePrivilegeCondition(conditionValue, context);
      break;
    case "date":
      conditionMet = evaluateDateCondition(conditionValue, context);
      break;
    case "feature":
      conditionMet = evaluateFeatureCondition(conditionValue, context);
      break;
    case "env":
      conditionMet = evaluateEnvCondition(conditionValue, context);
      break;
    default:
      // Unknown condition type - default to hiding content for safety
      conditionMet = false;
  }

  // Apply showWhen logic: if showWhen is true, show when condition is met
  // If showWhen is false, show when condition is NOT met
  return showWhen ? conditionMet : !conditionMet;
}

/**
 * Evaluate authentication condition
 */
function evaluateAuthCondition(
  value: string,
  context: ConditionalContext
): boolean {
  switch (value) {
    case "authenticated":
      return context.isAuthenticated;
    case "anonymous":
      return !context.isAuthenticated;
    default:
      return false;
  }
}

/**
 * Evaluate privilege level condition
 */
function evaluatePrivilegeCondition(
  value: string,
  context: ConditionalContext
): boolean {
  return context.privilegeLevel === value;
}

/**
 * Evaluate date-based condition
 * Supports: "before:YYYY-MM-DD", "after:YYYY-MM-DD", "between:YYYY-MM-DD,YYYY-MM-DD"
 */
function evaluateDateCondition(
  value: string,
  context: ConditionalContext
): boolean {
  try {
    const now = context.currentDate.getTime();

    if (value.startsWith("before:")) {
      const dateStr = value.substring(7);
      const targetDate = new Date(dateStr).getTime();
      return now < targetDate;
    }

    if (value.startsWith("after:")) {
      const dateStr = value.substring(6);
      const targetDate = new Date(dateStr).getTime();
      return now > targetDate;
    }

    if (value.startsWith("between:")) {
      const dateRange = value.substring(8).split(",");
      if (dateRange.length !== 2) return false;

      const startDate = new Date(dateRange[0].trim()).getTime();
      const endDate = new Date(dateRange[1].trim()).getTime();
      return now >= startDate && now <= endDate;
    }

    return false;
  } catch (error) {
    console.error("Error parsing date condition:", error);
    return false;
  }
}

/**
 * Evaluate feature flag condition
 */
function evaluateFeatureCondition(
  value: string,
  context: ConditionalContext
): boolean {
  return context.featureFlags[value] === true;
}

/**
 * Evaluate environment variable condition
 * Format: "ENV_VAR_NAME:expected_value" or "ENV_VAR_NAME:*" for any truthy value
 */
function evaluateEnvCondition(
  value: string,
  context: ConditionalContext
): boolean {
  try {
    // Parse format: "VAR_NAME:expected_value"
    const colonIndex = value.indexOf(":");
    if (colonIndex === -1) return false;

    const varName = value.substring(0, colonIndex).trim();
    const expectedValue = value.substring(colonIndex + 1).trim();

    const actualValue = context.env[varName];

    // If expected value is "*", check if variable exists and is truthy
    if (expectedValue === "*") {
      return !!actualValue;
    }

    // Otherwise, check for exact match
    return actualValue === expectedValue;
  } catch (error) {
    console.error("Error parsing env condition:", error);
    return false;
  }
}
