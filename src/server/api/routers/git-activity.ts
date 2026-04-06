import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import { env } from "~/env/server";
import { withCacheAndStale } from "~/server/cache";
import { CACHE_CONFIG, NETWORK_CONFIG } from "~/config";
import {
  fetchWithTimeout,
  checkResponse,
  NetworkError,
  TimeoutError,
  APIError
} from "~/server/fetch-utils";

interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  repo: string;
  url: string;
}

interface ContributionDay {
  date: string;
  count: number;
}

export const gitActivityRouter = createTRPCRouter({
  getGitHubCommits: publicProcedure
    .input(z.object({ limit: z.number().default(3) }))
    .query(async ({ input }) => {
      return withCacheAndStale(
        `github-commits-${input.limit}`,
        CACHE_CONFIG.GIT_ACTIVITY_CACHE_TTL_MS,
        async () => {
          // Use Events API to get recent push events - much more efficient
          const eventsResponse = await fetchWithTimeout(
            `https://api.github.com/users/MikeFreno/events/public?per_page=100`,
            {
              headers: {
                Authorization: `Bearer ${env.GITHUB_API_TOKEN}`,
                Accept: "application/vnd.github.v3+json"
              },
              timeout: NETWORK_CONFIG.GITHUB_API_TIMEOUT_MS
            }
          );

          await checkResponse(eventsResponse);
          const events = await eventsResponse.json();
          const allCommits: GitCommit[] = [];

          // Extract commits directly from PushEvent payload — no per-commit API calls needed
          for (const event of events) {
            if (event.type !== "PushEvent") continue;
            if (allCommits.length >= input.limit) break;

            const repoName = event.repo.name;
            const payloadCommits: any[] = event.payload.commits || [];

            for (const payloadCommit of payloadCommits) {
              if (allCommits.length >= input.limit) break;
              allCommits.push({
                sha: payloadCommit.sha?.substring(0, 7) || "unknown",
                message: payloadCommit.message?.split("\n")[0] || "No message",
                author: payloadCommit.author?.name || "Unknown",
                // event.created_at is the push timestamp — close enough to commit date
                date: event.created_at || new Date().toISOString(),
                repo: repoName,
                url: `https://github.com/${repoName}/commit/${payloadCommit.sha}`
              });
            }
          }

          // Events are already in reverse-chronological order
          return allCommits.slice(0, input.limit);
        },
        { maxStaleMs: CACHE_CONFIG.GIT_ACTIVITY_MAX_STALE_MS }
      ).catch((error) => {
        if (error instanceof NetworkError) {
          console.error("GitHub API unavailable (network error)");
        } else if (error instanceof TimeoutError) {
          console.error(`GitHub API timeout after ${error.timeoutMs}ms`);
        } else if (error instanceof APIError) {
          console.error(
            `GitHub API error: ${error.status} ${error.statusText}`
          );
        } else {
          console.error("Unexpected error fetching GitHub commits:", error);
        }
        return [];
      });
    }),

  getGiteaCommits: publicProcedure
    .input(z.object({ limit: z.number().default(3) }))
    .query(async ({ input }) => {
      return withCacheAndStale(
        `gitea-commits-${input.limit}`,
        CACHE_CONFIG.GIT_ACTIVITY_CACHE_TTL_MS,
        async () => {
          const reposResponse = await fetchWithTimeout(
            `${env.GITEA_URL}/api/v1/users/Mike/repos?limit=100`,
            {
              headers: {
                Authorization: `token ${env.GITEA_TOKEN}`,
                Accept: "application/json"
              },
              timeout: NETWORK_CONFIG.GITHUB_API_TIMEOUT_MS
            }
          );

          await checkResponse(reposResponse);
          const repos = await reposResponse.json();

          // Fetch commits for all repos in parallel instead of serially
          const commitResults = await Promise.allSettled(
            repos.map((repo: any) =>
              fetchWithTimeout(
                `${env.GITEA_URL}/api/v1/repos/Mike/${repo.name}/commits?limit=5`,
                {
                  headers: {
                    Authorization: `token ${env.GITEA_TOKEN}`,
                    Accept: "application/json"
                  },
                  timeout: 10000
                }
              )
                .then((res) => (res.ok ? res.json() : []))
                .catch(() => [])
            )
          );

          const allCommits: GitCommit[] = [];
          for (let i = 0; i < commitResults.length; i++) {
            const result = commitResults[i];
            if (result.status === "rejected") continue;
            const repo = repos[i];
            const commits: any[] = result.value;
            for (const commit of commits) {
              const email: string = commit.commit?.author?.email ?? "";
              if (
                email.includes("michael@freno.me") ||
                email.includes("michaelt.freno@gmail.com")
              ) {
                allCommits.push({
                  sha: commit.sha?.substring(0, 7) || "unknown",
                  message:
                    commit.commit?.message?.split("\n")[0] || "No message",
                  author:
                    commit.commit?.author?.name ||
                    repo.owner?.login ||
                    "Unknown",
                  date: commit.commit?.author?.date || new Date().toISOString(),
                  repo: repo.full_name,
                  url: `${env.GITEA_URL}/${repo.full_name}/commit/${commit.sha}`
                });
              }
            }
          }

          allCommits.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          return allCommits.slice(0, input.limit);
        },
        { maxStaleMs: CACHE_CONFIG.GIT_ACTIVITY_MAX_STALE_MS }
      ).catch((error) => {
        if (error instanceof NetworkError) {
          console.error("Gitea API unavailable (network error)");
        } else if (error instanceof TimeoutError) {
          console.error(`Gitea API timeout after ${error.timeoutMs}ms`);
        } else if (error instanceof APIError) {
          console.error(`Gitea API error: ${error.status} ${error.statusText}`);
        } else {
          console.error("Unexpected error fetching Gitea commits:", error);
        }
        return [];
      });
    }),

  getGitHubActivity: publicProcedure.query(async () => {
    return withCacheAndStale(
      "github-activity",
      CACHE_CONFIG.GIT_ACTIVITY_CACHE_TTL_MS,
      async () => {
        const query = `
        query($userName: String!) {
          user(login: $userName) {
            contributionsCollection {
              contributionCalendar {
                weeks {
                  contributionDays {
                    date
                    contributionCount
                  }
                }
              }
            }
          }
        }
      `;

        const response = await fetchWithTimeout(
          "https://api.github.com/graphql",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.GITHUB_API_TOKEN}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              query,
              variables: { userName: "MikeFreno" }
            }),
            timeout: 15000
          }
        );

        await checkResponse(response);
        const data = await response.json();

        if (data.errors) {
          console.error("GitHub GraphQL errors:", data.errors);
          throw new APIError("GraphQL query failed", 500, "GraphQL Error");
        }

        const contributions: ContributionDay[] = [];
        const weeks =
          data.data?.user?.contributionsCollection?.contributionCalendar
            ?.weeks || [];

        for (const week of weeks) {
          for (const day of week.contributionDays) {
            contributions.push({
              date: day.date,
              count: day.contributionCount
            });
          }
        }

        return contributions;
      },
      { maxStaleMs: CACHE_CONFIG.GIT_ACTIVITY_MAX_STALE_MS }
    ).catch((error) => {
      if (error instanceof NetworkError) {
        console.error("GitHub GraphQL API unavailable (network error)");
      } else if (error instanceof TimeoutError) {
        console.error(`GitHub GraphQL API timeout after ${error.timeoutMs}ms`);
      } else if (error instanceof APIError) {
        console.error(
          `GitHub GraphQL API error: ${error.status} ${error.statusText}`
        );
      } else {
        console.error("Unexpected error fetching GitHub activity:", error);
      }
      return [];
    });
  }),

  getGiteaActivity: publicProcedure.query(async () => {
    return withCacheAndStale(
      "gitea-activity",
      CACHE_CONFIG.GIT_ACTIVITY_CACHE_TTL_MS,
      async () => {
        const reposResponse = await fetchWithTimeout(
          `${env.GITEA_URL}/api/v1/user/repos?limit=100`,
          {
            headers: {
              Authorization: `token ${env.GITEA_TOKEN}`,
              Accept: "application/json"
            },
            timeout: 15000
          }
        );

        await checkResponse(reposResponse);
        const repos = await reposResponse.json();
        const contributionsByDay = new Map<string, number>();

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const sinceParam = threeMonthsAgo.toISOString();

        // Fetch commits for all repos in parallel, scoped to the 3-month window
        const commitResults = await Promise.allSettled(
          repos.map((repo: any) =>
            fetchWithTimeout(
              `${env.GITEA_URL}/api/v1/repos/${repo.owner.login}/${repo.name}/commits?limit=100&since=${sinceParam}`,
              {
                headers: {
                  Authorization: `token ${env.GITEA_TOKEN}`,
                  Accept: "application/json"
                },
                timeout: 10000
              }
            )
              .then((res) => (res.ok ? res.json() : []))
              .catch(() => [])
          )
        );

        for (const result of commitResults) {
          if (result.status === "rejected") continue;
          const commits: any[] = result.value;
          for (const commit of commits) {
            const date = new Date(commit.commit.author.date)
              .toISOString()
              .split("T")[0];
            contributionsByDay.set(
              date,
              (contributionsByDay.get(date) || 0) + 1
            );
          }
        }

        const contributions: ContributionDay[] = Array.from(
          contributionsByDay.entries()
        ).map(([date, count]) => ({ date, count }));

        return contributions;
      },
      { maxStaleMs: CACHE_CONFIG.GIT_ACTIVITY_MAX_STALE_MS }
    ).catch((error) => {
      if (error instanceof NetworkError) {
        console.error("Gitea API unavailable (network error)");
      } else if (error instanceof TimeoutError) {
        console.error(`Gitea API timeout after ${error.timeoutMs}ms`);
      } else if (error instanceof APIError) {
        console.error(`Gitea API error: ${error.status} ${error.statusText}`);
      } else {
        console.error("Unexpected error fetching Gitea activity:", error);
      }
      return [];
    });
  })
});
