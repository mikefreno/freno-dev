import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import { env } from "~/env/server";
import { withCache } from "~/server/cache";

// Types for commits
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
  // Get recent commits from GitHub
  getGitHubCommits: publicProcedure
    .input(z.object({ limit: z.number().default(3) }))
    .query(async ({ input }) => {
      return withCache(
        `github-commits-${input.limit}`,
        10 * 60 * 1000, // 10 minutes
        async () => {
          try {
            // Get user's repositories sorted by most recently pushed
            const reposResponse = await fetch(
              `https://api.github.com/users/MikeFreno/repos?sort=pushed&per_page=10`,
              {
                headers: {
                  Authorization: `Bearer ${env.GITHUB_API_TOKEN}`,
                  Accept: "application/vnd.github.v3+json"
                }
              }
            );

            if (!reposResponse.ok) {
              throw new Error(
                `GitHub repos API error: ${reposResponse.statusText}`
              );
            }

            const repos = await reposResponse.json();
            const allCommits: GitCommit[] = [];

            // Fetch recent commits from each repo
            for (const repo of repos) {
              if (allCommits.length >= input.limit * 3) break; // Get extra to sort later

              try {
                const commitsResponse = await fetch(
                  `https://api.github.com/repos/${repo.full_name}/commits?per_page=5`,
                  {
                    headers: {
                      Authorization: `Bearer ${env.GITHUB_API_TOKEN}`,
                      Accept: "application/vnd.github.v3+json"
                    }
                  }
                );

                if (commitsResponse.ok) {
                  const commits = await commitsResponse.json();
                  for (const commit of commits) {
                    // Filter for commits by the authenticated user
                    if (
                      commit.author?.login === "MikeFreno" ||
                      commit.commit?.author?.email?.includes("mike")
                    ) {
                      allCommits.push({
                        sha: commit.sha?.substring(0, 7) || "unknown",
                        message:
                          commit.commit?.message?.split("\n")[0] ||
                          "No message",
                        author:
                          commit.commit?.author?.name ||
                          commit.author?.login ||
                          "Unknown",
                        date:
                          commit.commit?.author?.date ||
                          new Date().toISOString(),
                        repo: repo.full_name,
                        url: `https://github.com/${repo.full_name}/commit/${commit.sha}`
                      });
                    }
                  }
                }
              } catch (error) {
                console.error(
                  `Error fetching commits for ${repo.full_name}:`,
                  error
                );
              }
            }

            // Sort by date and return the most recent
            allCommits.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            return allCommits.slice(0, input.limit);
          } catch (error) {
            console.error("Error fetching GitHub commits:", error);
            return [];
          }
        }
      );
    }),

  // Get recent commits from Gitea
  getGiteaCommits: publicProcedure
    .input(z.object({ limit: z.number().default(3) }))
    .query(async ({ input }) => {
      return withCache(
        `gitea-commits-${input.limit}`,
        10 * 60 * 1000, // 10 minutes
        async () => {
          try {
            // First, get user's repositories
            const reposResponse = await fetch(
              `${env.GITEA_URL}/api/v1/users/Mike/repos?limit=100`,
              {
                headers: {
                  Authorization: `token ${env.GITEA_TOKEN}`,
                  Accept: "application/json"
                }
              }
            );

            if (!reposResponse.ok) {
              throw new Error(
                `Gitea repos API error: ${reposResponse.statusText}`
              );
            }

            const repos = await reposResponse.json();
            const allCommits: GitCommit[] = [];

            // Fetch recent commits from each repo
            for (const repo of repos) {
              if (allCommits.length >= input.limit * 3) break; // Get extra to sort later

              try {
                const commitsResponse = await fetch(
                  `${env.GITEA_URL}/api/v1/repos/Mike/${repo.name}/commits?limit=5`,
                  {
                    headers: {
                      Authorization: `token ${env.GITEA_TOKEN}`,
                      Accept: "application/json"
                    }
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
                          commit.commit?.message?.split("\n")[0] ||
                          "No message",
                        author: commit.commit?.author?.name || repo.owner.login,
                        date:
                          commit.commit?.author?.date ||
                          new Date().toISOString(),
                        repo: repo.full_name,
                        url: `${env.GITEA_URL}/${repo.full_name}/commit/${commit.sha}`
                      });
                    }
                  }
                }
              } catch (error) {
                console.error(
                  `Error fetching commits for ${repo.name}:`,
                  error
                );
              }
            }

            // Sort by date and return the most recent
            allCommits.sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            return allCommits.slice(0, input.limit);
          } catch (error) {
            console.error("Error fetching Gitea commits:", error);
            return [];
          }
        }
      );
    }),

  // Get GitHub contribution activity (for heatmap)
  getGitHubActivity: publicProcedure.query(async () => {
    return withCache("github-activity", 10 * 60 * 1000, async () => {
      try {
        // Use GitHub GraphQL API for contribution data
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

        const response = await fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GITHUB_API_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query,
            variables: { userName: "MikeFreno" }
          })
        });

        if (!response.ok) {
          throw new Error(`GitHub GraphQL API error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
          console.error("GitHub GraphQL errors:", data.errors);
          throw new Error("GraphQL query failed");
        }

        // Extract contribution days from the response
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
      } catch (error) {
        console.error("Error fetching GitHub activity:", error);
        return [];
      }
    });
  }),

  // Get Gitea contribution activity (for heatmap)
  getGiteaActivity: publicProcedure.query(async () => {
    return withCache("gitea-activity", 10 * 60 * 1000, async () => {
      try {
        // Get user's repositories
        const reposResponse = await fetch(
          `${env.GITEA_URL}/api/v1/user/repos?limit=100`,
          {
            headers: {
              Authorization: `token ${env.GITEA_TOKEN}`,
              Accept: "application/json"
            }
          }
        );

        if (!reposResponse.ok) {
          throw new Error(`Gitea repos API error: ${reposResponse.statusText}`);
        }

        const repos = await reposResponse.json();
        const contributionsByDay = new Map<string, number>();

        // Get commits from each repo (last 3 months to avoid too many API calls)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        for (const repo of repos) {
          try {
            const commitsResponse = await fetch(
              `${env.GITEA_URL}/api/v1/repos/${repo.owner.login}/${repo.name}/commits?limit=100`,
              {
                headers: {
                  Authorization: `token ${env.GITEA_TOKEN}`,
                  Accept: "application/json"
                }
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
            console.error(`Error fetching commits for ${repo.name}:`, error);
          }
        }

        // Convert to array format
        const contributions: ContributionDay[] = Array.from(
          contributionsByDay.entries()
        ).map(([date, count]) => ({ date, count }));

        return contributions;
      } catch (error) {
        console.error("Error fetching Gitea activity:", error);
        return [];
      }
    });
  })
});
