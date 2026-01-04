import { createSignal, onMount, onCleanup, JSX, Show } from "solid-js";

export interface CustomScrollbarProps {
  autoHide?: boolean;
  autoHideDelay?: number;
  rightOffset?: number;
  children: JSX.Element;
}

export default function CustomScrollbar(props: CustomScrollbarProps) {
  const [scrollPercentage, setScrollPercentage] = createSignal(0);
  const [thumbHeight, setThumbHeight] = createSignal(100);
  const [isDragging, setIsDragging] = createSignal(false);
  const [isVisible, setIsVisible] = createSignal(true);
  const [isHovering, setIsHovering] = createSignal(false);
  const [windowWidth, setWindowWidth] = createSignal(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  let containerRef: HTMLDivElement | undefined;
  let scrollbarRef: HTMLDivElement | undefined;
  let thumbRef: HTMLDivElement | undefined;
  let hideTimeout: NodeJS.Timeout | undefined;

  const updateScrollbar = () => {
    if (!containerRef) return;

    const scrollTop = containerRef.scrollTop;
    const scrollHeight = containerRef.scrollHeight;
    const clientHeight = containerRef.clientHeight;

    const viewportRatio = clientHeight / scrollHeight;
    const calculatedThumbHeight = Math.max(viewportRatio * 100, 5);
    setThumbHeight(calculatedThumbHeight);

    const maxScroll = scrollHeight - clientHeight;
    const percentage = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    setScrollPercentage(percentage);

    if (props.autoHide) {
      setIsVisible(true);
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (!isDragging()) {
          setIsVisible(false);
        }
      }, props.autoHideDelay || 1500);
    }
  };

  const handleTrackClick = (e: MouseEvent) => {
    if (!scrollbarRef || !containerRef || e.target === thumbRef) return;

    const rect = scrollbarRef.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = rect.height;
    const targetPercentage = (clickY / trackHeight) * 100;

    const scrollHeight = containerRef.scrollHeight;
    const clientHeight = containerRef.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    const targetScroll = (targetPercentage / 100) * maxScroll;
    containerRef.scrollTop = targetScroll;
  };

  const handleThumbMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const startY = e.clientY;
    const startScrollPercentage = scrollPercentage();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef || !scrollbarRef) return;

      const deltaY = moveEvent.clientY - startY;
      const trackHeight = scrollbarRef.getBoundingClientRect().height || 0;
      const deltaPercentage = (deltaY / trackHeight) * 100;
      const newPercentage = Math.max(
        0,
        Math.min(100, startScrollPercentage + deltaPercentage)
      );

      const scrollHeight = containerRef.scrollHeight;
      const clientHeight = containerRef.clientHeight;
      const maxScroll = scrollHeight - clientHeight;

      const targetScroll = (newPercentage / 100) * maxScroll;
      containerRef.scrollTop = targetScroll;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  onMount(() => {
    if (!containerRef) return;

    updateScrollbar();

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      updateScrollbar();
    };

    const resizeObserver = new ResizeObserver(() => {
      updateScrollbar();
    });

    resizeObserver.observe(containerRef);

    containerRef.addEventListener("scroll", updateScrollbar, { passive: true });
    window.addEventListener("resize", handleResize);

    onCleanup(() => {
      resizeObserver.disconnect();
      containerRef?.removeEventListener("scroll", updateScrollbar);
      window.removeEventListener("resize", handleResize);
      if (hideTimeout) clearTimeout(hideTimeout);
    });
  });

  const getRightOffset = () => {
    const baseOffset = props.rightOffset || 0;
    return windowWidth() >= 768 ? baseOffset : 0;
  };

  return (
    <div
      ref={containerRef}
      class="relative h-screen w-full overflow-x-hidden overflow-y-auto"
      style={{
        "scrollbar-width": "none",
        "-ms-overflow-style": "none"
      }}
    >
      <style>
        {`
          div::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      {props.children}

      <Show when={thumbHeight() < 100}>
        <div
          ref={scrollbarRef}
          onClick={handleTrackClick}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          class="fixed top-0 h-full w-3 transition-opacity duration-300"
          classList={{
            "opacity-0":
              props.autoHide && !isVisible() && !isDragging() && !isHovering(),
            "opacity-100":
              !props.autoHide || isVisible() || isDragging() || isHovering()
          }}
          style={{
            right: `${getRightOffset()}px`,
            "z-index": "9999"
          }}
        >
          <div
            ref={thumbRef}
            onMouseDown={handleThumbMouseDown}
            class="bg-text absolute right-0.5 w-2 cursor-pointer rounded-full hover:w-2.5"
            style={{
              height: `${Math.max(thumbHeight(), 5)}%`,
              top: `${(scrollPercentage() / 100) * (100 - thumbHeight())}%`,
              transition: "width 0.15s, background 0.15s"
            }}
          />
        </div>
      </Show>
    </div>
  );
}
