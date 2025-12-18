import { useNavigate } from "@solidjs/router";
import { createEffect, createSignal, For } from "solid-js";

export interface ErrorBoundaryFallbackProps {
  error: Error;
  reset: () => void;
}

export default function ErrorBoundaryFallback(
  props: ErrorBoundaryFallbackProps
) {
  // Try to get navigate, but handle case where we're outside router context
  let navigate: ((path: string) => void) | undefined;
  try {
    navigate = useNavigate();
  } catch (e) {
    // If we're outside router context, fallback to window.location
    navigate = (path: string) => {
      window.location.href = path;
    };
  }
  const [glitchText, setGlitchText] = createSignal("ERROR");

  createEffect(() => {
    console.error(props.error);

    const glitchChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?~`";
    const originalText = "ERROR";

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.8) {
        let glitched = "";
        for (let i = 0; i < originalText.length; i++) {
          if (Math.random() > 0.6) {
            glitched +=
              glitchChars[Math.floor(Math.random() * glitchChars.length)];
          } else {
            glitched += originalText[i];
          }
        }
        setGlitchText(glitched);

        setTimeout(() => setGlitchText(originalText), 150);
      }
    }, 400);

    return () => clearInterval(glitchInterval);
  });

  const createParticles = () => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${2 + Math.random() * 3}s`
    }));
  };

  return (
    <div class="relative min-h-screen w-full overflow-hidden bg-gradient-to-bl from-slate-900 via-red-950/20 to-slate-900 dark:from-black dark:via-red-950/30 dark:to-black">
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
              <div class="h-1 w-1 rounded-full bg-red-400 opacity-40 dark:bg-red-300" />
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
              linear-gradient(rgba(239, 68, 68, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(239, 68, 68, 0.3) 1px, transparent 1px)
            `,
            "background-size": "60px 60px",
            animation: "grid-move 25s linear infinite"
          }}
        />
      </div>

      {/* Main content */}
      <div class="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center">
        {/* Glitchy ERROR text */}
        <div class="mb-8">
          <h1
            class="bg-gradient-to-r from-red-400 via-orange-500 to-red-600 bg-clip-text text-7xl font-bold text-transparent select-none md:text-8xl"
            style={{
              "text-shadow": "0 0 30px rgba(239, 68, 68, 0.5)",
              filter: "drop-shadow(0 0 10px rgba(239, 68, 68, 0.3))"
            }}
          >
            {glitchText()}
          </h1>
          <div class="mx-auto mt-2 h-1 w-40 animate-pulse bg-gradient-to-r from-transparent via-red-500 to-transparent" />
        </div>

        {/* Error message */}
        <div class="max-w-2xl space-y-4">
          <h2 class="animate-fade-in text-2xl font-light text-slate-700 md:text-3xl dark:text-slate-400">
            Huh.
          </h2>
          <p class="animate-fade-in-delay text-lg text-slate-600 dark:text-slate-500">
            An unexpected error has disrupted the flow of ... something.
            <br />
            But don't worry, you can try again or navigate back to safety.
          </p>
          {props.error.message && (
            <p class="animate-fade-in-delay-2 font-mono text-sm text-slate-600 dark:text-slate-600">
              Error: {props.error.message}
            </p>
          )}
        </div>

        <div class="mt-12 flex flex-col gap-4 sm:flex-row">
          <button
            onClick={() => props.reset()}
            class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-red-500/25 active:scale-95"
          >
            <div class="absolute inset-0 bg-gradient-to-r from-red-700 to-orange-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span class="relative flex items-center gap-2">🔄 Try Again</span>
          </button>

          <button
            onClick={() => navigate("/")}
            class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95"
          >
            <div class="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span class="relative flex items-center gap-2">🏠 cd ~</span>
          </button>

          <button
            onClick={() => window.history.back()}
            class="group relative overflow-hidden rounded-lg border-2 border-slate-600 bg-transparent px-8 py-4 text-lg font-medium text-slate-600 transition-all duration-300 hover:border-red-500 hover:bg-red-500/10 hover:text-red-400 active:scale-95"
          >
            <span class="relative flex items-center gap-2">← Go Back</span>
          </button>
        </div>

        {/* Floating elements */}
        <div class="animate-bounce-slow absolute top-20 left-10">
          <div class="h-6 w-6 rotate-45 bg-gradient-to-br from-red-400 to-orange-500 opacity-60" />
        </div>
        <div class="animate-bounce-slow-delay absolute top-32 right-16">
          <div class="h-4 w-4 rounded-full bg-gradient-to-br from-orange-400 to-red-500 opacity-60" />
        </div>
        <div class="animate-bounce-slow absolute bottom-20 left-20">
          <div
            class="h-5 w-5 bg-gradient-to-br from-red-500 to-orange-400 opacity-60"
            style={{ "clip-path": "polygon(50% 0%, 0% 100%, 100% 100%)" }}
          />
        </div>

        {/* Footer */}
        <div class="absolute bottom-8 left-1/2 -translate-x-1/2">
          <p class="text-sm text-slate-500 dark:text-slate-600">
            System Error • Something went wrong
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
            transform: translate(60px, 60px);
          }
        }

        .animate-fade-in {
          animation: fadeIn 1s ease-out 0.5s both;
        }

        .animate-fade-in-delay {
          animation: fadeIn 1s ease-out 1s both;
        }

        .animate-fade-in-delay-2 {
          animation: fadeIn 1s ease-out 1.5s both;
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
  );
}
