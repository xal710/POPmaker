import type { PopPlacementSlot } from "../../shared/popPlacement";

const MIN_SLOT_PIXELS = 2400;
const MIN_SLOT_WIDTH = 40;
const MIN_SLOT_HEIGHT = 55;

function isBlueSlotPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 100) return false;
  return b > 80 && g < 180 && r < 120 && b > r && b > g;
}

interface RawSlot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function detectBluePopSlots(
  width: number,
  height: number,
  data: Uint8ClampedArray,
  wallId: string,
): PopPlacementSlot[] {
  const visited = new Uint8Array(width * height);
  const rawSlots: RawSlot[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (visited[index]) continue;

      const offset = index * 4;
      if (!isBlueSlotPixel(data[offset], data[offset + 1], data[offset + 2], data[offset + 3])) {
        continue;
      }

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;
      const stack = [index];

      while (stack.length > 0) {
        const current = stack.pop();
        if (current === undefined || visited[current]) continue;

        const cx = current % width;
        const cy = Math.floor(current / width);
        const pixelOffset = current * 4;

        if (!isBlueSlotPixel(data[pixelOffset], data[pixelOffset + 1], data[pixelOffset + 2], data[pixelOffset + 3])) {
          continue;
        }

        visited[current] = 1;
        count += 1;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        if (cx > 0) stack.push(current - 1);
        if (cx < width - 1) stack.push(current + 1);
        if (cy > 0) stack.push(current - width);
        if (cy < height - 1) stack.push(current + width);
      }

      const slotWidth = maxX - minX + 1;
      const slotHeight = maxY - minY + 1;
      if (count < MIN_SLOT_PIXELS || slotWidth < MIN_SLOT_WIDTH || slotHeight < MIN_SLOT_HEIGHT) {
        continue;
      }

      rawSlots.push({ x: minX, y: minY, width: slotWidth, height: slotHeight });
    }
  }

  rawSlots.sort((a, b) => a.y - b.y || a.x - b.x);

  return rawSlots.map((slot, index) => ({
    id: `${wallId}-slot-${index + 1}`,
    rect: {
      left: slot.x / width,
      top: slot.y / height,
      width: slot.width / width,
      height: slot.height / height,
    },
  }));
}

export function findPopSlotAtPoint(
  slots: PopPlacementSlot[],
  x: number,
  y: number,
): PopPlacementSlot | null {
  for (const slot of slots) {
    const { left, top, width, height } = slot.rect;
    if (x >= left && x <= left + width && y >= top && y <= top + height) {
      return slot;
    }
  }
  return null;
}
