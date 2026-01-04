import { JSX, onMount, createSignal, children } from "solid-js";

export function Typewriter(props: {
  children: JSX.Element;
  speed?: number;
  class?: string;
  keepAlive?: boolean | number;
  delay?: number;
}) {
  const { keepAlive = true, delay = 0 } = props;
  let containerRef: HTMLDivElement | undefined;
  let cursorRef: HTMLDivElement | undefined;
  const [isTyping, setIsTyping] = createSignal(false);
  const [isDelaying, setIsDelaying] = createSignal(delay > 0);
  const [shouldHide, setShouldHide] = createSignal(false);
  const [animated, setAnimated] = createSignal(false);
  const resolved = children(() => props.children);

  onMount(() => {
    if (!containerRef || !cursorRef) return;

    containerRef.style.position = "relative";

    const textNodes: { node: Text; text: string; startIndex: number }[] = [];
    let totalChars = 0;

    const walkDOM = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (text.trim().length > 0) {
          textNodes.push({
            node: node as Text,
            text: text,
            startIndex: totalChars
          });
          totalChars += text.length;

          const span = document.createElement("span");
          text.split("").forEach((char, i) => {
            const charSpan = document.createElement("span");
            charSpan.textContent = char;
            charSpan.setAttribute(
              "data-char-index",
              String(totalChars - text.length + i)
            );
            span.appendChild(charSpan);
          });
          node.parentNode?.replaceChild(span, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.childNodes).forEach(walkDOM);
      }
    };

    walkDOM(containerRef);

    setAnimated(true);

    containerRef.setAttribute("data-typewriter-ready", "true");

    const handleAnimationEnd = () => {
      setShouldHide(true);
      cursorRef?.removeEventListener("animationend", handleAnimationEnd);
    };

    const startReveal = () => {
      setIsTyping(true);

      let currentIndex = 0;
      const speed = props.speed || 30;

      const revealNextChar = () => {
        if (currentIndex < totalChars) {
          const charSpan = containerRef?.querySelector(
            `[data-char-index="${currentIndex}"]`
          ) as HTMLElement;

          if (charSpan) {
            charSpan.style.opacity = "1";

            if (cursorRef && containerRef) {
              const rect = charSpan.getBoundingClientRect();
              const containerRect = containerRef.getBoundingClientRect();

              cursorRef.style.left = `${rect.right - containerRect.left}px`;
              cursorRef.style.top = `${rect.top - containerRect.top}px`;
              cursorRef.style.height = `${charSpan.offsetHeight}px`;
            }
          }

          currentIndex++;
          setTimeout(revealNextChar, 1000 / speed);
        } else {
          setIsTyping(false);

          if (typeof keepAlive === "number") {
            cursorRef?.addEventListener("animationend", handleAnimationEnd);

            const durationSeconds = keepAlive / 1000;
            const iterations = Math.ceil(durationSeconds);
            if (cursorRef) {
              cursorRef.style.animation = `blink 1s ${iterations}`;
            }
          }
        }
      };

      setTimeout(revealNextChar, 100);
    };

    if (delay > 0) {
      setTimeout(() => {
        setIsDelaying(false);
        startReveal();
      }, delay);
    } else {
      startReveal();
    }
  });

  const getCursorClass = () => {
    if (isDelaying()) return "cursor-block";
    if (isTyping()) return "cursor-typing";
    if (shouldHide()) return "hidden";
    return keepAlive ? "cursor-block" : "hidden";
  };

  return (
    <div
      ref={containerRef}
      class={props.class}
      data-typewriter={!animated() ? "static" : "animated"}
    >
      {resolved()}
      <span ref={cursorRef} class={getCursorClass()}></span>
    </div>
  );
}
