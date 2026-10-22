import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Check, Crop, Monitor, RotateCcw, RotateCw, Smartphone, X } from "lucide-react";
import type { VehiclePhoto } from "../../lib/skinaoAdminApi";
import {
  adjustedImageStyle, DEFAULT_PHOTO_ADJUSTMENTS,
  normalizeAdjustments, type PhotoAdjustments,
} from "../../lib/skinaoPhotoAdjust";
import { panPhoto, pointerCenter, pointerDistance, wheelZoomFactor, zoomPhoto, type PhotoPoint } from "../../lib/skinaoPhotoGestures";

type Props = {
  photo: VehiclePhoto; imageUrl: string;
  onClose: () => void; onSave: (adjustments: PhotoAdjustments) => Promise<void>;
};
type Gesture = { start: PhotoAdjustments; center: PhotoPoint; distance: number };

export function PhotoEditor({ photo, imageUrl, onClose, onSave }: Props) {
  const [edit, setEdit] = useState<PhotoAdjustments>(() => normalizeAdjustments(photo));
  const [preview, setPreview] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<PhotoAdjustments>(edit);
  const pointersRef = useRef(new Map<number, PhotoPoint>());
  const gestureRef = useRef<Gesture | null>(null);

  function updateEdit(next: PhotoAdjustments) {
    const normalized = normalizeAdjustments(next);
    editRef.current = normalized;
    setEdit(normalized);
  }

  // Native wheel handler is explicitly non-passive: the page must not scroll while zooming the photo.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const wheel = (event: WheelEvent) => {
      if (saving || pointersRef.current.size > 0) return;
      event.preventDefault();
      const next = zoomPhoto(editRef.current, wheelZoomFactor(event.deltaY, event.deltaMode, frame.clientHeight));
      editRef.current = next;
      setEdit(next);
    };
    frame.addEventListener("wheel", wheel, { passive: false });
    return () => frame.removeEventListener("wheel", wheel);
  }, [saving]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        event.stopPropagation();
        onClose();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])',
      ) ?? []);
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [onClose, saving]);

  const change = (key: keyof PhotoAdjustments, value: number) =>
    updateEdit({ ...editRef.current, [key]: value });

  function startGesture() {
    const active = [...pointersRef.current.values()];
    if (active.length === 0) { gestureRef.current = null; return; }
    const center = active.length > 1 ? pointerCenter(active[0], active[1]) : active[0];
    const distance = active.length > 1 ? pointerDistance(active[0], active[1]) : 0;
    gestureRef.current = { start: editRef.current, center, distance };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (saving || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // Changing between one-finger drag and two-finger pinch establishes a new baseline.
    startGesture();
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (saving || !pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const start = gestureRef.current;
    if (!start) return;
    const active = [...pointersRef.current.values()];
    const center = active.length > 1 ? pointerCenter(active[0], active[1]) : active[0];
    const width = event.currentTarget.clientWidth;
    const height = event.currentTarget.clientHeight;
    const zoomed = active.length > 1 && start.distance > 0
      ? zoomPhoto(start.start, pointerDistance(active[0], active[1]) / start.distance)
      : start.start;
    updateEdit(panPhoto(zoomed, center.x - start.center.x, center.y - start.center.y, width, height));
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.delete(event.pointerId)) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    startGesture();
  }

  function onEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (saving) return;
    const current = editRef.current;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault(); updateEdit(zoomPhoto(current, 1.1));
    } else if (event.key === "-") {
      event.preventDefault(); updateEdit(zoomPhoto(current, 1 / 1.1));
    } else {
      const delta: Record<string, [number, number]> = {
        ArrowLeft: [-3, 0], ArrowRight: [3, 0], ArrowUp: [0, -3], ArrowDown: [0, 3],
      };
      const movement = delta[event.key];
      if (movement) {
        event.preventDefault();
        updateEdit({ ...current, crop_x: current.crop_x + movement[0], crop_y: current.crop_y + movement[1] });
      }
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true); setError("");
    try {
      await onSave(normalizeAdjustments(editRef.current));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar os ajustes.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="ska-photo-editor-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <div ref={dialogRef} className="ska-photo-editor-modal" role="dialog" aria-modal="true"
        aria-labelledby="ska-photo-editor-title" aria-describedby="ska-photo-editor-desc">
        <header className="ska-photo-editor-heading">
          <div>
            <span className="ska-eyebrow"><Crop size={14} aria-hidden="true"/> FOTOGRAFIAS</span>
            <h2 id="ska-photo-editor-title">Ajustar imagem</h2>
            <p id="ska-photo-editor-desc">Ajuste diretamente na foto: arraste para mover, use a roda do mouse ou a pinça para ampliar. O arquivo original será preservado.</p>
          </div>
          <button type="button" ref={closeRef} className="ska-photo-editor-close"
            onClick={onClose} disabled={saving} aria-label="Fechar editor"><X size={21}/></button>
        </header>
        <div className="ska-photo-editor-content">
          <div className="ska-photo-editor-visual">
            <div className="ska-photo-editor-tabs" aria-label="Prévia de enquadramento">
              <button type="button" className={preview === "desktop" ? "is-active" : ""}
                aria-pressed={preview === "desktop"} onClick={() => setPreview("desktop")}><Monitor size={16}/> Desktop</button>
              <button type="button" className={preview === "mobile" ? "is-active" : ""}
                aria-pressed={preview === "mobile"} onClick={() => setPreview("mobile")}><Smartphone size={16}/> Mobile</button>
            </div>
            <div className="ska-photo-editor-frame-wrap">
              <div ref={frameRef} className={"ska-photo-editor-frame ska-photo-editor-frame--" + preview}
                onPointerDown={onPointerDown} onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
                onLostPointerCapture={onPointerEnd}
                onDoubleClick={() => { if (!saving) updateEdit(zoomPhoto(editRef.current, editRef.current.crop_zoom >= 250 ? 100 / editRef.current.crop_zoom : 1.25)); }}
                onKeyDown={onEditorKeyDown} tabIndex={0} role="group"
                aria-label="Prévia editável. Arraste para mover, roda do mouse ou gesto de pinça para zoom. Use as setas e as teclas mais e menos no teclado.">
                <img src={imageUrl} alt={photo.alt_text || "Prévia da fotografia"}
                  draggable={false} style={adjustedImageStyle(edit)}/>
                <span className="ska-photo-editor-grid" aria-hidden="true"/>
              </div>
            </div>
            <p className="ska-photo-editor-hint"><strong>Computador:</strong> arraste para mover; use a roda do mouse ou dê dois cliques para ampliar. <strong>Celular:</strong> arraste com um dedo e amplie com dois dedos (pinça).</p>
          </div>
          <div className="ska-photo-editor-sliders">
            <label>Zoom <strong>{edit.crop_zoom}%</strong>
              <input type="range" min={100} max={250} step={5} value={edit.crop_zoom}
                onChange={event => change("crop_zoom", Number(event.target.value))}/>
            </label>
            <label>Posição horizontal <strong>{edit.crop_x}%</strong>
              <input type="range" min={0} max={100} step={1} value={edit.crop_x}
                onChange={event => change("crop_x", Number(event.target.value))}/>
            </label>
            <label>Posição vertical <strong>{edit.crop_y}%</strong>
              <input type="range" min={0} max={100} step={1} value={edit.crop_y}
                onChange={event => change("crop_y", Number(event.target.value))}/>
            </label>
            <div className="ska-photo-editor-tools">
              <button type="button" onClick={() => change("crop_rotation", (edit.crop_rotation + 270) % 360)}>
                <RotateCcw size={18}/> Girar à esquerda
              </button>
              <button type="button" onClick={() => change("crop_rotation", (edit.crop_rotation + 90) % 360)}>
                <RotateCw size={18}/> Girar à direita
              </button>
            </div>
            <button type="button" className="ska-photo-editor-reset"
              onClick={() => updateEdit({ ...DEFAULT_PHOTO_ADJUSTMENTS })}>
              <RotateCcw size={16}/> Restaurar enquadramento original
            </button>
          </div>
        </div>
        {error && <p className="ska-feedback ska-feedback--error" role="alert">{error}</p>}
        <footer className="ska-photo-editor-footer">
          <span>As mudanças serão aplicadas ao catálogo após salvar.</span>
          <div>
            <button type="button" className="ska-button ska-button--outline" disabled={saving} onClick={onClose}>Cancelar</button>
            <button type="button" className="ska-button ska-button--red" disabled={saving} onClick={() => void save()}>
              <Check size={18}/> {saving ? "Salvando..." : "Salvar ajustes"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
