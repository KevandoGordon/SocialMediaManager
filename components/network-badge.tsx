import { NETWORKS } from "@/lib/networks";
import type { NetworkId } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Pass `decorative` when the network name is already written next to the icon. */
export function NetworkIcon({
  network,
  size = 20,
  className,
  decorative,
}: {
  network: NetworkId;
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  const spec = NETWORKS[network];
  return (
    <span
      title={decorative ? undefined : spec.name}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : spec.name}
      aria-hidden={decorative || undefined}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-md font-bold text-white", className)}
      style={{
        background: network === "tiktok" ? "#111" : spec.color,
        color: network === "tiktok" ? spec.color : "#fff",
        width: size,
        height: size,
        fontSize: size * (spec.glyph.length > 1 ? 0.42 : 0.55),
        lineHeight: 1,
      }}
    >
      {spec.glyph}
    </span>
  );
}

export function NetworkStack({ networks, size = 18 }: { networks: NetworkId[]; size?: number }) {
  return (
    <span className="inline-flex items-center -space-x-1">
      {networks.map((n) => (
        <NetworkIcon key={n} network={n} size={size} className="ring-2 ring-surface" />
      ))}
    </span>
  );
}
