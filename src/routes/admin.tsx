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
import { getInventoryMode } from "../lib/skinaoInventory.functions";
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
  const [accessIssue, setAccessIssue] = useState<"restricted" | "unavailable" | null>(null);
  // The catalog is already linked to the Neon database on the server.
  // There is no local fallback, password field or invite flow in the admin UI.
  // A previously authorized session is still verified server-side before writes.
  useEffect(() => {
    let active = true;
    void getInventoryMode().then(mode => {
      if (!active) return;
      setRemoteInventory(mode.unlocked);
      setRemoteMode(mode.unlocked);
      setAccessIssue(mode.unlocked ? null : mode.configured ? "restricted" : "unavailable");
    }).catch(() => {
      if (!active) return;
      setRemoteInventory(false);
      setRemoteMode(false);
      setAccessIssue("unavailable");
    }).finally(() => { if (active) setModeReady(true); });
    return () => { active = false; };
  }, []);
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
  const [pendingVisibility, setPendingVisibility] = useState<{ vehicle: Vehicle; publish: boolean } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Vehicle | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmDialogRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VehicleDraft>(emptyDraft);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const formBaselineRef = useRef("");

  // Form data is saved only when "Salvar veículo" is pressed; gallery controls save immediately.
  function hasUnsavedFormChanges() {
    return view === "form" && (newPhotos.length > 0 ||
      JSON.stringify({ draft, features: featureInput }) !== formBaselineRef.current);
  }
  function confirmLeaveForm() {
    return !hasUnsavedFormChanges() || window.confirm(
      "Você tem alterações não salvas neste veículo. Deseja sair e descartar essas alterações?"
    );
  }
  function leaveForm(next: "inventory" | "storage") {
    if (!confirmLeaveForm()) return;
    setView(next); setMenuOpen(false);
  }
  useEffect(() => {
    if (!hasUnsavedFormChanges()) return;
    const preventAccidentalExit = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventAccidentalExit);
    return () => window.removeEventListener("beforeunload", preventAccidentalExit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, draft, featureInput, newPhotos]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (modeReady && remoteMode) void refresh();
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
    if (!confirmLeaveForm()) return;
    const fresh = emptyDraft();
    setDraft(fresh); setFeatureInput(""); setNewPhotos([]);
    formBaselineRef.current = JSON.stringify({ draft: fresh, features: "" });
    setEditingId(null); setEditingPhoto(null); setCroppingPhoto(null); setView("form"); setFeedback(null);
    setMenuOpen(false);
  }
  function editItem(vehicle: Vehicle) {
    if (!confirmLeaveForm()) return;
    const initial = toDraft(vehicle);
    const initialFeatures = vehicle.features.join(", ");
    setDraft(initial);
    setFeatureInput(initialFeatures);
    formBaselineRef.current = JSON.stringify({ draft: initial, features: initialFeatures });
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
    if (wasDemo && !draft.is_demo && !window.confirm(
      "Converter este EXEMPLO DO SITE em um veículo real da loja? Verifique marca, preço, disponibilidade e fotografias reais antes de publicá-lo como anúncio."
    )) return;
    const original = editingId ? vehicles.find(v => v.id === editingId) : null;
    if (original && original.is_published && !draft.is_published && !window.confirm(
      "Despublicar " + original.brand + " " + original.model +
      "? O veículo ficará oculto no site, mas continuará cadastrado com todas as fotos e poderá ser republicado depois."
    )) return;
    if (original && !original.is_published && draft.is_published && !window.confirm(
      "Publicar " + original.brand + " " + original.model +
      "? Confira preço, fotos e descrição antes de tornar o anúncio visível no site."
    )) return;
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
  async function applyPublication(item: Vehicle, publish: boolean) {
    if (working || item.is_published === publish) return;
    if (publish && item.status === "sold") {
      setFeedback({ text: "Veículos vendidos não podem ser publicados. Atualize o status antes.", error: true });
      return;
    }
    if (publish && !orderPhotos(photos, item.id).length) {
      setFeedback({ text: "Inclua uma fotografia antes de publicar.", error: true });
      return;
    }
    setWorking(true); setFeedback(null);
    try {
      await saveVehicle({ ...toDraft(item), is_published: publish }, item.id);
      await refresh();
      setFeedback({ text: remoteMode
        ? (publish ? "Veículo publicado no catálogo. As informações e fotos estão preservadas." :
          "Veículo despublicado. Dados e fotografias foram mantidos no painel e podem ser republicados.")
        : (publish ? "Marcado como publicado apenas neste navegador." :
          "Despublicado apenas neste navegador; o estoque Neon não foi alterado.") });
    } catch (error) {
      setFeedback({ text: error instanceof Error ? error.message : "Erro ao atualizar a publicação.", error: true });
    } finally {
      setWorking(false);
    }
  }
  function confirmVisibility(item: Vehicle, publish: boolean) {
    if (working || item.is_published === publish) return;
    setPendingVisibility({ vehicle: item, publish });
  }
  function requestDeletion(item: Vehicle) {
    if (working) return;
    setDeleteConfirmation("");
    setPendingDelete(item);
  }
  async function deleteConfirmed(item: Vehicle) {
    if (working || deleteConfirmation.trim().toUpperCase() !== "EXCLUIR") return;
    setPendingDelete(null);
    setDeleteConfirmation("");
    setWorking(true); setFeedback(null);
    try {
      const result = await deleteVehicle(item.id);
      setAdminPage(0);
      await refresh();
      setFeedback(result.cleanupFailed ? {
        text: "O veículo foi excluído, mas alguns arquivos não puderam ser removidos do armazenamento. Revise o bucket de imagens.",
        error: true,
      } : {
        text: remoteMode
          ? "Veículo e fotografias excluídos definitivamente do estoque Neon."
          : "Veículo e fotografias excluídos deste navegador. O estoque Neon não foi alterado.",
      });
    } catch (error) {
      setFeedback({ text:error instanceof Error ? error.message : "Falha ao excluir o veículo.",error:true });
    } finally { setWorking(false); }
  }
  // Trap keyboard focus within the confirmation dialog; Escape/backdrop cancel safely.
  useEffect(() => {
    if (!pendingVisibility && !pendingDelete) return;
    const previousFocus = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmCancelRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setPendingVisibility(null);
        setPendingDelete(null);
        setDeleteConfirmation("");
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
  }, [pendingVisibility, pendingDelete]);
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
    if (working || !window.confirm(
      "Excluir esta fotografia do cadastro? Esta ação não pode ser desfeita. Se for a última foto, o veículo será despublicado automaticamente, mas continuará cadastrado."
    )) return;
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

  if (!modeReady || !remoteMode) {
    return <div className="ska ska-dashboard" data-ska-theme={adminTheme}>
      <main className="ska-access-state">
        <span className="ska-brand">SKINÃO <strong>VEÍCULOS</strong></span>
        <span className="ska-eyebrow">PAINEL ADMINISTRATIVO</span>
        <h1>{!modeReady ? "Abrindo estoque..." :
          accessIssue === "unavailable" ? "Estoque indisponível." : "Acesso restrito."}</h1>
        <p>{!modeReady ? "Verificando a conexão segura com o estoque do site." :
          accessIssue === "unavailable"
            ? "Não foi possível acessar a configuração do estoque online. O catálogo público continua disponível."
            : "Este navegador não possui uma sessão de administração válida. O sistema não libera alterações de veículos a visitantes não autorizados."}</p>
        <a className="ska-button ska-button--outline" href="/">Voltar ao site</a>
      </main>
    </div>;
  }

  return (
    <div className="ska ska-dashboard" data-ska-theme={adminTheme}>
      <aside className={"ska-sidebar" + (menuOpen ? " ska-sidebar--open" : "")}>
        <div className="ska-sidebar-head">
          <span className="ska-brand">SKINÃO <strong>VEÍCULOS</strong></span>
          <small>PAINEL ADMINISTRATIVO</small>
          <button className="ska-mobile-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={19}/></button>
        </div>
        <nav className="ska-nav" aria-label="Navegação administrativa">
          <button className={view === "inventory" ? "is-active" : ""} onClick={() => leaveForm("inventory")}><ClipboardList size={19}/> Estoque</button>
          <button className={view === "form" ? "is-active" : ""} onClick={createNew}><Plus size={19}/> Novo veículo</button>
          <button className={view === "storage" ? "is-active" : ""} onClick={() => leaveForm("storage")}><HardDrive size={19}/> Armazenamento</button>
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
          {modeReady && !remoteMode && <section className="ska-connection-panel" aria-label="Autorizar este navegador">
            <div className="ska-connection-copy">
              <strong>Primeiro acesso neste dispositivo</strong>
              <p>Quem recebeu um convite deve abrir o link enviado pela loja: a autorização será automática e ficará salva neste navegador. Sem convite, use a chave administrativa somente nesta primeira autorização.</p>
              {!canUnlock && <p>O acesso online ainda não está configurado. Os dados locais deste navegador não são publicados no site.</p>}
            </div>
            {canUnlock && <form id="ska-unlock-form" className="ska-connection-form ska-connection-form--inline" onSubmit={changeAccess}>
              <label htmlFor="ska-access-key">Chave administrativa</label>
              <div className="ska-connection-form-row">
                <input id="ska-access-key" type="password" autoComplete="off" required
                  value={accessKey} maxLength={1024} onChange={event=>setAccessKey(event.target.value)}
                  placeholder="Informe uma vez neste dispositivo"/>
                <button type="submit" className="ska-button ska-button--red" disabled={working}>
                  {working ? "Autorizando..." : "Autorizar dispositivo"}
                </button>
              </div>
            </form>}
          </section>}
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
            <p className="ska-stock-hint"><CircleAlert size={16} aria-hidden="true"/> Despublicar apenas oculta o anúncio. Veículo, informações e fotos continuam salvos e podem ser republicados.</p>
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
                      <small>{v.is_published ? (remoteMode ? "Publicado no site" : "Marcado publicado (local)") : (remoteMode ? "Despublicado • preservado" : "Não publicado (local)")}</small>
                    </div>
                    <div className="ska-actions">
                      <button type="button" className="ska-publish-action" disabled={working || v.is_published}
                        onClick={() => confirmVisibility(v, true)}
                        title={v.is_published ? "Este veículo já está publicado" : "Publicar veículo"}
                        aria-label={"Publicar "+v.brand+" "+v.model}>Publicar</button>
                      <button type="button" className="ska-unpublish-action" disabled={working || !v.is_published}
                        onClick={() => confirmVisibility(v, false)}
                        title={!v.is_published ? "Este veículo já está despublicado" : "Despublicar sem excluir"}
                        aria-label={"Despublicar "+v.brand+" "+v.model}>Despublicar</button>
                      <button type="button" disabled={working} onClick={() => editItem(v)}
                        title="Editar veículo" aria-label={"Editar "+v.brand+" "+v.model}><Edit3 size={18}/></button>
                      <button type="button" className="ska-delete-action" disabled={working}
                        onClick={() => requestDeletion(v)} title="Excluir definitivamente"
                        aria-label={"Excluir definitivamente "+v.brand+" "+v.model}><Trash2 size={18}/></button>
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
                <span>{remoteMode ? "Publicar no catálogo" : "Marcar como publicado (apenas local)"}</span><small>{remoteMode
                    ? (draft.is_demo
                      ? "Exemplos aparecerão identificados como ilustrativos. Para despublicar, os dados e fotos ficam salvos."
                      : "Veículos reais precisam estar disponíveis ou reservados e ter fotos reais.")
                    : "Esta opção não publica no site público."}</small>
              </label>
              <label className="ska-toggle"><input type="checkbox" checked={draft.is_featured}
                onChange={e => setDraft(d => ({ ...d, is_featured:e.target.checked }))}/>
                <span>Marcar como destaque</span>
              </label>
              <div className="ska-form-footer"><button type="button" className="ska-button ska-button--outline" onClick={() => leaveForm("inventory")}>Cancelar</button>
                <button type="submit" disabled={working} className="ska-button ska-button--red"><Save size={18}/>{working?"Salvando...":"Salvar veículo"}</button></div>
            </form>
          </>}
          {view === "storage" && <>
            <div className="ska-section-header"><div><span className="ska-eyebrow">DADOS DO PAINEL</span>
              <h1>ARMAZENAMENTO <em>{remoteMode ? "NEON." : "LOCAL."}</em></h1>
              <p>{remoteMode ? "Banco de dados conectado e acesso autorizado neste navegador." :
                "Cadastros locais não são enviados ao site. Para usar o estoque Neon, autorize este dispositivo."}</p></div></div>
            {remoteMode ? <>
              <div className="ska-info">
                <h3>Estoque sincronizado</h3>
                <p>Os veículos ficam no Neon e as fotos reais no armazenamento vehicle-images.
                  Este navegador permanece autorizado nas visitas futuras, enquanto a sessão e a chave administrativa forem válidas.</p>
              </div>
              <div className="ska-info ska-device-sharing">
                <h3>Entregar acesso a outra pessoa</h3>
                <p>Gere um convite para o navegador de quem administrará a loja. A pessoa
                  abre o link uma única vez e poderá gerenciar o estoque sem digitar a chave.
                  O link expira em 24 horas e só pode ser usado uma vez.</p>
                <p><strong>Atenção:</strong> qualquer pessoa que usar o convite poderá publicar,
                  editar e excluir veículos. Envie exclusivamente ao responsável pela loja.</p>
                <button type="button" className="ska-button ska-button--red"
                  disabled={inviteBusy || working} onClick={() => void createInviteLink()}>
                  {inviteBusy ? "Gerando convite..." : "Gerar convite de acesso"}
                </button>
                {inviteLink && <div className="ska-invite-result">
                  <label htmlFor="ska-invite-url">Link de convite (válido por 24 horas)</label>
                  <div className="ska-invite-row">
                    <input id="ska-invite-url" type="text" readOnly value={inviteLink}
                      onFocus={event => event.currentTarget.select()} autoComplete="off"/>
                    <button type="button" className="ska-button ska-button--outline"
                      onClick={() => void copyInviteLink()}>Copiar link</button>
                  </div>
                  <small>O link será descartado desta tela ao atualizar a página. Se necessário, gere outro.</small>
                </div>}
              </div>
              <div className="ska-info">
                <h3>Segurança do dispositivo</h3>
                <p>Se este computador deixar de ser utilizado pela loja, encerre a autorização
                  aqui. Essa ação não remove veículos nem fotografias.</p>
                <button type="button" className="ska-button ska-button--outline"
                  disabled={working} onClick={() => void lockAccess()}>Encerrar acesso neste dispositivo</button>
              </div>
            </> : <div className="ska-info">
              <h3>Armazenamento deste navegador</h3>
              <p>Os veículos e as fotografias locais ficam no IndexedDB e não aparecem no site público.
                O estoque verdadeiro precisa de um convite ou da autorização inicial deste navegador.</p>
              <p>Limpar os dados do navegador pode apagar cadastros locais. Eles não são transferidos automaticamente ao Neon.</p>
            </div>}
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
      {pendingVisibility && <div className="ska-confirm-overlay"
        onMouseDown={event => { if (event.target === event.currentTarget) setPendingVisibility(null); }}>
        <div className="ska-confirm-dialog" ref={confirmDialogRef} role="alertdialog" aria-modal="true"
          aria-labelledby="ska-visibility-title" aria-describedby="ska-visibility-description">
          <button type="button" className="ska-confirm-close" aria-label="Fechar aviso"
            onClick={() => setPendingVisibility(null)}><X size={19}/></button>
          <span className="ska-confirm-icon"><AlertTriangle size={25} aria-hidden="true"/></span>
          <span className="ska-eyebrow">CONFIRMAR ALTERAÇÃO</span>
          <h2 id="ska-visibility-title">{pendingVisibility.publish ? "Publicar veículo?" : "Despublicar veículo?"}</h2>
          <p id="ska-visibility-description">
            O veículo <strong>{pendingVisibility.vehicle.brand} {pendingVisibility.vehicle.model}</strong>{" "}
            {pendingVisibility.publish
              ? (remoteMode
                ? (pendingVisibility.vehicle.is_demo
                  ? "aparecerá na vitrine como EXEMPLO DO SITE. Confira se os dados e as fotografias ilustrativas estão corretos."
                  : "ficará visível no catálogo público, incluindo preço, descrição e fotografias.")
                : "será marcado como publicado somente neste navegador. Nada será enviado ao Neon.")
              : (remoteMode
                ? "deixará de aparecer na vitrine pública, mas continuará no painel com todas as informações e fotografias. Você poderá republicá-lo depois."
                : "deixará de estar marcado neste navegador, sem excluir informações ou fotografias. Nada muda no Neon.")}
          </p>
          <div className="ska-confirm-actions">
            <button type="button" ref={confirmCancelRef} className="ska-button ska-button--outline"
              onClick={() => setPendingVisibility(null)}>Cancelar</button>
            <button type="button" className={pendingVisibility.publish ? "ska-button ska-button--outline" : "ska-button ska-button--red"}
              onClick={() => {
                const { vehicle, publish } = pendingVisibility;
                setPendingVisibility(null);
                void applyPublication(vehicle, publish);
              }}><Check size={17}/>{pendingVisibility.publish ? "Sim, publicar" : "Sim, despublicar"}</button>
          </div>
        </div>
      </div>}
      {pendingDelete && <div className="ska-confirm-overlay"
        onMouseDown={event => {
          if (event.target === event.currentTarget) { setPendingDelete(null); setDeleteConfirmation(""); }
        }}>
        <div className="ska-confirm-dialog ska-confirm-dialog--delete" ref={confirmDialogRef}
          role="alertdialog" aria-modal="true"
          aria-labelledby="ska-delete-title" aria-describedby="ska-delete-description">
          <button type="button" className="ska-confirm-close" aria-label="Fechar aviso"
            onClick={() => { setPendingDelete(null); setDeleteConfirmation(""); }}><X size={19}/></button>
          <span className="ska-confirm-icon"><AlertTriangle size={25} aria-hidden="true"/></span>
          <span className="ska-eyebrow">EXCLUSÃO DEFINITIVA</span>
          <h2 id="ska-delete-title">Excluir veículo?</h2>
          <p id="ska-delete-description">
            <strong>{pendingDelete.brand} {pendingDelete.model}</strong> será removido
            {remoteMode ? " do banco Neon e do catálogo público" : " do armazenamento deste navegador"}.
            O cadastro e suas fotografias serão apagados. <strong>Essa ação não pode ser desfeita.</strong>
            Se você pretende apenas ocultá-lo, cancele e use o botão vermelho Despublicar.
          </p>
          <label className="ska-delete-confirm-label" htmlFor="ska-delete-confirm-input">
            Para confirmar a exclusão permanente, digite <strong>EXCLUIR</strong>:
          </label>
          <input id="ska-delete-confirm-input" className="ska-delete-confirm-input"
            type="text" autoComplete="off" spellCheck={false}
            value={deleteConfirmation} onChange={event=>setDeleteConfirmation(event.target.value)}
            placeholder="EXCLUIR" maxLength={30}/>
          <div className="ska-confirm-actions">
            <button type="button" ref={confirmCancelRef} className="ska-button ska-button--outline"
              onClick={() => { setPendingDelete(null); setDeleteConfirmation(""); }}>Cancelar</button>
            <button type="button" className="ska-button ska-button--red"
              disabled={working || deleteConfirmation.trim().toUpperCase() !== "EXCLUIR"}
              onClick={() => { if (pendingDelete) void deleteConfirmed(pendingDelete); }}>
              <Trash2 size={17}/> Excluir definitivamente
            </button>
          </div>
        </div>
      </div>}
    </div>
  );
}
