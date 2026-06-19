import {
  drawCenteredOpentypeText,
  loadCorporateLogoFont,
  loadImpactFont,
} from "./popFonts";

/** PowerPoint template slide size (EMU) */
const SLIDE_WIDTH_EMU = 10_691_813;
const SLIDE_HEIGHT_EMU = 15_119_350;

/** Card image placeholder from slide2.xml */
const CARD_IMAGE_RECT = {
  x: 2_409_580,
  y: 1_175_975,
  w: 6_282_406,
  h: 8_749_892,
};

/** Card name text box — コーポレート・ロゴＢ 60pt（長い名称は自動縮小） */
const NAME_RECT = {
  x: -138_726,
  y: 13_417_071,
  w: 10_969_264,
  h: 1_015_663,
  fontSizePt: 60,
  minFontSizePt: 28,
};

/** Price text box — Impact 161pt（桁数が多い場合のみ縮小） */
const PRICE_RECT = {
  x: -138_726,
  y: 11_345_915,
  w: 10_969_264,
  h: 2_569_934,
  fontSizePt: 161,
  minFontSizePt: 72,
};

/** Footer disclaimer from slide2.xml */
const DISCLAIMER_RECT = {
  x: -138_726,
  y: 14_247_647,
  w: 10_969_264,
  h: 707_886,
  fontSizePt: 17,
};

export const POP_DISCLAIMER_TEXT =
  "※上記は当店基準で状態Aの買取価格となります。\nカードの状態やお持ち込み頂いたタイミングでの在庫状況により、価格が変更される可能性がございます。";

const BACKGROUND_URL = "/pop-template/background.jpg";
const PLACEHOLDER_URL = "/pop-template/card-placeholder.png";
const OUTPUT_WIDTH = 1080;

function resolveCardImageUrl(cardImageUrl: string | null): string {
  if (!cardImageUrl) return PLACEHOLDER_URL;
  return `/api/proxy-image?url=${encodeURIComponent(cardImageUrl)}`;
}

async function loadCardImage(cardImageUrl: string | null): Promise<HTMLImageElement> {
  if (!cardImageUrl) {
    return loadImage(PLACEHOLDER_URL);
  }

  return loadImage(resolveCardImageUrl(cardImageUrl));
}

function emu(value: number, slideSize: number, outputSize: number): number {
  return (value / slideSize) * outputSize;
}

/** PowerPoint pt → canvas px（スライド高さに比例） */
function ptToPx(pointSize: number, outputHeight: number): number {
  const slideHeightInches = SLIDE_HEIGHT_EMU / 914_400;
  return (pointSize / 72) * (outputHeight / slideHeightInches);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (url.startsWith("/api/")) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`画像の読み込みに失敗しました: ${url}`));
    image.src = url;
  });
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawWrappedCenteredText(
  context: CanvasRenderingContext2D,
  text: string,
  rect: { x: number; y: number; w: number; h: number },
  fontSize: number,
  fillStyle: string,
  fontFamily: string,
): void {
  context.fillStyle = fillStyle;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${fontSize}px ${fontFamily}`;

  const lines = text.split("\n");
  const lineHeight = fontSize * 1.35;
  const totalHeight = lines.length * lineHeight;
  let y = rect.y + (rect.h - totalHeight) / 2 + lineHeight / 2;
  const centerX = rect.x + rect.w / 2;

  for (const line of lines) {
    context.fillText(line, centerX, y);
    y += lineHeight;
  }
}

export interface GeneratePopImageInput {
  cardName: string;
  priceLabel: string;
  cardImageUrl: string | null;
}

export async function generatePopImage({
  cardName,
  priceLabel,
  cardImageUrl,
}: GeneratePopImageInput): Promise<Blob> {
  const outputHeight = Math.round((OUTPUT_WIDTH * SLIDE_HEIGHT_EMU) / SLIDE_WIDTH_EMU);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("POP画像の生成に失敗しました");
  }

  const [background, cardImage, corporateLogoFont, impactFont] = await Promise.all([
    loadImage(BACKGROUND_URL),
    loadCardImage(cardImageUrl),
    loadCorporateLogoFont(),
    loadImpactFont(),
  ]);

  context.drawImage(background, 0, 0, OUTPUT_WIDTH, outputHeight);

  const cardRect = {
    x: emu(CARD_IMAGE_RECT.x, SLIDE_WIDTH_EMU, OUTPUT_WIDTH),
    y: emu(CARD_IMAGE_RECT.y, SLIDE_HEIGHT_EMU, outputHeight),
    w: emu(CARD_IMAGE_RECT.w, SLIDE_WIDTH_EMU, OUTPUT_WIDTH),
    h: emu(CARD_IMAGE_RECT.h, SLIDE_HEIGHT_EMU, outputHeight),
  };

  drawCoverImage(context, cardImage, cardRect.x, cardRect.y, cardRect.w, cardRect.h);

  const nameRect = {
    x: emu(NAME_RECT.x, SLIDE_WIDTH_EMU, OUTPUT_WIDTH),
    y: emu(NAME_RECT.y, SLIDE_HEIGHT_EMU, outputHeight),
    w: emu(NAME_RECT.w, SLIDE_WIDTH_EMU, OUTPUT_WIDTH),
    h: emu(NAME_RECT.h, SLIDE_HEIGHT_EMU, outputHeight),
  };

  const priceRect = {
    x: emu(PRICE_RECT.x, SLIDE_WIDTH_EMU, OUTPUT_WIDTH),
    y: emu(PRICE_RECT.y, SLIDE_HEIGHT_EMU, outputHeight),
    w: emu(PRICE_RECT.w, SLIDE_WIDTH_EMU, OUTPUT_WIDTH),
    h: emu(PRICE_RECT.h, SLIDE_HEIGHT_EMU, outputHeight),
  };

  const nameFontPx = ptToPx(NAME_RECT.fontSizePt, outputHeight);
  const nameMinFontPx = ptToPx(NAME_RECT.minFontSizePt, outputHeight);

  drawCenteredOpentypeText(
    context,
    corporateLogoFont,
    cardName,
    nameRect,
    nameFontPx,
    "#ffffff",
    nameMinFontPx,
  );

  const priceFontPx = ptToPx(PRICE_RECT.fontSizePt, outputHeight);
  const priceMinFontPx = ptToPx(PRICE_RECT.minFontSizePt, outputHeight);

  drawCenteredOpentypeText(
    context,
    impactFont,
    priceLabel,
    priceRect,
    priceFontPx,
    "#ffff00",
    priceMinFontPx,
  );

  const disclaimerRect = {
    x: emu(DISCLAIMER_RECT.x, SLIDE_WIDTH_EMU, OUTPUT_WIDTH),
    y: emu(DISCLAIMER_RECT.y, SLIDE_HEIGHT_EMU, outputHeight),
    w: emu(DISCLAIMER_RECT.w, SLIDE_WIDTH_EMU, OUTPUT_WIDTH),
    h: emu(DISCLAIMER_RECT.h, SLIDE_HEIGHT_EMU, outputHeight),
  };

  drawWrappedCenteredText(
    context,
    POP_DISCLAIMER_TEXT,
    disclaimerRect,
    ptToPx(DISCLAIMER_RECT.fontSizePt, outputHeight),
    "#ffffff",
    '"Noto Sans JP", sans-serif',
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
        return;
      }
      reject(new Error("POP画像の変換に失敗しました"));
    }, "image/png");
  });

  return blob;
}
