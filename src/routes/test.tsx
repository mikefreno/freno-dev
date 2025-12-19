import { createSignal, For, Show } from "solid-js";
import { query, createAsync } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { api } from "~/lib/api";

const getAuthState = query(async () => {
  "use server";
  const { getPrivilegeLevel } = await import("~/server/utils");
  const event = getRequestEvent()!;
  const privilegeLevel = await getPrivilegeLevel(event.nativeEvent);

  return { privilegeLevel };
}, "test-auth-state");

type EndpointTest = {
  name: string;
  router: string;
  procedure: string;
  method: "query" | "mutation";
  sampleInput?: object;
  description: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
};

type RouterSection = {
  name: string;
  description: string;
  endpoints: EndpointTest[];
};

const routerSections: RouterSection[] = [
  // ============================================================
  // Example Router
  // ============================================================
  {
    name: "Example Router",
    description:
      "Example endpoints demonstrating public, protected, and admin procedures",
    endpoints: [
      {
        name: "Hello",
        router: "example",
        procedure: "hello",
        method: "query",
        description: "Simple hello world endpoint",
        sampleInput: "World"
      },
      {
        name: "Get Profile",
        router: "example",
        procedure: "getProfile",
        method: "query",
        description: "Get authenticated user profile",
        requiresAuth: true
      },
      {
        name: "Admin Dashboard",
        router: "example",
        procedure: "adminDashboard",
        method: "query",
        description: "Access admin dashboard",
        requiresAdmin: true
      }
    ]
  },

  // ============================================================
  // Auth Router
  // ============================================================
  {
    name: "Auth Router",
    description: "OAuth callbacks and email-based authentication",
    endpoints: [
      {
        name: "Email Registration",
        router: "auth",
        procedure: "emailRegistration",
        method: "mutation",
        description: "Register new user with email/password",
        sampleInput: {
          email: "newuser@example.com",
          password: "SecurePass123!",
          passwordConfirmation: "SecurePass123!"
        }
      },
      {
        name: "Email Password Login",
        router: "auth",
        procedure: "emailPasswordLogin",
        method: "mutation",
        description: "Login with email and password",
        sampleInput: {
          email: "test@example.com",
          password: "SecurePass123!",
          rememberMe: true
        }
      },
      {
        name: "Request Email Link Login",
        router: "auth",
        procedure: "requestEmailLinkLogin",
        method: "mutation",
        description: "Request magic link login email",
        sampleInput: {
          email: "test@example.com",
          rememberMe: false
        }
      },
      {
        name: "Email Login (with token)",
        router: "auth",
        procedure: "emailLogin",
        method: "mutation",
        description: "Complete magic link login",
        sampleInput: {
          email: "test@example.com",
          token: "eyJhbGciOiJIUzI1NiJ9...",
          rememberMe: true
        },
        requiresAuth: false
      },
      {
        name: "Request Password Reset",
        router: "auth",
        procedure: "requestPasswordReset",
        method: "mutation",
        description: "Send password reset email",
        sampleInput: {
          email: "test@example.com"
        }
      },
      {
        name: "Reset Password",
        router: "auth",
        procedure: "resetPassword",
        method: "mutation",
        description: "Reset password with token from email",
        sampleInput: {
          token: "eyJhbGciOiJIUzI1NiJ9...",
          newPassword: "NewSecurePass123!",
          newPasswordConfirmation: "NewSecurePass123!"
        }
      },
      {
        name: "Resend Email Verification",
        router: "auth",
        procedure: "resendEmailVerification",
        method: "mutation",
        description: "Resend verification email",
        sampleInput: {
          email: "test@example.com"
        }
      },
      {
        name: "Email Verification",
        router: "auth",
        procedure: "emailVerification",
        method: "mutation",
        description: "Verify email with token",
        sampleInput: {
          email: "test@example.com",
          token: "eyJhbGciOiJIUzI1NiJ9..."
        }
      },
      {
        name: "Sign Out",
        router: "auth",
        procedure: "signOut",
        method: "mutation",
        description: "Clear session cookies and sign out"
      },
      {
        name: "GitHub Callback",
        router: "auth",
        procedure: "githubCallback",
        method: "mutation",
        description: "Complete GitHub OAuth flow",
        sampleInput: { code: "github_oauth_code_here" }
      },
      {
        name: "Google Callback",
        router: "auth",
        procedure: "googleCallback",
        method: "mutation",
        description: "Complete Google OAuth flow",
        sampleInput: { code: "google_oauth_code_here" }
      }
    ]
  },

  // ============================================================
  // Database Router
  // ============================================================
  {
    name: "Database - Comment Reactions",
    description: "Add/remove reactions to comments",
    endpoints: [
      {
        name: "Get Comment Reactions",
        router: "database",
        procedure: "getCommentReactions",
        method: "query",
        description: "Get all reactions for a comment",
        sampleInput: { commentID: "comment_123" }
      },
      {
        name: "Add Comment Reaction",
        router: "database",
        procedure: "addCommentReaction",
        method: "mutation",
        description: "Add a reaction to a comment",
        sampleInput: {
          type: "👍",
          comment_id: "comment_123",
          user_id: "user_123"
        }
      },
      {
        name: "Remove Comment Reaction",
        router: "database",
        procedure: "removeCommentReaction",
        method: "mutation",
        description: "Remove a reaction from a comment",
        sampleInput: {
          type: "👍",
          comment_id: "comment_123",
          user_id: "user_123"
        }
      }
    ]
  },
  {
    name: "Database - Comments",
    description: "Fetch comments for posts",
    endpoints: [
      {
        name: "Get All Comments",
        router: "database",
        procedure: "getAllComments",
        method: "query",
        description: "Fetch all comments in the system"
      },
      {
        name: "Get Comments by Post ID",
        router: "database",
        procedure: "getCommentsByPostId",
        method: "query",
        description: "Fetch comments for a specific post",
        sampleInput: { post_id: "post_123" }
      }
    ]
  },
  {
    name: "Database - Posts",
    description: "CRUD operations for blog posts",
    endpoints: [
      {
        name: "Get Post by ID",
        router: "database",
        procedure: "getPostById",
        method: "query",
        description: "Fetch a post by ID with tags",
        sampleInput: { category: "blog", id: 1 }
      },
      {
        name: "Get Post by Title",
        router: "database",
        procedure: "getPostByTitle",
        method: "query",
        description: "Fetch post with comments, likes, and tags",
        sampleInput: { category: "blog", title: "My Blog Post" }
      },
      {
        name: "Create Post",
        router: "database",
        procedure: "createPost",
        method: "mutation",
        description: "Create a new blog post",
        sampleInput: {
          category: "blog",
          title: "Test Post",
          subtitle: "A test subtitle",
          body: "Post content here",
          banner_photo: null,
          published: false,
          tags: ["tech", "coding"],
          author_id: "user_123"
        }
      },
      {
        name: "Update Post",
        router: "database",
        procedure: "updatePost",
        method: "mutation",
        description: "Update an existing post",
        sampleInput: {
          id: 1,
          title: "Updated Title",
          published: true,
          author_id: "user_123"
        }
      },
      {
        name: "Delete Post",
        router: "database",
        procedure: "deletePost",
        method: "mutation",
        description: "Delete a post and its associated data",
        sampleInput: { id: 1 }
      }
    ]
  },
  {
    name: "Database - Post Likes",
    description: "Like/unlike posts",
    endpoints: [
      {
        name: "Add Post Like",
        router: "database",
        procedure: "addPostLike",
        method: "mutation",
        description: "Add a like to a post",
        sampleInput: { user_id: "user_123", post_id: "post_123" }
      },
      {
        name: "Remove Post Like",
        router: "database",
        procedure: "removePostLike",
        method: "mutation",
        description: "Remove a like from a post",
        sampleInput: { user_id: "user_123", post_id: "post_123" }
      }
    ]
  },
  {
    name: "Database - Users",
    description: "User profile and data management",
    endpoints: [
      {
        name: "Get User by ID",
        router: "database",
        procedure: "getUserById",
        method: "query",
        description: "Fetch complete user data by ID",
        sampleInput: { id: "user_123" }
      },
      {
        name: "Get User Public Data",
        router: "database",
        procedure: "getUserPublicData",
        method: "query",
        description: "Fetch public user data (email, name, image)",
        sampleInput: { id: "user_123" }
      },
      {
        name: "Get User Image",
        router: "database",
        procedure: "getUserImage",
        method: "query",
        description: "Fetch user image URL",
        sampleInput: { id: "user_123" }
      },
      {
        name: "Update User Image",
        router: "database",
        procedure: "updateUserImage",
        method: "mutation",
        description: "Update user profile image",
        sampleInput: { id: "user_123", imageURL: "path/to/image.jpg" }
      },
      {
        name: "Update User Email",
        router: "database",
        procedure: "updateUserEmail",
        method: "mutation",
        description: "Update user email address",
        sampleInput: {
          id: "user_123",
          newEmail: "new@example.com",
          oldEmail: "old@example.com"
        }
      }
    ]
  },

  // ============================================================
  // User Router
  // ============================================================
  {
    name: "User Router",
    description: "User profile management and account operations",
    endpoints: [
      {
        name: "Get Profile",
        router: "user",
        procedure: "getProfile",
        method: "query",
        description: "Get current user's profile",
        requiresAuth: true
      },
      {
        name: "Update Email",
        router: "user",
        procedure: "updateEmail",
        method: "mutation",
        description: "Update user's email address",
        sampleInput: { email: "newemail@example.com" },
        requiresAuth: true
      },
      {
        name: "Update Display Name",
        router: "user",
        procedure: "updateDisplayName",
        method: "mutation",
        description: "Update user's display name",
        sampleInput: { displayName: "New Display Name" },
        requiresAuth: true
      },
      {
        name: "Update Profile Image",
        router: "user",
        procedure: "updateProfileImage",
        method: "mutation",
        description: "Update user's profile image URL",
        sampleInput: { imageUrl: "https://example.com/image.jpg" },
        requiresAuth: true
      },
      {
        name: "Change Password",
        router: "user",
        procedure: "changePassword",
        method: "mutation",
        description: "Change password (requires old password)",
        sampleInput: {
          oldPassword: "oldpass123",
          newPassword: "newpass123",
          newPasswordConfirmation: "newpass123"
        },
        requiresAuth: true
      },
      {
        name: "Set Password",
        router: "user",
        procedure: "setPassword",
        method: "mutation",
        description: "Set password for OAuth users",
        sampleInput: {
          newPassword: "newpass123",
          newPasswordConfirmation: "newpass123"
        },
        requiresAuth: true
      },
      {
        name: "Delete Account",
        router: "user",
        procedure: "deleteAccount",
        method: "mutation",
        description: "Delete account (anonymize user data)",
        sampleInput: { password: "mypassword123" },
        requiresAuth: true
      }
    ]
  },

  // ============================================================
  // Misc Router
  // ============================================================
  {
    name: "Misc - Downloads",
    description: "Generate signed URLs for downloadable assets",
    endpoints: [
      {
        name: "Get Download URL",
        router: "misc",
        procedure: "getDownloadUrl",
        method: "query",
        description: "Get signed S3 URL for asset download",
        sampleInput: { asset_name: "shapes-with-abigail" }
      }
    ]
  },
  {
    name: "Misc - S3 Operations",
    description: "S3 image upload/delete operations",
    endpoints: [
      {
        name: "Get Pre-Signed URL",
        router: "misc",
        procedure: "getPreSignedURL",
        method: "mutation",
        description: "Get signed URL for S3 upload",
        sampleInput: {
          type: "blog",
          title: "my-post",
          filename: "image.jpg"
        }
      },
      {
        name: "Delete Image",
        router: "misc",
        procedure: "deleteImage",
        method: "mutation",
        description: "Delete image from S3 and update DB",
        sampleInput: {
          key: "blog/my-post/image.jpg",
          newAttachmentString: "[]",
          type: "Post",
          id: 1
        }
      },
      {
        name: "Simple Delete Image",
        router: "misc",
        procedure: "simpleDeleteImage",
        method: "mutation",
        description: "Delete image from S3 only",
        sampleInput: { key: "blog/my-post/image.jpg" }
      }
    ]
  },
  {
    name: "Misc - Password Utilities",
    description: "Password hashing and verification",
    endpoints: [
      {
        name: "Hash Password",
        router: "misc",
        procedure: "hashPassword",
        method: "mutation",
        description: "Hash a password with bcrypt",
        sampleInput: { password: "mypassword123" }
      },
      {
        name: "Check Password",
        router: "misc",
        procedure: "checkPassword",
        method: "mutation",
        description: "Verify password against hash",
        sampleInput: {
          password: "mypassword123",
          hash: "$2b$10$..."
        }
      }
    ]
  },

  // ============================================================
  // Lineage Router
  // ============================================================
  {
    name: "Lineage - JSON Service",
    description: "Static game data - no authentication required",
    endpoints: [
      {
        name: "Get Items",
        router: "lineage.jsonService",
        procedure: "items",
        method: "query",
        description: "Get all item data (weapons, armor, potions, etc.)"
      },
      {
        name: "Get Attacks",
        router: "lineage.jsonService",
        procedure: "attacks",
        method: "query",
        description: "Get all attack and spell data"
      },
      {
        name: "Get Conditions",
        router: "lineage.jsonService",
        procedure: "conditions",
        method: "query",
        description: "Get all condition and debilitation data"
      },
      {
        name: "Get Dungeons",
        router: "lineage.jsonService",
        procedure: "dungeons",
        method: "query",
        description: "Get all dungeon and encounter data"
      },
      {
        name: "Get Enemies",
        router: "lineage.jsonService",
        procedure: "enemies",
        method: "query",
        description: "Get all enemy and boss data"
      },
      {
        name: "Get Misc",
        router: "lineage.jsonService",
        procedure: "misc",
        method: "query",
        description: "Get misc game data (jobs, activities, etc.)"
      }
    ]
  },
  {
    name: "Lineage - Authentication",
    description: "User registration and login endpoints",
    endpoints: [
      {
        name: "Email Registration",
        router: "lineage.auth",
        procedure: "emailRegistration",
        method: "mutation",
        description: "Register new user with email/password",
        sampleInput: {
          email: "test@example.com",
          password: "password123",
          password_conf: "password123"
        }
      },
      {
        name: "Email Login",
        router: "lineage.auth",
        procedure: "emailLogin",
        method: "mutation",
        description: "Login with email/password (requires verified email)",
        sampleInput: { email: "test@example.com", password: "password123" }
      },
      {
        name: "Email Verification",
        router: "lineage.auth",
        procedure: "emailVerification",
        method: "mutation",
        description: "Verify email with token from email",
        sampleInput: { token: "eyJhbGciOiJIUzI1NiJ9..." }
      },
      {
        name: "Refresh Verification Email",
        router: "lineage.auth",
        procedure: "refreshVerification",
        method: "mutation",
        description: "Resend verification email",
        sampleInput: { email: "test@example.com" }
      },
      {
        name: "Refresh Auth Token",
        router: "lineage.auth",
        procedure: "refreshToken",
        method: "mutation",
        description: "Refresh expired JWT token",
        sampleInput: {
          email: "test@example.com",
          authToken: "eyJhbGciOiJIUzI1NiJ9..."
        },
        requiresAuth: true
      },
      {
        name: "Google Registration",
        router: "lineage.auth",
        procedure: "googleRegistration",
        method: "mutation",
        description: "Register/login with Google OAuth",
        sampleInput: { idToken: "google_id_token_here" }
      },
      {
        name: "Apple Registration",
        router: "lineage.auth",
        procedure: "appleRegistration",
        method: "mutation",
        description: "Register/login with Apple Sign In",
        sampleInput: {
          userString: "apple_user_string_here",
          email: "user@privaterelay.appleid.com"
        }
      },
      {
        name: "Apple Get Email",
        router: "lineage.auth",
        procedure: "appleGetEmail",
        method: "mutation",
        description: "Get email from Apple user string",
        sampleInput: { userString: "apple_user_string_here" }
      }
    ]
  },
  {
    name: "Lineage - Database Management",
    description: "User database credentials and deletion workflow",
    endpoints: [
      {
        name: "Get Credentials",
        router: "lineage.database",
        procedure: "credentials",
        method: "mutation",
        description: "Get per-user database credentials",
        sampleInput: {
          email: "test@example.com",
          provider: "email",
          authToken: "jwt_token_here"
        },
        requiresAuth: true
      },
      {
        name: "Init Deletion",
        router: "lineage.database",
        procedure: "deletionInit",
        method: "mutation",
        description: "Start 24hr database deletion countdown",
        sampleInput: {
          email: "test@example.com",
          db_name: "db_name",
          db_token: "db_token",
          authToken: "jwt_token"
        },
        requiresAuth: true
      },
      {
        name: "Check Deletion Status",
        router: "lineage.database",
        procedure: "deletionCheck",
        method: "mutation",
        description: "Check if deletion is scheduled",
        sampleInput: {
          email: "test@example.com",
          db_name: "db_name",
          db_token: "db_token",
          authToken: "jwt_token"
        },
        requiresAuth: true
      },
      {
        name: "Cancel Deletion",
        router: "lineage.database",
        procedure: "deletionCancel",
        method: "mutation",
        description: "Cancel scheduled database deletion",
        sampleInput: {
          email: "test@example.com",
          db_name: "db_name",
          db_token: "db_token",
          authToken: "jwt_token"
        },
        requiresAuth: true
      },
      {
        name: "Deletion Cron",
        router: "lineage.database",
        procedure: "deletionCron",
        method: "query",
        description: "Cleanup expired databases (runs via cron)"
      }
    ]
  },
  {
    name: "Lineage - PvP",
    description: "Player vs Player matchmaking and battle system",
    endpoints: [
      {
        name: "Register Character",
        router: "lineage.pvp",
        procedure: "registerCharacter",
        method: "mutation",
        description: "Register/update character for PvP",
        sampleInput: {
          character: {
            playerClass: "Mage",
            name: "TestMage",
            maxHealth: 100,
            maxSanity: 100,
            maxMana: 150,
            baseManaRegen: 10,
            strength: 5,
            intelligence: 15,
            dexterity: 10,
            resistanceTable: "{}",
            damageTable: "{}",
            attackStrings: "[]",
            knownSpells: "[]"
          },
          linkID: "unique_player_id_here"
        }
      },
      {
        name: "Get Opponents",
        router: "lineage.pvp",
        procedure: "getOpponents",
        method: "query",
        description: "Get 3 random PvP opponents"
      },
      {
        name: "Record Battle Result",
        router: "lineage.pvp",
        procedure: "battleResult",
        method: "mutation",
        description: "Record PvP battle outcome",
        sampleInput: {
          winnerID: "player_id_1",
          loserID: "player_id_2"
        }
      }
    ]
  },
  {
    name: "Lineage - Misc",
    description: "Analytics, device tokens, and utility endpoints",
    endpoints: [
      {
        name: "Track Analytics",
        router: "lineage.misc",
        procedure: "analytics",
        method: "mutation",
        description: "Store player analytics data",
        sampleInput: {
          playerID: "player_123",
          dungeonProgression: { dungeon_1: 5 },
          playerClass: "Mage",
          spellCount: 10,
          proficiencies: { fire: 3 },
          jobs: { blacksmith: 2 },
          resistanceTable: { fire: 10 },
          damageTable: { physical: 5 }
        }
      },
      {
        name: "Update Device Token",
        router: "lineage.misc",
        procedure: "tokens",
        method: "mutation",
        description: "Register/update push notification token",
        sampleInput: { token: "device_push_token_here" }
      },
      {
        name: "Offline Secret",
        router: "lineage.misc",
        procedure: "offlineSecret",
        method: "query",
        description: "Get offline serialization secret"
      }
    ]
  },
  {
    name: "Lineage - Maintenance (Admin Only)",
    description: "Database cleanup and administrative endpoints",
    endpoints: [
      {
        name: "Find Loose Databases",
        router: "lineage.maintenance",
        procedure: "findLooseDatabases",
        method: "query",
        description: "Find orphaned databases not linked to users",
        requiresAdmin: true
      },
      {
        name: "Cleanup Expired Databases",
        router: "lineage.maintenance",
        procedure: "cleanupExpiredDatabases",
        method: "query",
        description: "Delete databases past 24hr deletion window",
        requiresAdmin: true
      }
    ]
  }
];

