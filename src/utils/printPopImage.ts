function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("画像の読み込みに失敗しました"));
    };
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    reader.readAsDataURL(blob);
  });
}

/** 生成済みの POP PNG を印刷プレビューで開く */
export async function printPopImageBlob(blob: Blob): Promise<void> {
  const dataUrl = await readBlobAsDataUrl(blob);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow;
  const doc = iframe.contentDocument ?? printWindow?.document;
  if (!printWindow || !doc) {
    iframe.remove();
    throw new Error("印刷の準備に失敗しました");
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.setTimeout(() => iframe.remove(), 500);
      resolve();
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      iframe.remove();
      reject(new Error(message));
    };

    printWindow.onafterprint = finish;
    window.setTimeout(finish, 60_000);

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>POP印刷</title>
  <style>
    @page { margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #fff;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    img {
      display: block;
      width: auto;
      height: auto;
      max-width: 100%;
      max-height: 100vh;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="POP">
</body>
</html>`);
    doc.close();

    const image = doc.querySelector("img");
    if (!image) {
      fail("印刷用画像の作成に失敗しました");
      return;
    }

    const startPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        fail("印刷の開始に失敗しました");
      }
    };

    if (image.complete) {
      startPrint();
      return;
    }

    image.onload = startPrint;
    image.onerror = () => fail("印刷用画像の読み込みに失敗しました");
  });
}
