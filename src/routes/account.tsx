import { createSignal, Show, createEffect } from "solid-js";
import { Title, Meta } from "@solidjs/meta";
import { useNavigate, redirect, query, createAsync } from "@solidjs/router";
import { getEvent } from "vinxi/http";
import Eye from "~/components/icons/Eye";
import EyeSlash from "~/components/icons/EyeSlash";
import XCircle from "~/components/icons/XCircle";
import GoogleLogo from "~/components/icons/GoogleLogo";
import GitHub from "~/components/icons/GitHub";
import EmailIcon from "~/components/icons/EmailIcon";
import Dropzone from "~/components/blog/Dropzone";
import AddImageToS3 from "~/lib/s3upload";
import { validatePassword, isValidEmail } from "~/lib/validation";
import { TerminalSplash } from "~/components/TerminalSplash";

import type { UserProfile } from "~/types/user";

const getUserProfile = query(async (): Promise<UserProfile | null> => {
  "use server";
  const { getUserID, ConnectionFactory } = await import("~/server/utils");
  const event = getEvent()!;

  const userId = await getUserID(event);
  if (!userId) {
    throw redirect("/login");
  }

  const conn = ConnectionFactory();
  try {
    const res = await conn.execute({
      sql: "SELECT * FROM User WHERE id = ?",
      args: [userId]
    });

    if (res.rows.length === 0) {
      throw redirect("/login");
    }

    const user = res.rows[0] as any;

    // Transform database User to UserProfile
    return {
      id: user.id,
      email: user.email ?? undefined,
      emailVerified: user.email_verified === 1,
      displayName: user.display_name ?? undefined,
      provider: user.provider ?? undefined,
      image: user.image ?? undefined,
      hasPassword: !!user.password_hash
    };
  } catch (err) {
    console.error("Failed to fetch user profile:", err);
    throw redirect("/login");
  }
}, "accountUserProfile");

export const route = {
  load: () => getUserProfile()
};

