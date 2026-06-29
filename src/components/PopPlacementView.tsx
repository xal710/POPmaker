import { useEffect, useRef, useState } from "react";

import {
  POP_PLACEMENT_FLOOR_PLAN,
  canUsePopPlacementOnline,
  type PendingPopPlacement,
  type PopPlacementZone,
} from "../../shared/popPlacement";
import { formatPopCopyName, formatYen } from "../utils/format";
import {
  exportPopPlacementJson,
  forcePushPopPlacementToServer,
  importPopPlacementJson,
} from "../utils/popPlacementSync";
import {
  detectPopPlacementZones,
  findZoneAtPoint,
  toMonochromeFloorPlan,
} from "../utils/popPlacementDetect";
import { WallFacePanel } from "./WallFacePanel";

interface PopPlacementViewProps {
  username: string | null;
  pendingPlacement: PendingPopPlacement | null;
  onPendingPlacementConsumed: () => void;
  onCancelPendingPlacement: () => void;
}

export function PopPlacementView({
  username,
  pendingPlacement,
  onPendingPlacementConsumed,
  onCancelPendingPlacement,
}: PopPlacementViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const zonesRef = useRef<PopPlacementZone[]>([]);
  const [zones, setZones] = useState<PopPlacementZone[]>([]);
  const [hoveredZone, setHoveredZone] = useState<PopPlacementZone | null>(null);
  const [selectedZone, setSelectedZone] = useState<PopPlacementZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const canSyncOnline = canUsePopPlacementOnline(username);

  useEffect(() => {
    const image = new Image();
    image.src = POP_PLACEMENT_FLOOR_PLAN;
    imageRef.current = image;

    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext("2d");
      if (!context) {
        setError("キャンバスの初期化に失敗しました");
        setLoading(false);
        return;
      }

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      context.drawImage(image, 0, 0);
      const source = context.getImageData(0, 0, canvas.width, canvas.height);
      const detected = detectPopPlacementZones(canvas.width, canvas.height, source.data);

      zonesRef.current = detected;
      setZones(detected);

      const gray = toMonochromeFloorPlan(source.data);
      context.putImageData(
        new ImageData(new Uint8ClampedArray(gray), canvas.width, canvas.height),
        0,
        0,
      );

      setLoading(false);
    };

    image.onerror = () => {
      setError("フロア図の読み込みに失敗しました");
      setLoading(false);
    };
  }, []);

  const redraw = (highlight: PopPlacementZone | null) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !image.complete) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(image, 0, 0);
    const source = context.getImageData(0, 0, canvas.width, canvas.height);
    const gray = toMonochromeFloorPlan(source.data);
    context.putImageData(
      new ImageData(new Uint8ClampedArray(gray), canvas.width, canvas.height),
      0,
      0,
    );

    if (highlight) {
      const { left, top, width, height } = highlight.rect;
      const x = left * canvas.width;
      const y = top * canvas.height;
      const w = width * canvas.width;
      const h = height * canvas.height;
      context.save();
      context.fillStyle = "rgba(234, 88, 12, 0.35)";
      context.strokeStyle = "rgba(234, 88, 12, 0.95)";
      context.lineWidth = 2;
      context.fillRect(x, y, w, h);
      context.strokeRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));
      context.restore();
    }
  };

  useEffect(() => {
    if (loading) return;
    redraw(hoveredZone);
  }, [hoveredZone, loading]);

  const handlePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || zonesRef.current.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const zone = findZoneAtPoint(zonesRef.current, x, y);
    setHoveredZone(zone);
    canvas.style.cursor = zone ? "pointer" : "default";
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || zonesRef.current.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const zone = findZoneAtPoint(zonesRef.current, x, y);
    if (zone) setSelectedZone(zone);
  };

  const handlePushToServer = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setError(null);

    try {
      const ok = await forcePushPopPlacementToServer();
      setSyncMessage(ok ? "サーバーへ反映しました。" : "サーバーへの反映に失敗しました。");
    } catch {
      setSyncMessage("サーバーへの反映に失敗しました。");
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    const json = exportPopPlacementJson();
    try {
      await navigator.clipboard.writeText(json);
      setSyncMessage("配置データをクリップボードにコピーしました。");
    } catch {
      setSyncMessage("コピーに失敗しました。開発者ツールから localStorage を確認してください。");
    }
  };

  const handleImportAndPush = async () => {
    setSyncing(true);
    setSyncMessage(null);
    setError(null);

    try {
      importPopPlacementJson(importText.trim());
      const ok = await forcePushPopPlacementToServer();
      setImportOpen(false);
      setImportText("");
      setSyncMessage(ok ? "読み込んでサーバーへ反映しました。" : "読み込み後のサーバー反映に失敗しました。");
    } catch (importError) {
      const message =
        importError instanceof Error ? importError.message : "配置データの読み込みに失敗しました";
      setError(message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="pop-placement" aria-labelledby="pop-placement-title">
      <div className="pop-placement__intro">
        <h2 id="pop-placement-title" className="pop-placement__title">
          POP配置マップ
        </h2>
        <p className="pop-placement__note">
          {pendingPlacement
            ? "壁面を選び、青い展示枠をクリックしてPOPを配置してください。"
            : "比較リストからカードを選び、POPモーダルの「POPを配置」で追加できます。配置済みのPOPは壁面で確認できます。"}
        </p>
      </div>

      {canSyncOnline ? (
        <div className="pop-placement__sync">
          <div className="pop-placement__sync-actions">
            <button
              type="button"
              className="btn btn--secondary btn--compact"
              onClick={() => void handlePushToServer()}
              disabled={syncing}
            >
              {syncing ? "反映中..." : "サーバーに反映"}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--compact"
              onClick={() => void handleExport()}
              disabled={syncing}
            >
              配置データをコピー
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--compact"
              onClick={() => setImportOpen((open) => !open)}
              disabled={syncing}
            >
              {importOpen ? "読み込みを閉じる" : "配置データを読み込む"}
            </button>
          </div>
          {syncMessage ? (
            <p className="pop-placement__sync-message" role="status">
              {syncMessage}
            </p>
          ) : null}
          {importOpen ? (
            <div className="pop-placement__import">
              <p className="pop-placement__note">
                ローカル（localhost）でコピーした JSON を貼り付けて反映できます。
              </p>
              <textarea
                className="pop-placement__import-input"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                rows={6}
                placeholder='{"line-1":{"line-1-slot-1":{...}}}'
              />
              <button
                type="button"
                className="btn btn--primary btn--compact"
                onClick={() => void handleImportAndPush()}
                disabled={syncing || !importText.trim()}
              >
                読み込んでサーバーに反映
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {pendingPlacement ? (
        <div className="pop-placement__pending" role="status">
          <div className="pop-placement__pending-body">
            <strong>{formatPopCopyName(pendingPlacement.sourceName)}</strong>
            <span className="pop-placement__pending-price">{formatYen(pendingPlacement.priceYen)}</span>
            <span className="pop-placement__pending-hint">を配置する位置を選んでください</span>
          </div>
          <button
            type="button"
            className="btn btn--secondary btn--compact"
            onClick={onCancelPendingPlacement}
          >
            キャンセル
          </button>
        </div>
      ) : null}

      <div className="pop-placement__map-wrap">
        {loading && (
          <div className="pop-placement__loading">
            <div className="loading-spinner" aria-hidden="true" />
            <p>フロア図を読み込んでいます...</p>
          </div>
        )}
        {error && (
          <p className="pop-placement__error" role="alert">
            {error}
          </p>
        )}
        <canvas
          ref={canvasRef}
          className="pop-placement__canvas"
          onPointerMove={handlePointer}
          onPointerLeave={() => setHoveredZone(null)}
          onClick={handleClick}
          aria-label="店舗フロア図。オレンジの壁面をクリックすると展示配置画面を開きます。"
        />
      </div>

      {selectedZone ? (
        <WallFacePanel
          zone={selectedZone}
          pendingPlacement={pendingPlacement}
          onPendingPlacementConsumed={onPendingPlacementConsumed}
          onBack={() => setSelectedZone(null)}
        />
      ) : (
        <p className="pop-placement__hint">
          {pendingPlacement
            ? "まず配置する壁面（オレンジ）をクリックしてください。"
            : zones.length > 0
              ? `${zones.length}箇所の壁面にカーソルを合わせるとハイライトされます。`
              : "クリック可能な壁面が見つかりませんでした。"}
        </p>
      )}
    </section>
  );
}
