import * as opentype from "opentype.js";

/** カード名: コーポレート・ロゴＢ */
const CORPORATE_LOGO_FONT_URL = "/fonts/Corporate-Logo-Bold.otf";

/**
 * 金額用フォント（POPテンプレ指定フォント）
 * 差し替え: public/fonts/Pop-Price.ttf を上書き
 * 読み込み失敗時: POP_PRICE_FONT.fallbackUrl（Impact）を使用
 */
export const POP_PRICE_FONT = {
  url: "/fonts/Pop-Price.ttf",
  fallbackUrl: "/fonts/Impact.ttf",
  label: "金額フォント",
} as const;

type FontKind = "corporate" | "price";

let corporateLogoFontPromise: Promise<opentype.Font> | null = null;
let popPriceFontPromise: Promise<opentype.Font> | null = null;

function resetFontPromise(kind: FontKind): void {
  if (kind === "corporate") {
    corporateLogoFontPromise = null;
    return;
  }
  popPriceFontPromise = null;
}

function loadFontFile(url: string, errorLabel: string, kind: FontKind): Promise<opentype.Font> {
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
    corporateLogoFontPromise = loadFontFile(CORPORATE_LOGO_FONT_URL, "名称フォント", "corporate");
  }
  return corporateLogoFontPromise;
}

/** POP金額描画用フォント（Pop-Price.ttf → 失敗時 Impact） */
export function loadPopPriceFont(): Promise<opentype.Font> {
  if (!popPriceFontPromise) {
    popPriceFontPromise = loadFontFile(POP_PRICE_FONT.url, POP_PRICE_FONT.label, "price").catch(
      () => loadFontFile(POP_PRICE_FONT.fallbackUrl, POP_PRICE_FONT.label, "price"),
    );
  }
  return popPriceFontPromise;
}

/** @deprecated loadPopPriceFont を使用 */
export function loadImpactFont(): Promise<opentype.Font> {
  return loadPopPriceFont();
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
