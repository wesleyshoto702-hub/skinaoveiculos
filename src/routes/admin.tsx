import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft, ArrowRight, Camera, CarFront, Check, ChevronDown, CircleAlert,
  ClipboardList, Edit3, ImagePlus, LockKeyhole, LogOut, Menu, Plus,
  RefreshCw, Save, Search, ShieldCheck, Trash2, UsersRound, X,
} from "lucide-react";
import {
  addPhoto, currentSession, deletePhoto, deleteVehicle, listPhotos, listVehicles,
  myRole, photoUrl, removeStoredPhotos, saveVehicle, signIn, signOut, uploadPhoto,
  type AdminRole, type Session, type Vehicle, type VehicleDraft, type VehiclePhoto,
  type VehicleStatus,
} from "../lib/skinaoAdminApi";
import "../admin.css";

export const Route = createFileRoute("/admin")({ component: AdminPanel });
type View = "inventory" | "form" | "team";
type Status = { text: string; error?: boolean };
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const statusLabel: Record<VehicleStatus, string> = {
  available: "Disponível", reserved: "Reservado", sold: "Vendido",
};
function emptyDraft(): VehicleDraft {
  return {
    brand: "", model: "", version: "", year: new Date().getFullYear(), km: 0,
    transmission: "Manual", fuel: "Flex", type: "Hatch", color: "",
    price: 0, description: "", features: [], badge: null, status: "available",
    is_published: false, is_featured: false,
  };
}
function toDraft(v: Vehicle): VehicleDraft {
  const { id: _id, created_at: _created, updated_at: _updated, ...data } = v;
  return data;
}
const orderPhotos = (photos: VehiclePhoto[], vehicleId: string) =>
  photos.filter(p => p.vehicle_id === vehicleId).sort((a, b) =>
    Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order);

