import { onMount } from "solid-js";

export default function MermaidRenderer() {
  onMount(async () => {
    const mermaidPres = document.querySelectorAll('pre[data-type="mermaid"]');

    // Only load mermaid if there are diagrams to render
    if (mermaidPres.length === 0) return;

    const mermaid = (await import("mermaid")).default;

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
