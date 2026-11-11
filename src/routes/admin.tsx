import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Camera, CarFront, Check, ChevronDown, CircleAlert,
  ClipboardList, Crop, Edit3, HardDrive, ImagePlus, Menu, Plus,
  RefreshCw, RotateCcw, Save, Search, Sun, Moon, Trash2, WandSparkles, X,
} from "lucide-react";
import {
  setRemoteInventory, ADMIN_PAGE_SIZE, addPhoto, deletePhoto, deleteVehicle, getAdminStats,
  listPhotosForVehicles, listVehiclePage,
  photoUrl, displayPhotoUrl, removeStoredPhotos, saveVehicle, setCoverPhoto, updatePhoto, uploadPhoto,
  type AdminStats, type Vehicle, type VehicleDraft, type VehiclePhoto,
  type VehicleStatus,
} from "../lib/skinaoAdminApi";
import "../admin.css";
import { useServerFn } from "@tanstack/react-start";
import { getInventoryMode, unlockInventory, lockInventory } from "../lib/skinaoInventory.functions";
import { Button } from "../components/ui/button";
import { PhotoEditor } from "../components/admin/PhotoEditor";
import { PhotoCropper } from "../components/admin/PhotoCropper";
import { adjustedImageStyle, DEFAULT_PHOTO_ADJUSTMENTS, type PhotoAdjustments } from "../lib/skinaoPhotoAdjust";

export const Route = createFileRoute("/admin")({
  component: AdminPanel,
  head: () => ({ meta: [{ name: "robots", content: "noindex,nofollow" },
    { title:"Skinão Veículos | Gestão de estoque" },{ name:"description",content:"Painel de gestão do catálogo Skinão Veículos." },
    { property:"og:title",content:"Skinão Veículos | Gestão de estoque" },
    { property:"og:description",content:"Administração de veículos e fotografias Skinão." },
    { property:"og:type",content:"website" },{ name:"twitter:card",content:"summary" }] }),
});
type View = "inventory" | "form" | "storage";
type Status = { text: string; error?: boolean };
type AdminTheme = "dark" | "light";
const THEME_STORAGE_KEY = "skinao-admin-theme";

function ThemeToggle({ theme, onToggle }: { theme: AdminTheme; onToggle: () => void }) {
  const nextTheme = theme === "dark" ? "claro" : "escuro";
  return (
    <button type="button" className="ska-theme-toggle" onClick={onToggle}
      title={`Ativar tema ${nextTheme}`} aria-label={`Ativar tema ${nextTheme}`}>
      {theme === "dark" ? <Sun size={18} aria-hidden="true"/> : <Moon size={18} aria-hidden="true"/>}
      <span>Tema {nextTheme}</span>
    </button>
  );
}
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const statusLabel: Record<VehicleStatus, string> = {
  available: "Disponível", reserved: "Reservado", sold: "Vendido",
};
function emptyDraft(): VehicleDraft {
  return {
    brand: "", model: "", version: "", year: new Date().getFullYear(), km: 0,
    transmission: "Manual", fuel: "Flex", type: "Hatch", color: "",
    price: 0, description: "", features: [], badge: null, status: "available",
    is_published: false, is_featured: false, is_demo: false,
  };
}
function toDraft(v: Vehicle): VehicleDraft {
  const { id: _id, created_at: _created, updated_at: _updated, demo_source_id: _source, ...data } = v;
  return data;
}
const orderPhotos = (photos: VehiclePhoto[], vehicleId: string) =>
  photos.filter(p => p.vehicle_id === vehicleId).sort((a, b) =>
    Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);

