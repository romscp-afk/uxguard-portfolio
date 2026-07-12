import type { ContentBlock } from "../../types";
import { resolveAssetUrl } from "../../api/client";
import { RichText } from "../ui/RichText";

function TextBlock({ data }: { data: Record<string, unknown> }) {
  return (
    <section className="space-y-3">
      {data.heading ? (
        <h3 className="font-display text-2xl font-semibold text-ink-900">{String(data.heading)}</h3>
      ) : null}
      {data.body ? <RichText text={String(data.body)} /> : null}
    </section>
  );
}

function QuoteBlock({ data }: { data: Record<string, unknown> }) {
  return (
    <blockquote className="rounded-2xl border-l-4 border-brand-500 bg-brand-50/50 px-6 py-5">
      <p className="text-lg italic leading-relaxed text-ink-800">&ldquo;{String(data.text)}&rdquo;</p>
      {data.attribution ? (
        <footer className="mt-3 text-sm font-medium text-ink-500">— {String(data.attribution)}</footer>
      ) : null}
    </blockquote>
  );
}

function FindingsBlock({ data }: { data: Record<string, unknown> }) {
  const items = (data.items as Array<{ statement: string; evidence: string }>) || [];
  return (
    <div className="space-y-4">
      <h3 className="font-display text-2xl font-semibold text-ink-900">Key Findings</h3>
      <div className="grid gap-4">
        {items.map((item, i) => (
          <div key={i} className="card p-5">
            <p className="font-semibold text-ink-900">{item.statement}</p>
            <p className="mt-2 text-sm text-ink-600">{item.evidence}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function GalleryBlock({ data }: { data: Record<string, unknown> }) {
  const images = (data.images as Array<{ url: string; caption?: string }>) || [];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {images.map((img, i) => (
        <figure key={i} className="overflow-hidden rounded-2xl border border-ink-100">
          <img
            src={resolveAssetUrl(img.url)}
            alt={img.caption || ""}
            className="aspect-video w-full object-cover"
            loading="lazy"
          />
          {img.caption ? (
            <figcaption className="px-4 py-3 text-sm text-ink-500">{img.caption}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

function ImageBlock({ data }: { data: Record<string, unknown> }) {
  const url = String(data.url || "");
  if (!url) return null;
  return (
    <figure className="overflow-hidden rounded-2xl border border-ink-100">
      <img
        src={resolveAssetUrl(url)}
        alt={String(data.caption || "")}
        className="w-full object-cover"
        loading="lazy"
      />
      {data.caption ? (
        <figcaption className="px-4 py-3 text-sm text-ink-500">{String(data.caption)}</figcaption>
      ) : null}
    </figure>
  );
}

export function ContentBlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  if (!blocks.length) return null;

  return (
    <div className="space-y-10">
      {blocks.map((block) => {
        switch (block.type) {
          case "text":
            return <TextBlock key={block.id} data={block.data} />;
          case "quote":
            return <QuoteBlock key={block.id} data={block.data} />;
          case "findings":
            return <FindingsBlock key={block.id} data={block.data} />;
          case "gallery":
            return <GalleryBlock key={block.id} data={block.data} />;
          case "image":
            return <ImageBlock key={block.id} data={block.data} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
