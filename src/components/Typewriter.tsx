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

    // FIRST: Walk DOM and split text into character spans
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

          // Replace text with spans for each character
          const span = document.createElement("span");
          text.split("").forEach((char, i) => {
            const charSpan = document.createElement("span");
            charSpan.textContent = char;
            // Don't set opacity here - CSS will handle it based on data-typewriter state
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

    // Mark as animated AFTER DOM manipulation - this triggers CSS to hide characters
    setAnimated(true);

    containerRef.setAttribute("data-typewriter-ready", "true");

    // Listen for animation end to hide cursor
    const handleAnimationEnd = () => {
      setShouldHide(true);
      cursorRef?.removeEventListener("animationend", handleAnimationEnd);
    };

    const startReveal = () => {
      setIsTyping(true); // Switch to typing cursor

      // Animate revealing characters
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

              // Position cursor at the end of the current character
              cursorRef.style.left = `${rect.right - containerRect.left}px`;
              cursorRef.style.top = `${rect.top - containerRect.top}px`;
              cursorRef.style.height = `${charSpan.offsetHeight}px`;
            }
          }

          currentIndex++;
          setTimeout(revealNextChar, 1000 / speed);
        } else {
          // Typing finished, switch to block cursor
          setIsTyping(false);

          // Start keepAlive timer if it's a number
          if (typeof keepAlive === "number") {
            // Attach animation end listener
            cursorRef?.addEventListener("animationend", handleAnimationEnd);

            // Trigger the animation with finite iteration count
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
