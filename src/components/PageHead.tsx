import { Title, Meta, Link } from "@solidjs/meta";

export interface PageHeadProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  canonical?: string;
}

/**
 * PageHead component for consistent page metadata across the application.
 * Automatically appends " | Michael Freno" to the title.
 *
 * @example
 * ```tsx
 * <PageHead
 *   title="Blog"
 *   description="Technical blog posts about web development"
 *   ogImage="https://example.com/og-image.jpg"
 * />
 * ```
 */
export default function PageHead(props: PageHeadProps) {
  const fullTitle = () => `${props.title} | Michael Freno`;

  return (
    <>
      <Title>{fullTitle()}</Title>
      {props.description && (
        <Meta name="description" content={props.description} />
      )}
      {props.canonical && <Link rel="canonical" href={props.canonical} />}

      {/* Open Graph / Social Media Tags */}
      {(props.ogTitle || props.title) && (
        <Meta property="og:title" content={props.ogTitle || props.title} />
      )}
      {(props.ogDescription || props.description) && (
        <Meta
          property="og:description"
          content={props.ogDescription || props.description}
        />
      )}
      {props.ogImage && <Meta property="og:image" content={props.ogImage} />}
    </>
  );
}
