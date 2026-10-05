/**
 * Subdomain routing invariant test.
 *
 * Verifies that every subdomain route (src/routes/<prefix>/<name>) has a
 * corresponding top-level dispatch route (src/routes/<name>.tsx or
 * src/routes/<name>/index.tsx). This is required because production Vercel
 * deployments do not apply vercel.json host rewrites — the Nitro Build Output
 * API config.json replaces them entirely, so host-aware root dispatch is the
 * only mechanism that serves subdomain pages.
 *
 * See docs/subdomain-setup.md and AGENTS.md "Subdomain Routing" for context.
 */
import { describe, it, expect } from "bun:test";
import { readdirSync, existsSync, statSync } from "fs";

function isRouteFile(name: string): boolean {
    return name.endsWith(".tsx") || name.endsWith(".ts");
}

function listRouteFiles(dir: string): string[] {
    try {
        return readdirSync(dir).filter(isRouteFile);
    } catch {
        return [];
    }
}

function hasDispatchRoute(routeName: string, routesDir: string): boolean {
    // Check for src/routes/<name>.tsx
    if (existsSync(`${routesDir}/${routeName}.tsx`)) {
        return true;
    }
    // Check for src/routes/<name>/index.tsx
    if (existsSync(`${routesDir}/${routeName}/index.tsx`)) {
        return true;
    }
    return false;
}

describe("subdomain routing dispatch invariant", () => {
    const routesDir = "./src/routes";

    it("every subdomain route has a top-level dispatch route", () => {
        const prefixDirs = listRouteFiles(routesDir)
            .filter((name) => {
                try {
                    return statSync(`${routesDir}/${name}`).isDirectory();
                } catch {
                    return false;
                }
            })
            // Exclude non-product subdomains
            .filter((name) =>
                ["nessa", "lineage", "gaze", "inputhalo", "nook"].includes(name)
            );

        const missing = [];

        for (const prefix of prefixDirs) {
            const prefixFiles = listRouteFiles(`${routesDir}/${prefix}`);
            for (const file of prefixFiles) {
                // Skip test files and non-route files
                if (file.includes("test") || file.includes("spec")) {
                    continue;
                }
                if (!isRouteFile(file)) {
                    continue;
                }

                // Determine route name (without extension)
                const routeName = file.replace(/\.(tsx|ts)$/, "");

                // index.tsx maps to the parent directory name
                const effectiveRoute = routeName === "index" ? prefix : routeName;

                // Skip routes that are intentionally not dispatched to root
                // (these are subdomain-specific, not shared surfaces)
                if (
                    effectiveRoute === "content" ||
                    effectiveRoute === "meta" ||
                    effectiveRoute.endsWith("-content") ||
                    effectiveRoute === "password-reset" ||
                    effectiveRoute === "request-password-reset" ||
                    effectiveRoute === "checkout" ||
                    effectiveRoute === "success" ||
                    effectiveRoute === "notifications"
                ) {
                    continue;
                }

                if (!hasDispatchRoute(effectiveRoute, routesDir)) {
                    missing.push(`${prefix}/${file} → missing dispatch for /${effectiveRoute}`);
                }
            }
        }

        expect(missing).toEqual([]);
    });
});
