import { Title, Meta } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";
import { useNavigate } from "@solidjs/router";
import { createEffect, createSignal, For } from "solid-js";
import { ERROR_PAGE_CONFIG } from "~/config";

export default function Page_401() {
  const navigate = useNavigate();
  const [glitchText, setGlitchText] = createSignal("401");

  createEffect(() => {
    const glitchChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?~`";
    const originalText = "401";

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.85) {
        let glitched = "";
        for (let i = 0; i < originalText.length; i++) {
          if (Math.random() > 0.7) {
            glitched +=
              glitchChars[Math.floor(Math.random() * glitchChars.length)];
          } else {
            glitched += originalText[i];
          }
        }
        setGlitchText(glitched);

        setTimeout(
          () => setGlitchText(originalText),
          ERROR_PAGE_CONFIG.GLITCH_DURATION_MS
        );
      }
    }, ERROR_PAGE_CONFIG.GLITCH_INTERVAL_MS);

    return () => clearInterval(glitchInterval);
  });

  const createParticles = () => {
    return Array.from({ length: ERROR_PAGE_CONFIG.PARTICLE_COUNT }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${2 + Math.random() * 3}s`
    }));
  };

  function doubleBack() {
    window.history.go(-2);
  }

  return (
    <>
      <Title>401 Unauthorized | Michael Freno</Title>
      <Meta
        name="description"
        content="401 - Unauthorized access. Please log in to access this page."
      />
      <HttpStatusCode code={401} />
      <div class="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 dark:from-black dark:via-amber-950/30 dark:to-black">
        {/* Animated particle background */}
        <div class="absolute inset-0 overflow-hidden">
          <For each={createParticles()}>
            {(particle) => (
              <div
                class="absolute animate-pulse"
                style={{
                  left: particle.left,
                  top: particle.top,
                  "animation-delay": particle.animationDelay,
                  "animation-duration": particle.animationDuration
                }}
              >
                <div class="h-1 w-1 rounded-full bg-amber-400 opacity-30 dark:bg-amber-300" />
              </div>
            )}
          </For>
        </div>

        {/* Animated grid background */}
        <div class="absolute inset-0 opacity-10">
          <div
            class="h-full w-full"
            style={{
              "background-image": `
              linear-gradient(rgba(251, 191, 36, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(251, 191, 36, 0.3) 1px, transparent 1px)
            `,
              "background-size": "50px 50px",
              animation: "grid-move 20s linear infinite"
            }}
          />
        </div>

        {/* Logo overlay */}
        <div class="absolute inset-0 flex items-center justify-center opacity-10">
          <picture class="h-80 object-cover sm:h-96">
            <source
              srcSet="/WhiteLogo.png"
              media="(prefers-color-scheme: dark)"
            />
            <img
              src="/BlackLogo.png"
              alt="logo"
              class="mx-auto brightness-50"
            />
          </picture>
        </div>

        {/* Main content */}
        <div class="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center">
          {/* Glitchy 401 */}
          <div class="mb-8">
            <h1
              class="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-8xl font-bold text-transparent select-none md:text-9xl"
              style={{
                "text-shadow": "0 0 30px rgba(251, 191, 36, 0.5)",
                filter: "drop-shadow(0 0 10px rgba(251, 191, 36, 0.3))"
              }}
            >
              {glitchText()}
            </h1>
            <div class="mx-auto mt-2 h-1 w-32 animate-pulse bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          </div>

          {/* Error message */}
          <div class="max-w-2xl space-y-4">
            <h2 class="animate-fade-in text-2xl font-light text-slate-300 md:text-3xl dark:text-slate-400">
              Access Denied
            </h2>
            <p class="animate-fade-in-delay text-lg text-slate-400 dark:text-slate-500">
              You lack authentication sufficient for that page.
              <br />
              Please log in or return to a safe location.
            </p>
          </div>

          {/* Action buttons */}
          <div class="mt-12 flex flex-col gap-4 sm:flex-row">
            <button
              onClick={() => navigate("/login")}
              class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-amber-500/25 active:scale-95"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-amber-700 to-orange-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span class="relative flex items-center gap-2">🔐 Login</span>
            </button>

            <button
              onClick={() => navigate("/")}
              class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95"
            >
              <div class="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span class="relative flex items-center gap-2">
                🏠 Return Home
              </span>
            </button>

            <button
              onClick={doubleBack}
              class="group relative overflow-hidden rounded-lg border-2 border-slate-600 bg-transparent px-8 py-4 text-lg font-medium text-slate-300 transition-all duration-300 hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-400 active:scale-95"
            >
              <span class="relative flex items-center gap-2">← Go Back</span>
            </button>
          </div>

          {/* Floating elements */}
          <div class="animate-bounce-slow absolute top-20 left-10">
            <div class="h-6 w-6 rotate-45 bg-gradient-to-br from-amber-400 to-orange-500 opacity-60" />
          </div>
          <div class="animate-bounce-slow-delay absolute top-32 right-16">
            <div class="h-4 w-4 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 opacity-60" />
          </div>
          <div class="animate-bounce-slow absolute bottom-20 left-20">
            <div
              class="h-5 w-5 bg-gradient-to-br from-amber-500 to-orange-400 opacity-60"
              style={{ "clip-path": "polygon(50% 0%, 0% 100%, 100% 100%)" }}
            />
          </div>

          {/* Footer */}
          <div class="absolute bottom-8 left-1/2 -translate-x-1/2">
            <p class="text-sm text-slate-500 dark:text-slate-600">
              Error Code: 401 • Unauthorized Access
            </p>
          </div>
        </div>

        {/* Custom styles */}
        <style>{`
          @keyframes grid-move {
            0% {
              transform: translate(0, 0);
            }
            100% {
              transform: translate(50px, 50px);
            }
          }

          .animate-fade-in {
            animation: fadeIn 1s ease-out 0.5s both;
          }

          .animate-fade-in-delay {
            animation: fadeIn 1s ease-out 1s both;
          }

          .animate-bounce-slow {
            animation: bounce-slow 3s ease-in-out infinite;
          }

          .animate-bounce-slow-delay {
            animation: bounce-slow 3s ease-in-out infinite 1.5s;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes bounce-slow {
            0%,
            100% {
              transform: translateY(0) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(180deg);
            }
          }
        `}</style>
      </div>
    </>
  );
}
