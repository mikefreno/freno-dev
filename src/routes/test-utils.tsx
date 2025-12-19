import { createSignal } from "solid-js";
import { Title, Meta } from "@solidjs/meta";
import Input from "~/components/ui/Input";
import Button from "~/components/ui/Button";
import {
  isValidEmail,
  validatePassword,
  passwordsMatch
} from "~/lib/validation";

/**
 * Test page to validate Task 01 components and utilities
 * Navigate to /test-utils to view
 */
export default function TestUtilsPage() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [passwordConf, setPasswordConf] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const emailError = () => {
    if (!email()) return undefined;
    return isValidEmail(email()) ? undefined : "Invalid email format";
  };

  const passwordError = () => {
    if (!password()) return undefined;
    const validation = validatePassword(password());
    return validation.isValid ? undefined : validation.errors.join(", ");
  };

  const passwordMatchError = () => {
    if (!passwordConf()) return undefined;
    return passwordsMatch(password(), passwordConf())
      ? undefined
      : "Passwords do not match";
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    alert(`Form submitted!\nEmail: ${email()}\nPassword: ${password()}`);
    setLoading(false);
  };

  return (
    <>
      <Title>Utility Testing | Michael Freno</Title>
      <Meta
        name="description"
        content="Testing page for form components and validation utilities."
      />
      <main class="min-h-screen bg-gray-100 p-8">
        <div class="mx-auto max-w-2xl">
          <div class="mb-6 rounded-lg bg-white p-6 shadow-lg">
            <h1 class="mb-2 text-3xl font-bold">Task 01 - Utility Testing</h1>
            <p class="mb-4 text-gray-600">
              Testing shared utilities, types, and UI components
            </p>
          </div>

          <div class="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 class="mb-4 text-xl font-bold">Form Components & Validation</h2>

            <form onSubmit={handleSubmit} class="space-y-4">
              <Input
                type="email"
                label="Email Address"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                error={emailError()}
                helperText="Enter a valid email address"
                required
              />

              <Input
                type="password"
                label="Password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                error={passwordError()}
                helperText="Minimum 8 characters"
                required
              />

              <Input
                type="password"
                label="Confirm Password"
                value={passwordConf()}
                onInput={(e) => setPasswordConf(e.currentTarget.value)}
                error={passwordMatchError()}
                required
              />

              <div class="flex gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading()}
                  disabled={
                    !isValidEmail(email()) ||
                    !validatePassword(password()).isValid ||
                    !passwordsMatch(password(), passwordConf())
                  }
                >
                  Submit
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEmail("");
                    setPassword("");
                    setPasswordConf("");
                  }}
                >
                  Reset
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  onClick={() => alert("Danger action!")}
                >
                  Delete
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => alert("Ghost action!")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>

          <div class="rounded-lg bg-white p-6 shadow">
            <h2 class="mb-4 text-xl font-bold">Validation Status</h2>

            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <span
                  class={`h-3 w-3 rounded-full ${isValidEmail(email()) ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span>Email Valid: {isValidEmail(email()) ? "✓" : "✗"}</span>
              </div>

              <div class="flex items-center gap-2">
                <span
                  class={`h-3 w-3 rounded-full ${validatePassword(password()).isValid ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span>
                  Password Valid:{" "}
                  {validatePassword(password()).isValid ? "✓" : "✗"}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <span
                  class={`h-3 w-3 rounded-full ${passwordsMatch(password(), passwordConf()) ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span>
                  Passwords Match:{" "}
                  {passwordsMatch(password(), passwordConf()) ? "✓" : "✗"}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-6 rounded border border-blue-200 bg-blue-50 p-4">
            <h3 class="mb-2 font-bold text-blue-800">✅ Task 01 Complete</h3>
            <ul class="space-y-1 text-sm text-blue-700">
              <li>✓ User types created</li>
              <li>✓ Cookie utilities created</li>
              <li>✓ Validation helpers created</li>
              <li>✓ Input component created</li>
              <li>✓ Button component created</li>
              <li>✓ Conversion patterns documented</li>
              <li>✓ Build successful</li>
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}
