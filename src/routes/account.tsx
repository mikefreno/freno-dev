import { createSignal, Show, createEffect } from "solid-js";
import { Title, Meta } from "@solidjs/meta";
import { useNavigate, redirect, query, createAsync } from "@solidjs/router";
import { getEvent } from "vinxi/http";
import XCircle from "~/components/icons/XCircle";
import GoogleLogo from "~/components/icons/GoogleLogo";
import GitHub from "~/components/icons/GitHub";
import EmailIcon from "~/components/icons/EmailIcon";
import Dropzone from "~/components/blog/Dropzone";
import AddImageToS3 from "~/lib/s3upload";
import { validatePassword, isValidEmail } from "~/lib/validation";
import { TerminalSplash } from "~/components/TerminalSplash";
import { VALIDATION_CONFIG } from "~/config";
import { api } from "~/lib/api";
import Input from "~/components/ui/Input";
import PasswordInput from "~/components/ui/PasswordInput";
import Button from "~/components/ui/Button";

import type { UserProfile } from "~/types/user";
import PasswordStrengthMeter from "~/components/PasswordStrengthMeter";

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

  const [user, setUser] = createSignal<UserProfile | null>(null);

  const [emailButtonLoading, setEmailButtonLoading] = createSignal(false);
  const [displayNameButtonLoading, setDisplayNameButtonLoading] =
    createSignal(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = createSignal(false);
  const [deleteAccountButtonLoading, setDeleteAccountButtonLoading] =
    createSignal(false);
  const [profileImageSetLoading, setProfileImageSetLoading] =
    createSignal(false);
  const [signOutLoading, setSignOutLoading] = createSignal(false);

  const [passwordsMatch, setPasswordsMatch] = createSignal(false);
  const [showPasswordLengthWarning, setShowPasswordLengthWarning] =
    createSignal(false);
  const [passwordLengthSufficient, setPasswordLengthSufficient] =
    createSignal(false);
  const [passwordBlurred, setPasswordBlurred] = createSignal(false);
  const [passwordError, setPasswordError] = createSignal(false);
  const [passwordDeletionError, setPasswordDeletionError] = createSignal(false);
  const [newPassword, setNewPassword] = createSignal("");

  const [showImageSuccess, setShowImageSuccess] = createSignal(false);
  const [showEmailSuccess, setShowEmailSuccess] = createSignal(false);
  const [showDisplayNameSuccess, setShowDisplayNameSuccess] =
    createSignal(false);
  const [showPasswordSuccess, setShowPasswordSuccess] = createSignal(false);

  const [profileImage, setProfileImage] = createSignal<Blob | undefined>(
    undefined
  );
  const [profileImageHolder, setProfileImageHolder] = createSignal<
    string | null
  >(null);
  const [profileImageStateChange, setProfileImageStateChange] =
    createSignal(false);
  const [preSetHolder, setPreSetHolder] = createSignal<string | null>(null);

  let oldPasswordRef: HTMLInputElement | undefined;
  let newPasswordRef: HTMLInputElement | undefined;
  let newPasswordConfRef: HTMLInputElement | undefined;
  let emailRef: HTMLInputElement | undefined;
  let displayNameRef: HTMLInputElement | undefined;
  let deleteAccountPasswordRef: HTMLInputElement | undefined;

  const currentUser = () => user() || userData();

  createEffect(() => {
    const userProfile = userData();
    if (userProfile?.image && !preSetHolder()) {
      setPreSetHolder(userProfile.image);
    }
  });

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

  const handlePasswordSubmit = async (e: Event) => {
    e.preventDefault();
    const userProfile = currentUser();
    if (!userProfile) return;

    if (userProfile.hasPassword) {
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
          const profileResponse = await fetch("/api/trpc/user.getProfile");
          const profileResult = await profileResponse.json();
          if (profileResult.result?.data) {
            setUser(profileResult.result.data);
          }
          setShowPasswordSuccess(true);
          setTimeout(() => setShowPasswordSuccess(false), 3000);
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
    setNewPassword(target.value);
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

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await api.auth.signOut.mutate();
      navigate("/");
    } catch (error) {
      console.error("Sign out failed:", error);
      setSignOutLoading(false);
    }
  };

  const getProviderName = (provider: UserProfile["provider"]) => {
    switch (provider) {
      case "google":
        return "Google";
      case "github":
        return "GitHub";
      case "email":
        return "Email";
      default:
        return "Unknown";
    }
  };

  const getProviderColor = (provider: UserProfile["provider"]) => {
    switch (provider) {
      case "google":
        return "text-blue-500";
      case "github":
        return "text-gray-700 dark:text-gray-300";
      case "email":
        return "text-green-500";
      default:
        return "text-gray-500";
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
                      <span class={getProviderColor(userProfile().provider)}>
                        <Show when={userProfile().provider === "google"}>
                          <GoogleLogo height={24} width={24} />
                        </Show>
                        <Show when={userProfile().provider === "github"}>
                          <GitHub height={24} width={24} fill="currentColor" />
                        </Show>
                        <Show
                          when={
                            userProfile().provider === "email" ||
                            !userProfile().provider
                          }
                        >
                          <EmailIcon height={24} width={24} />
                        </Show>
                      </span>
                      <span class="text-lg font-semibold">
                        {getProviderName(userProfile().provider)} Account
                      </span>
                    </div>
                    <Show
                      when={
                        userProfile().provider !== "email" &&
                        !userProfile().email
                      }
                    >
                      <div class="bg-yellow mt-3 rounded px-3 py-2 text-center text-base text-sm">
                        ⚠️ Add an email address for account recovery
                      </div>
                    </Show>
                    <Show
                      when={
                        userProfile().provider !== "email" &&
                        !userProfile().hasPassword
                      }
                    >
                      <div class="bg-blue mt-3 rounded px-3 py-2 text-center text-base text-sm">
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
                    <Input
                      ref={emailRef}
                      type="email"
                      required
                      disabled={
                        emailButtonLoading() ||
                        (userProfile().email !== null &&
                          !userProfile().emailVerified)
                      }
                      title="Please enter a valid email address"
                      label={userProfile().email ? "Update Email" : "Add Email"}
                      containerClass="input-group mx-4"
                    />
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
                    <Input
                      ref={displayNameRef}
                      type="text"
                      required
                      disabled={displayNameButtonLoading()}
                      title="Please enter your display name"
                      label={`Set ${userProfile().displayName ? "New " : ""}Display Name`}
                      containerClass="input-group mx-4"
                    />
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
                            getProviderName(userProfile().provider) +
                            " login"}
                      </div>
                    </Show>

                    <Show when={userProfile().hasPassword}>
                      <PasswordInput
                        ref={oldPasswordRef}
                        required
                        minlength={VALIDATION_CONFIG.MIN_PASSWORD_LENGTH}
                        disabled={passwordChangeLoading()}
                        title="Password must be at least 8 characters"
                        label="Old Password"
                        containerClass="input-group relative mx-4 mb-6"
                      />
                    </Show>

                    <PasswordInput
                      ref={newPasswordRef}
                      required
                      minlength="8"
                      onInput={handleNewPasswordChange}
                      onBlur={handlePasswordBlur}
                      disabled={passwordChangeLoading()}
                      title="Password must be at least 8 characters"
                      label="New Password"
                      showStrength
                      passwordValue={newPassword()}
                      containerClass="input-group relative mx-4 mb-2"
                    />
                    <PasswordInput
                      ref={newPasswordConfRef}
                      required
                      minlength="8"
                      onInput={handlePasswordConfChange}
                      disabled={passwordChangeLoading()}
                      title="Password must be at least 8 characters"
                      label="New Password Confirmation"
                      containerClass="input-group relative mx-4 mb-2"
                    />

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
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signOutLoading()}
                    class={`${
                      signOutLoading()
                        ? "bg-overlay0 cursor-not-allowed opacity-75"
                        : "bg-overlay0 hover:bg-overlay1"
                    } w-full rounded px-4 py-2 transition-all`}
                  >
                    {signOutLoading() ? "Signing Out..." : "Sign Out"}
                  </button>
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
                            Your {getProviderName(userProfile().provider)}{" "}
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
                          <PasswordInput
                            ref={deleteAccountPasswordRef}
                            required
                            minlength={VALIDATION_CONFIG.MIN_PASSWORD_LENGTH}
                            disabled={deleteAccountButtonLoading()}
                            title="Enter your password to confirm account deletion"
                            label="Enter Password"
                            containerClass="input-group delete mx-4"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={deleteAccountButtonLoading()}
                          class={`${
                            deleteAccountButtonLoading()
                              ? "bg-red cursor-not-allowed brightness-75"
                              : "bg-red hover:brightness-125 active:scale-90"
                          } border-text mx-auto mt-4 flex justify-center rounded border px-4 py-2 text-base transition-all duration-300 ease-out`}
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
