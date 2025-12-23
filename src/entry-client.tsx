// @refresh reload
import { injectSpeedInsights } from "@vercel/speed-insights";
import { mount, StartClient } from "@solidjs/start/client";
injectSpeedInsights();
mount(() => <StartClient />, document.getElementById("app")!);
