import * as opentype from "opentype.js";

const CORPORATE_LOGO_FONT_URL = "/fonts/Corporate-Logo-Bold.otf";
const IMPACT_FONT_URL = "/fonts/Impact.ttf";

let corporateLogoFontPromise: Promise<opentype.Font> | null = null;
let impactFontPromise: Promise<opentype.Font> | null = null;

function resetFontPromise(kind: "corporate" | "impact"): void {
  if (kind === "corporate") {
    corporateLogoFontPromise = null;
    return;
  }
  impactFontPromise = null;
}

function loadFont(url: string, errorLabel: string, kind: "corporate" | "impact"): Promise<opentype.Font> {
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`${errorLabel}の取得に失敗しました`);
      }
      return response.arrayBuffer();
    })
    .then((buffer) => opentype.parse(buffer))
    .catch((error) => {
      resetFontPromise(kind);
      throw error;
    });
}

export function loadCorporateLogoFont(): Promise<opentype.Font> {
  if (!corporateLogoFontPromise) {
    corporateLogoFontPromise = loadFont(CORPORATE_LOGO_FONT_URL, "名称フォント", "corporate");
  }
  return corporateLogoFontPromise;
}

export function loadImpactFont(): Promise<opentype.Font> {
  if (!impactFontPromise) {
    impactFontPromise = loadFont(IMPACT_FONT_URL, "金額フォント", "impact");
  }
  return impactFontPromise;
}

function measureOpentypeText(font: opentype.Font, text: string, fontSize: number) {
  const path = font.getPath(text, 0, 0, fontSize);
  const bounds = path.getBoundingBox();
  return {
    width: bounds.x2 - bounds.x1,
    height: bounds.y2 - bounds.y1,
    bounds,
  };
}

export function drawCenteredOpentypeText(
  context: CanvasRenderingContext2D,
  font: opentype.Font,
  text: string,
  rect: { x: number; y: number; w: number; h: number },
  maxFontSize: number,
  fillStyle: string,
  minFontSize = 12,
): void {
  let fontSize = maxFontSize;
  let layout = measureOpentypeText(font, text, fontSize);

  while (fontSize > minFontSize) {
    if (layout.width <= rect.w * 0.95 && layout.height <= rect.h * 0.92) {
      break;
    }
    fontSize -= 1;
    layout = measureOpentypeText(font, text, fontSize);
  }

  const { bounds } = layout;
  const textWidth = bounds.x2 - bounds.x1;
  const textHeight = bounds.y2 - bounds.y1;
  const x = rect.x + (rect.w - textWidth) / 2 - bounds.x1;
  const y = rect.y + (rect.h - textHeight) / 2 - bounds.y1;

  const path = font.getPath(text, x, y, fontSize);
  path.fill = fillStyle;
  path.draw(context);
}
