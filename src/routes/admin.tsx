import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Camera, CarFront, Check, ChevronDown, CircleAlert,
  ClipboardList, Edit3, Eye, EyeOff, ImagePlus, LockKeyhole, LogOut, Menu, Plus,
  RefreshCw, Save, Search, ShieldCheck, Sun, Moon, Trash2, UsersRound, X,
} from "lucide-react";
import {
  ADMIN_PAGE_SIZE, addPhoto, currentSession, deletePhoto, deleteVehicle, getAdminStats,
  listPhotosForVehicles, listVehiclePage,
  myRole, photoUrl, removeStoredPhotos, saveVehicle, signIn, signOut, updatePhoto, uploadPhoto,
  type AdminRole, type AdminStats, type Session, type Vehicle, type VehicleDraft, type VehiclePhoto,
  type VehicleStatus,
} from "../lib/skinaoAdminApi";
import "../admin.css";

export const Route = createFileRoute("/admin")({ component: AdminPanel });
type View = "inventory" | "form" | "team";
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
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState<View>("inventory");
  const [menuOpen, setMenuOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
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
    let active = true;
    (async () => {
      try {
        const current = await currentSession();
        const membership = current ? await myRole(current.user.id) : null;
        if (!active) return;
        setSession(current);
        setRole(membership);
      } catch {
        if (active) { setSession(null); setRole(null); }
      } finally { if (active) setChecking(false); }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (session && role) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, role, adminPage, debouncedSearch]);

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
  async function logIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;
    setAuthBusy(true); setAuthError("");
    try {
      const signed = await signIn(email.trim().toLowerCase(), password);
      const membership = await myRole(signed.user.id);
      if (!membership) {
        await signOut();
        throw new Error("Sua conta não está autorizada a administrar a Skinão.");
      }
      setPassword("");
      setShowPassword(false);
      setSession(signed);
      setRole(membership);
    } catch (e) { setAuthError(e instanceof Error ? e.message : "Falha ao entrar."); }
    finally { setAuthBusy(false); }
  }
  async function logOut() {
    await signOut();
    refreshRunRef.current++;
    setSession(null); setRole(null); setVehicles([]); setPhotos([]);
    setView("inventory"); setFeedback(null); setMenuOpen(false);
  }
  function createNew() {
    setDraft(emptyDraft()); setFeatureInput(""); setNewPhotos([]);
    setEditingId(null); setView("form"); setFeedback(null);
    setMenuOpen(false);
  }
  function editItem(vehicle: Vehicle) {
    setDraft(toDraft(vehicle));
    setFeatureInput(vehicle.features.join(", "));
    setNewPhotos([]); setEditingId(vehicle.id);
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
      setFeedback({ text: item.is_published ? "Anúncio retirado do site." : "Anúncio publicado no site." });
    } catch (e) { setFeedback({ text: e instanceof Error ? e.message : "Erro ao atualizar publicação.", error: true }); }
    finally { setWorking(false); }
  }
  function changePublish(item: Vehicle) {
    if (working) return;
    if (item.is_published) setPendingUnpublish(item);
    else void applyPublication(item);
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
  async function removeItem(item: Vehicle) {
    if (!window.confirm("Excluir definitivamente " + item.brand + " " + item.model + " e suas fotografias?")) return;
    setWorking(true); setFeedback(null);
    try {
      const paths = orderPhotos(photos, item.id).map(p => p.storage_path);
      await deleteVehicle(item.id);
      if (paths.length) { try { await removeStoredPhotos(paths); } catch { /* clean-up can be retried */ } }
      await refresh();
      setFeedback({ text: "Veículo excluído do catálogo." });
    } catch (e) { setFeedback({ text: e instanceof Error ? e.message : "Erro ao excluir.", error: true }); }
    finally { setWorking(false); }
  }
  // These photo controls save immediately; the vehicle's text fields still use "Salvar veículo".
  async function setCoverPicture(photo: VehiclePhoto) {
    if (working) return;
    const current = orderPhotos(photos, photo.vehicle_id);
    if (photo.is_cover && current.filter(p => p.is_cover).length === 1) return;
    setWorking(true); setFeedback(null);
    try {
      // Set the replacement first, so a failed upload never leaves the gallery coverless.
      await updatePhoto(photo.id, { is_cover: true });
      for (const old of current.filter(p => p.id !== photo.id && p.is_cover)) {
        await updatePhoto(old.id, { is_cover: false });
      }
      await refresh();
      setFeedback({ text: "Foto de capa atualizada no catálogo." });
    } catch (e) {
      await refresh();
      setFeedback({ text: e instanceof Error ? e.message : "Falha ao alterar a capa.", error: true });
    } finally { setWorking(false); }
  }
  async function movePicture(photo: VehiclePhoto, direction: -1 | 1) {
    if (working) return;
    const ordered = orderPhotos(photos, photo.vehicle_id);
    const from = ordered.findIndex(p => p.id === photo.id);
    const to = from + direction;
    // The cover stays first; the other photos can be reordered.
    if (from < 0 || to < 0 || to >= ordered.length ||
        ordered[from].is_cover || ordered[to].is_cover) return;
    const changed = [...ordered];
    [changed[from], changed[to]] = [changed[to], changed[from]];
    setWorking(true); setFeedback(null);
    try {
      await Promise.all(changed.map((item, index) =>
        item.sort_order !== index ? updatePhoto(item.id, { sort_order: index }) : Promise.resolve()));
      await refresh();
      setFeedback({ text: "Ordem das fotografias atualizada no catálogo." });
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
      if (nextCover) await updatePhoto(nextCover.id, { is_cover: true });
      try { await removeStoredPhotos([photo.storage_path]); } catch {
        // Orphaned storage can be cleaned up later; the public gallery is already consistent.
      }
      await refresh();
      setFeedback({ text: "Fotografia excluída do catálogo." });
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

  if (checking) return <main className="ska ska-centered" data-ska-theme={adminTheme}><span className="ska-spinner"/> Validando sua sessão...</main>;
  if (!session || !role) return (
    <main className="ska ska-login-page" data-ska-theme={adminTheme}>
      <a className="ska-back-link" href="/"><ArrowLeft size={17}/> Voltar ao site</a>
      <ThemeToggle theme={adminTheme} onToggle={toggleAdminTheme}/>
      <div className="ska-login-card">
        <div className="ska-login-icon"><LockKeyhole size={29}/></div>
        <span className="ska-eyebrow">SKINÃO VEÍCULOS</span>
        <h1>SEU ESTOQUE.<br/><em>SOB CONTROLE.</em></h1>
        <p>Entre com a conta autorizada para gerenciar os veículos da loja.</p>
        <form onSubmit={logIn} className="ska-form">
          <label>E-mail<input type="email" autoComplete="username" required value={email}
            onChange={e => setEmail(e.target.value)} placeholder="seuemail@exemplo.com"/></label>
          <div className="ska-password-control">
            <label htmlFor="ska-admin-password">Senha</label>
            <div className="ska-password-field">
              <input id="ska-admin-password" type={showPassword ? "text" : "password"}
                autoComplete="current-password" required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Sua senha"/>
              <button type="button" className="ska-password-visibility"
                onClick={() => setShowPassword(visible => !visible)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                {showPassword ? <EyeOff size={18} aria-hidden="true"/> : <Eye size={18} aria-hidden="true"/>}
              </button>
            </div>
          </div>
          {authError && <p className="ska-feedback ska-feedback--error" role="alert">{authError}</p>}
          <button className="ska-button ska-button--red" type="submit" disabled={authBusy}>
            {authBusy ? "Verificando..." : "Entrar no painel"} <ArrowRight size={18}/>
          </button>
        </form>
      </div>
    </main>
  );

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
          <button className={view === "team" ? "is-active" : ""} onClick={() => { setView("team"); setMenuOpen(false); }}><UsersRound size={19}/> Equipe</button>
        </nav>
        <div className="ska-sidebar-footer">
          <a href="/" target="_blank" rel="noopener noreferrer"><ArrowLeft size={18}/> Visualizar site</a>
          <button type="button" onClick={() => void logOut()}><LogOut size={18}/> Sair do painel</button>
        </div>
      </aside>
      {menuOpen && <button type="button" className="ska-menu-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}/>}
      <div className="ska-main">
        <header className="ska-topbar">
          <button type="button" className="ska-mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={23}/></button>
          <span>SKINÃO <strong>ADMIN</strong></span>
          <div className="ska-topbar-actions">
            <ThemeToggle theme={adminTheme} onToggle={toggleAdminTheme}/>
            <div className="ska-session-badge"><span className="ska-online-dot"/><span>{session.user.email ?? "Administrador"}</span><b>{role === "owner" ? "PROPRIETÁRIO" : "EQUIPE"}</b></div>
          </div>
        </header>
        <main className="ska-content">
          {feedback && <div className={"ska-feedback" + (feedback.error ? " ska-feedback--error" : "")} role="status">
            {feedback.error ? <CircleAlert size={19}/> : <Check size={19}/>} {feedback.text}
            <button type="button" onClick={() => setFeedback(null)} aria-label="Fechar aviso"><X size={16}/></button>
          </div>}
          {view === "inventory" && <>
            <div className="ska-section-header">
              <div><span className="ska-eyebrow">VISÃO GERAL</span><h1>GESTÃO DE <em>ESTOQUE.</em></h1>
                <p>Cadastre, atualize e publique veículos em poucos cliques. {demoCount ? demoCount + " modelos ilustrativos importados do site." : ""}</p></div>
              <button className="ska-button ska-button--red" type="button" onClick={createNew}><Plus size={18}/> Adicionar veículo</button>
            </div>
            <div className="ska-stats">
              {[
                {title:"Total de veículos",number:stats.total,icon:<CarFront size={21}/>},
                {title:"No site",number:published,icon:<Check size={21}/>},
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
                    <div className="ska-vehicle-thumb">{first ? <img src={photoUrl(first.storage_path, first.external_url)} alt={v.brand+" "+v.model}/> : <CarFront size={27}/>}</div>
                    <div className="ska-vehicle-copy">
                      <strong>{v.brand} {v.model}</strong><small>{v.version} · {v.year} · {v.km.toLocaleString("pt-BR")} km</small>
                      <b>{money(v.price)}</b>
                      {v.is_demo && <span className="ska-status ska-status--demo">EXEMPLO DO SITE</span>}
                    </div>
                    <div className="ska-vehicle-state"><span className={"ska-status ska-status--"+v.status}>{statusLabel[v.status]}</span>
                      <small>{v.is_published ? "Publicado" : "Rascunho"}</small>
                    </div>
                    <div className="ska-actions">
                      <button type="button" disabled={working} onClick={() => void changePublish(v)} title={v.is_published ? "Retirar publicação" : "Publicar"}>
                        {v.is_published ? "Despublicar" : "Publicar"}
                      </button>
                      <button type="button" onClick={() => editItem(v)} title="Editar" aria-label={"Editar "+v.model}><Edit3 size={18}/></button>
                      <button type="button" disabled={working} onClick={() => void removeItem(v)} title="Excluir" aria-label={"Excluir "+v.model}><Trash2 size={18}/></button>
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
              <p>Informações exibidas no catálogo público quando o anúncio for publicado.</p>
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
              {editingId && editingPhotos.length > 0 && <p className="ska-muted">Escolha a capa e use as setas para organizar as outras imagens. A capa fica sempre em primeiro lugar. Essas alterações são salvas imediatamente.</p>}
              {editingId && <div className="ska-photo-grid">
                {editingPhotos.map((p, index) => {
                  const previous = editingPhotos[index - 1];
                  return <div className={"ska-photo" + (p.is_cover ? " ska-photo--cover" : "")} key={p.id}>
                    <div className="ska-photo-preview">
                      <img alt={p.alt_text} src={photoUrl(p.storage_path, p.external_url)}/>
                      {(p.is_cover || p.external_url) && <span>{p.is_cover ? (p.external_url ? "CAPA · ILUSTRATIVA" : "CAPA") : "ILUSTRATIVA"}</span>}
                    </div>
                    <div className="ska-photo-controls">
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
                <span>Publicar anúncio no site</span><small>Desmarcado, o veículo permanece como rascunho.</small>
              </label>
              <label className="ska-toggle"><input type="checkbox" checked={draft.is_featured}
                onChange={e => setDraft(d => ({ ...d, is_featured:e.target.checked }))}/>
                <span>Marcar como destaque</span>
              </label>
              <div className="ska-form-footer"><button type="button" className="ska-button ska-button--outline" onClick={() => setView("inventory")}>Cancelar</button>
                <button type="submit" disabled={working} className="ska-button ska-button--red"><Save size={18}/>{working?"Salvando...":"Salvar veículo"}</button></div>
            </form>
          </>}
          {view === "team" && <>
            <div className="ska-section-header"><div><span className="ska-eyebrow">CONTROLE DE ACESSO</span>
              <h1>GERENCIAR <em>EQUIPE.</em></h1><p>Segurança e permissões da administração.</p></div></div>
            <div className="ska-team-card"><div className="ska-team-icon"><ShieldCheck size={29}/></div>
              <div><h2>{role === "owner" ? "Administrador principal" : "Funcionário autorizado"}</h2>
                <p>{session.user.email}</p><span className="ska-status ska-status--available">{role === "owner" ? "PROPRIETÁRIO" : "FUNCIONÁRIO"}</span></div></div>
            {role === "owner" ? <div className="ska-info">
              <h3>Autorização de funcionários</h3><p>Por enquanto, apenas sua conta tem acesso.
                As permissões de funcionário já estão previstas no banco. O convite e a revogação
                de outras contas precisam de uma rotina administrativa segura antes da liberação.</p>
            </div> : <div className="ska-info"><p>Somente o proprietário pode autorizar e revogar funcionários.</p></div>}
          </>}
        </main>
      </div>
      {pendingUnpublish && <div className="ska-confirm-overlay"
        onMouseDown={event => { if (event.target === event.currentTarget) setPendingUnpublish(null); }}>
        <div className="ska-confirm-dialog" ref={confirmDialogRef} role="alertdialog" aria-modal="true"
          aria-labelledby="ska-unpublish-title" aria-describedby="ska-unpublish-description">
          <button type="button" className="ska-confirm-close" aria-label="Fechar aviso"
            onClick={() => setPendingUnpublish(null)}><X size={19}/></button>
          <span className="ska-confirm-icon"><AlertTriangle size={25} aria-hidden="true"/></span>
          <span className="ska-eyebrow">CONFIRMAR ALTERAÇÃO</span>
          <h2 id="ska-unpublish-title">Despublicar veículo?</h2>
          <p id="ska-unpublish-description">O anúncio de <strong>{pendingUnpublish.brand} {pendingUnpublish.model}</strong> deixará de aparecer no catálogo do site. Ele continuará salvo no painel e poderá ser publicado novamente quando desejar.</p>
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
