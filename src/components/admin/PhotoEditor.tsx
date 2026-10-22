import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, Crop, Monitor, RotateCcw, RotateCw, Smartphone, X } from "lucide-react";
import type { VehiclePhoto } from "../../lib/skinaoAdminApi";
import {
  adjustedImageStyle, DEFAULT_PHOTO_ADJUSTMENTS,
  normalizeAdjustments, type PhotoAdjustments,
} from "../../lib/skinaoPhotoAdjust";

type Props = {
  photo: VehiclePhoto; imageUrl: string;
  onClose: () => void; onSave: (adjustments: PhotoAdjustments) => Promise<void>;
};

export function PhotoEditor({ photo, imageUrl, onClose, onSave }: Props) {
  const [edit, setEdit] = useState<PhotoAdjustments>(() => normalizeAdjustments(photo));
  const [preview, setPreview] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

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
    setEdit(prev => normalizeAdjustments({ ...prev, [key]: value }));
  const moveStart = (event: PointerEvent<HTMLDivElement>) => {
    if (saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY };
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || saving) return;
    const { width, height } = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - drag.current.x) * 100 / Math.max(1, width);
    const dy = (event.clientY - drag.current.y) * 100 / Math.max(1, height);
    drag.current = { x: event.clientX, y: event.clientY };
    setEdit(prev => normalizeAdjustments({
      ...prev, crop_x: prev.crop_x + dx * 1.2, crop_y: prev.crop_y + dy * 1.2,
    }));
  };
  async function save() {
    if (saving) return;
    setSaving(true); setError("");
    try {
      await onSave(normalizeAdjustments(edit));
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
            <p id="ska-photo-editor-desc">Arraste a foto dentro do enquadramento. O arquivo original será preservado.</p>
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
              <div className={"ska-photo-editor-frame ska-photo-editor-frame--" + preview}
                onPointerDown={moveStart} onPointerMove={move}
                onPointerUp={() => { drag.current = null; }}
                onPointerCancel={() => { drag.current = null; }}
                aria-label="Área de recorte. Arraste para mover a fotografia">
                <img src={imageUrl} alt={photo.alt_text || "Prévia da fotografia"}
                  draggable={false} style={adjustedImageStyle(edit)}/>
                <span className="ska-photo-editor-grid" aria-hidden="true"/>
              </div>
            </div>
            <p className="ska-photo-editor-hint">Arraste a imagem para ajustar a posição. A área visível será usada no catálogo.</p>
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
              onClick={() => setEdit({ ...DEFAULT_PHOTO_ADJUSTMENTS })}>
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
