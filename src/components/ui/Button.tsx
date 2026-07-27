import {
  type JSX,
  splitProps,
  Show,
  createSignal,
  createEffect
} from "solid-js";
import { Spinner } from "~/components/Spinner";

/** Parse a hex color string like `#f9e2af` into `[r, g, b]` in 0..255. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16)
  ];
}

/** Convert `[r, g, b]` 0..255 to `[h, s, l]` — h in 0..360, s and l in 0..1. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      case bn:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s, l];
}

/** Convert `[h, s, l]` (h in 0..360, s and l in 0..1) to `[r, g, b]` 0..255. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return [f(0), f(8), f(4)];
}

/**
 * Compute the relative luminance (WCAG) of an sRGB color, given linear
 * channel values in 0..1.
 */
function luminance(r: number, g: number, b: number): number {
  return (
    0.2126 * (r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92) +
    0.7152 * (g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92) +
    0.0722 * (b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92)
  );
}

/**
 * Given a background color, return a pair of `{ bg, text }` CSS color
 * strings that guarantee WCAG AA contrast.
 *
 * Light backgrounds (luminance > 0.4) are darkened in HSL space so the
 * result is dark enough for white text.  Dark backgrounds are kept as-is
 * with white text.  This is used by the download variant whose background
 * is a product brand color that can be arbitrarily light.
 */
function adjustForContrast(color: string): { bg: string; text: string } {
  const [r, g, b] = hexToRgb(color);
  const [h, s, l] = rgbToHsl(r, g, b);
  const lum = luminance(r / 255, g / 255, b / 255);

  if (lum > 0.4) {
    // Darken: keep hue and saturation, clamp lightness so the result is
    // dark enough for white text (l ~ 0.35 → luminance ~ 0.17, contrast
    // with white ≈ 6:1).
    const dl = Math.min(l, 0.35);
    const [dr, dg, db] = hslToRgb(h, s, dl);
    return {
      bg: `rgb(${dr}, ${dg}, ${db})`,
      text: "#ffffff"
    };
  }
  return {
    bg: `rgb(${r}, ${g}, ${b})`,
    text: "#ffffff"
  };
}

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "download";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  /**
   * Override the variant's background color with an explicit CSS color.
   * Used by download pages to theme the button with the product brand color.
   */
  color?: string;
}

export default function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, [
    "variant",
    "size",
    "loading",
    "fullWidth",
    "class",
    "children",
    "disabled",
    "color"
  ]);

  let contentRef: HTMLSpanElement | undefined;
  const [dimensions, setDimensions] = createSignal<{
    width: number;
    height: number;
  } | null>(null);

  // Measure content dimensions when not loading
  createEffect(() => {
    if (!local.loading && contentRef) {
      const rect = contentRef.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  });

  const variant = () => local.variant || "primary";
  const size = () => local.size || "md";

  const baseClasses =
    "flex justify-center cursor-pointer items-center rounded transition-all duration-300 ease-out";

  const variantClasses = () => {
    const isDisabledOrLoading = local.disabled || local.loading;

    switch (variant()) {
      case "primary":
        return isDisabledOrLoading
          ? "bg-blue cursor-not-allowed brightness-75"
          : "bg-blue hover:brightness-125 active:scale-90";
      case "secondary":
        return isDisabledOrLoading
          ? "bg-surface0 cursor-not-allowed brightness-75"
          : "bg-surface0 hover:brightness-125 active:scale-90";
      case "download":
        return isDisabledOrLoading
          ? "cursor-not-allowed brightness-75"
          : "hover:brightness-125 active:scale-90";
      case "danger":
        return isDisabledOrLoading
          ? "bg-red cursor-not-allowed brightness-75"
          : "bg-red hover:brightness-125 active:scale-90";
      case "ghost":
        return isDisabledOrLoading
          ? "cursor-not-allowed opacity-50"
          : "hover:brightness-125 active:scale-90";
      default:
        return "";
    }
  };

  /** Compute background + text color for the download variant. */
  const downloadColors = () => {
    const isDisabledOrLoading = local.disabled || local.loading;
    if (isDisabledOrLoading) {
      return { bg: "var(--color-base)", text: "#ffffff" };
    }
    return adjustForContrast(local.color || "var(--color-blue)");
  };

  const sizeClasses = () => {
    switch (size()) {
      case "sm":
        return "px-3 py-1.5 text-sm";
      case "md":
        return "px-4 py-2 text-base";
      case "lg":
        return "px-6 py-3 text-lg";
      default:
        return "";
    }
  };

  const widthClass = () => (local.fullWidth ? "w-full" : "");

  const buttonStyle = (): JSX.CSSProperties => {
    if (variant() === "download") {
      const { bg, text } = downloadColors();
      return { background: bg, color: text };
    }
    // Theme-aware text: white on dark bg variants (primary/danger),
    // theme text on light bg variants (secondary).  The CSS variables
    // flip between light/dark modes so the contrast stays good in both.
    if (variant() === "secondary")
      return { color: "var(--color-button-text-alt)" };
    return { color: "var(--color-button-text)" };
  };

  return (
    <button
      {...others}
      disabled={local.disabled || local.loading}
      class={`${baseClasses} ${variantClasses()} ${sizeClasses()} ${widthClass()} ${local.class || ""}`}
      style={buttonStyle()}
    >
      <Show
        when={local.loading}
        fallback={
          <span ref={contentRef} style={{ display: "inline-flex" }}>
            {local.children}
          </span>
        }
      >
        <span
          style={{
            display: "inline-flex",
            "align-items": "center",
            "justify-content": "center",
            "min-width": dimensions() ? `${dimensions()!.width}px` : undefined,
            "min-height": dimensions() ? `${dimensions()!.height}px` : undefined
          }}
        >
          <Spinner size={24} />
        </span>
      </Show>
    </button>
  );
}

// Named export for consistency
export { Button };
