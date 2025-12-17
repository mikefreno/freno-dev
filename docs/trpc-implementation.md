# tRPC Implementation Documentation

## Overview

This project implements a [tRPC](https://trpc.io/) API layer to provide type-safe communication between the frontend and backend. The implementation follows SolidStart's server-side rendering architecture with a clear separation of concerns.

## Architecture

The tRPC setup is organized in the following structure:

```
src/
├── server/
│   └── api/
│       ├── root.ts         # Main router that combines all sub-routers
│       ├── utils.ts        # tRPC utility functions and initialization
│       └── routers/        # Individual API route groups
│           ├── auth.ts     # Authentication procedures
│           ├── database.ts # Database operations
│           ├── example.ts  # Example procedures
│           ├── lineage.ts  # Lineage-related APIs
│           └── misc.ts     # Miscellaneous endpoints
└── routes/
    └── api/
        └── trpc/
            └── [trpc].ts   # API endpoint handler
```

## How to Use tRPC Procedures from the Frontend

The `api` client is pre-configured and available for use in components:

```typescript
import { api } from "~/lib/api";

// Example usage in a component
export function MyComponent() {
  const [result, setResult] = useState<string | null>(null);
  
  const handleClick = async () => {
    try {
      // Call a tRPC procedure
      const data = await api.example.hello.query("World");
      setResult(data);
    } catch (error) {
      console.error("Error calling tRPC procedure:", error);
    }
  };
  
  return (
    <div>
      <p>{result}</p>
      <button onClick={handleClick}>Call API</button>
    </div>
  );
}
```

## API Route Structure

### Root Router (`src/server/api/root.ts`)

The main router combines all individual routers:

```typescript
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  auth: authRouter,
  database: databaseRouter,
  lineage: lineageRouter,
  misc: miscRouter
});
```

### Procedure Types

tRPC provides two main procedure types:
- **Query**: For read-only operations (GET requests)
- **Mutation**: For write operations (POST, PUT, DELETE requests)

Example:

```typescript
// Query procedure - read-only
publicProcedure
  .input(z.string())
  .query(({ input }) => {
    return `Hello ${input}!`;
  })

// Mutation procedure - write operation  
publicProcedure
  .input(z.object({ name: z.string() }))
  .mutation(({ input }) => {
    // Logic for creating/updating data
    return { success: true, name: input.name };
  })
```

## Adding New Endpoints

### 1. Create a new router file

Create a new file in `src/server/api/routers/`:

```typescript
import { createTRPCRouter, publicProcedure } from "../utils";
import { z } from "zod";

export const myRouter = createTRPCRouter({
  // Add your procedures here
  hello: publicProcedure
    .input(z.string())
    .query(({ input }) => {
      return `Hello ${input}!`;
    }),
});
```

### 2. Register the router in the root

Add your new router to `src/server/api/root.ts`:

```typescript
import { exampleRouter } from "./routers/example";
import { authRouter } from "./routers/auth";
import { databaseRouter } from "./routers/database";
import { lineageRouter } from "./routers/lineage";
import { miscRouter } from "./routers/misc";
import { myRouter } from "./routers/myRouter"; // Add this import
import { createTRPCRouter } from "./utils";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  auth: authRouter,
  database: databaseRouter,
  lineage: lineageRouter,
  misc: miscRouter,
  myRouter: myRouter, // Add this line
});
```

### 3. Use in frontend

```typescript
// In your frontend component
const data = await api.myRouter.hello.query("World");
```

## Best Practices

1. **Type Safety**: Always use Zod schemas to validate input data and return types.

2. **Error Handling**: Implement proper error handling with try/catch blocks in async procedures.

3. **Procedure Organization**: Group related procedures into logical routers.
   
4. **Consistent Naming**: Use clear, descriptive names for your procedures and routers.

5. **Documentation**: Document each procedure with clear descriptions of what it does.

## Example Usage Patterns

### Query Procedure (GET)
```typescript
// In your router file
getPosts: publicProcedure
  .input(z.object({ 
    limit: z.number().optional(),
    offset: z.number().optional() 
  }))
  .query(({ input }) => {
    // Return data from database or external service
    return { posts: [], total: 0 };
  })
```

```typescript
// In frontend component
const { data, isLoading } = api.database.getPosts.useQuery({ limit: 10 });
```

### Mutation Procedure (POST/PUT/DELETE)
```typescript
// In your router file
createPost: publicProcedure
  .input(z.object({ 
    title: z.string(), 
    content: z.string() 
  }))
  .mutation(({ input }) => {
    // Create post in database
    return { success: true, post: { id: "1", ...input } };
  })
```

```typescript
// In frontend component
const { mutateAsync } = api.database.createPost.useMutation();

const handleClick = async () => {
  try {
    const result = await mutateAsync({ 
      title: "New Post", 
      content: "Post content" 
    });
    console.log("Created post:", result);
  } catch (error) {
    console.error("Error creating post:", error);
  }
};
```

## Available Endpoints

### Auth
- `auth.githubCallback` - GitHub OAuth callback
- `auth.googleCallback` - Google OAuth callback  
- `auth.emailLogin` - Email login
- `auth.emailVerification` - Email verification

### Database
- `database.getCommentReactions` - Get comment reactions
- `database.postCommentReaction` - Add comment reaction
- `database.deleteCommentReaction` - Remove comment reaction
- `database.getComments` - Get comments for a post
- `database.getPosts` - Get posts with pagination
- `database.createPost` - Create new post
- `database.updatePost` - Update existing post
- `database.deletePost` - Delete post
- `database.getPostLikes` - Get likes for a post
- `database.likePost` - Like a post
- `database.unlikePost` - Unlike a post

### Lineage
- `lineage.databaseManagement` - Database management operations
- `lineage.analytics` - Analytics endpoints
- `lineage.appleAuth` - Apple authentication
- `lineage.emailLogin` - Email login
- `lineage.emailRegister` - Email registration
- `lineage.emailVerify` - Email verification
- `lineage.googleRegister` - Google registration
- `lineage.attacks` - Attack data
- `lineage.conditions` - Condition data
- `lineage.dungeons` - Dungeon data
- `lineage.enemies` - Enemy data
- `lineage.items` - Item data
- `lineage.misc` - Miscellaneous data
- `lineage.offlineSecret` - Offline secret endpoint
- `lineage.pvpGet` - PvP GET operations
- `lineage.pvpPost` - PvP POST operations
- `lineage.tokens` - Token operations

### Misc
- `misc.downloads` - Downloads endpoint
- `misc.s3Delete` - Delete S3 object
- `misc.s3Get` - Get S3 object
- `misc.hashPassword` - Hash password