import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../utils";
import { env } from "~/env/server";

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
      try {
        const response = await fetch(
          `https://api.github.com/users/MikeFreno/events`,
          {
            headers: {
              Authorization: `Bearer ${env.GITHUB_API_TOKEN}`,
              Accept: "application/vnd.github.v3+json"
            }
          }
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const events = await response.json();

        // Filter for push events and extract commits
        const commits: GitCommit[] = [];
        for (const event of events) {
          if (event.type === "PushEvent" && commits.length < input.limit) {
            for (const commit of event.payload.commits || []) {
              if (commits.length >= input.limit) break;
              commits.push({
                sha: commit.sha.substring(0, 7),
                message: commit.message.split("\n")[0], // First line only
                author: event.actor.login,
                date: event.created_at,
                repo: event.repo.name,
                url: `https://github.com/${event.repo.name}/commit/${commit.sha}`
              });
            }
          }
        }

        return commits;
      } catch (error) {
        console.error("Error fetching GitHub commits:", error);
        return [];
      }
    }),

  // Get recent commits from Gitea
  getGiteaCommits: publicProcedure
    .input(z.object({ limit: z.number().default(3) }))
    .query(async ({ input }) => {
      try {
        // First, get user's repos
        const reposResponse = await fetch(
          `${env.GITEA_URL}/api/v1/user/repos`,
          {
            headers: {
              Authorization: `token ${env.GITEA_TOKEN}`,
              Accept: "application/json"
            }
          }
        );

        if (!reposResponse.ok) {
          throw new Error(`Gitea API error: ${reposResponse.statusText}`);
        }

        const repos = await reposResponse.json();
        const commits: GitCommit[] = [];

        // Get commits from each repo
        for (const repo of repos) {
          if (commits.length >= input.limit) break;

          try {
            const commitsResponse = await fetch(
              `${env.GITEA_URL}/api/v1/repos/${repo.owner.login}/${repo.name}/commits?limit=${input.limit}`,
              {
                headers: {
                  Authorization: `token ${env.GITEA_TOKEN}`,
                  Accept: "application/json"
                }
              }
            );

            if (commitsResponse.ok) {
              const repoCommits = await commitsResponse.json();
              for (const commit of repoCommits) {
                if (commits.length >= input.limit) break;
                commits.push({
                  sha: commit.sha.substring(0, 7),
                  message: commit.commit.message.split("\n")[0],
                  author: commit.commit.author.name,
                  date: commit.commit.author.date,
                  repo: `${repo.owner.login}/${repo.name}`,
                  url: `${env.GITEA_URL}/${repo.owner.login}/${repo.name}/commit/${commit.sha}`
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching commits for ${repo.name}:`, error);
          }
        }

        // Sort by date and return top N
        return commits
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          .slice(0, input.limit);
      } catch (error) {
        console.error("Error fetching Gitea commits:", error);
        return [];
      }
    }),

  // Get GitHub contribution activity (for heatmap)
  getGitHubActivity: publicProcedure.query(async () => {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const response = await fetch(
        `https://api.github.com/users/MikeFreno/events?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${env.GITHUB_API_TOKEN}`,
            Accept: "application/vnd.github.v3+json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const events = await response.json();

      // Count contributions by day
      const contributionsByDay = new Map<string, number>();

      for (const event of events) {
        const date = new Date(event.created_at).toISOString().split("T")[0];
        contributionsByDay.set(date, (contributionsByDay.get(date) || 0) + 1);
      }

      // Convert to array format
      const contributions: ContributionDay[] = Array.from(
        contributionsByDay.entries()
      ).map(([date, count]) => ({ date, count }));

      return contributions;
    } catch (error) {
      console.error("Error fetching GitHub activity:", error);
      return [];
    }
  }),

  // Get Gitea contribution activity (for heatmap)
  getGiteaActivity: publicProcedure.query(async () => {
    try {
      // Get all user repos
      const reposResponse = await fetch(`${env.GITEA_URL}/api/v1/user/repos`, {
        headers: {
          Authorization: `token ${env.GITEA_TOKEN}`,
          Accept: "application/json"
        }
      });

      if (!reposResponse.ok) {
        throw new Error(`Gitea API error: ${reposResponse.statusText}`);
      }

      const repos = await reposResponse.json();
      const contributionsByDay = new Map<string, number>();

      // Fetch commits from all repos
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
  })
});
