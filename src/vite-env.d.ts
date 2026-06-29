/// <reference types="vite/client" />

declare const __APP_BUILD_ID__: string;

declare module "opentype.js" {
  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export interface Path {
    fill?: string;
    draw(context: CanvasRenderingContext2D): void;
    getBoundingBox(): BoundingBox;
  }

  export interface Font {
    unitsPerEm: number;
    getAdvanceWidth(text: string, fontSize: number): number;
    getPath(text: string, x: number, y: number, fontSize: number): Path;
  }

  export function parse(buffer: ArrayBuffer): Font;
}