function AdminPanel() {
  // Initial render matches SSR; restore preference after hydration without changing the public site.
  const [adminTheme, setAdminTheme] = useState<AdminTheme>("dark");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") setAdminTheme(saved);
    } catch { /* Private browsing may block storage; keep the default theme. */ }
  }, []);
  function toggleAdminTheme() {
    const next: AdminTheme = adminTheme === "dark" ? "light" : "dark";
    setAdminTheme(next);
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Theme still works for this visit. */ }
  }
  const [remoteMode, setRemoteMode] = useState(false);
  const [modeReady, setModeReady] = useState(false);
  const [canUnlock, setCanUnlock] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [unlockOpen, setUnlockOpen] = useState(false);
  const unlock = useServerFn(unlockInventory);
  const lock = useServerFn(lockInventory);
  useEffect(() => {
    let active = true;
    void getInventoryMode().then(mode => {
      if (!active) return;
      setRemoteInventory(mode.unlocked); setRemoteMode(mode.unlocked); setCanUnlock(mode.canUnlock);
    }).catch(() => { setRemoteInventory(false); }).finally(() => { if(active) setModeReady(true); });
    return () => { active=false; };
  }, []);
  async function changeAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (working) return;
    setWorking(true);
    try {
      const result = await unlock({ data:{ password:accessKey } });
      setAccessKey("");
      if (!result.ok) { setFeedback({ text:"Chave inválida ou administração não configurada.",error:true }); return; }
      const mode = await getInventoryMode();
      if (!mode.unlocked) throw new Error("Conecte o banco Neon antes de editar o estoque real.");
      setRemoteInventory(true); setRemoteMode(true); setUnlockOpen(false); setEditingId(null); setView("inventory"); setAdminPage(0);
    } catch(error) { setAccessKey(""); setFeedback({ text:error instanceof Error ? error.message : "Não foi possível desbloquear.",error:true }); }
    finally { setWorking(false); }
  }
  async function lockAccess() {
    if (working) return;
    await lock(); setRemoteInventory(false); setRemoteMode(false); setView("inventory"); setEditingId(null); setAdminPage(0);
  }
  const [view, setView] = useState<View>("inventory");
  const [menuOpen, setMenuOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [editingPhoto, setEditingPhoto] = useState<VehiclePhoto | null>(null);
  const [croppingPhoto, setCroppingPhoto] = useState<VehiclePhoto | null>(null);
  const [adminPage, setAdminPage] = useState(0);
  const [pageTotal, setPageTotal] = useState(0);
  const [adminHasMore, setAdminHasMore] = useState(false);
  const [stats, setStats] = useState<AdminStats>({ total: 0, published: 0, reserved: 0, sold: 0, demos: 0 });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const refreshRunRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<Status | null>(null);
  const [pendingUnpublish, setPendingUnpublish] = useState<Vehicle | null>(null);
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmDialogRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VehicleDraft>(emptyDraft);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (modeReady) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminPage, debouncedSearch, modeReady, remoteMode]);

  async function refresh() {
    const run = ++refreshRunRef.current;
    setLoading(true);
    try {
      const [pageData, summary] = await Promise.all([
        listVehiclePage(adminPage, debouncedSearch), getAdminStats(),
      ]);
      if (run !== refreshRunRef.current) return;
      if (adminPage > 0 && pageData.total <= adminPage * ADMIN_PAGE_SIZE) {
        setAdminPage(Math.max(0, Math.ceil(pageData.total / ADMIN_PAGE_SIZE) - 1));
        return;
      }
      const pictures = await listPhotosForVehicles(pageData.vehicles.map(v => v.id));
      if (run !== refreshRunRef.current) return;
      setVehicles(pageData.vehicles);
      setPhotos(pictures);
      setPageTotal(pageData.total);
      setAdminHasMore(pageData.hasMore);
      setStats(summary);
    } catch (e) {
      if (run === refreshRunRef.current) {
        setFeedback({ text: e instanceof Error ? e.message : "Falha ao consultar o estoque.", error: true });
      }
    } finally {
      if (run === refreshRunRef.current) setLoading(false);
    }
  }
  function createNew() {
    setDraft(emptyDraft()); setFeatureInput(""); setNewPhotos([]);
    setEditingId(null); setEditingPhoto(null); setCroppingPhoto(null); setView("form"); setFeedback(null);
    setMenuOpen(false);
  }
  function editItem(vehicle: Vehicle) {
    setDraft(toDraft(vehicle));
    setFeatureInput(vehicle.features.join(", "));
    setNewPhotos([]); setEditingId(vehicle.id); setEditingPhoto(null); setCroppingPhoto(null);
    setView("form"); setFeedback(null); setMenuOpen(false);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    if (!draft.brand.trim() || !draft.model.trim() || draft.price <= 0) {
      setFeedback({ text: "Preencha marca, modelo e preço válido.", error: true });
      return;
    }
    const existingVehiclePhotos = editingId ? orderPhotos(photos, editingId) : [];
    const existingPhotos = existingVehiclePhotos.length;
    const wasDemo = vehicles.find(v => v.id === editingId)?.is_demo ?? false;
    if (wasDemo && !draft.is_demo && existingVehiclePhotos.some(p => Boolean(p.external_url))) {
      setFeedback({ text: "Antes de converter este exemplo, exclua as fotos ilustrativas e adicione fotos reais.", error: true });
      return;
    }
    if (wasDemo && !draft.is_demo && !existingPhotos && !newPhotos.length) {
      setFeedback({ text: "Adicione fotos reais antes de converter este exemplo.", error: true });
      return;
    }
    if (draft.is_published && !existingPhotos && !newPhotos.length) {
      setFeedback({ text: "Inclua uma fotografia antes de publicar o anúncio.", error: true });
      return;
    }
    setWorking(true); setFeedback(null);
    try {
      const requestedPublication = draft.is_published;
      const item = await saveVehicle({
        ...draft, is_published: false, brand: draft.brand.trim(), model: draft.model.trim(),
        features: featureInput.split(",").map(f => f.trim()).filter(Boolean),
      }, editingId || undefined);
      let numberOfImages = orderPhotos(photos, item.id).length;
      let failures = 0;
      for (const file of newPhotos) {
        let path: string | null = null;
        try {
          path = await uploadPhoto(item.id, file);
          await addPhoto({
            vehicle_id: item.id, storage_path: path, alt_text: item.brand + " " + item.model,
            sort_order: numberOfImages, is_cover: numberOfImages === 0,
          });
          numberOfImages++;
        } catch {
          failures++;
          if (path) { try { await removeStoredPhotos([path]); } catch { /* report below */ } }
        }
      }
      if (requestedPublication && numberOfImages > 0) {
        await saveVehicle({ ...toDraft(item), is_published: true }, item.id);
      }
      setNewPhotos([]); setEditingId(null); setView("inventory");
      setAdminPage(0);
      setFeedback({ text: failures ? "Veículo salvo, mas " + failures + " foto(s) falharam. Revise as imagens." :
        "Veículo salvo com sucesso." , error: failures > 0 });
      await refresh();
    } catch (e) { setFeedback({ text: e instanceof Error ? e.message : "Não foi possível salvar.", error: true }); }
    finally { setWorking(false); }
  }
  async function applyPublication(item: Vehicle) {
    if (working) return;
    if (!item.is_published && !orderPhotos(photos, item.id).length) {
      setFeedback({ text: "Inclua uma fotografia antes de publicar.", error: true });
      return;
    }
    setWorking(true); setFeedback(null);
    try {
      await saveVehicle({ ...toDraft(item), is_published: !item.is_published }, item.id);
      await refresh();
      setFeedback({ text: remoteMode ? (item.is_published ? "Veículo despublicado do site." : "Veículo publicado no site.") : (item.is_published ? "Publicação local desmarcada." : "Marcado apenas neste navegador; não publica no site.") });
    } catch (e) { setFeedback({ text: e instanceof Error ? e.message : "Erro ao atualizar publicação.", error: true }); }
    finally { setWorking(false); }
  }
  function changePublish(item: Vehicle) {
    if (working) return;
    if (item.is_published) setPendingUnpublish(item);
    else void applyPublication(item);
  }
  async function removeVehicle(item: Vehicle) {
    if (working || !window.confirm(
      "Excluir permanentemente " + item.brand + " " + item.model +
      "? O anúncio e todas as fotos serão removidos. Esta ação não pode ser desfeita."
    )) return;
    setWorking(true); setFeedback(null);
    try {
      if (!remoteMode) {
        const pictures = await listPhotosForVehicles([item.id]);
        for (const picture of pictures) await deletePhoto(picture.id);
        await removeStoredPhotos([...new Set(pictures.flatMap(p =>
          [p.storage_path, ...(p.cropped_storage_path ? [p.cropped_storage_path] : [])]))]);
      }
      await deleteVehicle(item.id);
      setAdminPage(0);
      await refresh();
      setFeedback({ text: remoteMode ? "Veículo e fotografias excluídos do estoque da loja." :
        "Veículo e fotografias removidos deste navegador." });
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Não foi possível excluir o veículo.", error: true });
    } finally { setWorking(false); }
  }
  // Trap keyboard focus within the confirmation dialog; Escape/backdrop cancel safely.
  useEffect(() => {
    if (!pendingUnpublish) return;
    const previousFocus = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmCancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setPendingUnpublish(null);
      } else if (event.key === "Tab") {
        const buttons = confirmDialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener("keydown", onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [pendingUnpublish]);
  // These photo controls save immediately; the vehicle's text fields still use "Salvar veículo".
  async function setCoverPicture(photo: VehiclePhoto) {
    if (working || photo.is_cover) return;
    setWorking(true); setFeedback(null);
    try {
      // A single transactional RPC satisfies the unique "one cover per vehicle" index.
      await setCoverPhoto(photo.id);
      await refresh();
      setFeedback({ text: "Capa alterada com sucesso." });
    } catch (e) {
      setFeedback({ text: e instanceof Error ? e.message : "Não foi possível definir a capa.", error: true });
      await refresh();
    } finally { setWorking(false); }
  }
  async function savePhotoEdits(photo: VehiclePhoto, edits: PhotoAdjustments) {
    if (working) throw new Error("Aguarde a operação atual antes de ajustar uma foto.");
    setWorking(true); setFeedback(null);
    try {
      await updatePhoto(photo.id, edits);
      await refresh();
      setFeedback({ text: "Enquadramento salvo." });
    } catch (e) {
      throw e instanceof Error ? e : new Error("Erro ao salvar o enquadramento.");
    } finally {
      setWorking(false);
    }
  }
  /** Save a derived cropped copy. Upload happens only after the preview AND confirmation. */
  async function saveCroppedPhoto(photo: VehiclePhoto, file: File) {
    if (working) throw new Error("Aguarde a operação atual terminar.");
    setWorking(true); setFeedback(null);
    let uploaded: string | null = null;
    let changed = false;
    try {
      uploaded = await uploadPhoto(photo.vehicle_id, file);
      await updatePhoto(photo.id, {
        cropped_storage_path: uploaded, ...DEFAULT_PHOTO_ADJUSTMENTS,
      });
      changed = true;
      await refresh();
      setFeedback({ text: "Fotografia recortada com sucesso. A imagem original foi preservada." });
    } catch (error) {
      if (!changed && uploaded) {
        try { await removeStoredPhotos([uploaded]); } catch { /* storage cleanup can be retried */ }
      }
      throw error instanceof Error ? error : new Error("Não foi possível aplicar o recorte.");
    } finally {
      setWorking(false);
    }
    if (photo.cropped_storage_path && photo.cropped_storage_path !== uploaded) {
      try { await removeStoredPhotos([photo.cropped_storage_path]); } catch { /* old crop may be cleaned later */ }
    }
  }

  async function restoreOriginalPhoto(photo: VehiclePhoto) {
    if (working || !photo.cropped_storage_path) return;
    setWorking(true); setFeedback(null);
    try {
      await updatePhoto(photo.id, {
        cropped_storage_path: null, ...DEFAULT_PHOTO_ADJUSTMENTS,
      });
      await refresh();
      setFeedback({ text: "Imagem original restaurada." });
      try { await removeStoredPhotos([photo.cropped_storage_path]); } catch { /* orphan variant is harmless */ }
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Falha ao restaurar imagem.", error: true });
    } finally { setWorking(false); }
  }

  async function movePicture(photo: VehiclePhoto, direction: -1 | 1) {
    if (working) return;
    const ordered = orderPhotos(photos, photo.vehicle_id);
    const from = ordered.findIndex(p => p.id === photo.id);
    const to = from + direction;
    // The cover stays first; the other photos can be reordered.
    const source = ordered[from], target = ordered[to];
    if (!source || !target || source.is_cover || target.is_cover) return;
    const changed = [...ordered];
    changed[from] = target; changed[to] = source;
    setWorking(true); setFeedback(null);
    try {
      await Promise.all(changed.map((item, index) =>
        item.sort_order !== index ? updatePhoto(item.id, { sort_order: index }) : Promise.resolve()));
      await refresh();
      setFeedback({ text: "Ordem das fotografias atualizada." });
    } catch (e) {
      await refresh();
      setFeedback({ text: e instanceof Error ? e.message : "Falha ao reorganizar fotos.", error: true });
    } finally { setWorking(false); }
  }
  async function removePicture(photo: VehiclePhoto) {
    if (working || !window.confirm("Excluir esta fotografia?")) return;
    setWorking(true); setFeedback(null);
    try {
      const nextCover = photo.is_cover
        ? orderPhotos(photos, photo.vehicle_id).find(p => p.id !== photo.id) : undefined;
      // Remove the database reference before the storage file to avoid broken public URLs.
      await deletePhoto(photo.id);
      if (nextCover) await setCoverPhoto(nextCover.id);
      try { await removeStoredPhotos([photo.storage_path, ...(photo.cropped_storage_path ? [photo.cropped_storage_path] : [])]); } catch {
        // Orphaned storage can be cleaned up later; the public gallery is already consistent.
      }
      await refresh();
      setFeedback({ text: "Fotografia excluída." });
    } catch (e) {
      await refresh();
      setFeedback({ text: e instanceof Error ? e.message : "Erro ao excluir foto.", error: true });
    } finally { setWorking(false); }
  }
  const published = stats.published;
  const reserved = stats.reserved;
  const sold = stats.sold;
  const demoCount = stats.demos;
  const editingPhotos = editingId ? orderPhotos(photos, editingId) : [];
  const searched = vehicles;

  return (
    <div className="ska ska-dashboard" data-ska-theme={adminTheme}>
      <aside className={"ska-sidebar" + (menuOpen ? " ska-sidebar--open" : "")}>
        <div className="ska-sidebar-head">
          <span className="ska-brand">SKINÃO <strong>VEÍCULOS</strong></span>
          <small>PAINEL ADMINISTRATIVO</small>
          <button className="ska-mobile-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={19}/></button>
        </div>
        <nav className="ska-nav" aria-label="Navegação administrativa">
          <button className={view === "inventory" ? "is-active" : ""} onClick={() => { setView("inventory"); setMenuOpen(false); }}><ClipboardList size={19}/> Estoque</button>
          <button className={view === "form" ? "is-active" : ""} onClick={createNew}><Plus size={19}/> Novo veículo</button>
          <button className={view === "storage" ? "is-active" : ""} onClick={() => { setView("storage"); setMenuOpen(false); }}><HardDrive size={19}/> Armazenamento</button>
        </nav>
        <div className="ska-sidebar-footer">
          <a href="/" target="_blank" rel="noopener noreferrer"><ArrowLeft size={18}/> Visualizar site</a>
          <span className="ska-local-mode"><HardDrive size={17}/> Painel sem login</span>
        </div>
      </aside>
      {menuOpen && <button type="button" className="ska-menu-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}/>}
      <div className="ska-main">
        <header className="ska-topbar">
          <button type="button" className="ska-mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={23}/></button>
          <span>SKINÃO <strong>ADMIN</strong></span>
          <div className="ska-topbar-actions">
            <ThemeToggle theme={adminTheme} onToggle={toggleAdminTheme}/>
            <div className="ska-session-badge"><span className="ska-online-dot"/><span>{remoteMode ? "Estoque da loja" : "Este navegador"}</span><b>{remoteMode ? "NEON" : "MODO LOCAL"}</b></div>
          </div>
        </header>
        <main className="ska-content">
          <div className="ska-local-notice" role="note">
            <HardDrive size={19} aria-hidden="true"/>
            <span>{remoteMode ? <><strong>Edição autorizada.</strong> Cadastros e fotografias são enviados ao estoque real; anúncios publicados aparecem no site.</> : <><strong>Modo local: não publica.</strong> Dados e fotos ficam neste navegador. O estoque local não é transferido automaticamente ao Neon.</>}</span>
          </div>
          <section className="ska-connection-panel" aria-label="Acesso ao estoque online Neon">
            <div className="ska-connection-copy">
              <strong>{remoteMode ? "Estoque Neon desbloqueado" : "Gerenciar veículos no estoque online"}</strong>
              <p>{remoteMode
                ? "Acesso salvo neste navegador (até 12 meses, renovado nas visitas). Suas edições são salvas no Neon e os exemplos ilustrativos também são atualizados na vitrine."
                : "Para cadastrar e publicar veículos no site, desbloqueie a edição usando a chave administrativa."}</p>
            </div>
            {remoteMode ?
              <button type="button" className="ska-button ska-button--outline ska-connection-action"
                disabled={working} onClick={() => void lockAccess()}>Bloquear edição</button> :
              <button type="button" className="ska-button ska-button--red ska-connection-action"
                disabled={!modeReady || working}
                aria-expanded={unlockOpen} aria-controls="ska-unlock-form"
                onClick={() => setUnlockOpen(v => !v)}>
                Desbloquear edição
              </button>}
          </section>
          {unlockOpen && !remoteMode && <form id="ska-unlock-form" className="ska-connection-form" onSubmit={changeAccess}>
            {canUnlock ? <>
              <label htmlFor="ska-access-key">Chave de administração</label>
              <div className="ska-connection-form-row">
                <input id="ska-access-key" type="password" autoComplete="off" required
                  value={accessKey} maxLength={1024} onChange={e=>setAccessKey(e.target.value)}
                  placeholder="Digite sua chave de administração"/>
                <button type="submit" className="ska-button ska-button--red" disabled={working}>
                  {working ? "Verificando..." : "Entrar no estoque"}
                </button>
              </div>
            </> : <p>A conexão ou a autorização do servidor ainda não está configurada. O modo local continua disponível.</p>}
          </form>}
          {feedback && <div className={"ska-feedback" + (feedback.error ? " ska-feedback--error" : "")} role="status">
            {feedback.error ? <CircleAlert size={19}/> : <Check size={19}/>} {feedback.text}
            <button type="button" onClick={() => setFeedback(null)} aria-label="Fechar aviso"><X size={16}/></button>
          </div>}
          {view === "inventory" && <>
            <div className="ska-section-header">
              <div><span className="ska-eyebrow">VISÃO GERAL</span><h1>GESTÃO DE <em>ESTOQUE.</em></h1>
                <p>{remoteMode ? "Gerencie o estoque real e suas publicações." : "Organize veículos neste navegador; não publica."} {demoCount ? demoCount + " modelos ilustrativos importados do site." : ""}</p></div>
              <button className="ska-button ska-button--red" type="button" onClick={createNew}><Plus size={18}/> Adicionar veículo</button>
            </div>
            <div className="ska-stats">
              {[
                {title:"Total de veículos",number:stats.total,icon:<CarFront size={21}/>},
                {title:"Marcados como publicados",number:published,icon:<Check size={21}/>},
                {title:"Reservados",number:reserved,icon:<ClipboardList size={21}/>},
                {title:"Vendidos",number:sold,icon:<CarFront size={21}/>},
              ].map(s => <div className="ska-stat" key={s.title}><span>{s.icon}{s.title}</span><strong>{s.number}</strong></div>)}
            </div>
            <div className="ska-section-title"><h2>Veículos cadastrados</h2>
              <button type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={18}/> Atualizar</button>
            </div>
            <label className="ska-search"><Search size={19}/><input value={search} onChange={e => { setSearch(e.target.value); setAdminPage(0); }} placeholder="Buscar marca, modelo ou versão..."/></label>
            <div className="ska-inventory">
              {loading ? <div className="ska-empty">Carregando veículos...</div> :
                searched.length ? searched.map(v => {
                  const first = orderPhotos(photos, v.id)[0];
                  return <div className="ska-vehicle-row" key={v.id}>
                    <div className="ska-vehicle-thumb">{first ? <img src={displayPhotoUrl(first)} style={adjustedImageStyle(first)} alt={v.brand+" "+v.model}/> : <CarFront size={27}/>}</div>
                    <div className="ska-vehicle-copy">
                      <strong>{v.brand} {v.model}</strong><small>{v.version} · {v.year} · {v.km.toLocaleString("pt-BR")} km</small>
                      <b>{money(v.price)}</b>
                      {v.is_demo && <span className="ska-status ska-status--demo">EXEMPLO DO SITE</span>}
                    </div>
                    <div className="ska-vehicle-state"><span className={"ska-status ska-status--"+v.status}>{statusLabel[v.status]}</span>
                      <small>{v.is_published ? (remoteMode ? "Publicado no site" : "Marcado como publicado (local)") : "Rascunho"}</small>
                    </div>
                    <div className="ska-actions">
                      <button type="button" disabled={working} onClick={() => void changePublish(v)} title={v.is_published ? "Despublicar veículo" : "Publicar veículo"}>
                        {v.is_published ? "Despublicar" : remoteMode ? "Publicar" : "Marcar publicado"}
                      </button>
                      <button type="button" onClick={() => editItem(v)} title="Editar" aria-label={"Editar "+v.model}><Edit3 size={18}/></button>
                      <button type="button" disabled={working} onClick={() => void removeVehicle(v)}
                        title="Excluir veículo" aria-label={"Excluir "+v.brand+" "+v.model}><Trash2 size={18}/></button>
                    </div>
                  </div>;
                }) : <div className="ska-empty"><CarFront size={33}/><h3>{search ? "Nenhum resultado" : "Seu estoque começa aqui"}</h3><p>{search ? "Experimente outra busca." : "Adicione o primeiro veículo para começar a utilizar o painel."}</p>{!search && <button className="ska-button ska-button--red" type="button" onClick={createNew}><Plus size={17}/> Cadastrar veículo</button>}</div>
              }
            </div>
            {pageTotal > ADMIN_PAGE_SIZE && <nav className="ska-stock-pagination" aria-label="Páginas do estoque">
              <button type="button" disabled={loading || adminPage === 0} onClick={() => setAdminPage(p => Math.max(0,p-1))}>
                <ArrowLeft size={17}/> Anterior
              </button>
              <span>Página {adminPage + 1} de {Math.max(1, Math.ceil(pageTotal / ADMIN_PAGE_SIZE))} · {pageTotal} veículos</span>
              <button type="button" disabled={loading || !adminHasMore} onClick={() => setAdminPage(p => p+1)}>
                Próxima <ArrowRight size={17}/>
              </button>
            </nav>}
          </>}
          {view === "form" && <>
            <div className="ska-section-header"><div>
              <span className="ska-eyebrow">GERENCIAR ANÚNCIO</span>
              <h1>{editingId ? "EDITAR" : "NOVO"} <em>VEÍCULO.</em></h1>
              <p>{remoteMode ? "Alterações são salvas no estoque da loja." : "Cadastro local: não aparece no site público."}</p>
            </div><button type="button" className="ska-button ska-button--outline" onClick={() => setView("inventory")}><ArrowLeft size={17}/> Voltar</button></div>
            <form onSubmit={save} className="ska-edit-form">
              <h2>Informações do veículo</h2>
              <div className="ska-field-grid">
                {([["brand","Marca *","Volkswagen"],["model","Modelo *","Polo"],["version","Versão","1.0 TSI Comfortline"],["color","Cor","Prata"]] as const).map(([field,label,placeholder]) =>
                  <label key={field}>{label}<input required={field==="brand" || field==="model"} value={draft[field]}
                    onChange={e => setDraft(d => ({ ...d, [field]:e.target.value }))} placeholder={placeholder}/></label>)}
                <label>Ano *<input required type="number" min={1900} max={2100} value={draft.year}
                  onChange={e => setDraft(d => ({ ...d, year:Number(e.target.value) }))}/></label>
                <label>Quilometragem<input min={0} type="number" value={draft.km}
                  onChange={e => setDraft(d => ({ ...d, km:Number(e.target.value) }))}/></label>
                <label>Preço (R$) *<input required type="number" min="0.01" step="0.01" value={draft.price}
                  onChange={e => setDraft(d => ({ ...d, price:Number(e.target.value) }))}/></label>
                <label>Tipo<select value={draft.type} onChange={e => setDraft(d => ({...d,type:e.target.value}))}>
                  {["Hatch","Sedã","SUV","Picape","Moto","Coupé","Utilitário","Outro"].map(t => <option key={t}>{t}</option>)}
                </select></label>
                <label>Câmbio<select value={draft.transmission} onChange={e => setDraft(d => ({...d,transmission:e.target.value}))}>
                  {["Manual","Automático","CVT","Automatizado","Outro"].map(t => <option key={t}>{t}</option>)}
                </select></label>
                <label>Combustível<select value={draft.fuel} onChange={e => setDraft(d => ({...d,fuel:e.target.value}))}>
                  {["Flex","Gasolina","Diesel","Elétrico","Híbrido","Etanol","Outro"].map(t => <option key={t}>{t}</option>)}
                </select></label>
                <label>Situação<select value={draft.status} onChange={e => setDraft(d => ({...d,status:e.target.value as VehicleStatus}))}>
                  <option value="available">Disponível</option><option value="reserved">Reservado</option><option value="sold">Vendido</option>
                </select></label>
                <label>Etiqueta<select value={draft.badge || ""} onChange={e => setDraft(d => ({...d,badge:e.target.value || null}))}>
                  <option value="">Sem etiqueta</option><option value="DESTAQUE">DESTAQUE</option>
                  <option value="NOVIDADE">NOVIDADE</option><option value="OPORTUNIDADE">OPORTUNIDADE</option>
                </select></label>
              </div>
              <label>Descrição<textarea rows={4} value={draft.description} onChange={e => setDraft(d => ({...d,description:e.target.value}))} placeholder="Detalhes sobre o veículo..."/></label>
              <label>Opcionais (separe por vírgulas)<input value={featureInput} onChange={e => setFeatureInput(e.target.value)} placeholder="Ar-condicionado, Direção elétrica, Airbags"/></label>
              <div className="ska-divider"/>
              <h2>Fotografias</h2>
              {draft.is_demo && <p className="ska-feedback ska-feedback--demo">Este veículo foi importado como demonstração. Substitua as imagens ilustrativas por fotografias reais antes de convertê-lo em anúncio da loja.</p>}
              <p className="ska-muted">JPG, PNG, WebP ou AVIF, até 8 MB por foto. Ao enviar as primeiras imagens, a primeira será a capa.</p>
              {editingId && editingPhotos.length > 0 && <p className="ska-muted">Escolha a capa, arraste ou ajuste o enquadramento e use as setas para organizar as outras imagens. As alterações são salvas imediatamente.</p>}
              {editingId && <div className="ska-photo-grid">
                {editingPhotos.map((p, index) => {
                  const previous = editingPhotos[index - 1];
                  return <div className={"ska-photo" + (p.is_cover ? " ska-photo--cover" : "")} key={p.id}>
                    <div className="ska-photo-preview">
                      <img alt={p.alt_text} src={displayPhotoUrl(p)} style={adjustedImageStyle(p)}/>
                      {(p.is_cover || p.external_url) && <span>{p.is_cover ? (p.external_url ? "CAPA · ILUSTRATIVA" : "CAPA") : "ILUSTRATIVA"}</span>}
                    </div>
                    <div className="ska-photo-controls">
                      <button type="button" className="ska-crop-photo-button" disabled={working}
                        onClick={() => setCroppingPhoto(p)}><Crop size={15}/> Recortar foto</button>
                      {p.cropped_storage_path && <button type="button" className="ska-restore-photo-button" disabled={working}
                        onClick={() => void restoreOriginalPhoto(p)}><RotateCcw size={15}/> Restaurar original</button>}
                      <button type="button" className="ska-edit-photo-button" disabled={working}
                        onClick={() => setEditingPhoto(p)}><WandSparkles size={15}/> Ajustar imagem</button>
                      <button type="button" className={"ska-cover-button" + (p.is_cover ? " is-cover" : "")}
                        disabled={working || p.is_cover} aria-pressed={p.is_cover}
                        onClick={() => void setCoverPicture(p)} title={p.is_cover ? "Foto de capa atual" : "Definir como foto de capa"}>
                        <Camera size={15}/>{p.is_cover ? "Capa atual" : "Definir capa"}
                      </button>
                      <div className="ska-photo-order">
                        <button type="button" disabled={working || p.is_cover || index === 0 || Boolean(previous?.is_cover)}
                          onClick={() => void movePicture(p, -1)} aria-label="Mover foto para a esquerda" title="Mover para a esquerda"><ArrowLeft size={16}/></button>
                        <button type="button" disabled={working || p.is_cover || index === editingPhotos.length - 1}
                          onClick={() => void movePicture(p, 1)} aria-label="Mover foto para a direita" title="Mover para a direita"><ArrowRight size={16}/></button>
                        <button type="button" disabled={working} className="ska-delete-photo"
                          onClick={() => void removePicture(p)} aria-label="Excluir fotografia" title="Excluir fotografia"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  </div>;
                })}
              </div>}
              {editingId && feedback && <div className={"ska-photo-inline-status" + (feedback.error ? " is-error" : "")}
                role="status">{feedback.text}</div>}
              <label className="ska-upload"><ImagePlus size={26}/><span>Selecionar fotografias</span><small>{newPhotos.length ? newPhotos.length+" foto(s) selecionada(s)" : "Você pode selecionar vários arquivos"}</small>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={e => setNewPhotos(Array.from(e.target.files || []))}/></label>
              <div className="ska-divider"/>
              <h2>Publicação</h2>
              {editingId && vehicles.find(v => v.id === editingId)?.is_demo && (
                <label className="ska-toggle">
                  <input type="checkbox" checked={!draft.is_demo}
                    onChange={e => setDraft(d => ({ ...d, is_demo: !e.target.checked }))}/>
                  <span>Converter este exemplo em veículo real da loja</span>
                  <small>Confira os dados, exclua as fotos ilustrativas e envie fotos reais antes de converter.</small>
                </label>
              )}
              <label className="ska-toggle"><input type="checkbox" checked={draft.is_published}
                onChange={e => setDraft(d => ({ ...d, is_published:e.target.checked }))}/>
                <span>{remoteMode ? "Publicar no catálogo" : "Marcar como publicado (apenas local)"}</span><small>{remoteMode ? "Somente veículos disponíveis ou reservados com fotos reais." : "Esta opção não publica no site público."}</small>
              </label>
              <label className="ska-toggle"><input type="checkbox" checked={draft.is_featured}
                onChange={e => setDraft(d => ({ ...d, is_featured:e.target.checked }))}/>
                <span>Marcar como destaque</span>
              </label>
              <div className="ska-form-footer"><button type="button" className="ska-button ska-button--outline" onClick={() => setView("inventory")}>Cancelar</button>
                <button type="submit" disabled={working} className="ska-button ska-button--red"><Save size={18}/>{working?"Salvando...":"Salvar veículo"}</button></div>
            </form>
          </>}
          {view === "storage" && <>
            <div className="ska-section-header"><div><span className="ska-eyebrow">DADOS DO PAINEL</span>
              <h1>ARMAZENAMENTO <em>{remoteMode ? "NEON." : "LOCAL."}</em></h1>
              <p>O painel abre sem login. Alterações reais exigem desbloqueio autorizado.</p></div></div>
            <div className="ska-info">
              <h3>{remoteMode ? "Estoque conectado" : "Armazenamento deste navegador"}</h3>
              {remoteMode && <p>O estoque real fica no Neon e as fotos no bucket vehicle-images. Originais e recortes são preservados separadamente. Bloqueie a edição ao terminar.</p>}
              <p>Os veículos e as fotografias são salvos no armazenamento IndexedDB deste navegador.
                É possível criar e editar cadastros sem conta e sem banco de dados remoto.</p>
              <p>Esses cadastros não sincronizam com outros navegadores ou celulares e não aparecem
                automaticamente no site público. Limpar os dados do navegador ou usar modo anônimo
                pode apagar os cadastros. Faça cópias dos arquivos importantes.</p>
              <p><strong>Atenção:</strong> qualquer pessoa com o endereço /admin pode abrir seu próprio
                painel local. Antes de publicar alterações reais para visitantes, será necessário
                reintroduzir um backend com autenticação e permissões seguras.</p>
            </div>
          </>}
        </main>
      </div>
      {croppingPhoto && <PhotoCropper key={croppingPhoto.id} photo={croppingPhoto}
        originalUrl={photoUrl(croppingPhoto.storage_path, croppingPhoto.external_url)}
        onClose={() => setCroppingPhoto(null)}
        onConfirm={file => saveCroppedPhoto(croppingPhoto, file)}/>}
      {editingPhoto && <PhotoEditor key={editingPhoto.id} photo={editingPhoto}
        imageUrl={displayPhotoUrl(editingPhoto)}
        onClose={() => setEditingPhoto(null)}
        onSave={edits => savePhotoEdits(editingPhoto, edits)}/>}
      {pendingUnpublish && <div className="ska-confirm-overlay"
        onMouseDown={event => { if (event.target === event.currentTarget) setPendingUnpublish(null); }}>
        <div className="ska-confirm-dialog" ref={confirmDialogRef} role="alertdialog" aria-modal="true"
          aria-labelledby="ska-unpublish-title" aria-describedby="ska-unpublish-description">
          <button type="button" className="ska-confirm-close" aria-label="Fechar aviso"
            onClick={() => setPendingUnpublish(null)}><X size={19}/></button>
          <span className="ska-confirm-icon"><AlertTriangle size={25} aria-hidden="true"/></span>
          <span className="ska-eyebrow">CONFIRMAR ALTERAÇÃO</span>
          <h2 id="ska-unpublish-title">Despublicar veículo?</h2>
          <p id="ska-unpublish-description">O veículo <strong>{pendingUnpublish.brand} {pendingUnpublish.model}</strong> {remoteMode ? "deixará de aparecer no catálogo público." : "deixará de estar marcado neste navegador; nada muda no site público."}</p>
          <div className="ska-confirm-actions">
            <button type="button" ref={confirmCancelRef} className="ska-button ska-button--outline"
              onClick={() => setPendingUnpublish(null)}>Manter publicado</button>
            <button type="button" className="ska-button ska-button--red"
              onClick={() => {
                const item = pendingUnpublish;
                setPendingUnpublish(null);
                void applyPublication(item);
              }}><Check size={17}/> Sim, despublicar</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
