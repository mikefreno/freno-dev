import { createSignal, onMount, onCleanup, Accessor } from "solid-js";

export const MOBILE_BREAKPOINT = 768;

/**
 * Creates a reactive window width signal that updates on resize
 * @param debounceMs Optional debounce delay in milliseconds
 * @returns Accessor for current window width
 */
export function createWindowWidth(debounceMs?: number): Accessor<number> {
  const initialWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const [width, setWidth] = createSignal(initialWidth);

  onMount(() => {
    setWidth(window.innerWidth);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const handleResize = () => {
      if (debounceMs) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setWidth(window.innerWidth);
        }, debounceMs);
      } else {
        setWidth(window.innerWidth);
      }
    };

    window.addEventListener("resize", handleResize);

    onCleanup(() => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    });
  });

  return width;
}

/**
 * Checks if the current window width is in mobile viewport
 * @param width Current window width
 * @returns true if mobile viewport
 */
export function isMobile(width: number): boolean {
  return width < MOBILE_BREAKPOINT;
}

/**
 * Creates a derived signal for mobile state
 * @param windowWidth Window width accessor
 * @returns Accessor for mobile state
 */
export function createIsMobile(
  windowWidth: Accessor<number>
): Accessor<boolean> {
  return () => isMobile(windowWidth());
}

/**
 * Resizes an image file to a maximum width/height while maintaining aspect ratio
 * @param file Original image file
 * @param maxWidth Maximum width in pixels
 * @param maxHeight Maximum height in pixels
 * @param quality JPEG quality (0-1), default 0.85
 * @returns Resized image as Blob
 */
export async function resizeImage(
  file: File | Blob,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;

        if (width > height) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob from canvas"));
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => {
      reject(new Error("FileReader error"));
    };
    reader.readAsDataURL(file);
  });
}
