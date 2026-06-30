import { useEffect, useMemo, useRef, useState } from "react";

import {
  POP_PLACEMENT_FLOOR_PLAN,
  POP_PLACEMENT_SYNC_EVENT,
  type PendingPopPlacement,
  type PopPlacementZone,
} from "../../shared/popPlacement";
import { formatPopCopyName, formatYen } from "../utils/format";
import {
  hasPopPlacementIssues,
  summarizePopPlacementStatus,
} from "../utils/popPlacementIndicators";
import {
  detectPopPlacementZones,
  findZoneAtPoint,
  toMonochromeFloorPlan,
} from "../utils/popPlacementDetect";
import { readPopPlacementAssignmentStore } from "../utils/popPlacementStorage";
import { WallFacePanel } from "./WallFacePanel";
import type { ComparisonItem } from "../types";

interface PopPlacementViewProps {
  comparisonItems: ComparisonItem[];
  pendingPlacement: PendingPopPlacement | null;
  onPendingPlacementConsumed: () => void;
  onCancelPendingPlacement: () => void;
}

export function PopPlacementView({
  comparisonItems,
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
  const [statusVersion, setStatusVersion] = useState(0);

  const placementStatus = useMemo(
    () => summarizePopPlacementStatus(readPopPlacementAssignmentStore(), comparisonItems),
    [comparisonItems, statusVersion],
  );
  const hasPlacementIssues = hasPopPlacementIssues(placementStatus);

  useEffect(() => {
    const refreshStatus = () => setStatusVersion((value) => value + 1);

    window.addEventListener("pop-placement-local-change", refreshStatus);
    window.addEventListener(POP_PLACEMENT_SYNC_EVENT, refreshStatus);

    return () => {
      window.removeEventListener("pop-placement-local-change", refreshStatus);
      window.removeEventListener(POP_PLACEMENT_SYNC_EVENT, refreshStatus);
    };
  }, []);

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

      <div
        className={`pop-placement__status${hasPlacementIssues ? " pop-placement__status--alert" : " pop-placement__status--ok"}`}
        role="status"
      >
        {hasPlacementIssues ? (
          <ul className="pop-placement__status-list">
            {placementStatus.stale3Days > 0 ? (
              <li>3日未更新POP枚数：{placementStatus.stale3Days}枚</li>
            ) : null}
            {placementStatus.stale5Days > 0 ? (
              <li>5日未更新POP枚数：{placementStatus.stale5Days}枚</li>
            ) : null}
            {placementStatus.stale7Days > 0 ? (
              <li>7日未更新POP枚数：{placementStatus.stale7Days}枚</li>
            ) : null}
            {placementStatus.priceMismatch > 0 ? (
              <li className="pop-placement__status-warning">
                ⚠最新価格と異なるPOPがあります！：{placementStatus.priceMismatch}枚
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="pop-placement__status-ok">更新すべきPOPはありません。</p>
        )}
      </div>

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
          comparisonItems={comparisonItems}
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
