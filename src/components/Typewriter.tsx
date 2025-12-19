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
  const resolved = children(() => props.children);

  onMount(() => {
    if (!containerRef || !cursorRef) return;

    // FIRST: Walk DOM and hide all text immediately
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
            charSpan.style.opacity = "0";
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

    // Position cursor at the first character location
    const firstChar = containerRef.querySelector(
      '[data-char-index="0"]'
    ) as HTMLElement;
    if (firstChar && cursorRef) {
      // Insert cursor before the first character
      firstChar.parentNode?.insertBefore(cursorRef, firstChar);
      // Set cursor height to match first character
      cursorRef.style.height = `${firstChar.offsetHeight}px`;
    }

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

            // Move cursor after this character and match its height
            if (cursorRef) {
              charSpan.parentNode?.insertBefore(
                cursorRef,
                charSpan.nextSibling
              );

              // Match the height of the current character
              const charHeight = charSpan.offsetHeight;
              cursorRef.style.height = `${charHeight}px`;
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

    // Start delay if specified, otherwise start immediately
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
    <div ref={containerRef} class={props.class}>
      {resolved()}
      <span ref={cursorRef} class={getCursorClass()}></span>
    </div>
  );
}
