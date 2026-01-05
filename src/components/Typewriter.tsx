import { JSX, onMount, onCleanup, createSignal, children } from "solid-js";

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

    let totalChars = 0;
    const charElements: HTMLElement[] = [];

    const walkDOM = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (text.trim().length > 0) {
          totalChars += text.length;

          const fragment = document.createDocumentFragment();
          const span = document.createElement("span");

          text.split("").forEach((char) => {
            const charSpan = document.createElement("span");
            charSpan.textContent = char;
            charSpan.style.opacity = "0";
            charElements.push(charSpan);
            span.appendChild(charSpan);
          });

          fragment.appendChild(span);
          node.parentNode?.replaceChild(fragment, node);
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

    let cleanupAnimation: (() => void) | undefined;

    const startReveal = () => {
      setIsTyping(true);

      let currentIndex = 0;
      const speed = props.speed || 30;
      const msPerChar = 1000 / speed;
      let lastTime = performance.now();
      let animationFrameId: number;

      const revealNextChar = (currentTime: number) => {
        const elapsed = currentTime - lastTime;

        if (elapsed >= msPerChar) {
          if (currentIndex < totalChars) {
            const charSpan = charElements[currentIndex];

            if (charSpan) {
              // Batch style reads first
              const rect = charSpan.getBoundingClientRect();
              const containerRect = containerRef?.getBoundingClientRect();

              // Then batch style writes
              charSpan.style.opacity = "1";

              if (cursorRef && containerRect) {
                cursorRef.style.left = `${rect.right - containerRect.left}px`;
                cursorRef.style.top = `${rect.top - containerRect.top}px`;
                cursorRef.style.height = `${charSpan.offsetHeight}px`;
              }
            }

            currentIndex++;
            lastTime = currentTime;
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
            return;
          }
        }

        animationFrameId = requestAnimationFrame(revealNextChar);
      };

      animationFrameId = requestAnimationFrame(revealNextChar);

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    };

    if (delay > 0) {
      setTimeout(() => {
        setIsDelaying(false);
        cleanupAnimation = startReveal();
      }, delay);
    } else {
      cleanupAnimation = startReveal();
    }

    // Use IntersectionObserver to pause animation when not in viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If component leaves viewport while animating, we could pause
          // For now, we just ensure it starts when visible
          if (!entry.isIntersecting && cleanupAnimation) {
            // Component is off-screen - could add pause logic here if needed
          }
        });
      },
      {
        rootMargin: "50px", // Start slightly before entering viewport
        threshold: 0.1
      }
    );

    observer.observe(containerRef);

    onCleanup(() => {
      observer.disconnect();
      if (cleanupAnimation) {
        cleanupAnimation();
      }
    });
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
      style={{ opacity: animated() ? "1" : "0" }}
      data-typewriter={!animated() ? "static" : "animated"}
    >
      {resolved()}
      <span ref={cursorRef} class={getCursorClass()}></span>
    </div>
  );
}
