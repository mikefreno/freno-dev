import { Spinner } from "~/components/Spinner";

export function TerminalSplash() {
  return (
    <div class="bg-base flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      <div class="text-text max-w-3xl p-8">
        <div class="flex items-center justify-center">
          <Spinner size="xl" />
        </div>
      </div>
    </div>
  );
}
