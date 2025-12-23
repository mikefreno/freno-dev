import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import { env } from "~/env/server";
import { withCacheAndStale } from "~/server/cache";
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
        10 * 60 * 1000, // 10 minutes
        async () => {
          const reposResponse = await fetchWithTimeout(
            `https://api.github.com/users/MikeFreno/repos?sort=pushed&per_page=10`,
            {
              headers: {
                Authorization: `Bearer ${env.GITHUB_API_TOKEN}`,
                Accept: "application/vnd.github.v3+json"
              },
              timeout: 15000 // 15 second timeout
            }
          );

          await checkResponse(reposResponse);
          const repos = await reposResponse.json();
          const allCommits: GitCommit[] = [];

          for (const repo of repos) {
            if (allCommits.length >= input.limit * 3) break; // Get extra to sort later

            try {
              const commitsResponse = await fetchWithTimeout(
                `https://api.github.com/repos/${repo.full_name}/commits?per_page=5`,
                {
                  headers: {
                    Authorization: `Bearer ${env.GITHUB_API_TOKEN}`,
                    Accept: "application/vnd.github.v3+json"
                  },
                  timeout: 10000
                }
              );

              if (commitsResponse.ok) {
                const commits = await commitsResponse.json();
                for (const commit of commits) {
                  if (
                    commit.author?.login === "MikeFreno" ||
                    commit.commit?.author?.email?.includes("mike")
                  ) {
                    allCommits.push({
                      sha: commit.sha?.substring(0, 7) || "unknown",
                      message:
                        commit.commit?.message?.split("\n")[0] || "No message",
                      author:
                        commit.commit?.author?.name ||
                        commit.author?.login ||
                        "Unknown",
                      date:
                        commit.commit?.author?.date || new Date().toISOString(),
                      repo: repo.full_name,
                      url: `https://github.com/${repo.full_name}/commit/${commit.sha}`
                    });
                  }
                }
              }
            } catch (error) {
              if (
                error instanceof NetworkError ||
                error instanceof TimeoutError
              ) {
                console.warn(
                  `Network error fetching commits for ${repo.full_name}, skipping`
                );
              } else {
                console.error(
                  `Error fetching commits for ${repo.full_name}:`,
                  error
                );
              }
            }
          }

          allCommits.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          return allCommits.slice(0, input.limit);
        },
        { maxStaleMs: 24 * 60 * 60 * 1000 } // Accept stale data up to 24 hours old
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
        10 * 60 * 1000, // 10 minutes
        async () => {
          const reposResponse = await fetchWithTimeout(
            `${env.GITEA_URL}/api/v1/users/Mike/repos?limit=100`,
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
          const allCommits: GitCommit[] = [];

          for (const repo of repos) {
            if (allCommits.length >= input.limit * 3) break; // Get extra to sort later

            try {
              const commitsResponse = await fetchWithTimeout(
                `${env.GITEA_URL}/api/v1/repos/Mike/${repo.name}/commits?limit=5`,
                {
                  headers: {
                    Authorization: `token ${env.GITEA_TOKEN}`,
                    Accept: "application/json"
                  },
                  timeout: 10000
                }
              );

              if (commitsResponse.ok) {
                const commits = await commitsResponse.json();
                for (const commit of commits) {
                  if (
                    (commit.commit?.author?.email &&
                      commit.commit.author.email.includes(
                        "michael@freno.me"
                      )) ||
                    commit.commit.author.email.includes(
                      "michaelt.freno@gmail.com"
                    ) // Filter for your commits
                  ) {
                    allCommits.push({
                      sha: commit.sha?.substring(0, 7) || "unknown",
                      message:
                        commit.commit?.message?.split("\n")[0] || "No message",
                      author: commit.commit?.author?.name || repo.owner.login,
                      date:
                        commit.commit?.author?.date || new Date().toISOString(),
                      repo: repo.full_name,
                      url: `${env.GITEA_URL}/${repo.full_name}/commit/${commit.sha}`
                    });
                  }
                }
              }
            } catch (error) {
              if (
                error instanceof NetworkError ||
                error instanceof TimeoutError
              ) {
                console.warn(
                  `Network error fetching commits for ${repo.name}, skipping`
                );
              } else {
                console.error(
                  `Error fetching commits for ${repo.name}:`,
                  error
                );
              }
            }
          }

          allCommits.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          return allCommits.slice(0, input.limit);
        },
        { maxStaleMs: 24 * 60 * 60 * 1000 }
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

  // Get GitHub contribution activity (for heatmap)
  getGitHubActivity: publicProcedure.query(async () => {
    return withCacheAndStale(
      "github-activity",
      10 * 60 * 1000,
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
      { maxStaleMs: 24 * 60 * 60 * 1000 }
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

  // Get Gitea contribution activity (for heatmap)
  getGiteaActivity: publicProcedure.query(async () => {
    return withCacheAndStale(
      "gitea-activity",
      10 * 60 * 1000,
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

        for (const repo of repos) {
          try {
            const commitsResponse = await fetchWithTimeout(
              `${env.GITEA_URL}/api/v1/repos/${repo.owner.login}/${repo.name}/commits?limit=100`,
              {
                headers: {
                  Authorization: `token ${env.GITEA_TOKEN}`,
                  Accept: "application/json"
                },
                timeout: 10000
              }
            );

            if (commitsResponse.ok) {
              const commits = await commitsResponse.json();
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
          } catch (error) {
            if (
              error instanceof NetworkError ||
              error instanceof TimeoutError
            ) {
              console.warn(
                `Network error fetching commits for ${repo.name}, skipping`
              );
            } else {
              console.error(`Error fetching commits for ${repo.name}:`, error);
            }
          }
        }

        const contributions: ContributionDay[] = Array.from(
          contributionsByDay.entries()
        ).map(([date, count]) => ({ date, count }));

        return contributions;
      },
      { maxStaleMs: 24 * 60 * 60 * 1000 }
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
