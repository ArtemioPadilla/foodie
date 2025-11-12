import { Octokit } from '@octokit/rest';

/**
 * GitHub Service for recipe contribution
 * Handles repository forking, branch creation, and pull request submission
 */

export interface GitHubConfig {
  owner: string; // Repository owner (e.g., 'yourorg')
  repo: string; // Repository name (e.g., 'foodie')
  recipesPath: string; // Path to recipes directory (e.g., 'public/data')
}

export interface CreatePROptions {
  recipeId: string;
  recipeJson: string;
  contributorName: string;
  contributorEmail?: string;
}

export interface PRResult {
  success: boolean;
  prUrl?: string;
  prNumber?: number;
  error?: string;
}

class GitHubService {
  private octokit: Octokit | null = null;
  private config: GitHubConfig;
  private userLogin: string | null = null;

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  /**
   * Initialize Octokit with user's access token
   */
  authenticate(accessToken: string): void {
    this.octokit = new Octokit({
      auth: accessToken,
    });
  }

  /**
   * Check if service is authenticated
   */
  isAuthenticated(): boolean {
    return this.octokit !== null;
  }

  /**
   * Get authenticated user's login
   */
  async getUserLogin(): Promise<string> {
    if (this.userLogin) {
      return this.userLogin;
    }

    if (!this.octokit) {
      throw new Error('GitHub service not authenticated');
    }

    const { data } = await this.octokit.users.getAuthenticated();
    this.userLogin = data.login;
    return this.userLogin;
  }

  /**
   * Fork the repository to user's account
   */
  private async forkRepository(): Promise<string> {
    if (!this.octokit) {
      throw new Error('GitHub service not authenticated');
    }

    try {
      const userLogin = await this.getUserLogin();

      // Check if fork already exists
      try {
        await this.octokit.repos.get({
          owner: userLogin,
          repo: this.config.repo,
        });
        // Fork already exists
        return userLogin;
      } catch {
        // Fork doesn't exist, create it
      }

      // Create fork
      await this.octokit.repos.createFork({
        owner: this.config.owner,
        repo: this.config.repo,
      });

      // Wait for fork to be ready (GitHub takes a few seconds)
      await this.waitForFork(userLogin);

      return userLogin;
    } catch (error) {
      console.error('Error forking repository:', error);
      throw new Error('Failed to fork repository');
    }
  }

