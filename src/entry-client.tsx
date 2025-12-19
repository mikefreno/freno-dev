// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";
import { injectSpeedInsights } from "@vercel/speed-insights";
injectSpeedInsights();
mount(() => <StartClient />, document.getElementById("app")!);
