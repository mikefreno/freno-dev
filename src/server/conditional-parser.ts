export function getSafeEnvVariables(): Record<string, string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    VITE_DOMAIN: process.env.VITE_DOMAIN,
    VITE_AWS_BUCKET_STRING: process.env.VITE_AWS_BUCKET_STRING,
    VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID,
    VITE_GITHUB_CLIENT_ID: process.env.VITE_GITHUB_CLIENT_ID,
    VITE_WEBSOCKET: process.env.VITE_WEBSOCKET
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

export function parseConditionals(
  html: string,
  context: ConditionalContext
): string {
  if (!html) return html;

  let processedHtml = html;

  processedHtml = processBlockConditionals(processedHtml, context);
  processedHtml = processInlineConditionals(processedHtml, context);

  return processedHtml;
}

function processBlockConditionals(
  html: string,
  context: ConditionalContext
): string {
  const divRegex =
    /<div\s+([^>]*class="[^"]*conditional-block[^"]*"[^>]*)>([\s\S]*?)<\/div>/gi;

  let processedHtml = html;
  let match: RegExpExecArray | null;

  divRegex.lastIndex = 0;

  const matches: ConditionalBlock[] = [];
  while ((match = divRegex.exec(html)) !== null) {
    const attributes = match[1];
    const content = match[2];

    const typeMatch = /data-condition-type="([^"]+)"/.exec(attributes);
    const valueMatch = /data-condition-value="([^"]+)"/.exec(attributes);
    const showWhenMatch = /data-show-when="(true|false)"/.exec(attributes);

    if (typeMatch && valueMatch && showWhenMatch) {
      matches.push({
        fullMatch: match[0],
        conditionType: typeMatch[1],
        conditionValue: valueMatch[1],
        showWhen: showWhenMatch[1],
        content: content
      });
    }
  }

  for (const block of matches) {
    const shouldShow = evaluateCondition(
      block.conditionType,
      block.conditionValue,
      block.showWhen === "true",
      context
    );

    if (shouldShow) {
      const innerContentRegex =
        /<div\s+class="conditional-content">([\s\S]*?)<\/div>/i;
      const innerMatch = block.fullMatch.match(innerContentRegex);
      const innerContent = innerMatch ? innerMatch[1] : block.content;

      processedHtml = processedHtml.replace(block.fullMatch, innerContent);
    } else {
      processedHtml = processedHtml.replace(block.fullMatch, "");
    }
  }

  return processedHtml;
}

function processInlineConditionals(
  html: string,
  context: ConditionalContext
): string {
  const spanRegex =
    /<span\s+([^>]*class="[^"]*conditional-inline[^"]*"[^>]*)>([\s\S]*?)<\/span>/gi;

  let processedHtml = html;
  let match: RegExpExecArray | null;

  spanRegex.lastIndex = 0;

  const matches: ConditionalBlock[] = [];
  while ((match = spanRegex.exec(html)) !== null) {
    const attributes = match[1];
    const content = match[2];

    const typeMatch = /data-condition-type="([^"]+)"/.exec(attributes);
    const valueMatch = /data-condition-value="([^"]+)"/.exec(attributes);
    const showWhenMatch = /data-show-when="(true|false)"/.exec(attributes);

    if (typeMatch && valueMatch && showWhenMatch) {
      matches.push({
        fullMatch: match[0],
        conditionType: typeMatch[1],
        conditionValue: valueMatch[1],
        showWhen: showWhenMatch[1],
        content: content
      });
    }
  }

  for (const inline of matches) {
    const shouldShow = evaluateCondition(
      inline.conditionType,
      inline.conditionValue,
      inline.showWhen === "true",
      context
    );

    if (shouldShow) {
      processedHtml = processedHtml.replace(inline.fullMatch, inline.content);
    } else {
      processedHtml = processedHtml.replace(inline.fullMatch, "");
    }
  }

  return processedHtml;
}

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
      conditionMet = false;
  }

  return showWhen ? conditionMet : !conditionMet;
}

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

function evaluatePrivilegeCondition(
  value: string,
  context: ConditionalContext
): boolean {
  return context.privilegeLevel === value;
}

/**
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

function evaluateFeatureCondition(
  value: string,
  context: ConditionalContext
): boolean {
  return context.featureFlags[value] === true;
}

/**
 * Format: "ENV_VAR_NAME:expected_value" or "ENV_VAR_NAME:*" for any truthy value
 */
function evaluateEnvCondition(
  value: string,
  context: ConditionalContext
): boolean {
  try {
    const colonIndex = value.indexOf(":");
    if (colonIndex === -1) return false;

    const varName = value.substring(0, colonIndex).trim();
    const expectedValue = value.substring(colonIndex + 1).trim();

    const actualValue = context.env[varName];

    if (expectedValue === "*") {
      return !!actualValue;
    }

    return actualValue === expectedValue;
  } catch (error) {
    console.error("Error parsing env condition:", error);
    return false;
  }
}
