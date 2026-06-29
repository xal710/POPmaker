import { useCallback, useEffect, useRef, useState } from "react";

import {
  POP_PLACEMENT_SYNC_EVENT,
  type PendingPopPlacement,
  type PopPlacementSlot,
  type PopPlacementZone,
} from "../../shared/popPlacement";
import { formatPopCopyName, formatYen } from "../utils/format";
import { generatePopImage } from "../utils/popImage";
import {
  getWallSlotAssignments,
  moveWallSlotAssignment,
  removeWallSlotAssignment,
  saveWallSlotAssignment,
  type StoredWallSlotPop,
} from "../utils/popPlacementStorage";
import { detectBluePopSlots } from "../utils/popPlacementSlots";

const LONG_PRESS_MS = 500;
const DRAG_THRESHOLD_PX = 8;

interface DragOverlay {
  sourceSlotId: string;
  previewUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PointerSession {
  slotId: string;
  pointerId: number;
  startX: number;
  startY: number;
  dragging: boolean;
}

interface WallFacePanelProps {
  zone: PopPlacementZone;
  pendingPlacement: PendingPopPlacement | null;
  onPendingPlacementConsumed: () => void;
  onBack: () => void;
}

function findSlotAtPoint(
  slots: PopPlacementSlot[],
  clientX: number,
  clientY: number,
  stageRect: DOMRect,
): string | null {
  const x = (clientX - stageRect.left) / stageRect.width;
  const y = (clientY - stageRect.top) / stageRect.height;

  for (const slot of slots) {
    const rect = slot.rect;
    if (
      x >= rect.left &&
      x <= rect.left + rect.width &&
      y >= rect.top &&
      y <= rect.top + rect.height
    ) {
      return slot.id;
    }
  }

  return null;
}

export function WallFacePanel({
  zone,
  pendingPlacement,
  onPendingPlacementConsumed,
  onBack,
}: WallFacePanelProps) {
  const [slots, setSlots] = useState<PopPlacementSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, StoredWallSlotPop>>({});
  const [slotPreviews, setSlotPreviews] = useState<Record<string, string>>({});
  const [dragOverlay, setDragOverlay] = useState<DragOverlay | null>(null);
  const [dropTargetSlotId, setDropTargetSlotId] = useState<string | null>(null);
  const [loadingWall, setLoadingWall] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const dragOccurredRef = useRef(false);
  const pointerSessionRef = useRef<PointerSession | null>(null);
  const selectedSlotIdRef = useRef<string | null>(null);
  const slotsRef = useRef<PopPlacementSlot[]>([]);
  const slotPreviewsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    selectedSlotIdRef.current = selectedSlotId;
  }, [selectedSlotId]);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    slotPreviewsRef.current = slotPreviews;
  }, [slotPreviews]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const removeAssignmentFromSlot = useCallback(
    (slotId: string) => {
      removeWallSlotAssignment(zone.id, slotId);

      setAssignments((current) => {
        if (!current[slotId]) return current;
        const next = { ...current };
        delete next[slotId];
        return next;
      });
      setSlotPreviews((current) => {
        const previous = current[slotId];
        if (!previous) return current;
        URL.revokeObjectURL(previous);
        const next = { ...current };
        delete next[slotId];
        return next;
      });

      if (selectedSlotIdRef.current === slotId) {
        setSelectedSlotId(null);
      }
    },
    [zone.id],
  );

  const moveAssignmentBetweenSlots = useCallback(
    (fromSlotId: string, toSlotId: string) => {
      if (fromSlotId === toSlotId) return;

      const stored = getWallSlotAssignments(zone.id);
      if (!stored[fromSlotId]) return;

      moveWallSlotAssignment(zone.id, fromSlotId, toSlotId);

      setAssignments((current) => {
        const fromAssignment = current[fromSlotId];
        if (!fromAssignment) return current;

        const toAssignment = current[toSlotId];
        const next = { ...current };
        delete next[fromSlotId];
        next[toSlotId] = fromAssignment;
        if (toAssignment) {
          next[fromSlotId] = toAssignment;
        }

        return next;
      });

      setSlotPreviews((current) => {
        const fromPreview = current[fromSlotId];
        if (!fromPreview) return current;

        const toPreview = current[toSlotId];
        const next = { ...current };
        delete next[fromSlotId];
        next[toSlotId] = fromPreview;
        if (toPreview) {
          next[fromSlotId] = toPreview;
        }

        return next;
      });

      setSelectedSlotId(toSlotId);
    },
    [zone.id],
  );

  const applyAssignmentToSlot = useCallback(
    async (slotId: string, assignment: StoredWallSlotPop) => {
      saveWallSlotAssignment(zone.id, slotId, assignment);

      const blob = await generatePopImage({
        cardName: formatPopCopyName(assignment.sourceName),
        priceLabel: formatYen(assignment.priceYen),
        cardImageUrl: assignment.cardImageUrl,
      });

      const nextUrl = URL.createObjectURL(blob);
      previewUrlsRef.current.push(nextUrl);

      setAssignments((current) => ({ ...current, [slotId]: assignment }));
      setSlotPreviews((current) => {
        const previous = current[slotId];
        if (previous) URL.revokeObjectURL(previous);
        return { ...current, [slotId]: nextUrl };
      });
    },
    [zone.id],
  );

  useEffect(() => {
    let cancelled = false;

    const image = new Image();
    image.src = zone.detailImage;
    image.onload = () => {
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        setError("壁面画像の読み込みに失敗しました");
        setLoadingWall(false);
        return;
      }

      context.drawImage(image, 0, 0);
      const source = context.getImageData(0, 0, canvas.width, canvas.height);
      const detected = detectBluePopSlots(canvas.width, canvas.height, source.data, zone.id);
      setSlots(detected);
      setLoadingWall(false);
    };
    image.onerror = () => {
      if (cancelled) return;
      setError("壁面画像の読み込みに失敗しました");
      setLoadingWall(false);
    };

    return () => {
      cancelled = true;
    };
  }, [zone.detailImage, zone.id]);

  useEffect(() => {
    let cancelled = false;
    const stored = getWallSlotAssignments(zone.id);
    setAssignments(stored);
    setSelectedSlotId(null);

    async function rebuildPreviews() {
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      previewUrlsRef.current = [];

      const next: Record<string, string> = {};
      for (const [slotId, assignment] of Object.entries(stored)) {
        try {
          const blob = await generatePopImage({
            cardName: formatPopCopyName(assignment.sourceName),
            priceLabel: formatYen(assignment.priceYen),
            cardImageUrl: assignment.cardImageUrl,
          });
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          previewUrlsRef.current.push(url);
          next[slotId] = url;
        } catch {
          // skip broken preview
        }
      }

      if (!cancelled) {
        setSlotPreviews(next);
      }
    }

    void rebuildPreviews();

    return () => {
      cancelled = true;
    };
  }, [zone.id, reloadToken]);

  useEffect(() => {
    const handleSyncApplied = () => {
      setReloadToken((value) => value + 1);
    };

    window.addEventListener(POP_PLACEMENT_SYNC_EVENT, handleSyncApplied);
    return () => window.removeEventListener(POP_PLACEMENT_SYNC_EVENT, handleSyncApplied);
  }, []);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      previewUrlsRef.current = [];
    };
  }, [clearLongPressTimer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" && event.key !== "Delete") return;

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }

      const slotId = selectedSlotIdRef.current;
      if (!slotId) return;

      event.preventDefault();
      removeAssignmentFromSlot(slotId);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [removeAssignmentFromSlot]);

  const beginDrag = (session: PointerSession, clientX: number, clientY: number) => {
    const stage = stageRef.current;
    const slot = slotsRef.current.find((entry) => entry.id === session.slotId);
    const previewUrl = slotPreviewsRef.current[session.slotId];
    if (!stage || !slot || !previewUrl) return;

    const stageRect = stage.getBoundingClientRect();
    const width = slot.rect.width * stageRect.width;
    const height = slot.rect.height * stageRect.height;

    session.dragging = true;
    dragOccurredRef.current = true;
    setSelectedSlotId(session.slotId);
    setDragOverlay({
      sourceSlotId: session.slotId,
      previewUrl,
      x: clientX - width / 2,
      y: clientY - height / 2,
      width,
      height,
    });
  };

  const finishDrag = (session: PointerSession, clientX: number, clientY: number) => {
    const stage = stageRef.current;
    const targetSlotId = stage
      ? findSlotAtPoint(slotsRef.current, clientX, clientY, stage.getBoundingClientRect())
      : null;

    if (targetSlotId && targetSlotId !== session.slotId) {
      moveAssignmentBetweenSlots(session.slotId, targetSlotId);
    }

    setDragOverlay(null);
    setDropTargetSlotId(null);
  };

  const placePendingPop = async (slotId: string) => {
    if (!pendingPlacement) return;

    setSaving(true);
    setError(null);

    try {
      const assignment: StoredWallSlotPop = {
        cardName: pendingPlacement.cardName,
        sourceName: pendingPlacement.sourceName,
        priceYen: pendingPlacement.priceYen,
        cardImageUrl: pendingPlacement.cardImageUrl,
      };

      await applyAssignmentToSlot(slotId, assignment);
      onPendingPlacementConsumed();
    } catch (placeError) {
      const message =
        placeError instanceof Error ? placeError.message : "POPの配置に失敗しました";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSlotClick = (slotId: string) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    if (dragOccurredRef.current) {
      dragOccurredRef.current = false;
      return;
    }

    if (pendingPlacement) {
      if (saving) return;
      setError(null);
      void placePendingPop(slotId);
      return;
    }

    if (saving || dragOverlay) return;

    setError(null);
    setSelectedSlotId((current) => (current === slotId ? null : slotId));
  };

  const handleSlotPointerDown = (
    slotId: string,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (pendingPlacement || saving || !assignments[slotId]) return;

    clearLongPressTimer();
    longPressTriggeredRef.current = false;
    dragOccurredRef.current = false;

    pointerSessionRef.current = {
      slotId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };

    longPressTimerRef.current = window.setTimeout(() => {
      if (pointerSessionRef.current?.dragging) return;
      longPressTriggeredRef.current = true;
      pointerSessionRef.current = null;
      removeAssignmentFromSlot(slotId);
      navigator.vibrate?.(10);
    }, LONG_PRESS_MS);

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSlotPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const session = pointerSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);

    if (!session.dragging) {
      if (distance < DRAG_THRESHOLD_PX) return;
      clearLongPressTimer();
      beginDrag(session, event.clientX, event.clientY);
      return;
    }

    setDragOverlay((current) => {
      if (!current) return current;
      return {
        ...current,
        x: event.clientX - current.width / 2,
        y: event.clientY - current.height / 2,
      };
    });

    const stage = stageRef.current;
    if (!stage) {
      setDropTargetSlotId(null);
      return;
    }

    setDropTargetSlotId(
      findSlotAtPoint(slotsRef.current, event.clientX, event.clientY, stage.getBoundingClientRect()),
    );
  };

  const handleSlotPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    clearLongPressTimer();

    const session = pointerSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    if (session.dragging) {
      finishDrag(session, event.clientX, event.clientY);
    }

    pointerSessionRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleSlotPointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    clearLongPressTimer();
    pointerSessionRef.current = null;
    setDragOverlay(null);
    setDropTargetSlotId(null);
    dragOccurredRef.current = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const isPlacementMode = pendingPlacement !== null;
  const selectedAssignment = selectedSlotId ? assignments[selectedSlotId] : null;
  const draggingSlotId = dragOverlay?.sourceSlotId ?? null;

  return (
    <div className="wall-face">
      <div className="wall-face__header">
        <h3 className="wall-face__title">{zone.label}</h3>
        <button type="button" className="btn btn--secondary btn--compact" onClick={onBack}>
          フロア図に戻る
        </button>
      </div>

      <p className="wall-face__note">
        {isPlacementMode
          ? "配置したい青い四角をクリックするとPOPが挿入されます。"
          : "配置済みのPOPはドラッグで移動できます。クリックで選択、Backspace（スマホは長押し）で削除。"}
      </p>

      {error && !saving && (
        <p className="wall-face__error" role="alert">
          {error}
        </p>
      )}

      <div className="wall-face__stage" ref={stageRef}>
        {loadingWall ? (
          <div className="pop-placement__loading">
            <div className="loading-spinner" aria-hidden="true" />
            <p>壁面を読み込んでいます...</p>
          </div>
        ) : (
          <>
            <img
              className="wall-face__image"
              src={zone.detailImage}
              alt={`${zone.label}の壁面`}
            />
            {slots.map((slot) => {
              const { left, top, width, height } = slot.rect;
              const isSelected = slot.id === selectedSlotId;
              const isDropTarget = slot.id === dropTargetSlotId && draggingSlotId !== slot.id;
              const isDragSource = slot.id === draggingSlotId;
              const previewUrl = slotPreviews[slot.id];
              const assignment = assignments[slot.id];
              const isFilled = Boolean(previewUrl);

              return (
                <button
                  key={slot.id}
                  type="button"
                  className={`wall-face__slot${isSelected ? " wall-face__slot--selected" : ""}${isFilled ? " wall-face__slot--filled" : ""}${isPlacementMode ? " wall-face__slot--placement-target" : ""}${isDropTarget ? " wall-face__slot--drop-target" : ""}${isDragSource ? " wall-face__slot--drag-source" : ""}`}
                  style={{
                    left: `${left * 100}%`,
                    top: `${top * 100}%`,
                    width: `${width * 100}%`,
                    height: `${height * 100}%`,
                  }}
                  onClick={() => handleSlotClick(slot.id)}
                  onPointerDown={(event) => handleSlotPointerDown(slot.id, event)}
                  onPointerMove={handleSlotPointerMove}
                  onPointerUp={handleSlotPointerUp}
                  onPointerCancel={handleSlotPointerCancel}
                  onContextMenu={(event) => event.preventDefault()}
                  disabled={saving}
                  aria-label={`POP展示スロット${assignment ? ` ${assignment.sourceName}` : ""}`}
                  aria-pressed={isSelected}
                >
                  {previewUrl && !isDragSource ? (
                    <img className="wall-face__slot-pop" src={previewUrl} alt="" draggable={false} />
                  ) : null}
                </button>
              );
            })}
          </>
        )}
      </div>

      {dragOverlay ? (
        <div
          className="wall-face__drag-ghost"
          style={{
            left: dragOverlay.x,
            top: dragOverlay.y,
            width: dragOverlay.width,
            height: dragOverlay.height,
          }}
          aria-hidden="true"
        >
          <img className="wall-face__slot-pop" src={dragOverlay.previewUrl} alt="" draggable={false} />
        </div>
      ) : null}

      {saving && isPlacementMode ? (
        <p className="pop-placement__hint" role="status">
          POPを配置しています...
        </p>
      ) : selectedAssignment && !dragOverlay ? (
        <p className="pop-placement__hint" role="status">
          選択中: {formatPopCopyName(selectedAssignment.sourceName)} — ドラッグで移動 / Backspace で削除（スマホは長押し）
        </p>
      ) : (
        <p className="pop-placement__hint">
          {isPlacementMode
            ? "青い展示スロットをクリックして配置してください。"
            : slots.length > 0
              ? `${slots.length}箇所の展示スロットを表示しています。`
              : "展示スロットが見つかりませんでした。"}
        </p>
      )}
    </div>
  );
}
