import { onMount } from "solid-js";

/**
 * Sanitize Mermaid SVG output by removing dangerous elements and attributes.
 * Prevents stored XSS via malicious Mermaid diagram code.
 */
function sanitizeMermaidSvg(svgString: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "text/html");

  // Remove dangerous elements
  doc.querySelectorAll("script, iframe, object, embed, form, link, meta, base").forEach((el) => {
    el.remove();
  });

  // Remove event handlers and dangerous attributes from all elements
  doc.querySelectorAll("[on*], [href*='javascript:'], [style*='expression(']").forEach((el) => {
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      if (
        attr.name.startsWith("on") ||
        attr.name === "href" ||
        attr.name === "style"
      ) {
        const value = attr.value;
        if (
          attr.name.startsWith("on") ||
          value.includes("javascript:") ||
          value.includes("expression(")
        ) {
          el.removeAttribute(attr.name);
        }
      }
    });
  });

  return doc.body.innerHTML;
}

export default function MermaidRenderer() {
  onMount(async () => {
    const mermaidPres = document.querySelectorAll('pre[data-type="mermaid"]');

    // Only load mermaid if there are diagrams to render
    if (mermaidPres.length === 0) return;

    const mermaid = (await import("mermaid")).default;

    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "strict",
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
        wrapper.innerHTML = sanitizeMermaidSvg(svg);
        pre.replaceWith(wrapper);
      } catch (err) {
        console.error("Failed to render mermaid diagram:", err);
        pre.classList.add("mermaid-error");
      }
    });
  });

  return null;
}
