import { createSignal, createEffect, Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import Eye from "~/components/icons/Eye";
import EyeSlash from "~/components/icons/EyeSlash";
import { validatePassword, isValidEmail } from "~/lib/validation";

type UserProfile = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  image: string | null;
  provider: string;
  hasPassword: boolean;
};

export default function AccountPage() {
  const navigate = useNavigate();

  // User data
  const [user, setUser] = createSignal<UserProfile | null>(null);
  const [loading, setLoading] = createSignal(true);

  // Form loading states
  const [emailButtonLoading, setEmailButtonLoading] = createSignal(false);
  const [displayNameButtonLoading, setDisplayNameButtonLoading] = createSignal(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = createSignal(false);
  const [deleteAccountButtonLoading, setDeleteAccountButtonLoading] = createSignal(false);
  const [profileImageSetLoading, setProfileImageSetLoading] = createSignal(false);

  // Password state
  const [passwordsMatch, setPasswordsMatch] = createSignal(false);
  const [showPasswordLengthWarning, setShowPasswordLengthWarning] = createSignal(false);
  const [passwordLengthSufficient, setPasswordLengthSufficient] = createSignal(false);
  const [passwordBlurred, setPasswordBlurred] = createSignal(false);
  const [passwordError, setPasswordError] = createSignal(false);
  const [passwordDeletionError, setPasswordDeletionError] = createSignal(false);

  // Show/hide password toggles
  const [showOldPasswordInput, setShowOldPasswordInput] = createSignal(false);
  const [showPasswordInput, setShowPasswordInput] = createSignal(false);
  const [showPasswordConfInput, setShowPasswordConfInput] = createSignal(false);

  // Success messages
  const [showImageSuccess, setShowImageSuccess] = createSignal(false);
  const [showEmailSuccess, setShowEmailSuccess] = createSignal(false);
  const [showDisplayNameSuccess, setShowDisplayNameSuccess] = createSignal(false);
  const [showPasswordSuccess, setShowPasswordSuccess] = createSignal(false);

  // Form refs
  let oldPasswordRef: HTMLInputElement | undefined;
  let newPasswordRef: HTMLInputElement | undefined;
  let newPasswordConfRef: HTMLInputElement | undefined;
  let emailRef: HTMLInputElement | undefined;
  let displayNameRef: HTMLInputElement | undefined;
  let deleteAccountPasswordRef: HTMLInputElement | undefined;

  // Fetch user profile on mount
  onMount(async () => {
    try {
      const response = await fetch("/api/trpc/user.getProfile", {
        method: "GET",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.result?.data) {
          setUser(result.result.data);
        } else {
          // Not logged in, redirect to login
          navigate("/login");
        }
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  });

  // Email update handler
  const setEmailTrigger = async (e: Event) => {
    e.preventDefault();
    if (!emailRef) return;

    const email = emailRef.value;
    if (!isValidEmail(email)) {
      alert("Invalid email address");
      return;
    }

    setEmailButtonLoading(true);
    setShowEmailSuccess(false);

    try {
      const response = await fetch("/api/trpc/user.updateEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      if (response.ok && result.result?.data) {
        setUser(result.result.data);
        setShowEmailSuccess(true);
        setTimeout(() => setShowEmailSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Email update error:", err);
    } finally {
      setEmailButtonLoading(false);
    }
  };

  // Display name update handler
  const setDisplayNameTrigger = async (e: Event) => {
    e.preventDefault();
    if (!displayNameRef) return;

    const displayName = displayNameRef.value;
    setDisplayNameButtonLoading(true);
    setShowDisplayNameSuccess(false);

    try {
      const response = await fetch("/api/trpc/user.updateDisplayName", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });

      const result = await response.json();
      if (response.ok && result.result?.data) {
        setUser(result.result.data);
        setShowDisplayNameSuccess(true);
        setTimeout(() => setShowDisplayNameSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Display name update error:", err);
    } finally {
      setDisplayNameButtonLoading(false);
    }
  };

  // Password change/set handler
  const handlePasswordSubmit = async (e: Event) => {
    e.preventDefault();
    const currentUser = user();
    if (!currentUser) return;

    if (currentUser.hasPassword) {
      // Change password (requires old password)
      if (!oldPasswordRef || !newPasswordRef || !newPasswordConfRef) return;

      const oldPassword = oldPasswordRef.value;
      const newPassword = newPasswordRef.value;
      const newPasswordConf = newPasswordConfRef.value;

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        setPasswordError(true);
        return;
      }

      if (newPassword !== newPasswordConf) {
        setPasswordError(true);
        return;
      }

      setPasswordChangeLoading(true);
      setPasswordError(false);

      try {
        const response = await fetch("/api/trpc/user.changePassword", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPassword, newPassword }),
        });

        const result = await response.json();
        if (response.ok && result.result?.data?.success) {
          setShowPasswordSuccess(true);
          setTimeout(() => setShowPasswordSuccess(false), 3000);
          // Clear form
          if (oldPasswordRef) oldPasswordRef.value = "";
          if (newPasswordRef) newPasswordRef.value = "";
          if (newPasswordConfRef) newPasswordConfRef.value = "";
        } else {
          setPasswordError(true);
        }
      } catch (err) {
        console.error("Password change error:", err);
        setPasswordError(true);
      } finally {
        setPasswordChangeLoading(false);
      }
    } else {
      // Set password (first time for OAuth users)
      if (!newPasswordRef || !newPasswordConfRef) return;

      const newPassword = newPasswordRef.value;
      const newPasswordConf = newPasswordConfRef.value;

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        setPasswordError(true);
        return;
      }

      if (newPassword !== newPasswordConf) {
        setPasswordError(true);
        return;
      }

      setPasswordChangeLoading(true);
      setPasswordError(false);

      try {
        const response = await fetch("/api/trpc/user.setPassword", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
        });

        const result = await response.json();
        if (response.ok && result.result?.data?.success) {
          // Refresh user data to show hasPassword = true
          const profileResponse = await fetch("/api/trpc/user.getProfile");
          const profileResult = await profileResponse.json();
          if (profileResult.result?.data) {
            setUser(profileResult.result.data);
          }
          setShowPasswordSuccess(true);
          setTimeout(() => setShowPasswordSuccess(false), 3000);
          // Clear form
          if (newPasswordRef) newPasswordRef.value = "";
          if (newPasswordConfRef) newPasswordConfRef.value = "";
        } else {
          setPasswordError(true);
        }
      } catch (err) {
        console.error("Password set error:", err);
        setPasswordError(true);
      } finally {
        setPasswordChangeLoading(false);
      }
    }
  };

  // Delete account handler
  const deleteAccountTrigger = async (e: Event) => {
    e.preventDefault();
    if (!deleteAccountPasswordRef) return;

    const password = deleteAccountPasswordRef.value;
    setDeleteAccountButtonLoading(true);
    setPasswordDeletionError(false);

    try {
      const response = await fetch("/api/trpc/user.deleteAccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();
      if (response.ok && result.result?.data?.success) {
        // Redirect to login
        navigate("/login");
      } else {
        setPasswordDeletionError(true);
      }
    } catch (err) {
      console.error("Delete account error:", err);
      setPasswordDeletionError(true);
    } finally {
      setDeleteAccountButtonLoading(false);
    }
  };

  // Resend email verification
  const sendEmailVerification = async () => {
    const currentUser = user();
    if (!currentUser?.email) return;

    try {
      await fetch("/api/trpc/auth.resendEmailVerification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email }),
      });
      alert("Verification email sent!");
    } catch (err) {
      console.error("Email verification error:", err);
    }
  };

  // Password validation helpers
  const checkPasswordLength = (password: string) => {
    if (password.length >= 8) {
      setPasswordLengthSufficient(true);
      setShowPasswordLengthWarning(false);
    } else {
      setPasswordLengthSufficient(false);
      if (passwordBlurred()) {
        setShowPasswordLengthWarning(true);
      }
    }
  };

  const checkForMatch = (newPassword: string, newPasswordConf: string) => {
    setPasswordsMatch(newPassword === newPasswordConf);
  };

  const handleNewPasswordChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    checkPasswordLength(target.value);
    if (newPasswordConfRef) {
      checkForMatch(target.value, newPasswordConfRef.value);
    }
  };

  const handlePasswordConfChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (newPasswordRef) {
      checkForMatch(newPasswordRef.value, target.value);
    }
  };

  const handlePasswordBlur = () => {
    if (!passwordLengthSufficient() && newPasswordRef && newPasswordRef.value !== "") {
      setShowPasswordLengthWarning(true);
    }
    setPasswordBlurred(true);
  };

  return (
    <div class="mx-8 min-h-screen md:mx-24 lg:mx-36 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div class="pt-24">
        <Show
          when={!loading() && user()}
          fallback={
            <div class="w-full mt-[35vh] flex justify-center">
              <div class="text-xl">Loading...</div>
            </div>
          }
        >
          {(currentUser) => (
            <>
              <div class="text-center text-3xl font-bold mb-8 text-slate-800 dark:text-slate-100">
                Account Settings
              </div>

              {/* Email Section */}
              <div class="mx-auto flex flex-col md:grid md:grid-cols-2 gap-6 max-w-4xl">
                <div class="flex justify-center text-lg md:justify-normal items-center">
                  <div class="flex flex-col lg:flex-row">
                    <div class="whitespace-nowrap pr-1 font-semibold">Current email:</div>
                    {currentUser().email ? (
                      <span>{currentUser().email}</span>
                    ) : (
                      <span class="font-light italic underline underline-offset-4">None Set</span>
                    )}
                  </div>
                  <Show when={currentUser().email && !currentUser().emailVerified}>
                    <button
                      onClick={sendEmailVerification}
                      class="ml-2 text-red-500 hover:text-red-600 text-sm underline"
                    >
                      Verify Email
                    </button>
                  </Show>
                </div>

                <form onSubmit={setEmailTrigger} class="mx-auto">
                  <div class="input-group mx-4">
                    <input
                      ref={emailRef}
                      type="email"
                      required
                      disabled={emailButtonLoading() || (currentUser().email !== null && !currentUser().emailVerified)}
                      placeholder=" "
                      class="underlinedInput bg-transparent"
                    />
                    <span class="bar"></span>
                    <label class="underlinedInputLabel">Set New Email</label>
                  </div>
                  <div class="flex justify-end">
                    <button
                      type="submit"
                      disabled={emailButtonLoading() || (currentUser().email !== null && !currentUser().emailVerified)}
                      class={`${
                        emailButtonLoading() || (currentUser().email !== null && !currentUser().emailVerified)
                          ? "bg-zinc-400 cursor-not-allowed"
                          : "bg-blue-400 hover:bg-blue-500 active:scale-90 dark:bg-blue-600 dark:hover:bg-blue-700"
                      } mt-2 flex justify-center rounded px-4 py-2 text-white transition-all duration-300 ease-out`}
                    >
                      {emailButtonLoading() ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                  <Show when={showEmailSuccess()}>
                    <div class="text-green-500 text-sm text-center mt-2">Email updated!</div>
                  </Show>
                </form>

                {/* Display Name Section */}
                <div class="flex justify-center text-lg md:justify-normal items-center">
                  <div class="flex flex-col lg:flex-row">
                    <div class="whitespace-nowrap pr-1 font-semibold">Display Name:</div>
                    {currentUser().displayName ? (
                      <span>{currentUser().displayName}</span>
                    ) : (
                      <span class="font-light italic underline underline-offset-4">None Set</span>
                    )}
                  </div>
                </div>

                <form onSubmit={setDisplayNameTrigger} class="mx-auto">
                  <div class="input-group mx-4">
                    <input
                      ref={displayNameRef}
                      type="text"
                      required
                      disabled={displayNameButtonLoading()}
                      placeholder=" "
                      class="underlinedInput bg-transparent"
                    />
                    <span class="bar"></span>
                    <label class="underlinedInputLabel">
                      Set {currentUser().displayName ? "New " : ""}Display Name
                    </label>
                  </div>
                  <div class="flex justify-end">
                    <button
                      type="submit"
                      disabled={displayNameButtonLoading()}
                      class={`${
                        displayNameButtonLoading()
                          ? "bg-zinc-400 cursor-not-allowed"
                          : "bg-blue-400 hover:bg-blue-500 active:scale-90 dark:bg-blue-600 dark:hover:bg-blue-700"
                      } mt-2 flex justify-center rounded px-4 py-2 text-white transition-all duration-300 ease-out`}
                    >
                      {displayNameButtonLoading() ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                  <Show when={showDisplayNameSuccess()}>
                    <div class="text-green-500 text-sm text-center mt-2">Display name updated!</div>
                  </Show>
                </form>
              </div>

              {/* Password Change/Set Section */}
              <form onSubmit={handlePasswordSubmit} class="mt-8 flex w-full justify-center">
                <div class="flex flex-col justify-center max-w-md w-full">
                  <div class="text-center text-xl font-semibold mb-4">
                    {currentUser().hasPassword ? "Change Password" : "Set Password"}
                  </div>

                  <Show when={currentUser().hasPassword}>
                    <div class="input-group mx-4 relative mb-6">
                      <input
                        ref={oldPasswordRef}
                        type={showOldPasswordInput() ? "text" : "password"}
                        required
                        disabled={passwordChangeLoading()}
                        placeholder=" "
                        class="underlinedInput w-full bg-transparent pr-10"
                      />
                      <span class="bar"></span>
                      <label class="underlinedInputLabel">Old Password</label>
                      <button
                        type="button"
                        onClick={() => setShowOldPasswordInput(!showOldPasswordInput())}
                        class="absolute right-0 top-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        <Show when={showOldPasswordInput()} fallback={<Eye />}>
                          <EyeSlash />
                        </Show>
                      </button>
                    </div>
                  </Show>

                  <div class="input-group mx-4 relative mb-2">
                    <input
                      ref={newPasswordRef}
                      type={showPasswordInput() ? "text" : "password"}
                      required
                      onInput={handleNewPasswordChange}
                      onBlur={handlePasswordBlur}
                      disabled={passwordChangeLoading()}
                      placeholder=" "
                      class="underlinedInput w-full bg-transparent pr-10"
                    />
                    <span class="bar"></span>
                    <label class="underlinedInputLabel">New Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPasswordInput(!showPasswordInput())}
                      class="absolute right-0 top-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <Show when={showPasswordInput()} fallback={<Eye />}>
                        <EyeSlash />
                      </Show>
                    </button>
                  </div>

                  <Show when={showPasswordLengthWarning()}>
                    <div class="text-red-500 text-sm text-center mb-4">
                      Password too short! Min Length: 8
                    </div>
                  </Show>

                  <div class="input-group mx-4 relative mb-2">
                    <input
                      ref={newPasswordConfRef}
                      type={showPasswordConfInput() ? "text" : "password"}
                      required
                      onInput={handlePasswordConfChange}
                      disabled={passwordChangeLoading()}
                      placeholder=" "
                      class="underlinedInput w-full bg-transparent pr-10"
                    />
                    <span class="bar"></span>
                    <label class="underlinedInputLabel">Password Confirmation</label>
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfInput(!showPasswordConfInput())}
                      class="absolute right-0 top-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <Show when={showPasswordConfInput()} fallback={<Eye />}>
                        <EyeSlash />
                      </Show>
                    </button>
                  </div>

                  <Show when={!passwordsMatch() && passwordLengthSufficient() && newPasswordConfRef && newPasswordConfRef.value.length >= 6}>
                    <div class="text-red-500 text-sm text-center mb-4">
                      Passwords do not match!
                    </div>
                  </Show>

                  <button
                    type="submit"
                    disabled={passwordChangeLoading() || !passwordsMatch()}
                    class={`${
                      passwordChangeLoading() || !passwordsMatch()
                        ? "bg-zinc-400 cursor-not-allowed"
                        : "bg-blue-400 hover:bg-blue-500 active:scale-90 dark:bg-blue-600 dark:hover:bg-blue-700"
                    } my-6 flex justify-center rounded px-4 py-2 text-white transition-all duration-300 ease-out`}
                  >
                    {passwordChangeLoading() ? "Setting..." : "Set"}
                  </button>

                  <Show when={passwordError()}>
                    <div class="text-red-500 text-sm text-center">
                      {currentUser().hasPassword
                        ? "Password did not match record"
                        : "Error setting password"}
                    </div>
                  </Show>

                  <Show when={showPasswordSuccess()}>
                    <div class="text-green-500 text-sm text-center">
                      Password {currentUser().hasPassword ? "changed" : "set"} successfully!
                    </div>
                  </Show>
                </div>
              </form>

              <hr class="mt-8 mb-8" />

              {/* Delete Account Section */}
              <div class="py-8 max-w-2xl mx-auto">
                <div class="w-full rounded-md bg-red-300 px-6 pb-4 pt-8 shadow-md dark:bg-red-950">
                  <div class="pb-4 text-center text-xl font-semibold">Delete Account</div>
                  <div class="text-center text-sm mb-4 text-red-700 dark:text-red-300">
                    Warning: This will delete all account information and is irreversible
                  </div>

                  <form onSubmit={deleteAccountTrigger}>
                    <div class="flex w-full justify-center">
                      <div class="input-group delete mx-4">
                        <input
                          ref={deleteAccountPasswordRef}
                          type="password"
                          required
                          disabled={deleteAccountButtonLoading()}
                          placeholder=" "
                          class="underlinedInput bg-transparent"
                        />
                        <span class="bar"></span>
                        <label class="underlinedInputLabel">Enter Password</label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={deleteAccountButtonLoading()}
                      class={`${
                        deleteAccountButtonLoading()
                          ? "bg-zinc-400 cursor-not-allowed"
                          : "bg-red-500 hover:bg-red-600 active:scale-90 dark:bg-red-600 dark:hover:bg-red-700"
                      } mx-auto mt-4 flex justify-center rounded px-4 py-2 text-white transition-all duration-300 ease-out`}
                    >
                      {deleteAccountButtonLoading() ? "Deleting..." : "Delete Account"}
                    </button>

                    <Show when={passwordDeletionError()}>
                      <div class="text-red-500 text-sm text-center mt-2">
                        Password did not match record
                      </div>
                    </Show>
                  </form>
                </div>
              </div>
            </>
          )}
        </Show>
      </div>
    </div>
  );
}
