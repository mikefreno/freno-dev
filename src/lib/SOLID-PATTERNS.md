# React to SolidJS Conversion Patterns

This guide documents common patterns for converting React code to SolidJS for this migration.

## Table of Contents
- [State Management](#state-management)
- [Effects](#effects)
- [Refs](#refs)
- [Routing](#routing)
- [Conditional Rendering](#conditional-rendering)
- [Lists](#lists)
- [Forms](#forms)
- [Event Handlers](#event-handlers)

## State Management

### React (useState)
```tsx
import { useState } from "react";

const [count, setCount] = useState(0);
const [user, setUser] = useState<User | null>(null);

// Update
setCount(count + 1);
setCount(prev => prev + 1);
setUser({ ...user, name: "John" });
```

### Solid (createSignal)
```tsx
import { createSignal } from "solid-js";

const [count, setCount] = createSignal(0);
const [user, setUser] = createSignal<User | null>(null);

// Update - note the function call to read value
setCount(count() + 1);
setCount(prev => prev + 1);
setUser({ ...user(), name: "John" });

// ⚠️ Important: Always call the signal to read its value
console.log(count()); // ✅ Correct
console.log(count);   // ❌ Wrong - this is the function itself
```

## Effects

### React (useEffect)
```tsx
import { useEffect } from "react";

// Run once on mount
useEffect(() => {
  console.log("Mounted");
  
  return () => {
    console.log("Cleanup");
  };
}, []);

// Run when dependency changes
useEffect(() => {
  console.log(count);
}, [count]);
```

### Solid (createEffect / onMount / onCleanup)
```tsx
import { createEffect, onMount, onCleanup } from "solid-js";

// Run once on mount
onMount(() => {
  console.log("Mounted");
});

// Cleanup
onCleanup(() => {
  console.log("Cleanup");
});

// Run when dependency changes (automatic tracking)
createEffect(() => {
  console.log(count()); // Automatically tracks count signal
});

// ⚠️ Important: Effects automatically track any signal reads
// No dependency array needed!
```

## Refs

### React (useRef)
```tsx
import { useRef } from "react";

const inputRef = useRef<HTMLInputElement>(null);

// Access
inputRef.current?.focus();

// In JSX
<input ref={inputRef} />
```

### Solid (let binding or signal)
```tsx
// Method 1: Direct binding (preferred for simple cases)
let inputRef: HTMLInputElement | undefined;

// Access
inputRef?.focus();

// In JSX
<input ref={inputRef} />

// Method 2: Using a signal (for reactive refs)
import { createSignal } from "solid-js";

const [inputRef, setInputRef] = createSignal<HTMLInputElement>();

// Access
inputRef()?.focus();

// In JSX
<input ref={setInputRef} />
```

## Routing

### React (Next.js)
```tsx
import Link from "next/link";
import { useRouter } from "next/navigation";

// Link component
<Link href="/about">About</Link>

// Programmatic navigation
const router = useRouter();
router.push("/dashboard");
router.back();
router.refresh();
```

### Solid (SolidStart)
```tsx
import { A, useNavigate } from "@solidjs/router";

// Link component
<A href="/about">About</A>

// Programmatic navigation
const navigate = useNavigate();
navigate("/dashboard");
navigate(-1); // Go back
// Note: No refresh() - Solid is reactive by default
```

## Conditional Rendering

### React
```tsx
// Using && operator
{isLoggedIn && <Dashboard />}

// Using ternary
{isLoggedIn ? <Dashboard /> : <Login />}

// Using if statement
if (loading) return <Spinner />;
return <Content />;
```

### Solid
```tsx
import { Show } from "solid-js";

// Using Show component (recommended)
<Show when={isLoggedIn()}>
  <Dashboard />
</Show>

// With fallback
<Show when={isLoggedIn()} fallback={<Login />}>
  <Dashboard />
</Show>

// ⚠️ Important: Can still use && and ternary, but Show is more efficient
// because it doesn't recreate the DOM on every change

// Early return still works
if (loading()) return <Spinner />;
return <Content />;
```

## Lists

### React
```tsx
// Using map
{users.map(user => (
  <div key={user.id}>{user.name}</div>
))}

// With index
{users.map((user, index) => (
  <div key={index}>{user.name}</div>
))}
```

### Solid
```tsx
import { For, Index } from "solid-js";

// Using For (when items have stable keys)
<For each={users()}>
  {(user) => <div>{user.name}</div>}
</For>

// With index
<For each={users()}>
  {(user, index) => <div>{index()} - {user.name}</div>}
</For>

// Using Index (when items have no stable identity, keyed by index)
<Index each={users()}>
  {(user, index) => <div>{index} - {user().name}</div>}
</Index>

// ⚠️ Key differences:
// - For: Better when items have stable identity (keyed by reference)
// - Index: Better when items change frequently (keyed by index)
// - Note the () on user in Index component
```

## Forms

### React
```tsx
import { useState } from "react";

const [email, setEmail] = useState("");

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  console.log(email);
};

<form onSubmit={handleSubmit}>
  <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</form>
```

### Solid
```tsx
import { createSignal } from "solid-js";

const [email, setEmail] = createSignal("");

const handleSubmit = (e: Event) => {
  e.preventDefault();
  console.log(email());
};

<form onSubmit={handleSubmit}>
  <input
    type="email"
    value={email()}
    onInput={(e) => setEmail(e.currentTarget.value)}
  />
</form>

// ⚠️ Important differences:
// - Use onInput instead of onChange for real-time updates
// - onChange fires on blur in Solid
// - Use e.currentTarget instead of e.target for type safety
```

## Event Handlers

### React
```tsx
// Inline
<button onClick={() => setCount(count + 1)}>

// Function reference
<button onClick={handleClick}>

// With parameters
<button onClick={(e) => handleClick(e, id)}>
```

### Solid
```tsx
// Inline - same as React
<button onClick={() => setCount(count() + 1)}>

// Function reference - same as React
<button onClick={handleClick}>

// With parameters - same as React
<button onClick={(e) => handleClick(e, id)}>

// Alternative syntax with array (for optimization)
<button onClick={[handleClick, id]}>

// ⚠️ Important: Remember to call signals with ()
<button onClick={() => setCount(count() + 1)}>  // ✅
<button onClick={() => setCount(count + 1)}>    // ❌
```

## Server Actions to tRPC

### React (Next.js Server Actions)
```tsx
"use server";

export async function updateProfile(displayName: string) {
  const userId = cookies().get("userIDToken");
  await db.execute("UPDATE User SET display_name = ? WHERE id = ?", 
    [displayName, userId]);
  return { success: true };
}

// Client usage
import { updateProfile } from "./actions";

const result = await updateProfile("John");
```

### Solid (tRPC)
```tsx
// Server (in src/server/api/routers/user.ts)
updateDisplayName: publicProcedure
  .input(z.object({ displayName: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const userId = await getUserID(ctx.event);
    const conn = ConnectionFactory();
    await conn.execute({
      sql: "UPDATE User SET display_name = ? WHERE id = ?",
      args: [input.displayName, userId]
    });
    return { success: true };
  })

// Client usage
import { api } from "~/lib/api";

const result = await api.user.updateDisplayName.mutate({ 
  displayName: "John" 
});
```

## Common Gotchas

### 1. Reading Signal Values
```tsx
// ❌ WRONG
const value = mySignal;  // This is the function, not the value!

// ✅ CORRECT
const value = mySignal(); // Call it to get the value
```

### 2. Updating Objects in Signals
```tsx
// ❌ WRONG - Mutating directly
const [user, setUser] = createSignal({ name: "John" });
user().name = "Jane"; // This won't trigger reactivity!

// ✅ CORRECT - Create new object
setUser({ ...user(), name: "Jane" });

// ✅ ALSO CORRECT - Using produce (from solid-js/store)
import { produce } from "solid-js/store";
setUser(produce(u => { u.name = "Jane"; }));
```

### 3. Conditional Effects
```tsx
// ❌ WRONG - Effect won't re-run when condition changes
if (someCondition()) {
  createEffect(() => {
    // This only creates the effect if condition is true initially
  });
}

// ✅ CORRECT - Effect tracks condition reactively
createEffect(() => {
  if (someCondition()) {
    // This runs whenever condition or dependencies change
  }
});
```

### 4. Cleanup in Effects
```tsx
// ❌ WRONG
createEffect(() => {
  const timer = setInterval(() => {}, 1000);
  // No cleanup!
});

// ✅ CORRECT
createEffect(() => {
  const timer = setInterval(() => {}, 1000);
  
  onCleanup(() => {
    clearInterval(timer);
  });
});
```

## Quick Reference Card

| React | Solid | Notes |
|-------|-------|-------|
| `useState` | `createSignal` | Call signal to read: `count()` |
| `useEffect` | `createEffect` | Auto-tracks dependencies |
| `useRef` | `let` binding | Or use signal for reactive refs |
| `useRouter()` | `useNavigate()` | Different API |
| `Link` | `A` | Different import |
| `{cond && <A />}` | `<Show when={cond()}><A /></Show>` | Show is more efficient |
| `{arr.map()}` | `<For each={arr()}></For>` | For is more efficient |
| `onChange` | `onInput` | onChange fires on blur |
| `e.target` | `e.currentTarget` | Better types |
| "use server" | tRPC router | Different architecture |

## Tips for Success

1. **Always call signals to read their values**: `count()` not `count`
2. **Use Show and For components**: More efficient than && and map
3. **Effects auto-track**: No dependency arrays needed
4. **Immutable updates**: Always create new objects when updating signals
5. **Use onCleanup**: Clean up timers, subscriptions, etc.
6. **Type safety**: SolidJS has excellent TypeScript support - use it!
