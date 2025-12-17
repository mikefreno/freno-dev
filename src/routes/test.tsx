import { createSignal, For, Show } from "solid-js";

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
    description: "Example endpoints demonstrating public, protected, and admin procedures",
    endpoints: [
      {
        name: "Hello",
        router: "example",
        procedure: "hello",
        method: "query",
        description: "Simple hello world endpoint",
        sampleInput: "World",
      },
      {
        name: "Get Profile",
        router: "example",
        procedure: "getProfile",
        method: "query",
        description: "Get authenticated user profile",
        requiresAuth: true,
      },
      {
        name: "Admin Dashboard",
        router: "example",
        procedure: "adminDashboard",
        method: "query",
        description: "Access admin dashboard",
        requiresAdmin: true,
      },
    ],
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
          passwordConfirmation: "SecurePass123!",
        },
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
          rememberMe: true,
        },
      },
      {
        name: "Request Email Link Login",
        router: "auth",
        procedure: "requestEmailLinkLogin",
        method: "mutation",
        description: "Request magic link login email",
        sampleInput: {
          email: "test@example.com",
          rememberMe: false,
        },
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
          rememberMe: true,
        },
      },
      {
        name: "Request Password Reset",
        router: "auth",
        procedure: "requestPasswordReset",
        method: "mutation",
        description: "Send password reset email",
        sampleInput: {
          email: "test@example.com",
        },
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
          newPasswordConfirmation: "NewSecurePass123!",
        },
      },
      {
        name: "Resend Email Verification",
        router: "auth",
        procedure: "resendEmailVerification",
        method: "mutation",
        description: "Resend verification email",
        sampleInput: {
          email: "test@example.com",
        },
      },
      {
        name: "Email Verification",
        router: "auth",
        procedure: "emailVerification",
        method: "mutation",
        description: "Verify email with token",
        sampleInput: {
          email: "test@example.com",
          token: "eyJhbGciOiJIUzI1NiJ9...",
        },
      },
      {
        name: "Sign Out",
        router: "auth",
        procedure: "signOut",
        method: "mutation",
        description: "Clear session cookies and sign out",
      },
      {
        name: "GitHub Callback",
        router: "auth",
        procedure: "githubCallback",
        method: "mutation",
        description: "Complete GitHub OAuth flow",
        sampleInput: { code: "github_oauth_code_here" },
      },
      {
        name: "Google Callback",
        router: "auth",
        procedure: "googleCallback",
        method: "mutation",
        description: "Complete Google OAuth flow",
        sampleInput: { code: "google_oauth_code_here" },
      },
    ],
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
        sampleInput: { commentID: "comment_123" },
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
          user_id: "user_123",
        },
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
          user_id: "user_123",
        },
      },
    ],
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
        description: "Fetch all comments in the system",
      },
      {
        name: "Get Comments by Post ID",
        router: "database",
        procedure: "getCommentsByPostId",
        method: "query",
        description: "Fetch comments for a specific post",
        sampleInput: { post_id: "post_123" },
      },
    ],
  },
  {
    name: "Database - Posts",
    description: "CRUD operations for blog/project posts",
    endpoints: [
      {
        name: "Get Post by ID",
        router: "database",
        procedure: "getPostById",
        method: "query",
        description: "Fetch a post by ID with tags",
        sampleInput: { category: "blog", id: 1 },
      },
      {
        name: "Get Post by Title",
        router: "database",
        procedure: "getPostByTitle",
        method: "query",
        description: "Fetch post with comments, likes, and tags",
        sampleInput: { category: "project", title: "My Project" },
      },
      {
        name: "Create Post",
        router: "database",
        procedure: "createPost",
        method: "mutation",
        description: "Create a new blog/project post",
        sampleInput: {
          category: "blog",
          title: "Test Post",
          subtitle: "A test subtitle",
          body: "Post content here",
          banner_photo: null,
          published: false,
          tags: ["tech", "coding"],
          author_id: "user_123",
        },
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
          author_id: "user_123",
        },
      },
    ],
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
        sampleInput: { user_id: "user_123", post_id: "post_123" },
      },
      {
        name: "Remove Post Like",
        router: "database",
        procedure: "removePostLike",
        method: "mutation",
        description: "Remove a like from a post",
        sampleInput: { user_id: "user_123", post_id: "post_123" },
      },
    ],
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
        sampleInput: { id: "user_123" },
      },
      {
        name: "Get User Public Data",
        router: "database",
        procedure: "getUserPublicData",
        method: "query",
        description: "Fetch public user data (email, name, image)",
        sampleInput: { id: "user_123" },
      },
      {
        name: "Get User Image",
        router: "database",
        procedure: "getUserImage",
        method: "query",
        description: "Fetch user image URL",
        sampleInput: { id: "user_123" },
      },
      {
        name: "Update User Image",
        router: "database",
        procedure: "updateUserImage",
        method: "mutation",
        description: "Update user profile image",
        sampleInput: { id: "user_123", imageURL: "path/to/image.jpg" },
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
          oldEmail: "old@example.com",
        },
      },
    ],
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
        requiresAuth: true,
      },
      {
        name: "Update Email",
        router: "user",
        procedure: "updateEmail",
        method: "mutation",
        description: "Update user's email address",
        sampleInput: { email: "newemail@example.com" },
        requiresAuth: true,
      },
      {
        name: "Update Display Name",
        router: "user",
        procedure: "updateDisplayName",
        method: "mutation",
        description: "Update user's display name",
        sampleInput: { displayName: "New Display Name" },
        requiresAuth: true,
      },
      {
        name: "Update Profile Image",
        router: "user",
        procedure: "updateProfileImage",
        method: "mutation",
        description: "Update user's profile image URL",
        sampleInput: { imageUrl: "https://example.com/image.jpg" },
        requiresAuth: true,
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
          newPasswordConfirmation: "newpass123",
        },
        requiresAuth: true,
      },
      {
        name: "Set Password",
        router: "user",
        procedure: "setPassword",
        method: "mutation",
        description: "Set password for OAuth users",
        sampleInput: {
          newPassword: "newpass123",
          newPasswordConfirmation: "newpass123",
        },
        requiresAuth: true,
      },
      {
        name: "Delete Account",
        router: "user",
        procedure: "deleteAccount",
        method: "mutation",
        description: "Delete account (anonymize user data)",
        sampleInput: { password: "mypassword123" },
        requiresAuth: true,
      },
    ],
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
        sampleInput: { asset_name: "shapes-with-abigail" },
      },
    ],
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
          filename: "image.jpg",
        },
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
          id: 1,
        },
      },
      {
        name: "Simple Delete Image",
        router: "misc",
        procedure: "simpleDeleteImage",
        method: "mutation",
        description: "Delete image from S3 only",
        sampleInput: { key: "blog/my-post/image.jpg" },
      },
    ],
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
        sampleInput: { password: "mypassword123" },
      },
      {
        name: "Check Password",
        router: "misc",
        procedure: "checkPassword",
        method: "mutation",
        description: "Verify password against hash",
        sampleInput: {
          password: "mypassword123",
          hash: "$2b$10$...",
        },
      },
    ],
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
        description: "Get all item data (weapons, armor, potions, etc.)",
      },
      {
        name: "Get Attacks",
        router: "lineage.jsonService",
        procedure: "attacks",
        method: "query",
        description: "Get all attack and spell data",
      },
      {
        name: "Get Conditions",
        router: "lineage.jsonService",
        procedure: "conditions",
        method: "query",
        description: "Get all condition and debilitation data",
      },
      {
        name: "Get Dungeons",
        router: "lineage.jsonService",
        procedure: "dungeons",
        method: "query",
        description: "Get all dungeon and encounter data",
      },
      {
        name: "Get Enemies",
        router: "lineage.jsonService",
        procedure: "enemies",
        method: "query",
        description: "Get all enemy and boss data",
      },
      {
        name: "Get Misc",
        router: "lineage.jsonService",
        procedure: "misc",
        method: "query",
        description: "Get misc game data (jobs, activities, etc.)",
      },
    ],
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
          password_conf: "password123",
        },
      },
      {
        name: "Email Login",
        router: "lineage.auth",
        procedure: "emailLogin",
        method: "mutation",
        description: "Login with email/password (requires verified email)",
        sampleInput: { email: "test@example.com", password: "password123" },
        requiresAuth: true,
      },
      {
        name: "Email Verification",
        router: "lineage.auth",
        procedure: "emailVerification",
        method: "mutation",
        description: "Verify email with token from email",
        sampleInput: { token: "eyJhbGciOiJIUzI1NiJ9..." },
      },
      {
        name: "Refresh Verification Email",
        router: "lineage.auth",
        procedure: "refreshVerification",
        method: "mutation",
        description: "Resend verification email",
        sampleInput: { email: "test@example.com" },
      },
      {
        name: "Refresh Auth Token",
        router: "lineage.auth",
        procedure: "refreshToken",
        method: "mutation",
        description: "Refresh expired JWT token",
        sampleInput: {
          email: "test@example.com",
          authToken: "eyJhbGciOiJIUzI1NiJ9...",
        },
        requiresAuth: true,
      },
      {
        name: "Google Registration",
        router: "lineage.auth",
        procedure: "googleRegistration",
        method: "mutation",
        description: "Register/login with Google OAuth",
        sampleInput: { idToken: "google_id_token_here" },
      },
      {
        name: "Apple Registration",
        router: "lineage.auth",
        procedure: "appleRegistration",
        method: "mutation",
        description: "Register/login with Apple Sign In",
        sampleInput: {
          userString: "apple_user_string_here",
          email: "user@privaterelay.appleid.com",
        },
      },
      {
        name: "Apple Get Email",
        router: "lineage.auth",
        procedure: "appleGetEmail",
        method: "mutation",
        description: "Get email from Apple user string",
        sampleInput: { userString: "apple_user_string_here" },
      },
    ],
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
          authToken: "jwt_token_here",
        },
        requiresAuth: true,
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
          authToken: "jwt_token",
        },
        requiresAuth: true,
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
          authToken: "jwt_token",
        },
        requiresAuth: true,
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
          authToken: "jwt_token",
        },
        requiresAuth: true,
      },
      {
        name: "Deletion Cron",
        router: "lineage.database",
        procedure: "deletionCron",
        method: "query",
        description: "Cleanup expired databases (runs via cron)",
      },
    ],
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
            knownSpells: "[]",
          },
          linkID: "unique_player_id_here",
        },
      },
      {
        name: "Get Opponents",
        router: "lineage.pvp",
        procedure: "getOpponents",
        method: "query",
        description: "Get 3 random PvP opponents",
      },
      {
        name: "Record Battle Result",
        router: "lineage.pvp",
        procedure: "battleResult",
        method: "mutation",
        description: "Record PvP battle outcome",
        sampleInput: {
          winnerID: "player_id_1",
          loserID: "player_id_2",
        },
      },
    ],
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
          damageTable: { physical: 5 },
        },
      },
      {
        name: "Update Device Token",
        router: "lineage.misc",
        procedure: "tokens",
        method: "mutation",
        description: "Register/update push notification token",
        sampleInput: { token: "device_push_token_here" },
      },
      {
        name: "Offline Secret",
        router: "lineage.misc",
        procedure: "offlineSecret",
        method: "query",
        description: "Get offline serialization secret",
      },
    ],
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
        requiresAdmin: true,
      },
      {
        name: "Cleanup Expired Databases",
        router: "lineage.maintenance",
        procedure: "cleanupExpiredDatabases",
        method: "query",
        description: "Delete databases past 24hr deletion window",
        requiresAdmin: true,
      },
    ],
  },
];

