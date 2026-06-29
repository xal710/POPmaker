import {
  POP_PLACEMENT_DETAIL_IMAGES,
  POP_PLACEMENT_LINE_COUNT,
  POP_PLACEMENT_ZONE_LABELS,
  type PopPlacementZone,
} from "../../shared/popPlacement";

interface OrangeSpan {
  start: number;
  end: number;
}

interface DetectedHorizontal {
  orientation: "horizontal";
  y: number;
  xMin: number;
  xMax: number;
}

interface DetectedVertical {
  orientation: "vertical";
  x: number;
  yMin: number;
  yMax: number;
}

type DetectedLine = DetectedHorizontal | DetectedVertical;

const GAP_TOLERANCE_PX = 8;
const ROW_CLUSTER_GAP_PX = 10;
const COL_CLUSTER_GAP_PX = 5;
const MIN_HORIZONTAL_SPAN_PX = 100;
const MIN_VERTICAL_SPAN_PX = 100;
const HIT_THICKNESS_PX = 14;

export function isOrangePixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 80) return false;
  return r >= 130 && g >= 50 && b <= 160 && r > g && g > b;
}

function longestSpan(values: number[]): OrangeSpan | null {
  if (values.length < 3) return null;

  values.sort((a, b) => a - b);

  let bestStart = values[0];
  let bestEnd = values[0];
  let start = values[0];
  let prev = values[0];

  for (let i = 1; i < values.length; i += 1) {
    const value = values[i];
    if (value - prev > GAP_TOLERANCE_PX) {
      if (prev - start > bestEnd - bestStart) {
        bestStart = start;
        bestEnd = prev;
      }
      start = value;
    }
    prev = value;
  }

  if (prev - start > bestEnd - bestStart) {
    bestStart = start;
    bestEnd = prev;
  }

  return { start: bestStart, end: bestEnd };
}

function detectHorizontalLines(width: number, height: number, data: Uint8ClampedArray): DetectedHorizontal[] {
  const rows: DetectedHorizontal[] = [];

  for (let y = 0; y < height; y += 1) {
    const xs: number[] = [];
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (!isOrangePixel(data[index], data[index + 1], data[index + 2], data[index + 3])) continue;
      xs.push(x);
    }

    const span = longestSpan(xs);
    if (!span || span.end - span.start < MIN_HORIZONTAL_SPAN_PX) continue;

    rows.push({
      orientation: "horizontal",
      y,
      xMin: span.start,
      xMax: span.end,
    });
  }

  if (rows.length === 0) return [];

  const clusters: DetectedHorizontal[][] = [[rows[0]]];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const last = clusters[clusters.length - 1][clusters[clusters.length - 1].length - 1];
    if (row.y - last.y <= ROW_CLUSTER_GAP_PX) {
      clusters[clusters.length - 1].push(row);
    } else {
      clusters.push([row]);
    }
  }

  return clusters
    .map((cluster) => {
      const y = Math.round(cluster.reduce((sum, row) => sum + row.y, 0) / cluster.length);
      return {
        orientation: "horizontal" as const,
        y,
        xMin: Math.min(...cluster.map((row) => row.xMin)),
        xMax: Math.max(...cluster.map((row) => row.xMax)),
      };
    })
    .sort((a, b) => a.y - b.y);
}

function detectVerticalLine(width: number, height: number, data: Uint8ClampedArray): DetectedVertical | null {
  const columns: DetectedVertical[] = [];

  for (let x = 0; x < width; x += 1) {
    const ys: number[] = [];
    for (let y = 0; y < height; y += 1) {
      const index = (y * width + x) * 4;
      if (!isOrangePixel(data[index], data[index + 1], data[index + 2], data[index + 3])) continue;
      ys.push(y);
    }

    const span = longestSpan(ys);
    if (!span || span.end - span.start < MIN_VERTICAL_SPAN_PX) continue;

    columns.push({
      orientation: "vertical",
      x,
      yMin: span.start,
      yMax: span.end,
    });
  }

  if (columns.length === 0) return null;

  const clusters: DetectedVertical[][] = [[columns[0]]];
  for (let i = 1; i < columns.length; i += 1) {
    const column = columns[i];
    const last = clusters[clusters.length - 1][clusters[clusters.length - 1].length - 1];
    if (column.x - last.x <= COL_CLUSTER_GAP_PX) {
      clusters[clusters.length - 1].push(column);
    } else {
      clusters.push([column]);
    }
  }

  const leftCluster = clusters.sort((a, b) => a[0].x - b[0].x)[0];
  return {
    orientation: "vertical",
    x: Math.round(leftCluster.reduce((sum, column) => sum + column.x, 0) / leftCluster.length),
    yMin: Math.min(...leftCluster.map((column) => column.yMin)),
    yMax: Math.max(...leftCluster.map((column) => column.yMax)),
  };
}

