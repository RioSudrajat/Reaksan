import {
  Activity,
  Droplets,
  Flame,
  Package,
  RefreshCw,
  Scale,
  Thermometer,
  Wind,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const glyphRules: Array<[RegExp, LucideIcon]> = [
  [/vacuum|vacum|pompa|cabinet/i, Wind],
  [/furnace|muffle/i, Flame],
  [/oven|microwave/i, Flame],
  [/spectro|turbidi/i, Activity],
  [/ph meter/i, Droplets],
  [/balance|timbangan/i, Scale],
  [/centrifuge|sentrifugator/i, RefreshCw],
  [/hot plate|stirrer|stirer|heatingmantle|electromantle/i, Thermometer],
  [/desiccator/i, Package],
  [/shaker|sonikator|bts/i, Activity],
];

export function EquipmentGlyph({
  name,
  className,
  strokeWidth = 1.8,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon =
    glyphRules.find(([pattern]) => pattern.test(name))?.[1] ?? Wrench;
  return (
    <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />
  );
}