export default function TestPage() {
  const [expandedSections, setExpandedSections] = createSignal<Set<string>>(
    new Set(),
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

      let url = `/api/trpc/${endpoint.router}.${endpoint.procedure}`;
      const options: RequestInit = {
        method: endpoint.method === "query" ? "GET" : "POST",
        headers: {},
      };

      // For queries, input goes in URL parameter
      if (endpoint.method === "query" && input !== undefined) {
        const encodedInput = encodeURIComponent(JSON.stringify(input));
        url += `?input=${encodedInput}`;
      }
      
      // For mutations, input goes in body
      if (endpoint.method === "mutation" && input !== undefined) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(input);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setResults({ ...results(), [key]: data });
    } catch (error: any) {
      setErrors({ ...errors(), [key]: error.message });
    } finally {
      setLoading({ ...loading(), [key]: false });
    }
  };

  const updateInput = (key: string, value: string) => {
    setInputEdits({ ...inputEdits(), [key]: value });
  };

  return (
    <main class="min-h-screen bg-gray-100 p-8">
      <div class="max-w-6xl mx-auto">
        <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 class="text-3xl font-bold mb-2">tRPC API Testing Dashboard</h1>
          <p class="text-gray-600 mb-4">
            Complete API coverage: Example, Auth, Database, User, Misc, and Lineage routers
          </p>

          <div class="bg-blue-50 border border-blue-200 rounded p-4">
            <p class="text-sm text-blue-800">
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
                <div class="bg-white rounded-lg shadow">
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.name)}
                    class="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition"
                  >
                    <div class="text-left">
                      <h2 class="text-xl font-bold text-gray-800">
                        {section.name}
                      </h2>
                      <p class="text-sm text-gray-600">{section.description}</p>
                      <p class="text-xs text-gray-500 mt-1">
                        {section.endpoints.length} endpoint
                        {section.endpoints.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div class="text-2xl text-gray-400">
                      {isExpanded() ? "−" : "+"}
                    </div>
                  </button>

                  {/* Section Content */}
                  <Show when={isExpanded()}>
                    <div class="border-t border-gray-200 p-6 space-y-4">
                      <For each={section.endpoints}>
                        {(endpoint) => {
                          const key = `${endpoint.router}.${endpoint.procedure}`;
                          const hasInput = endpoint.sampleInput !== undefined;
                          const displayInput = () => {
                            if (inputEdits()[key]) {
                              return inputEdits()[key];
                            }
                            // Handle primitive values (string, number, boolean)
                            if (typeof endpoint.sampleInput === 'string') {
                              return `"${endpoint.sampleInput}"`;
                            }
                            if (typeof endpoint.sampleInput === 'number' || typeof endpoint.sampleInput === 'boolean') {
                              return String(endpoint.sampleInput);
                            }
                            // Handle objects and arrays
                            return JSON.stringify(endpoint.sampleInput, null, 2);
                          };

                          return (
                            <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              {/* Endpoint Header */}
                              <div class="flex justify-between items-start mb-3">
                                <div class="flex-1">
                                  <div class="flex items-center gap-2">
                                    <h3 class="text-lg font-semibold text-gray-800">
                                      {endpoint.name}
                                    </h3>
                                    <Show when={endpoint.requiresAuth}>
                                      <span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                        🔒 Auth Required
                                      </span>
                                    </Show>
                                    <Show when={endpoint.requiresAdmin}>
                                      <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                        👑 Admin Only
                                      </span>
                                    </Show>
                                  </div>
                                  <p class="text-sm text-gray-600 mt-1">
                                    {endpoint.description}
                                  </p>
                                  <div class="flex gap-2 mt-2">
                                    <code class="text-xs bg-gray-200 px-2 py-1 rounded">
                                      {key}
                                    </code>
                                    <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                      {endpoint.method === "query"
                                        ? "GET"
                                        : "POST"}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => testEndpoint(endpoint)}
                                  disabled={loading()[key]}
                                  class="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition whitespace-nowrap ml-4"
                                >
                                  {loading()[key] ? "Testing..." : "Test"}
                                </button>
                              </div>

                              {/* Input Editor */}
                              <Show when={hasInput}>
                                <div class="mb-3">
                                  <label class="text-xs font-semibold text-gray-700 mb-1 block">
                                    Request Body (edit JSON):
                                  </label>
                                  <textarea
                                    value={displayInput()}
                                    onInput={(e) =>
                                      updateInput(key, e.currentTarget.value)
                                    }
                                    class="w-full font-mono text-xs bg-white border border-gray-300 rounded p-2 min-h-[100px]"
                                    spellcheck={false}
                                  />
                                </div>
                              </Show>

                              {/* Error Display */}
                              <Show when={errors()[key]}>
                                <div class="bg-red-50 border border-red-200 rounded p-3 mb-3">
                                  <p class="text-red-800 text-sm font-semibold">
                                    Error:
                                  </p>
                                  <p class="text-red-600 text-sm font-mono">
                                    {errors()[key]}
                                  </p>
                                </div>
                              </Show>

                              {/* Results Display */}
                              <Show when={results()[key]}>
                                <div class="bg-gray-900 rounded p-3">
                                  <p class="text-xs font-semibold text-green-400 mb-2">
                                    ✓ Response:
                                  </p>
                                  <pre class="text-xs overflow-auto max-h-60 text-green-400">
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
        <div class="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 class="text-2xl font-bold mb-4">Testing Guide</h2>

          <div class="space-y-4 text-gray-700">
            <div>
              <h3 class="font-semibold text-lg mb-2">🟢 No Auth Required</h3>
              <ul class="list-disc ml-6 space-y-1 text-sm">
                <li>
                  <strong>Example Router</strong> - Hello endpoint
                </li>
                <li>
                  <strong>Lineage JSON Service</strong> - All 6 endpoints work
                  immediately
                </li>
                <li>
                  <strong>Database</strong> - All endpoints (comments, posts, users, reactions, likes)
                </li>
                <li>
                  <strong>Misc</strong> - Downloads, S3 operations, password utilities
                </li>
                <li>
                  <strong>Lineage Misc</strong> - Offline Secret, Get Opponents
                </li>
                <li>
                  <strong>Lineage PvP</strong> - Get Opponents
                </li>
              </ul>
            </div>

            <div>
              <h3 class="font-semibold text-lg mb-2">🟡 Auth Required</h3>
              <p class="text-sm mb-2">
                These need valid JWT tokens from login/registration:
              </p>
              <ul class="list-disc ml-6 space-y-1 text-sm">
                <li><strong>Example Router</strong> - Get Profile</li>
                <li><strong>User Router</strong> - All endpoints (profile updates, password, account deletion)</li>
                <li><strong>Lineage Auth</strong> - Email Login, Refresh Token</li>
                <li><strong>Lineage Database</strong> - Get Credentials, Deletion endpoints</li>
              </ul>
            </div>

            <div>
              <h3 class="font-semibold text-lg mb-2">🔴 Admin Required</h3>
              <p class="text-sm mb-2">
                Maintenance endpoints require admin privileges (userIDToken
                cookie with ADMIN_ID).
              </p>
              <ul class="list-disc ml-6 space-y-1 text-sm">
                <li><strong>Example Router</strong> - Admin Dashboard</li>
                <li><strong>Lineage Maintenance</strong> - Find Loose Databases, Cleanup Expired</li>
              </ul>
            </div>

            <div>
              <h3 class="font-semibold text-lg mb-2">📝 Typical Workflows</h3>
              <ol class="list-decimal ml-6 space-y-2 text-sm">
                <li>
                  <strong>Test public endpoints:</strong> Start with Example Hello, 
                  Lineage JSON Service, or Database queries
                </li>
                <li>
                  <strong>OAuth flow:</strong> Use Auth router callbacks with OAuth codes 
                  from GitHub/Google
                </li>
                <li>
                  <strong>Email auth flow:</strong> Register → verify email → login → use JWT
                </li>
                <li>
                  <strong>Blog/Project management:</strong> Create posts → add comments/likes → 
                  upload images via S3
                </li>
                <li>
                  <strong>Lineage game data:</strong> Fetch JSON data → register character → 
                  find PvP opponents
                </li>
              </ol>
            </div>

            <div class="bg-yellow-50 border border-yellow-200 rounded p-4 mt-4">
              <p class="text-sm text-yellow-800">
                <strong>Note:</strong> Some endpoints require specific setup (e.g., OAuth codes, 
                existing database records, valid S3 keys). Check the sample input to understand 
                what data each endpoint expects.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