function horizontalToZone(line: DetectedHorizontal, width: number, height: number, index: number): PopPlacementZone {
  const half = HIT_THICKNESS_PX / 2;

  return {
    id: `line-${index + 1}`,
    label: POP_PLACEMENT_ZONE_LABELS[index] ?? `ライン ${index + 1}`,
    orientation: "horizontal",
    rect: {
      left: line.xMin / width,
      top: Math.max(0, line.y - half) / height,
      width: (line.xMax - line.xMin) / width,
      height: Math.min(height, line.y + half) / height - Math.max(0, line.y - half) / height,
    },
    detailImage: POP_PLACEMENT_DETAIL_IMAGES[index] ?? POP_PLACEMENT_DETAIL_IMAGES[0],
  };
}

function verticalToZone(line: DetectedVertical, width: number, height: number, index: number): PopPlacementZone {
  const half = HIT_THICKNESS_PX / 2;

  return {
    id: `line-${index + 1}`,
    label: POP_PLACEMENT_ZONE_LABELS[index] ?? `ライン ${index + 1}`,
    orientation: "vertical",
    rect: {
      left: Math.max(0, line.x - half) / width,
      top: line.yMin / height,
      width: (Math.min(width, line.x + half) - Math.max(0, line.x - half)) / width,
      height: (line.yMax - line.yMin) / height,
    },
    detailImage: POP_PLACEMENT_DETAIL_IMAGES[index] ?? POP_PLACEMENT_DETAIL_IMAGES[0],
  };
}

export function detectPopPlacementZones(
  width: number,
  height: number,
  data: Uint8ClampedArray,
): PopPlacementZone[] {
  const vertical = detectVerticalLine(width, height, data);
  const horizontals = detectHorizontalLines(width, height, data);

  const lines: DetectedLine[] = [];
  if (vertical) lines.push(vertical);
  lines.push(...horizontals);

  return lines
    .slice(0, POP_PLACEMENT_LINE_COUNT)
    .map((line, index) =>
      line.orientation === "vertical"
        ? verticalToZone(line, width, height, index)
        : horizontalToZone(line, width, height, index),
    );
}

export function findZoneAtPoint(
  zones: PopPlacementZone[],
  x: number,
  y: number,
): PopPlacementZone | null {
  let best: { zone: PopPlacementZone; distance: number } | null = null;

  for (const zone of zones) {
    const { left, top, width, height } = zone.rect;
    if (x < left || x > left + width || y < top || y > top + height) continue;

    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const distance =
      zone.orientation === "horizontal"
        ? Math.abs(y - centerY)
        : Math.abs(x - centerX);

    if (!best || distance < best.distance) {
      best = { zone, distance };
    }
  }

  return best?.zone ?? null;
}

export function toMonochromeFloorPlan(data: Uint8ClampedArray): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (isOrangePixel(r, g, b, a)) {
      output[i] = r;
      output[i + 1] = g;
      output[i + 2] = b;
      output[i + 3] = a;
      continue;
    }

    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const mapped = gray > 200 ? 255 : gray < 80 ? 32 : gray;

    output[i] = mapped;
    output[i + 1] = mapped;
    output[i + 2] = mapped;
    output[i + 3] = a;
  }

  return output;
}

export const toGrayscale = toMonochromeFloorPlan;
