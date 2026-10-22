import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Check, Crop, RotateCcw, X } from "lucide-react";
import type { VehiclePhoto } from "../../lib/skinaoAdminApi";
import {
  cropPixels, initialCrop, moveCrop, resizeCrop,
  type CropHandle, type CropRatio, type CropRect,
} from "../../lib/skinaoPhotoCrop";

type Props = {
  photo: VehiclePhoto; originalUrl: string;
  onClose: () => void; onConfirm: (file: File) => Promise<void>;
};
type Draft = { file: File; url: string; width: number; height: number };
type Drag = { x: number; y: number; rect: CropRect; handle: CropHandle | "move" };

export function PhotoCropper({ photo, originalUrl, onClose, onConfirm }: Props) {
  const [ratio, setRatio] = useState<CropRatio>("card");
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [preview, setPreview] = useState<Draft | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const imgRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<Drag | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const cancelConfirmRef = useRef<HTMLButtonElement>(null);
  const applyRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!active) return;
      if (!img.naturalWidth || !img.naturalHeight) {
        setError("A imagem original não possui dimensões válidas."); return;
      }
      imgRef.current = img;
      setSize({ width: img.naturalWidth, height: img.naturalHeight });
      setCrop(initialCrop(img.naturalWidth, img.naturalHeight, "card"));
    };
    img.onerror = () => {
      if (active) setError("Não foi possível carregar a imagem original. Verifique a conexão ou reenvie a foto.");
    };
    img.src = originalUrl;
    return () => { active = false; img.onload = null; img.onerror = null; imgRef.current = null; };
  }, [originalUrl]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview.url);
  }, [preview]);

  useEffect(() => {
    if (confirming) cancelConfirmRef.current?.focus();
    else if (preview) applyRef.current?.focus();
  }, [confirming, preview]);

  useEffect(() => {
    const oldOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = oldOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    const key = (event: globalThis.KeyboardEvent) => {
      if (confirming && event.key === "Tab") {
        const controls = Array.from(confirmRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        if (controls.length) {
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }
      if (event.key !== "Escape" || busy) return;
      event.preventDefault(); event.stopPropagation();
      if (confirming) setConfirming(false);
      else if (preview) setPreview(null);
      else onClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [busy, confirming, onClose, preview]);

  function selectRatio(next: CropRatio) {
    if (!size || busy) return;
    setRatio(next);
    setCrop(initialCrop(size.width, size.height, next));
    setError("");
  }
  function start(event: PointerEvent<HTMLElement>, handle: Drag["handle"]) {
    if (!crop || busy || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    event.stopPropagation();
    const stage = stageRef.current;
    if (!stage) return;
    stage.setPointerCapture(event.pointerId);
    pointerRef.current = { x: event.clientX, y: event.clientY, rect: crop, handle };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = pointerRef.current;
    if (!drag || !size || busy) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - drag.x) / Math.max(1, bounds.width);
    const dy = (event.clientY - drag.y) / Math.max(1, bounds.height);
    setCrop(drag.handle === "move"
      ? moveCrop(drag.rect, dx, dy)
      : resizeCrop(drag.rect, drag.handle, dx, dy, size.width, size.height, ratio));
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }
  function keyMove(event: KeyboardEvent<HTMLDivElement>) {
    if (!crop || busy) return;
    const step = event.shiftKey ? 0.04 : 0.01;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0],
      ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    if (moves[event.key]) {
      event.preventDefault();
      setCrop(current => current ? moveCrop(current, ...moves[event.key]) : current);
    }
  }
  async function makePreview() {
    if (!crop || !size || !imgRef.current || busy) return;
    setError(""); setBusy(true);
    try {
      const { sx, sy, sw, sh } = cropPixels(crop, size.width, size.height);
      const scale = Math.min(1, 2200 / Math.max(sw, sh));
      const w = Math.max(1, Math.round(sw * scale));
      const h = Math.max(1, Math.round(sh * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("O navegador não conseguiu abrir o editor de imagens.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, w, h);
      const blob = await new Promise<Blob>((resolve, reject) => {
        try {
          canvas.toBlob(value => value ? resolve(value) : reject(new Error("Falha ao gerar o recorte.")),
            "image/webp", 0.9);
        } catch { reject(new Error("Esta foto externa não permite recorte neste navegador. Envie a foto original ao painel e tente novamente.")); }
      });
      if (blob.size > 8 * 1024 * 1024) throw new Error("O recorte ficou maior que 8 MB. Escolha uma região menor.");
      const ext = blob.type === "image/webp" ? "webp" : "png";
      const file = new File([blob], `recorte-skinão.${ext}`, { type: blob.type });
      setPreview({ file, url: URL.createObjectURL(blob), width: w, height: h });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar a prévia do recorte.");
    } finally { setBusy(false); }
  }
  async function confirmCut() {
    if (!preview || busy) return;
    setBusy(true); setError("");
    try {
      await onConfirm(preview.file);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar a fotografia recortada.");
      setConfirming(false);
    } finally { setBusy(false); }
  }
  return (
    <div className="ska-photo-crop-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section className="ska-photo-crop-modal" role="dialog" aria-modal="true"
        aria-labelledby="ska-crop-title" aria-describedby="ska-crop-description">
        <header className="ska-photo-crop-head">
          <div>
            <span className="ska-eyebrow"><Crop size={15}/> EDITOR DE FOTOGRAFIA</span>
            <h2 id="ska-crop-title">Recortar foto</h2>
            <p id="ska-crop-description">O recorte será salvo como uma cópia. A foto original poderá ser restaurada.</p>
          </div>
          <button ref={closeRef} className="ska-photo-crop-close" type="button"
            onClick={onClose} disabled={busy} aria-label="Fechar editor"><X size={21}/></button>
        </header>
        {!preview ? (
          <div className="ska-photo-crop-workspace">
            <div className="ska-photo-crop-ratios" role="group" aria-label="Proporção de recorte">
              {([
                ["card","Catálogo desktop"],["mobile","Catálogo mobile"],["free","Livre"],
              ] as const).map(([value,label]) =>
                <button type="button" key={value} className={ratio === value ? "is-active" : ""}
                  aria-pressed={ratio === value} onClick={() => selectRatio(value)} disabled={!size || busy}>
                  {label}
                </button>)}
            </div>
            {size && crop ? (
              <div className="ska-photo-crop-canvas">
                <div ref={stageRef} className="ska-photo-crop-stage"
                  style={{aspectRatio: `${size.width} / ${size.height}`,
                    width: `min(100%, 660px, ${Math.round(360 * size.width / size.height)}px)`}}
                  onPointerMove={pointerMove} onPointerUp={end}
                  onPointerCancel={end} onLostPointerCapture={end}>
                  <img src={originalUrl} alt={photo.alt_text || "Imagem original para recortar"} draggable={false}/>
                  <div className="ska-photo-crop-selection"
                    style={{left: `${crop.x * 100}%`,top: `${crop.y * 100}%`,
                      width: `${crop.width * 100}%`,height: `${crop.height * 100}%`}}
                    onPointerDown={event => start(event, "move")}
                    onKeyDown={keyMove} tabIndex={0} role="group"
                    aria-label="Seleção do recorte. Arraste para mover, use as setas do teclado para reposicionar.">
                    {(["nw","ne","sw","se"] as const).map(handle =>
                      <button key={handle} type="button"
                        className={"ska-photo-crop-handle ska-photo-crop-handle--" + handle}
                        aria-label={"Redimensionar recorte " + handle}
                        onPointerDown={event => start(event, handle)}/>)}
                  </div>
                </div>
              </div>
            ) : <p className="ska-photo-crop-loading">Carregando fotografia original...</p>}
            <p className="ska-photo-crop-instructions">Arraste a seleção para posicioná-la e suas extremidades para mudar o tamanho. O fundo escurecido ficará fora da foto cortada.</p>
            {size && crop && <p className="ska-photo-crop-resolution">Resultado aproximado: {cropPixels(crop,size.width,size.height).sw} × {cropPixels(crop,size.width,size.height).sh} pixels antes da otimização.</p>}
          </div>
        ) : (
          <div className="ska-photo-crop-result">
            <h3>Prévia antes do corte</h3>
            <p>Confira o resultado. A imagem ainda não foi alterada no site.</p>
            <div className="ska-photo-crop-comparison">
              <div><span>Foto original</span><img src={originalUrl} alt="Imagem original"/></div>
              <div><span>Resultado do recorte</span><img src={preview.url} alt="Prévia da foto recortada"/></div>
            </div>
            <p>{preview.width} × {preview.height} pixels • {(preview.file.size / 1024).toFixed(0)} KB</p>
          </div>
        )}
        {error && <p className="ska-feedback ska-feedback--error" role="alert">{error}</p>}
        <footer className="ska-photo-crop-footer">
          {preview ? (
            <>
              <button type="button" className="ska-button ska-button--outline" disabled={busy}
                onClick={() => setPreview(null)}>Voltar e ajustar</button>
              <button ref={applyRef} type="button" className="ska-button ska-button--red" disabled={busy}
                onClick={() => setConfirming(true)}><Check size={17}/> Aplicar este recorte</button>
            </>
          ) : (
            <>
              <button type="button" className="ska-button ska-button--outline" disabled={busy}
                onClick={() => { if (size) selectRatio(ratio); }}><RotateCcw size={16}/> Restaurar seleção</button>
              <button type="button" className="ska-button ska-button--red" disabled={busy || !crop}
                onClick={() => void makePreview()}><Crop size={17}/> {busy ? "Preparando..." : "Ver prévia do corte"}</button>
            </>
          )}
        </footer>
        {confirming && (
          <div className="ska-photo-crop-confirm-backdrop">
            <div ref={confirmRef} className="ska-photo-crop-confirm" role="alertdialog" aria-modal="true"
              aria-labelledby="ska-crop-confirm-title" aria-describedby="ska-crop-confirm-text">
              <span className="ska-eyebrow">CONFIRMAR ALTERAÇÃO</span>
              <h3 id="ska-crop-confirm-title">Cortar esta fotografia?</h3>
              <p id="ska-crop-confirm-text">A nova versão recortada substituirá a visualização da foto no catálogo. O arquivo original permanecerá guardado para restauração.</p>
              <div>
                <button ref={cancelConfirmRef} type="button" className="ska-button ska-button--outline" disabled={busy}
                  onClick={() => setConfirming(false)}>Cancelar</button>
                <button type="button" className="ska-button ska-button--red" disabled={busy}
                  onClick={() => void confirmCut()}>{busy ? "Salvando..." : "Sim, confirmar corte"}</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