export default function TestPage() {
  const authState = createAsync(() => getAuthState());

  const [expandedSections, setExpandedSections] = createSignal<Set<string>>(
    new Set()
  );
  const [results, setResults] = createSignal<Record<string, any>>({});
  const [loading, setLoading] = createSignal<Record<string, boolean>>({});
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [inputEdits, setInputEdits] = createSignal<Record<string, string>>({});

  const toggleSection = (sectionName: string) => {
    const expanded = new Set(expandedSections());
    if (expanded.has(sectionName)) {
      expanded.delete(sectionName);
    } else {
      expanded.add(sectionName);
    }
    setExpandedSections(expanded);
  };

  const testEndpoint = async (endpoint: EndpointTest) => {
    const key = `${endpoint.router}.${endpoint.procedure}`;
    setLoading({ ...loading(), [key]: true });
    setErrors({ ...errors(), [key]: "" });

    try {
      // Get input - either from edited JSON or sample
      let input = endpoint.sampleInput;
      const editedInput = inputEdits()[key];
      if (editedInput) {
        try {
          // Try to parse as JSON (handles objects, arrays, strings in quotes, numbers, booleans)
          input = JSON.parse(editedInput);
        } catch (e) {
          throw new Error("Invalid JSON in input field");
        }
      }

      // Navigate the router path (handles nested routers like "lineage.auth")
      const routerParts = endpoint.router.split(".");
      let currentRouter: any = api;

      for (const part of routerParts) {
        currentRouter = currentRouter[part];
        if (!currentRouter) {
          throw new Error(`Router path not found: ${endpoint.router}`);
        }
      }

      const procedure = currentRouter[endpoint.procedure];
      if (!procedure) {
        throw new Error(
          `Procedure not found: ${endpoint.router}.${endpoint.procedure}`
        );
      }

      // Call the tRPC procedure with proper method
      const data =
        endpoint.method === "query"
          ? await procedure.query(input)
          : await procedure.mutate(input);

      setResults({ ...results(), [key]: data });
    } catch (error: any) {
      setErrors({ ...errors(), [key]: error.message || String(error) });
    } finally {
      setLoading({ ...loading(), [key]: false });
    }
  };

  const updateInput = (key: string, value: string) => {
    setInputEdits({ ...inputEdits(), [key]: value });
  };

  return (
    <Show
      when={authState()?.privilegeLevel === "admin"}
      fallback={
        <div class="w-full pt-[30vh] text-center">
          <div class="text-text text-2xl">Unauthorized</div>
          <div class="text-subtext0 mt-4">
            You must be an admin to access this page.
          </div>
        </div>
      }
    >
      <main class="min-h-screen p-8">
        <div class="mx-auto max-w-6xl">
          <div class="bg-surface0 mb-6 rounded-lg p-6 shadow-lg">
            <h1 class="mb-2 text-3xl font-bold">tRPC API Testing Dashboard</h1>
            <p class="text-text mb-4">
              Complete API coverage: Example, Auth, Database, User, Misc, and
              Lineage routers
            </p>

            <div class="border-lavender bg-mauve rounded border p-4">
              <p class="text-base text-sm">
                <strong>Quick Start:</strong> Expand any section below to test
                endpoints. Public endpoints work immediately. Auth-required
                endpoints need valid tokens.
              </p>
            </div>
          </div>

          <div class="space-y-4">
            <For each={routerSections}>
              {(section) => {
                const isExpanded = () => expandedSections().has(section.name);

                return (
                  <div class="bg-surface0 rounded-lg shadow">
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(section.name)}
                      class="flex w-full items-center justify-between px-6 py-4 transition"
                    >
                      <div class="text-left">
                        <h2 class="text-xl font-bold">{section.name}</h2>
                        <p class="text-subtext0 text-sm">
                          {section.description}
                        </p>
                        <p class="text-subtext1 mt-1 text-xs">
                          {section.endpoints.length} endpoint
                          {section.endpoints.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div class="text-subtext1 text-2xl">
                        {isExpanded() ? "−" : "+"}
                      </div>
                    </button>

                    {/* Section Content */}
                    <Show when={isExpanded()}>
                      <div class="border-base space-y-4 border-t p-6">
                        <For each={section.endpoints}>
                          {(endpoint) => {
                            const key = `${endpoint.router}.${endpoint.procedure}`;
                            const hasInput = endpoint.sampleInput !== undefined;
                            const displayInput = () => {
                              if (inputEdits()[key]) {
                                return inputEdits()[key];
                              }
                              // Handle primitive values (string, number, boolean)
                              if (typeof endpoint.sampleInput === "string") {
                                return `"${endpoint.sampleInput}"`;
                              }
                              if (
                                typeof endpoint.sampleInput === "number" ||
                                typeof endpoint.sampleInput === "boolean"
                              ) {
                                return String(endpoint.sampleInput);
                              }
                              // Handle objects and arrays
                              return JSON.stringify(
                                endpoint.sampleInput,
                                null,
                                2
                              );
                            };

                            return (
                              <div class="bg-surface2 border-surface1 rounded-lg border p-4">
                                {/* Endpoint Header */}
                                <div class="mb-3 flex items-start justify-between">
                                  <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                      <h3 class="text-subtext0 text-lg font-semibold">
                                        {endpoint.name}
                                      </h3>
                                      <Show when={endpoint.requiresAuth}>
                                        <span class="bg-surface1 text-yellow rounded px-2 py-1 text-xs">
                                          🔒 Auth Required
                                        </span>
                                      </Show>
                                      <Show when={endpoint.requiresAdmin}>
                                        <span class="bg-maroon rounded px-2 py-1 text-base text-xs">
                                          👑 Admin Only
                                        </span>
                                      </Show>
                                    </div>
                                    <p class="mt-1 text-sm text-gray-600">
                                      {endpoint.description}
                                    </p>
                                    <div class="mt-2 flex gap-2">
                                      <code class="bg-surface0 rounded px-2 py-1 text-xs">
                                        {key}
                                      </code>
                                      <span class="bg-blue text-text rounded px-2 py-1 text-xs">
                                        {endpoint.method === "query"
                                          ? "GET"
                                          : "POST"}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => testEndpoint(endpoint)}
                                    disabled={loading()[key]}
                                    class="bg-green ml-4 rounded px-4 py-2 text-base font-semibold whitespace-nowrap transition hover:brightness-125 disabled:brightness-50"
                                  >
                                    {loading()[key] ? "Testing..." : "Test"}
                                  </button>
                                </div>

                                {/* Input Editor */}
                                <Show when={hasInput}>
                                  <div class="mb-3">
                                    <label class="text-text mb-1 block text-xs font-semibold">
                                      Request Body (edit JSON):
                                    </label>
                                    <textarea
                                      value={displayInput()}
                                      onInput={(e) =>
                                        updateInput(key, e.currentTarget.value)
                                      }
                                      class="border-lavender bg-crust min-h-[100px] w-full rounded border p-2 font-mono text-xs"
                                      spellcheck={false}
                                    />
                                  </div>
                                </Show>

                                {/* Error Display */}
                                <Show when={errors()[key]}>
                                  <div class="mb-3 rounded border border-red-200 bg-red-50 p-3">
                                    <p class="text-sm font-semibold text-red-800">
                                      Error:
                                    </p>
                                    <p class="font-mono text-sm text-red-600">
                                      {errors()[key]}
                                    </p>
                                  </div>
                                </Show>

                                {/* Results Display */}
                                <Show when={results()[key]}>
                                  <div class="rounded bg-gray-900 p-3">
                                    <p class="mb-2 text-xs font-semibold text-green-400">
                                      ✓ Response:
                                    </p>
                                    <pre class="max-h-60 overflow-auto text-xs text-green-400">
                                      {JSON.stringify(results()[key], null, 2)}
                                    </pre>
                                  </div>
                                </Show>
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>

          {/* Footer Instructions */}
          <div class="bg-overlay2 mt-6 rounded-lg p-6 shadow-lg">
            <h2 class="text-crust mb-4 text-2xl font-bold">Testing Guide</h2>

            <div class="space-y-4 text-base">
              <div>
                <h3 class="mb-2 text-lg font-semibold">🟢 No Auth Required</h3>
                <ul class="ml-6 list-disc space-y-1 text-sm">
                  <li>
                    <strong>Example Router</strong> - Hello endpoint
                  </li>
                  <li>
                    <strong>Lineage JSON Service</strong> - All 6 endpoints work
                    immediately
                  </li>
                  <li>
                    <strong>Database</strong> - All endpoints (comments, posts,
                    users, reactions, likes)
                  </li>
                  <li>
                    <strong>Misc</strong> - Downloads, S3 operations, password
                    utilities
                  </li>
                  <li>
                    <strong>Lineage Misc</strong> - Offline Secret, Get
                    Opponents
                  </li>
                  <li>
                    <strong>Lineage PvP</strong> - Get Opponents
                  </li>
                </ul>
              </div>

              <div>
                <h3 class="mb-2 text-lg font-semibold">🟡 Auth Required</h3>
                <p class="mb-2 text-sm">
                  These need valid JWT tokens from login/registration:
                </p>
                <ul class="ml-6 list-disc space-y-1 text-sm">
                  <li>
                    <strong>Example Router</strong> - Get Profile
                  </li>
                  <li>
                    <strong>User Router</strong> - All endpoints (profile
                    updates, password, account deletion)
                  </li>
                  <li>
                    <strong>Lineage Auth</strong> - Email Login, Refresh Token
                  </li>
                  <li>
                    <strong>Lineage Database</strong> - Get Credentials,
                    Deletion endpoints
                  </li>
                </ul>
              </div>

              <div>
                <h3 class="mb-2 text-lg font-semibold">🔴 Admin Required</h3>
                <p class="mb-2 text-sm">
                  Maintenance endpoints require admin privileges (userIDToken
                  cookie with ADMIN_ID).
                </p>
                <ul class="ml-6 list-disc space-y-1 text-sm">
                  <li>
                    <strong>Example Router</strong> - Admin Dashboard
                  </li>
                  <li>
                    <strong>Lineage Maintenance</strong> - Find Loose Databases,
                    Cleanup Expired
                  </li>
                </ul>
              </div>

              <div>
                <h3 class="mb-2 text-lg font-semibold">📝 Typical Workflows</h3>
                <ol class="ml-6 list-decimal space-y-2 text-sm">
                  <li>
                    <strong>Test public endpoints:</strong> Start with Example
                    Hello, Lineage JSON Service, or Database queries
                  </li>
                  <li>
                    <strong>OAuth flow:</strong> Use Auth router callbacks with
                    OAuth codes from GitHub/Google
                  </li>
                  <li>
                    <strong>Email auth flow:</strong> Register → verify email →
                    login → use JWT
                  </li>
                  <li>
                    <strong>Blog/Project management:</strong> Create posts → add
                    comments/likes → upload images via S3
                  </li>
                  <li>
                    <strong>Lineage game data:</strong> Fetch JSON data →
                    register character → find PvP opponents
                  </li>
                </ol>
              </div>

              <div class="border-rosewater bg-rosewater mt-4 rounded border p-4">
                <p class="text-crust text-sm">
                  <strong>Note:</strong> Some endpoints require specific setup
                  (e.g., OAuth codes, existing database records, valid S3 keys).
                  Check the sample input to understand what data each endpoint
                  expects.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Show>
  );
}
