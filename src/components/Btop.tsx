import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { BREAKPOINTS } from "~/config";

interface BtopProps {
  onClose: () => void;
}

export function Btop(props: BtopProps) {
  const [cpuUsage, setCpuUsage] = createSignal(64);
  const [memUsage, setMemUsage] = createSignal(80);
  const [netDown, setNetDown] = createSignal(404);
  const [netUp, setNetUp] = createSignal(0);
  const [processes, setProcesses] = createSignal([
    {
      pid: 404,
      name: "error-handler",
      cpu: 32.0,
      mem: 15.2,
      status: "Running"
    },
    {
      pid: 128,
      name: "glitch-generator",
      cpu: 18.4,
      mem: 8.7,
      status: "Running"
    },
    { pid: 256, name: "terminal-shell", cpu: 8.2, mem: 4.1, status: "Running" },
    {
      pid: 512,
      name: "random-process",
      cpu: 5.4,
      mem: 2.3,
      status: "Sleeping"
    },
    { pid: 1024, name: "mystery-daemon", cpu: 0.0, mem: 0.0, status: "???" }
  ]);
  const [isMobile, setIsMobile] = createSignal(false);

  onMount(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < BREAKPOINTS.MOBILE);

      const handleResize = () => {
        setIsMobile(window.innerWidth < BREAKPOINTS.MOBILE);
      };
      window.addEventListener("resize", handleResize);
      onCleanup(() => window.removeEventListener("resize", handleResize));
    }

    const cpuInterval = setInterval(() => {
      setCpuUsage((prev) => {
        const change = (Math.random() - 0.5) * 10;
        const newVal = Math.max(30, Math.min(95, prev + change));
        return Math.round(newVal);
      });
    }, 1000);

    const memInterval = setInterval(() => {
      setMemUsage((prev) => {
        const change = (Math.random() - 0.5) * 5;
        const newVal = Math.max(60, Math.min(90, prev + change));
        return Math.round(newVal);
      });
    }, 1500);

    const netInterval = setInterval(() => {
      setNetDown(Math.floor(Math.random() * 1000));
      setNetUp(Math.floor(Math.random() * 100));
    }, 800);

    const procInterval = setInterval(() => {
      setProcesses((prev) =>
        prev.map((proc) => ({
          ...proc,
          cpu:
            proc.name === "mystery-daemon"
              ? 0.0
              : Math.max(0, proc.cpu + (Math.random() - 0.5) * 5),
          mem:
            proc.name === "mystery-daemon"
              ? 0.0
              : Math.max(0, proc.mem + (Math.random() - 0.5) * 2)
        }))
      );
    }, 2000);

    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isMobile() && e.key === "q" && e.shiftKey && e.key === ":") {
        props.onClose();
      }
      if (!isMobile() && e.key === "q") {
        props.onClose();
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    onCleanup(() => {
      clearInterval(cpuInterval);
      clearInterval(memInterval);
      clearInterval(netInterval);
      clearInterval(procInterval);
      window.removeEventListener("keydown", handleKeyPress);
    });
  });

  const createBar = (percentage: number, width: number = 30) => {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  };

  return (
    <div class="bg-crust fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div class="bg-mantle border-surface0 text-text relative h-full w-full max-w-6xl overflow-hidden rounded-lg border-2 font-mono text-sm shadow-2xl md:h-auto md:max-h-[90vh]">
        <div class="border-surface0 bg-surface0 border-b px-4 py-2">
          <div class="flex items-center justify-between">
            <span class="text-blue">
              btop <span class="text-subtext0">v1.404.0</span> - ErrorOS System
              Monitor
            </span>
            <Show
              when={!isMobile()}
              fallback={
                <button
                  onClick={props.onClose}
                  class="bg-red hover:bg-red/80 rounded px-3 py-1 text-base transition-colors"
                >
                  Close
                </button>
              }
            >
              <span class="text-subtext1 text-xs">Press 'q' to quit</span>
            </Show>
          </div>
        </div>

        <div class="space-y-4 p-4">
          <div class="border-surface0 bg-base rounded border p-3">
            <div class="text-green mb-2 font-bold">System Resources</div>
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-subtext1 w-12">CPU</span>
                <span class="text-blue">[{createBar(cpuUsage())}]</span>
                <span class="text-text w-16 text-right">{cpuUsage()}%</span>
                <span class="text-subtext0">2.4 GHz</span>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-subtext1 w-12">MEM</span>
                <span class="text-blue">[{createBar(memUsage())}]</span>
                <span class="text-text w-16 text-right">{memUsage()}%</span>
                <span class="text-subtext0">
                  {((memUsage() / 100) * 16).toFixed(1)}/16 GB
                </span>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-subtext1 w-12">NET</span>
                <span class="text-green">↓ {netDown()} KB/s</span>
                <span class="text-red">↑ {netUp()} KB/s</span>
              </div>
            </div>
          </div>

          <div class="border-surface0 bg-base rounded border">
            <div class="border-surface0 border-b px-3 py-2">
              <span class="text-green font-bold">Processes</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-surface0 text-subtext1 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left">PID</th>
                    <th class="px-3 py-2 text-left">Name</th>
                    <th class="px-3 py-2 text-right">CPU%</th>
                    <th class="px-3 py-2 text-right">MEM%</th>
                    <th class="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processes().map((proc) => (
                    <tr class="hover:bg-surface0 border-surface0 border-t transition-colors">
                      <td class="text-yellow px-3 py-2">{proc.pid}</td>
                      <td class="text-text px-3 py-2 font-medium">
                        {proc.name}
                      </td>
                      <td class="text-blue px-3 py-2 text-right">
                        {proc.cpu.toFixed(1)}
                      </td>
                      <td class="text-peach px-3 py-2 text-right">
                        {proc.mem.toFixed(1)}
                      </td>
                      <td
                        class="px-3 py-2"
                        classList={{
                          "text-green": proc.status === "Running",
                          "text-subtext1": proc.status === "Sleeping",
                          "text-mauve": proc.status === "???"
                        }}
                      >
                        {proc.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div class="text-subtext1 text-center text-xs">
            <Show
              when={!isMobile()}
              fallback={<span>Tap the Close button above to exit</span>}
            >
              <span>
                Type <span class="text-green">q</span> to quit btop
              </span>
            </Show>
          </div>
        </div>
      </div>

      <div
        class="absolute inset-0 -z-10 bg-black/80 backdrop-blur-sm"
        onClick={props.onClose}
      />
    </div>
  );
}
