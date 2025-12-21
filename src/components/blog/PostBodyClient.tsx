import { createEffect } from "solid-js";
import { createSignal } from "solid-js";
import type { HLJSApi } from "highlight.js";
import MermaidRenderer from "./MermaidRenderer";

export interface PostBodyClientProps {
  body: string;
  hasCodeBlock: boolean;
}

async function loadHighlightJS(): Promise<HLJSApi> {
  const [
    hljsModule,
    javascript,
    typescript,
    python,
    rust,
    c,
    cpp,
    csharp,
    ocaml,
    lua,
    swift,
    bash,
    css,
    xml, // handles HTML
    go,
    glsl,
    json,
    markdown,
    yaml,
    sql,
    diff,
    toml
  ] = await Promise.all([
    import("highlight.js/lib/core"),
    import("highlight.js/lib/languages/javascript"),
    import("highlight.js/lib/languages/typescript"),
    import("highlight.js/lib/languages/python"),
    import("highlight.js/lib/languages/rust"),
    import("highlight.js/lib/languages/c"),
    import("highlight.js/lib/languages/cpp"),
    import("highlight.js/lib/languages/csharp"),
    import("highlight.js/lib/languages/ocaml"),
    import("highlight.js/lib/languages/lua"),
    import("highlight.js/lib/languages/swift"),
    import("highlight.js/lib/languages/bash"),
    import("highlight.js/lib/languages/css"),
    import("highlight.js/lib/languages/xml"),
    import("highlight.js/lib/languages/go"),
    import("highlight.js/lib/languages/glsl"),
    import("highlight.js/lib/languages/json"),
    import("highlight.js/lib/languages/markdown"),
    import("highlight.js/lib/languages/yaml"),
    import("highlight.js/lib/languages/sql"),
    import("highlight.js/lib/languages/diff"),
    import("highlight.js/lib/languages/ini"), // handles TOML
    import("highlight.js/styles/github-dark.css")
  ]);

  const hljs = hljsModule.default;

  hljs.registerLanguage("javascript", javascript.default);
  hljs.registerLanguage("typescript", typescript.default);
  hljs.registerLanguage("python", python.default);
  hljs.registerLanguage("rust", rust.default);
  hljs.registerLanguage("c", c.default);
  hljs.registerLanguage("cpp", cpp.default);
  hljs.registerLanguage("csharp", csharp.default);
  hljs.registerLanguage("ocaml", ocaml.default);
  hljs.registerLanguage("lua", lua.default);
  hljs.registerLanguage("swift", swift.default);
  hljs.registerLanguage("bash", bash.default);
  hljs.registerLanguage("sh", bash.default); // alias
  hljs.registerLanguage("css", css.default);
  hljs.registerLanguage("html", xml.default);
  hljs.registerLanguage("xml", xml.default);
  hljs.registerLanguage("go", go.default);
  hljs.registerLanguage("glsl", glsl.default);
  hljs.registerLanguage("json", json.default);
  hljs.registerLanguage("markdown", markdown.default);
  hljs.registerLanguage("yaml", yaml.default);
  hljs.registerLanguage("yml", yaml.default); // alias
  hljs.registerLanguage("sql", sql.default);
  hljs.registerLanguage("diff", diff.default);
  hljs.registerLanguage("toml", toml.default);

  // Also register common aliases
  hljs.registerLanguage("js", javascript.default);
  hljs.registerLanguage("ts", typescript.default);
  hljs.registerLanguage("jsx", javascript.default);
  hljs.registerLanguage("tsx", typescript.default);

  return hljs;
}

export default function PostBodyClient(props: PostBodyClientProps) {
  let contentRef: HTMLDivElement | undefined;
  const [hljs, setHljs] = createSignal<HLJSApi | null>(null);

  // Load highlight.js only when needed
  createEffect(() => {
    if (props.hasCodeBlock && !hljs()) {
      loadHighlightJS().then(setHljs);
    }
  });

  // Apply syntax highlighting when hljs loads and when body changes
  createEffect(() => {
    const hljsInstance = hljs();
    if (hljsInstance && props.hasCodeBlock && contentRef) {
      setTimeout(() => {
        hljsInstance.highlightAll();
      }, 100);
    }
  });

  return (
    <div class="mx-auto max-w-4xl px-4 pt-32 md:pt-40">
      <div
        ref={contentRef}
        class="text-text prose dark:prose-invert max-w-none"
        innerHTML={props.body}
      />
      <MermaidRenderer />
    </div>
  );
}