  /**
   * Wait for fork to be ready
   */
  private async waitForFork(owner: string, maxAttempts = 10): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHub service not authenticated');
    }

    for (let i = 0; i < maxAttempts; i++) {
      try {
        await this.octokit.repos.get({
          owner,
          repo: this.config.repo,
        });
        return; // Fork is ready
      } catch {
        // Wait 2 seconds before retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error('Fork creation timeout');
  }

  /**
   * Get the default branch of the repository
   */
  private async getDefaultBranch(owner: string): Promise<string> {
    if (!this.octokit) {
      throw new Error('GitHub service not authenticated');
    }

    const { data } = await this.octokit.repos.get({
      owner,
      repo: this.config.repo,
    });

    return data.default_branch;
  }

  /**
   * Get the SHA of the latest commit on a branch
   */
  private async getLatestCommitSha(owner: string, branch: string): Promise<string> {
    if (!this.octokit) {
      throw new Error('GitHub service not authenticated');
    }

    const { data } = await this.octokit.repos.getBranch({
      owner,
      repo: this.config.repo,
      branch,
    });

    return data.commit.sha;
  }

  /**
   * Create a new branch from the default branch
   */
  private async createBranch(
    owner: string,
    branchName: string,
    fromSha: string
  ): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHub service not authenticated');
    }

    try {
      await this.octokit.git.createRef({
        owner,
        repo: this.config.repo,
        ref: `refs/heads/${branchName}`,
        sha: fromSha,
      });
    } catch (error: any) {
      // Branch might already exist, that's ok
      if (error?.status !== 422) {
        throw error;
      }
    }
  }

  /**
   * Create or update a file in the repository
   */
  private async createFile(
    owner: string,
    branch: string,
    path: string,
    content: string,
    message: string
  ): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHub service not authenticated');
    }

    const contentEncoded = Buffer.from(content, 'utf-8').toString('base64');

    // Check if file already exists
    let sha: string | undefined;
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo: this.config.repo,
        path,
        ref: branch,
      });

      if ('sha' in data) {
        sha = data.sha;
      }
    } catch {
      // File doesn't exist, that's ok
    }

    await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo: this.config.repo,
      path,
      message,
      content: contentEncoded,
      branch,
      sha, // Include SHA if updating existing file
    });
  }

  /**
   * Create a pull request
   */
  private async createPullRequest(
    owner: string,
    branch: string,
    title: string,
    body: string
  ): Promise<{ url: string; number: number }> {
    if (!this.octokit) {
      throw new Error('GitHub service not authenticated');
    }

    const { data } = await this.octokit.pulls.create({
      owner: this.config.owner,
      repo: this.config.repo,
      title,
      head: `${owner}:${branch}`,
      base: await this.getDefaultBranch(this.config.owner),
      body,
      maintainer_can_modify: true,
    });

    return {
      url: data.html_url,
      number: data.number,
    };
  }

  /**
   * Submit a recipe as a pull request
   */
  async submitRecipe(options: CreatePROptions): Promise<PRResult> {
    try {
      if (!this.octokit) {
        return {
          success: false,
          error: 'Not authenticated. Please sign in with GitHub.',
        };
      }

      // 1. Fork the repository
      const forkOwner = await this.forkRepository();

      // 2. Get the default branch and latest commit
      const defaultBranch = await this.getDefaultBranch(forkOwner);
      const latestSha = await this.getLatestCommitSha(forkOwner, defaultBranch);

      // 3. Create a new branch
      const branchName = `recipe/${options.recipeId}`;
      await this.createBranch(forkOwner, branchName, latestSha);

      // 4. Create the recipe file
      const filePath = `${this.config.recipesPath}/${options.recipeId}.json`;
      const commitMessage = `Add recipe: ${options.recipeId}`;
      await this.createFile(forkOwner, branchName, filePath, options.recipeJson, commitMessage);

      // 5. Create pull request
      const prTitle = `Add recipe: ${options.recipeId}`;
      const prBody = `## New Recipe Contribution

**Recipe ID**: \`${options.recipeId}\`
**Contributed by**: ${options.contributorName}${options.contributorEmail ? ` (${options.contributorEmail})` : ''}

### Description
This pull request adds a new recipe to the Foodie app.

### Checklist
- [x] Recipe follows the correct JSON schema
- [x] Recipe includes all required fields
- [x] Recipe has been tested in the contribution wizard
- [ ] Recipe has been reviewed for quality and accuracy

---

🤖 This PR was created automatically via the Foodie Recipe Contribution Wizard.

Co-Authored-By: ${options.contributorName} ${options.contributorEmail ? `<${options.contributorEmail}>` : ''}
`;

      const pr = await this.createPullRequest(forkOwner, branchName, prTitle, prBody);

      return {
        success: true,
        prUrl: pr.url,
        prNumber: pr.number,
      };
    } catch (error: any) {
      console.error('Error submitting recipe:', error);

      let errorMessage = 'Failed to submit recipe. Please try again.';

      if (error?.status === 401) {
        errorMessage = 'Authentication failed. Please sign in again.';
      } else if (error?.status === 403) {
        errorMessage = 'Permission denied. Please check your GitHub permissions.';
      } else if (error?.status === 404) {
        errorMessage = 'Repository not found. Please check the configuration.';
      } else if (error?.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if a recipe with the given ID already exists
   */
  async recipeExists(recipeId: string): Promise<boolean> {
    if (!this.octokit) {
      throw new Error('GitHub service not authenticated');
    }

    try {
      const filePath = `${this.config.recipesPath}/${recipeId}.json`;
      await this.octokit.repos.getContent({
        owner: this.config.owner,
        repo: this.config.repo,
        path: filePath,
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let githubServiceInstance: GitHubService | null = null;

/**
 * Initialize the GitHub service with configuration
 */
export function initializeGitHubService(config: GitHubConfig): GitHubService {
  if (!githubServiceInstance) {
    githubServiceInstance = new GitHubService(config);
  }
  return githubServiceInstance;
}

/**
 * Get the GitHub service instance
 */
export function getGitHubService(): GitHubService {
  if (!githubServiceInstance) {
    throw new Error('GitHub service not initialized. Call initializeGitHubService() first.');
  }
  return githubServiceInstance;
}

export default GitHubService;
