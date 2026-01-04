import { onMount } from "solid-js";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "monospace",
  themeVariables: {
    darkMode: true,
    primaryColor: "#2c2f40",
    primaryTextColor: "#b5c1f1",
    primaryBorderColor: "#739df2",
    lineColor: "#739df2",
    secondaryColor: "#3e4255",
    tertiaryColor: "#505469"
  }
});

export default function MermaidRenderer() {
  onMount(() => {
    const mermaidPres = document.querySelectorAll('pre[data-type="mermaid"]');

    mermaidPres.forEach(async (pre, index) => {
      const code = pre.querySelector("code");
      if (!code) return;

      const content = code.textContent || "";
      if (!content.trim()) return;

      try {
        const id = `mermaid-${index}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, content);

        const wrapper = document.createElement("div");
        wrapper.className = "mermaid-rendered";
        wrapper.innerHTML = svg;
        pre.replaceWith(wrapper);
      } catch (err) {
        console.error("Failed to render mermaid diagram:", err);
        pre.classList.add("mermaid-error");
      }
    });
  });

  return null;
}
