import { Typewriter } from "./Typewriter";
import { useBars } from "~/context/bars";
import { onMount, createEffect } from "solid-js";

export function LeftBar() {
  const { setLeftBarSize, leftBarVisible, setLeftBarVisible } = useBars();
  let ref: HTMLDivElement | undefined;
  let actualWidth = 0;
  let touchStartX = 0;
  let touchStartY = 0;

  onMount(() => {
    if (ref) {
      const updateSize = () => {
        actualWidth = ref?.offsetWidth || 0;
        setLeftBarSize(leftBarVisible() ? actualWidth : 0);
      };

      updateSize();

      const resizeObserver = new ResizeObserver((entries) => {
        // Use requestAnimationFrame to avoid ResizeObserver loop error
        requestAnimationFrame(() => {
          actualWidth = ref?.offsetWidth || 0;
          setLeftBarSize(leftBarVisible() ? actualWidth : 0);
        });
      });
      resizeObserver.observe(ref);

      // Swipe-to-dismiss gesture on sidebar itself (mobile only)
      const handleTouchStart = (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      };

      const handleTouchEnd = (e: TouchEvent) => {
        const isMobile = window.innerWidth < 768;
        if (!isMobile) return; // Only allow dismiss on mobile
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Only trigger if horizontal swipe is dominant
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Swipe left to dismiss (at least 50px)
          if (deltaX < -50 && leftBarVisible()) {
            setLeftBarVisible(false);
          }
        }
      };

      // Focus trap for accessibility on mobile
      const handleKeyDown = (e: KeyboardEvent) => {
        const isMobile = window.innerWidth < 768;
        
        if (!isMobile || !leftBarVisible()) return;

        if (e.key === 'Tab') {
          const focusableElements = ref?.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          
          if (!focusableElements || focusableElements.length === 0) return;

          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey) {
            // Shift+Tab - going backwards
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            // Tab - going forwards
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      ref.addEventListener('touchstart', handleTouchStart, { passive: true });
      ref.addEventListener('touchend', handleTouchEnd, { passive: true });
      ref.addEventListener('keydown', handleKeyDown);

      return () => {
        resizeObserver.disconnect();
        ref?.removeEventListener('touchstart', handleTouchStart);
        ref?.removeEventListener('touchend', handleTouchEnd);
        ref?.removeEventListener('keydown', handleKeyDown);
      };
    }
  });

  // Update size when visibility changes
  createEffect(() => {
    setLeftBarSize(leftBarVisible() ? actualWidth : 0);
  });

  // Auto-focus first element when sidebar opens on mobile
  createEffect(() => {
    const isMobile = window.innerWidth < 768;
    
    if (leftBarVisible() && isMobile && ref) {
      const firstFocusable = ref.querySelector(
        'a[href], button:not([disabled]), input:not([disabled])'
      ) as HTMLElement;
      
      if (firstFocusable) {
        // Small delay to ensure animation has started
        setTimeout(() => firstFocusable.focus(), 100);
      }
    }
  });

  return (
    <nav
      ref={ref}
      class="border-r-overlay2 fixed h-full min-h-screen w-fit max-w-[25%] border-r-2 transition-transform duration-500 ease-out z-50"
      classList={{
        "-translate-x-full": !leftBarVisible(),
        "translate-x-0": leftBarVisible()
      }}
      style={{
        "transition-timing-function": leftBarVisible() 
          ? "cubic-bezier(0.34, 1.56, 0.64, 1)" // Bounce out when revealing
          : "cubic-bezier(0.4, 0, 0.2, 1)" // Smooth when hiding
      }}
    >
      <Typewriter speed={10} keepAlive={10000} class="z-50 pr-8 pl-4">
        <h3 class="hover:text-subtext0 w-fit text-center text-3xl underline transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105">
          <a href="/">Freno.dev</a>
        </h3>
      </Typewriter>
      <Typewriter keepAlive={false} class="z-50 h-full">
        <div class="text-text flex h-full flex-col justify-between px-4 text-xl font-bold">
          <ul class="gap-4">
            {/*TODO:Grab and render 5 most recent blog posts here */}
            <li></li>
          </ul>
          <div class="flex flex-col gap-4">
            <ul class="gap-4">
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="/">Home</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="/blog">Blog</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="#services">Services</a>
              </li>
            </ul>
            {/* Right bar navigation merged for mobile */}
            <ul class="gap-4 md:hidden border-t border-overlay0 pt-4">
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="#home">Home</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="#about">About</a>
              </li>
              <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
                <a href="#services">Services</a>
              </li>
            </ul>
          </div>
        </div>
      </Typewriter>
    </nav>
  );
}

export function RightBar() {
  const { setRightBarSize, rightBarVisible } = useBars();
  let ref: HTMLDivElement | undefined;
  let actualWidth = 0;

  onMount(() => {
    if (ref) {
      const updateSize = () => {
        actualWidth = ref?.offsetWidth || 0;
        setRightBarSize(rightBarVisible() ? actualWidth : 0);
      };

      updateSize();

      const resizeObserver = new ResizeObserver((entries) => {
        // Use requestAnimationFrame to avoid ResizeObserver loop error
        requestAnimationFrame(() => {
          actualWidth = ref?.offsetWidth || 0;
          setRightBarSize(rightBarVisible() ? actualWidth : 0);
        });
      });
      resizeObserver.observe(ref);

      return () => {
        resizeObserver.disconnect();
      };
    }
  });

  // Update size when visibility changes
  createEffect(() => {
    setRightBarSize(rightBarVisible() ? actualWidth : 0);
  });

  return (
    <nav
      ref={ref}
      class="border-l-overlay2 fixed right-0 h-full min-h-screen w-fit max-w-[25%] border-l-2 transition-transform duration-500 ease-out md:block hidden z-50"
      classList={{
        "translate-x-full": !rightBarVisible(),
        "translate-x-0": rightBarVisible()
      }}
      style={{
        "transition-timing-function": rightBarVisible() 
          ? "cubic-bezier(0.34, 1.56, 0.64, 1)" // Bounce out when revealing
          : "cubic-bezier(0.4, 0, 0.2, 1)" // Smooth when hiding
      }}
    >
      <Typewriter keepAlive={false} class="z-50">
        <h3 class="hover:text-subtext0 w-fit text-center text-3xl underline transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-105">
          Right Navigation
        </h3>
        <div class="text-text flex h-screen flex-col justify-between px-4 py-10 text-xl font-bold">
          <ul class="gap-4">
            <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
              <a href="#home">Home</a>
            </li>
            <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
              <a href="#about">About</a>
            </li>
            <li class="hover:text-subtext0 w-fit transition-transform duration-200 ease-in-out hover:-translate-y-0.5 hover:scale-110 hover:font-bold">
              <a href="#services">Services</a>
            </li>
          </ul>
        </div>
      </Typewriter>
    </nav>
  );
}