export default function AccountPage() {
  const navigate = useNavigate();

  const userData = createAsync(() => getUserProfile(), { deferStream: true });

  // Local user state for client-side updates
  const [user, setUser] = createSignal<UserProfile | null>(null);

  // Form loading states
  const [emailButtonLoading, setEmailButtonLoading] = createSignal(false);
  const [displayNameButtonLoading, setDisplayNameButtonLoading] =
    createSignal(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = createSignal(false);
  const [deleteAccountButtonLoading, setDeleteAccountButtonLoading] =
    createSignal(false);
  const [profileImageSetLoading, setProfileImageSetLoading] =
    createSignal(false);

  // Password state
  const [passwordsMatch, setPasswordsMatch] = createSignal(false);
  const [showPasswordLengthWarning, setShowPasswordLengthWarning] =
    createSignal(false);
  const [passwordLengthSufficient, setPasswordLengthSufficient] =
    createSignal(false);
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
  const [showDisplayNameSuccess, setShowDisplayNameSuccess] =
    createSignal(false);
  const [showPasswordSuccess, setShowPasswordSuccess] = createSignal(false);

  // Profile image state
  const [profileImage, setProfileImage] = createSignal<Blob | undefined>(
    undefined
  );
  const [profileImageHolder, setProfileImageHolder] = createSignal<
    string | null
  >(null);
  const [profileImageStateChange, setProfileImageStateChange] =
    createSignal(false);
  const [preSetHolder, setPreSetHolder] = createSignal<string | null>(null);

  // Form refs
  let oldPasswordRef: HTMLInputElement | undefined;
  let newPasswordRef: HTMLInputElement | undefined;
  let newPasswordConfRef: HTMLInputElement | undefined;
  let emailRef: HTMLInputElement | undefined;
  let displayNameRef: HTMLInputElement | undefined;
  let deleteAccountPasswordRef: HTMLInputElement | undefined;

  // Helper to get current user (from SSR data or local state)
  const currentUser = () => user() || userData();

  // Initialize preSetHolder when userData loads
  createEffect(() => {
    const userProfile = userData();
    if (userProfile?.image && !preSetHolder()) {
      setPreSetHolder(userProfile.image);
    }
  });

  // Profile image handlers
  const handleImageDrop = (acceptedFiles: File[]) => {
    acceptedFiles.forEach((file: File) => {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        const str = reader.result as string;
        setProfileImageHolder(str);
        setProfileImageStateChange(true);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = () => {
    setProfileImage(undefined);
    setProfileImageHolder(null);
    if (preSetHolder()) {
      setProfileImageStateChange(true);
      setPreSetHolder(null);
    } else {
      setProfileImageStateChange(false);
    }
  };

  const setUserImage = async (e: Event) => {
    e.preventDefault();
    setProfileImageSetLoading(true);
    setShowImageSuccess(false);

    const userProfile = currentUser();
    if (!userProfile) {
      setProfileImageSetLoading(false);
      return;
    }

    try {
      let imageUrl = "";

      if (profileImage()) {
        const imageKey = await AddImageToS3(
          profileImage()!,
          userProfile.id,
          "user"
        );
        imageUrl = imageKey || "";
      }

      const response = await fetch("/api/trpc/user.updateProfileImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl })
      });

      const result = await response.json();
      if (response.ok && result.result?.data) {
        setUser(result.result.data);
        setShowImageSuccess(true);
        setProfileImageStateChange(false);
        setTimeout(() => setShowImageSuccess(false), 3000);

        // Update preSetHolder with new image
        setPreSetHolder(imageUrl || null);
      } else {
        alert("Error updating profile image!");
      }
    } catch (err) {
      console.error("Profile image update error:", err);
      alert("Error updating profile image! Check console.");
    } finally {
      setProfileImageSetLoading(false);
    }
  };

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
        body: JSON.stringify({ email })
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
        body: JSON.stringify({ displayName })
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
    const userProfile = currentUser();
    if (!userProfile) return;

    if (userProfile.hasPassword) {
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
          body: JSON.stringify({
            oldPassword,
            newPassword,
            newPasswordConfirmation: newPasswordConf
          })
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
          body: JSON.stringify({
            newPassword,
            newPasswordConfirmation: newPasswordConf
          })
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
        body: JSON.stringify({ password })
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
    const userProfile = currentUser();
    if (!userProfile?.email) return;

    try {
      await fetch("/api/trpc/auth.resendEmailVerification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userProfile.email })
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
    if (
      !passwordLengthSufficient() &&
      newPasswordRef &&
      newPasswordRef.value !== ""
    ) {
      setShowPasswordLengthWarning(true);
    }
    setPasswordBlurred(true);
  };

  // Helper to get provider display info
  const getProviderInfo = (provider: UserProfile["provider"]) => {
    switch (provider) {
      case "google":
        return {
          name: "Google",
          icon: <GoogleLogo height={24} width={24} />,
          color: "text-blue-500"
        };
      case "github":
        return {
          name: "GitHub",
          icon: <GitHub height={24} width={24} fill="currentColor" />,
          color: "text-gray-700 dark:text-gray-300"
        };
      case "email":
        return {
          name: "Email",
          icon: <EmailIcon height={24} width={24} />,
          color: "text-green-500"
        };
      default:
        return {
          name: "Unknown",
          icon: <EmailIcon height={24} width={24} />,
          color: "text-gray-500"
        };
    }
  };

  return (
    <>
      <Title>Account | Michael Freno</Title>
      <Meta
        name="description"
        content="Manage your account settings, update profile information, and configure preferences."
      />

      <div class="bg-base mx-8 min-h-screen md:mx-24 lg:mx-36">
        <noscript>
          <div class="bg-yellow mx-auto mt-8 max-w-2xl rounded-lg px-6 py-4 text-center text-black">
            <strong>⚠️ JavaScript Required for Account Updates</strong>
            <p class="mt-2 text-sm">
              You can view your account information below, but JavaScript is
              required to update your profile, change settings, or delete your
              account.
            </p>
          </div>
        </noscript>

        <div class="pt-24">
          <Show when={currentUser()} fallback={<TerminalSplash />}>
            {(userProfile) => (
              <>
                <div class="text-text mb-8 text-center text-3xl font-bold">
                  Account Settings
                </div>

                {/* Account Type Section */}
                <div class="mx-auto mb-8 max-w-md">
                  <div class="bg-surface0 border-surface1 rounded-lg border px-6 py-4 shadow-sm">
                    <div class="text-subtext0 mb-2 text-center text-sm font-semibold tracking-wide uppercase">
                      Account Type
                    </div>
                    <div class="flex items-center justify-center gap-3">
                      <span
                        class={getProviderInfo(userProfile().provider).color}
                      >
                        {getProviderInfo(userProfile().provider).icon}
                      </span>
                      <span class="text-lg font-semibold">
                        {getProviderInfo(userProfile().provider).name} Account
                      </span>
                    </div>
                    <Show
                      when={
                        userProfile().provider !== "email" &&
                        !userProfile().email
                      }
                    >
                      <div class="mt-3 rounded bg-yellow-500/10 px-3 py-2 text-center text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ Add an email address for account recovery
                      </div>
                    </Show>
                    <Show
                      when={
                        userProfile().provider !== "email" &&
                        !userProfile().hasPassword
                      }
                    >
                      <div class="mt-3 rounded bg-blue-500/10 px-3 py-2 text-center text-sm text-blue-600 dark:text-blue-400">
                        💡 Add a password to enable email/password login
                      </div>
                    </Show>
                  </div>
                </div>

                <hr class="mx-auto mb-8 max-w-4xl" />

                {/* Profile Image Section */}
                <div class="mx-auto mb-8 flex max-w-md justify-center">
                  <div class="flex flex-col py-4">
                    <div class="mb-2 text-center text-lg font-semibold">
                      Profile Image
                    </div>
                    <noscript>
                      <div class="text-subtext0 mb-4 text-center text-sm">
                        JavaScript is required to update profile images
                      </div>
                    </noscript>
                    <div class="flex items-start justify-center">
                      <Dropzone
                        onDrop={handleImageDrop}
                        acceptedFiles="image/jpg, image/jpeg, image/png"
                        fileHolder={profileImageHolder()}
                        preSet={preSetHolder() || userProfile().image || null}
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        class="z-20 -ml-6 h-fit rounded-full transition-all hover:brightness-125"
                      >
                        <XCircle
                          height={36}
                          width={36}
                          stroke="currentColor"
                          strokeWidth={1}
                        />
                      </button>
                    </div>
                    <form onSubmit={setUserImage}>
                      <button
                        type="submit"
                        disabled={
                          profileImageSetLoading() || !profileImageStateChange()
                        }
                        class={`${
                          profileImageSetLoading() || !profileImageStateChange()
                            ? "bg-blue cursor-not-allowed brightness-75"
                            : "bg-blue hover:brightness-125 active:scale-90"
                        } mt-2 flex w-full justify-center rounded px-4 py-2 text-base transition-all duration-300 ease-out`}
                      >
                        {profileImageSetLoading()
                          ? "Uploading..."
                          : "Set Image"}
                      </button>
                    </form>
                    <Show when={showImageSuccess()}>
                      <div class="text-green mt-2 text-center text-sm">
                        Profile image updated!
                      </div>
                    </Show>
                  </div>
                </div>

                <hr class="mx-auto mb-8 max-w-4xl" />

                {/* Email Section */}
                <div class="mx-auto flex max-w-4xl flex-col gap-6 md:grid md:grid-cols-2">
                  <div class="flex items-center justify-center text-lg md:justify-normal">
                    <div class="flex flex-col lg:flex-row">
                      <div class="pr-1 font-semibold whitespace-nowrap">
                        {userProfile().provider === "email"
                          ? "Email:"
                          : "Linked Email:"}
                      </div>
                      {userProfile().email ? (
                        <span>{userProfile().email}</span>
                      ) : (
                        <span class="font-light italic underline underline-offset-4">
                          {userProfile().provider === "email"
                            ? "None Set"
                            : "Not Linked"}
                        </span>
                      )}
                    </div>
                    <Show
                      when={userProfile().email && !userProfile().emailVerified}
                    >
                      <button
                        onClick={sendEmailVerification}
                        class="text-red ml-2 text-sm underline transition-all hover:brightness-125"
                      >
                        Verify Email
                      </button>
                    </Show>
                  </div>

                  <form onSubmit={setEmailTrigger} class="mx-auto">
                    <noscript>
                      <div class="text-subtext0 mb-2 px-4 text-center text-xs">
                        JavaScript required to update email
                      </div>
                    </noscript>
                    <div class="input-group mx-4">
                      <input
                        ref={emailRef}
                        type="email"
                        required
                        disabled={
                          emailButtonLoading() ||
                          (userProfile().email !== null &&
                            !userProfile().emailVerified)
                        }
                        placeholder=" "
                        title="Please enter a valid email address"
                        class="underlinedInput bg-transparent"
                      />
                      <span class="bar"></span>
                      <label class="underlinedInputLabel">
                        {userProfile().email ? "Update Email" : "Add Email"}
                      </label>
                    </div>
                    <Show
                      when={
                        userProfile().provider !== "email" &&
                        !userProfile().email
                      }
                    >
                      <div class="text-subtext0 mt-1 px-4 text-xs">
                        Add an email for account recovery and notifications
                      </div>
                    </Show>
                    <div class="flex justify-end">
                      <button
                        type="submit"
                        disabled={
                          emailButtonLoading() ||
                          (userProfile().email !== null &&
                            !userProfile().emailVerified)
                        }
                        class={`${
                          emailButtonLoading() ||
                          (userProfile().email !== null &&
                            !userProfile().emailVerified)
                            ? "bg-blue cursor-not-allowed brightness-75"
                            : "bg-blue hover:brightness-125 active:scale-90"
                        } mt-2 flex justify-center rounded px-4 py-2 text-base transition-all duration-300 ease-out`}
                      >
                        {emailButtonLoading() ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                    <Show when={showEmailSuccess()}>
                      <div class="text-green mt-2 text-center text-sm">
                        Email updated!
                      </div>
                    </Show>
                  </form>

                  {/* Display Name Section */}
                  <div class="flex items-center justify-center text-lg md:justify-normal">
                    <div class="flex flex-col lg:flex-row">
                      <div class="pr-1 font-semibold whitespace-nowrap">
                        Display Name:
                      </div>
                      {userProfile().displayName ? (
                        <span>{userProfile().displayName}</span>
                      ) : (
                        <span class="font-light italic underline underline-offset-4">
                          None Set
                        </span>
                      )}
                    </div>
                  </div>

                  <form onSubmit={setDisplayNameTrigger} class="mx-auto">
                    <noscript>
                      <div class="text-subtext0 mb-2 px-4 text-center text-xs">
                        JavaScript required to update display name
                      </div>
                    </noscript>
                    <div class="input-group mx-4">
                      <input
                        ref={displayNameRef}
                        type="text"
                        required
                        disabled={displayNameButtonLoading()}
                        placeholder=" "
                        title="Please enter your display name"
                        class="underlinedInput bg-transparent"
                      />
                      <span class="bar"></span>
                      <label class="underlinedInputLabel">
                        Set {userProfile().displayName ? "New " : ""}Display
                        Name
                      </label>
                    </div>
                    <div class="flex justify-end">
                      <button
                        type="submit"
                        disabled={displayNameButtonLoading()}
                        class={`${
                          displayNameButtonLoading()
                            ? "bg-blue cursor-not-allowed brightness-75"
                            : "bg-blue hover:brightness-125 active:scale-90"
                        } mt-2 flex justify-center rounded px-4 py-2 text-base transition-all duration-300 ease-out`}
                      >
                        {displayNameButtonLoading()
                          ? "Submitting..."
                          : "Submit"}
                      </button>
                    </div>
                    <Show when={showDisplayNameSuccess()}>
                      <div class="text-green mt-2 text-center text-sm">
                        Display name updated!
                      </div>
                    </Show>
                  </form>
                </div>

                {/* Password Change/Set Section */}
                <form
                  onSubmit={handlePasswordSubmit}
                  class="mt-8 flex w-full justify-center"
                >
                  <div class="flex w-full max-w-md flex-col justify-center">
                    <div class="mb-2 text-center text-xl font-semibold">
                      {userProfile().hasPassword
                        ? "Change Password"
                        : "Add Password"}
                    </div>
                    <noscript>
                      <div class="text-subtext0 mb-4 text-center text-sm">
                        JavaScript required to{" "}
                        {userProfile().hasPassword ? "change" : "add"} password
                      </div>
                    </noscript>
                    <Show when={!userProfile().hasPassword}>
                      <div class="text-subtext0 mb-4 text-center text-sm">
                        {userProfile().provider === "email"
                          ? "Set a password to enable password login"
                          : "Add a password to enable email/password login alongside your " +
                            getProviderInfo(userProfile().provider).name +
                            " login"}
                      </div>
                    </Show>

                    <Show when={userProfile().hasPassword}>
                      <div class="input-group relative mx-4 mb-6">
                        <input
                          ref={oldPasswordRef}
                          type={showOldPasswordInput() ? "text" : "password"}
                          required
                          minlength="8"
                          disabled={passwordChangeLoading()}
                          placeholder=" "
                          title="Password must be at least 8 characters"
                          class="underlinedInput w-full bg-transparent pr-10"
                        />
                        <span class="bar"></span>
                        <label class="underlinedInputLabel">Old Password</label>
                        <button
                          type="button"
                          onClick={() =>
                            setShowOldPasswordInput(!showOldPasswordInput())
                          }
                          class="text-subtext0 absolute top-2 right-0 transition-all hover:brightness-125"
                        >
                          <Show
                            when={showOldPasswordInput()}
                            fallback={<Eye />}
                          >
                            <EyeSlash />
                          </Show>
                        </button>
                      </div>
                    </Show>

                    <div class="input-group relative mx-4 mb-2">
                      <input
                        ref={newPasswordRef}
                        type={showPasswordInput() ? "text" : "password"}
                        required
                        minlength="8"
                        onInput={handleNewPasswordChange}
                        onBlur={handlePasswordBlur}
                        disabled={passwordChangeLoading()}
                        placeholder=" "
                        title="Password must be at least 8 characters"
                        class="underlinedInput w-full bg-transparent pr-10"
                      />
                      <span class="bar"></span>
                      <label class="underlinedInputLabel">New Password</label>
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswordInput(!showPasswordInput())
                        }
                        class="text-subtext0 absolute top-2 right-0 transition-all hover:brightness-125"
                      >
                        <Show when={showPasswordInput()} fallback={<Eye />}>
                          <EyeSlash />
                        </Show>
                      </button>
                    </div>

                    <Show when={showPasswordLengthWarning()}>
                      <div class="text-red mb-4 text-center text-sm">
                        Password too short! Min Length: 8
                      </div>
                    </Show>

                    <div class="input-group relative mx-4 mb-2">
                      <input
                        ref={newPasswordConfRef}
                        type={showPasswordConfInput() ? "text" : "password"}
                        required
                        minlength="8"
                        onInput={handlePasswordConfChange}
                        disabled={passwordChangeLoading()}
                        placeholder=" "
                        title="Password must be at least 8 characters"
                        class="underlinedInput w-full bg-transparent pr-10"
                      />
                      <span class="bar"></span>
                      <label class="underlinedInputLabel">
                        Password Confirmation
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswordConfInput(!showPasswordConfInput())
                        }
                        class="text-subtext0 absolute top-2 right-0 transition-all hover:brightness-125"
                      >
                        <Show when={showPasswordConfInput()} fallback={<Eye />}>
                          <EyeSlash />
                        </Show>
                      </button>
                    </div>

                    <Show
                      when={
                        !passwordsMatch() &&
                        passwordLengthSufficient() &&
                        newPasswordConfRef &&
                        newPasswordConfRef.value.length >= 6
                      }
                    >
                      <div class="text-red mb-4 text-center text-sm">
                        Passwords do not match!
                      </div>
                    </Show>

                    <button
                      type="submit"
                      disabled={passwordChangeLoading() || !passwordsMatch()}
                      class={`${
                        passwordChangeLoading() || !passwordsMatch()
                          ? "bg-blue cursor-not-allowed brightness-75"
                          : "bg-blue hover:brightness-125 active:scale-90"
                      } my-6 flex justify-center rounded px-4 py-2 text-base transition-all duration-300 ease-out`}
                    >
                      {passwordChangeLoading() ? "Setting..." : "Set"}
                    </button>

                    <Show when={passwordError()}>
                      <div class="text-red text-center text-sm">
                        {userProfile().hasPassword
                          ? "Password did not match record"
                          : "Error setting password"}
                      </div>
                    </Show>

                    <Show when={showPasswordSuccess()}>
                      <div class="text-green text-center text-sm">
                        Password {userProfile().hasPassword ? "changed" : "set"}{" "}
                        successfully!
                      </div>
                    </Show>
                  </div>
                </form>

                <hr class="mt-8 mb-8" />

                {/* Sign Out Section */}
                <div class="mx-auto max-w-md py-4">
                  <form method="post" action="/api/auth/signout">
                    <button
                      type="submit"
                      class="bg-overlay0 hover:bg-overlay1 w-full rounded px-4 py-2 transition-all"
                    >
                      Sign Out
                    </button>
                  </form>
                </div>

                <hr class="mt-8 mb-8" />

                {/* Delete Account Section */}
                <div class="mx-auto max-w-2xl py-8">
                  <div class="bg-red w-full rounded-md px-6 pt-8 pb-4 shadow-md brightness-75">
                    <div class="pb-4 text-center text-xl font-semibold">
                      Delete Account
                    </div>
                    <div class="text-crust mb-4 text-center text-sm">
                      Warning: This will delete all account information and is
                      irreversible
                    </div>

                    <noscript>
                      <div class="text-crust mb-4 text-center text-sm font-semibold">
                        JavaScript is required to delete your account
                      </div>
                    </noscript>

                    <Show
                      when={userProfile().hasPassword}
                      fallback={
                        <div class="flex flex-col items-center">
                          <div class="text-crust mb-4 text-center text-sm">
                            Your {getProviderInfo(userProfile().provider).name}{" "}
                            account doesn't have a password. To delete your
                            account, please set a password first, then return
                            here to proceed with deletion.
                          </div>
                          <button
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            class="bg-surface0 hover:bg-surface1 rounded px-4 py-2 transition-all"
                          >
                            Go to Add Password Section
                          </button>
                        </div>
                      }
                    >
                      <form onSubmit={deleteAccountTrigger}>
                        <div class="flex w-full justify-center">
                          <div class="input-group delete mx-4">
                            <input
                              ref={deleteAccountPasswordRef}
                              type="password"
                              required
                              minlength="8"
                              disabled={deleteAccountButtonLoading()}
                              placeholder=" "
                              title="Enter your password to confirm account deletion"
                              class="underlinedInput bg-transparent"
                            />
                            <span class="bar"></span>
                            <label class="underlinedInputLabel">
                              Enter Password
                            </label>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={deleteAccountButtonLoading()}
                          class={`${
                            deleteAccountButtonLoading()
                              ? "bg-red cursor-not-allowed brightness-75"
                              : "bg-red hover:brightness-125 active:scale-90"
                          } mx-auto mt-4 flex justify-center rounded px-4 py-2 text-base transition-all duration-300 ease-out`}
                        >
                          {deleteAccountButtonLoading()
                            ? "Deleting..."
                            : "Delete Account"}
                        </button>

                        <Show when={passwordDeletionError()}>
                          <div class="text-red mt-2 text-center text-sm">
                            Password did not match record
                          </div>
                        </Show>
                      </form>
                    </Show>
                  </div>
                </div>
              </>
            )}
          </Show>
        </div>
      </div>
    </>
  );
}
