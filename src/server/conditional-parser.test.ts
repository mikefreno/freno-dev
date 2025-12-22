import { describe, it, expect } from "bun:test";
import {
  parseConditionals,
  type ConditionalContext
} from "./conditional-parser";

describe("parseConditionals", () => {
  const baseContext: ConditionalContext = {
    isAuthenticated: true,
    privilegeLevel: "user",
    userId: "test-user",
    currentDate: new Date("2025-06-01"),
    featureFlags: { "beta-feature": true },
    env: { NODE_ENV: "development", VERCEL_ENV: "development" }
  };

  it("should show content for authenticated users", () => {
    const html = `
      <div class="conditional-block" data-condition-type="auth" data-condition-value="authenticated" data-show-when="true">
        <div class="conditional-content"><p>Secret content</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Secret content");
    expect(result).not.toContain("conditional-block");
  });

  it("should hide content for anonymous users when condition is authenticated", () => {
    const html = `
      <div class="conditional-block" data-condition-type="auth" data-condition-value="authenticated" data-show-when="true">
        <div class="conditional-content"><p>Secret content</p></div>
      </div>
    `;
    const anonContext: ConditionalContext = {
      ...baseContext,
      isAuthenticated: false,
      privilegeLevel: "anonymous"
    };
    const result = parseConditionals(html, anonContext);
    expect(result).not.toContain("Secret content");
  });

  it("should evaluate admin-only content", () => {
    const html = `
      <div class="conditional-block" data-condition-type="privilege" data-condition-value="admin" data-show-when="true">
        <div class="conditional-content"><p>Admin panel</p></div>
      </div>
    `;
    const userResult = parseConditionals(html, baseContext);
    expect(userResult).not.toContain("Admin panel");

    const adminContext: ConditionalContext = {
      ...baseContext,
      privilegeLevel: "admin"
    };
    const adminResult = parseConditionals(html, adminContext);
    expect(adminResult).toContain("Admin panel");
  });

  it("should handle date before condition", () => {
    const html = `
      <div class="conditional-block" data-condition-type="date" data-condition-value="before:2026-01-01" data-show-when="true">
        <div class="conditional-content"><p>Available until 2026</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Available until 2026");
  });

  it("should handle date after condition", () => {
    const html = `
      <div class="conditional-block" data-condition-type="date" data-condition-value="after:2024-01-01" data-show-when="true">
        <div class="conditional-content"><p>Available after 2024</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Available after 2024");
  });

  it("should handle date between condition", () => {
    const html = `
      <div class="conditional-block" data-condition-type="date" data-condition-value="between:2025-01-01,2025-12-31" data-show-when="true">
        <div class="conditional-content"><p>2025 content</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("2025 content");
  });

  it("should handle feature flag conditions", () => {
    const html = `
      <div class="conditional-block" data-condition-type="feature" data-condition-value="beta-feature" data-show-when="true">
        <div class="conditional-content"><p>Beta content</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Beta content");
  });

  it("should hide content when feature flag is false", () => {
    const html = `
      <div class="conditional-block" data-condition-type="feature" data-condition-value="disabled-feature" data-show-when="true">
        <div class="conditional-content"><p>Disabled content</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).not.toContain("Disabled content");
  });

  it("should handle showWhen=false (inverted logic)", () => {
    const html = `
      <div class="conditional-block" data-condition-type="auth" data-condition-value="authenticated" data-show-when="false">
        <div class="conditional-content"><p>Not authenticated content</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).not.toContain("Not authenticated content");

    const anonContext: ConditionalContext = {
      ...baseContext,
      isAuthenticated: false,
      privilegeLevel: "anonymous"
    };
    const anonResult = parseConditionals(html, anonContext);
    expect(anonResult).toContain("Not authenticated content");
  });

  it("should handle multiple conditional blocks", () => {
    const html = `
      <p>Public content</p>
      <div class="conditional-block" data-condition-type="auth" data-condition-value="authenticated" data-show-when="true">
        <div class="conditional-content"><p>Auth content</p></div>
      </div>
      <p>More public</p>
      <div class="conditional-block" data-condition-type="privilege" data-condition-value="admin" data-show-when="true">
        <div class="conditional-content"><p>Admin content</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Public content");
    expect(result).toContain("Auth content");
    expect(result).toContain("More public");
    expect(result).not.toContain("Admin content");
  });

  it("should handle empty HTML", () => {
    const result = parseConditionals("", baseContext);
    expect(result).toBe("");
  });

  it("should handle HTML with no conditionals", () => {
    const html = "<p>Regular content</p>";
    const result = parseConditionals(html, baseContext);
    expect(result).toBe(html);
  });

  it("should default to hiding unknown condition types", () => {
    const html = `
      <div class="conditional-block" data-condition-type="unknown" data-condition-value="something" data-show-when="true">
        <div class="conditional-content"><p>Unknown type content</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).not.toContain("Unknown type content");
  });

  it("should handle complex nested HTML in conditional content", () => {
    const html = `
      <div class="conditional-block" data-condition-type="auth" data-condition-value="authenticated" data-show-when="true">
        <div class="conditional-content">
          <h2>Title</h2>
          <ul><li>Item 1</li><li>Item 2</li></ul>
          <pre><code>console.log('test');</code></pre>
        </div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("<h2>Title</h2>");
    expect(result).toContain("<ul><li>Item 1</li>");
    expect(result).toContain("<code>console.log('test');</code>");
  });

  it("should handle env condition with exact match", () => {
    const html = `
      <div class="conditional-block" data-condition-type="env" data-condition-value="NODE_ENV:development" data-show-when="true">
        <div class="conditional-content"><p>Dev mode content</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Dev mode content");
  });

  it("should hide env condition when value doesn't match", () => {
    const html = `
      <div class="conditional-block" data-condition-type="env" data-condition-value="NODE_ENV:production" data-show-when="true">
        <div class="conditional-content"><p>Prod content</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).not.toContain("Prod content");
  });

  it("should handle env condition with wildcard (*) for any truthy value", () => {
    const html = `
      <div class="conditional-block" data-condition-type="env" data-condition-value="NODE_ENV:*" data-show-when="true">
        <div class="conditional-content"><p>Any env set</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Any env set");
  });

  it("should hide env condition when variable is undefined", () => {
    const html = `
      <div class="conditional-block" data-condition-type="env" data-condition-value="NONEXISTENT_VAR:*" data-show-when="true">
        <div class="conditional-content"><p>Should not show</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).not.toContain("Should not show");
  });

  it("should handle env condition with inverted logic", () => {
    const html = `
      <div class="conditional-block" data-condition-type="env" data-condition-value="NODE_ENV:production" data-show-when="false">
        <div class="conditional-content"><p>Not production</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Not production");
  });

  it("should handle malformed env condition format", () => {
    const html = `
      <div class="conditional-block" data-condition-type="env" data-condition-value="INVALID_FORMAT" data-show-when="true">
        <div class="conditional-content"><p>Invalid format</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).not.toContain("Invalid format");
  });

  // Inline conditional tests
  it("should handle inline conditional span for authenticated users", () => {
    const html = `<p>The domain is <span class="conditional-inline" data-condition-type="env" data-condition-value="NODE_ENV:development" data-show-when="true">localhost</span>.</p>`;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("The domain is localhost.");
    expect(result).not.toContain("conditional-inline");
    expect(result).not.toContain("data-condition-type");
  });

  it("should hide inline conditional when condition is false", () => {
    const html = `<p>The domain is <span class="conditional-inline" data-condition-type="env" data-condition-value="NODE_ENV:production" data-show-when="true">freno.me</span>.</p>`;
    const result = parseConditionals(html, baseContext);
    expect(result).toBe("<p>The domain is .</p>");
  });

  it("should handle inline auth conditionals", () => {
    const html = `<p>Welcome <span class="conditional-inline" data-condition-type="auth" data-condition-value="authenticated" data-show-when="true">back</span>!</p>`;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Welcome back!");
  });

  it("should handle multiple inline conditionals in same paragraph", () => {
    const html = `<p>Domain: <span class="conditional-inline" data-condition-type="env" data-condition-value="NODE_ENV:development" data-show-when="true">localhost</span>, User: <span class="conditional-inline" data-condition-type="auth" data-condition-value="authenticated" data-show-when="true">logged in</span></p>`;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Domain: localhost");
    expect(result).toContain("User: logged in");
  });

  it("should handle mixed block and inline conditionals", () => {
    const html = `
      <p>Text with <span class="conditional-inline" data-condition-type="auth" data-condition-value="authenticated" data-show-when="true">inline</span> conditional.</p>
      <div class="conditional-block" data-condition-type="privilege" data-condition-value="admin" data-show-when="true">
        <div class="conditional-content"><p>Block conditional</p></div>
      </div>
    `;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Text with inline conditional.");
    expect(result).not.toContain("Block conditional"); // user is not admin
  });

  it("should handle inline conditional with showWhen=false", () => {
    const html = `<p>Status: <span class="conditional-inline" data-condition-type="env" data-condition-value="NODE_ENV:production" data-show-when="false">not production</span></p>`;
    const result = parseConditionals(html, baseContext);
    expect(result).toContain("Status: not production");
  });
});
