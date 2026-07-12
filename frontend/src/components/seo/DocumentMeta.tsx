import { useEffect } from "react";

type DocumentMetaProps = {
  title: string;
  description?: string;
  image?: string;
  url?: string;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function DocumentMeta({ title, description, image, url }: DocumentMetaProps) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }

    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:type", "article");
    upsertMeta("property", "og:site_name", "UXGuard Studio");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);

    if (image) {
      upsertMeta("property", "og:image", image);
      upsertMeta("name", "twitter:image", image);
    }

    if (url) {
      upsertMeta("property", "og:url", url);
      let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = url;
    }

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, image, url]);

  return null;
}
