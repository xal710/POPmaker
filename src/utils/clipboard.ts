export async function copyImageElement(image: HTMLImageElement): Promise<void> {
  if (!image.complete || image.naturalWidth === 0) {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("画像の処理に失敗しました");
  }

  context.drawImage(image, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
        return;
      }
      reject(new Error("画像の変換に失敗しました"));
    }, "image/png");
  });

  if (!navigator.clipboard?.write) {
    throw new Error("このブラウザでは画像のコピーに対応していません");
  }

  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

export async function copyImageFromUrl(imageUrl: string): Promise<void> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("画像の取得に失敗しました");
  }

  const blob = await response.blob();
  const type = blob.type.startsWith("image/") ? blob.type : "image/png";

  if (!navigator.clipboard?.write) {
    throw new Error("このブラウザでは画像のコピーに対応していません");
  }

  await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
}