function AdminPanel() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState<View>("inventory");
  const [menuOpen, setMenuOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<Status | null>(null);
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
    if (session && role) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id, role]);

  async function refresh() {
    setLoading(true);
    try {
      const [items, pictures] = await Promise.all([listVehicles(), listPhotos()]);
      setVehicles(items);
      setPhotos(pictures);
    } catch (e) {
      setFeedback({ text: e instanceof Error ? e.message : "Falha ao consultar o estoque.", error: true });
    } finally { setLoading(false); }
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
      setSession(signed);
      setRole(membership);
    } catch (e) { setAuthError(e instanceof Error ? e.message : "Falha ao entrar."); }
    finally { setAuthBusy(false); }
  }
  async function logOut() {
    await signOut();
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
    setWorking(true); setFeedback(null);
    try {
      const item = await saveVehicle({
        ...draft, brand: draft.brand.trim(), model: draft.model.trim(),
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
      setNewPhotos([]); setEditingId(null); setView("inventory");
      setFeedback({ text: failures ? "Veículo salvo, mas " + failures + " foto(s) falharam. Revise as imagens." :
        "Veículo salvo com sucesso." , error: failures > 0 });
      await refresh();
    } catch (e) { setFeedback({ text: e instanceof Error ? e.message : "Não foi possível salvar.", error: true }); }
    finally { setWorking(false); }
  }
  async function changePublish(item: Vehicle) {
    setWorking(true); setFeedback(null);
    try {
      await saveVehicle({ ...toDraft(item), is_published: !item.is_published }, item.id);
      await refresh();
      setFeedback({ text: item.is_published ? "Anúncio retirado do site." : "Anúncio publicado no site." });
    } catch (e) { setFeedback({ text: e instanceof Error ? e.message : "Erro ao atualizar publicação.", error: true }); }
    finally { setWorking(false); }
  }
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
  async function removePicture(photo: VehiclePhoto) {
    if (!window.confirm("Excluir esta fotografia?")) return;
    setWorking(true); setFeedback(null);
    try {
      await removeStoredPhotos([photo.storage_path]);
      await deletePhoto(photo.id);
      await refresh();
    } catch (e) {
      setFeedback({ text: e instanceof Error ? e.message : "Erro ao excluir foto.", error: true });
    } finally { setWorking(false); }
  }
  const published = vehicles.filter(v => v.is_published && v.status !== "sold").length;
  const reserved = vehicles.filter(v => v.status === "reserved").length;
  const sold = vehicles.filter(v => v.status === "sold").length;
  const searched = vehicles.filter(v =>
    (v.brand + " " + v.model + " " + v.version).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));

  if (checking) return <main className="ska ska-centered"><span className="ska-spinner"/> Validando sua sessão...</main>;
  if (!session || !role) return (
    <main className="ska ska-login-page">
      <a className="ska-back-link" href="/"><ArrowLeft size={17}/> Voltar ao site</a>
      <div className="ska-login-card">
        <div className="ska-login-icon"><LockKeyhole size={29}/></div>
        <span className="ska-eyebrow">ACESSO RESTRITO · SKINÃO VEÍCULOS</span>
        <h1>SEU ESTOQUE.<br/><em>SOB CONTROLE.</em></h1>
        <p>Entre com a conta autorizada para gerenciar os veículos da loja.</p>
        <form onSubmit={logIn} className="ska-form">
          <label>E-mail<input type="email" autoComplete="username" required value={email}
            onChange={e => setEmail(e.target.value)} placeholder="seuemail@exemplo.com"/></label>
          <label>Senha<input type="password" autoComplete="current-password" required
            value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha"/></label>
          {authError && <p className="ska-feedback ska-feedback--error" role="alert">{authError}</p>}
          <button className="ska-button ska-button--red" type="submit" disabled={authBusy}>
            {authBusy ? "Verificando..." : "Entrar no painel"} <ArrowRight size={18}/>
          </button>
        </form>
        <div className="ska-auth-footer"><ShieldCheck size={17}/> Acesso protegido por autenticação e permissões do Supabase.</div>
      </div>
    </main>
  );

  return (
    <div className="ska ska-dashboard">
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
          <div className="ska-session-badge"><span className="ska-online-dot"/><span>{session.user.email ?? "Administrador"}</span><b>{role === "owner" ? "PROPRIETÁRIO" : "EQUIPE"}</b></div>
        </header>
        <main className="ska-content">
          {feedback && <div className={"ska-feedback" + (feedback.error ? " ska-feedback--error" : "")} role="status">
            {feedback.error ? <CircleAlert size={19}/> : <Check size={19}/>} {feedback.text}
            <button type="button" onClick={() => setFeedback(null)} aria-label="Fechar aviso"><X size={16}/></button>
          </div>}
          {view === "inventory" && <>
            <div className="ska-section-header">
              <div><span className="ska-eyebrow">VISÃO GERAL</span><h1>GESTÃO DE <em>ESTOQUE.</em></h1>
                <p>Cadastre, atualize e publique veículos em poucos cliques.</p></div>
              <button className="ska-button ska-button--red" type="button" onClick={createNew}><Plus size={18}/> Adicionar veículo</button>
            </div>
            <div className="ska-stats">
              {[
                {title:"Total de veículos",number:vehicles.length,icon:<CarFront size={21}/>},
                {title:"No site",number:published,icon:<Check size={21}/>},
                {title:"Reservados",number:reserved,icon:<ClipboardList size={21}/>},
                {title:"Vendidos",number:sold,icon:<CarFront size={21}/>},
              ].map(s => <div className="ska-stat" key={s.title}><span>{s.icon}{s.title}</span><strong>{s.number}</strong></div>)}
            </div>
            <div className="ska-section-title"><h2>Veículos cadastrados</h2>
              <button type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={18}/> Atualizar</button>
            </div>
            <label className="ska-search"><Search size={19}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar marca, modelo ou versão..."/></label>
            <div className="ska-inventory">
              {loading ? <div className="ska-empty">Carregando veículos...</div> :
                searched.length ? searched.map(v => {
                  const first = orderPhotos(photos, v.id)[0];
                  return <div className="ska-vehicle-row" key={v.id}>
                    <div className="ska-vehicle-thumb">{first ? <img src={photoUrl(first.storage_path)} alt={v.brand+" "+v.model}/> : <CarFront size={27}/>}</div>
                    <div className="ska-vehicle-copy">
                      <strong>{v.brand} {v.model}</strong><small>{v.version} · {v.year} · {v.km.toLocaleString("pt-BR")} km</small>
                      <b>{money(v.price)}</b>
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
              <p className="ska-muted">Formatos JPG, PNG, WebP e AVIF. Até 8 MB por foto. A primeira imagem será a capa.</p>
              {editingId && <div className="ska-photo-grid">
                {orderPhotos(photos, editingId).map(p => <div className="ska-photo" key={p.id}>
                  <img alt={p.alt_text} src={photoUrl(p.storage_path)}/>
                  {p.is_cover && <span>CAPA</span>}
                  <button type="button" disabled={working} onClick={() => void removePicture(p)} aria-label="Excluir imagem"><Trash2 size={16}/></button>
                </div>)}
              </div>}
              <label className="ska-upload"><ImagePlus size={26}/><span>Selecionar fotografias</span><small>{newPhotos.length ? newPhotos.length+" foto(s) selecionada(s)" : "Você pode selecionar vários arquivos"}</small>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={e => setNewPhotos(Array.from(e.target.files || []))}/></label>
              <div className="ska-divider"/>
              <h2>Publicação</h2>
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
    </div>
  );
}
