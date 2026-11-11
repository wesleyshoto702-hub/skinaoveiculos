import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  UsersRound, UserRound, ShieldCheck, UserPlus, KeyRound, Eye, EyeOff,
  Mail, Check, X, AlertTriangle, RefreshCw, UserCheck, UserX,
} from "lucide-react";
import {
  listTeamMembers, createStaffMember, setStaffActive, resetStaffPassword,
  type TeamMember,
} from "../../lib/skinaoTeam.functions";
import { staffEmailSchema, staffPasswordSchema } from "../../lib/skinaoTeamRules";
import "../../team-access.css";

type Identity = { username:string; role:"owner"|"staff" };
type Message = {text:string; error?:boolean};

function dateLabel(value:string|null) {
  if (!value) return "Ainda não acessou";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" :
    new Intl.DateTimeFormat("pt-BR", {dateStyle:"short",timeStyle:"short"}).format(date);
}

export function TeamAccess({ currentUser }: { currentUser:Identity }) {
  const listMembers = useServerFn(listTeamMembers);
  const createMember = useServerFn(createStaffMember);
  const toggleActive = useServerFn(setStaffActive);
  const changePassword = useServerFn(resetStaffPassword);

  const isOwner = currentUser.role === "owner";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [staffLimit, setStaffLimit] = useState(30);
  const [loading, setLoading] = useState(isOwner);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string|null>(null);
  const [message, setMessage] = useState<Message|null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetId, setResetId] = useState<string|null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  async function refresh() {
    if (!isOwner) return;
    setLoading(true);
    try {
      const response = await listMembers();
      setMembers(response.members);
      setStaffLimit(response.staffLimit);
    } catch {
      setMessage({text:"Não foi possível carregar os acessos da equipe. Tente novamente.",error:true});
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (isOwner) void refresh();
    // Reload only when the authorized account or role changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.username,currentUser.role]);

  async function createAccess(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setMessage(null);
    const validEmail = staffEmailSchema.safeParse(email);
    const validPassword = staffPasswordSchema.safeParse(password);
    if (!validEmail.success) {
      setMessage({text:validEmail.error.issues[0]?.message ?? "Informe um e-mail válido.",error:true});
      return;
    }
    if (!validPassword.success) {
      setMessage({text:validPassword.error.issues[0]?.message ?? "Informe uma senha válida.",error:true});
      return;
    }
    setPending(true);
    try {
      await createMember({data:{email:validEmail.data,password:validPassword.data}});
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setMessage({text:"Acesso liberado! O funcionário já pode entrar com o e-mail e a senha cadastrados."});
      await refresh();
    } catch (error) {
      setMessage({text:error instanceof Error?error.message:"Não foi possível cadastrar o funcionário.",error:true});
    } finally {
      setPending(false);
    }
  }

  async function switchAccess(member:TeamMember) {
    if (busyId) return;
    const activating = !member.is_active;
    const prompt = activating
      ? "Reativar o acesso de " + member.username + "? Esse funcionário poderá entrar no painel novamente."
      : "Suspender o acesso de " + member.username + "? As sessões atuais serão revogadas e o cadastro de veículos será preservado.";
    if (!window.confirm(prompt)) return;
    setBusyId(member.id);
    setMessage(null);
    try {
      await toggleActive({data:{id:member.id,active:activating}});
      setMessage({text:activating ? "Acesso reativado." : "Acesso suspenso e sessões anteriores revogadas."});
      await refresh();
    } catch (error) {
      setMessage({text:error instanceof Error?error.message:"Não foi possível alterar o acesso.",error:true});
    } finally {
      setBusyId(null);
    }
  }

  async function saveNewPassword(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetId || busyId) return;
    const checked = staffPasswordSchema.safeParse(resetPassword);
    if (!checked.success) {
      setMessage({text:checked.error.issues[0]?.message ?? "Escolha uma senha mais forte.",error:true});
      return;
    }
    setBusyId(resetId);
    setMessage(null);
    try {
      await changePassword({data:{id:resetId,password:checked.data}});
      setResetId(null);
      setResetPassword("");
      setShowResetPassword(false);
      setMessage({text:"Senha alterada. O funcionário deverá entrar novamente com a nova senha."});
      await refresh();
    } catch(error) {
      setMessage({text:error instanceof Error?error.message:"Não foi possível alterar a senha.",error:true});
    } finally {
      setBusyId(null);
    }
  }

  const owner = members.find(member => member.role === "owner");
  const employees = members.filter(member => member.role === "staff");
  const accountName = owner?.username ?? currentUser.username;

  return <div className="ska-team">
    <header className="ska-team-heading">
      <div>
        <span className="ska-eyebrow">GERENCIAMENTO DE USUÁRIOS</span>
        <h1>EQUIPE E <em>ACESSOS.</em></h1>
        <p>Controle quem pode entrar no painel e gerenciar o catálogo da loja.</p>
      </div>
      {isOwner && <button type="button" className="ska-button ska-button--outline"
        disabled={loading} onClick={() => void refresh()}>
        <RefreshCw size={17} aria-hidden="true"/> Atualizar
      </button>}
    </header>

    {message && <div className={"ska-team-alert"+(message.error?" ska-team-alert--error":"")}
      role={message.error?"alert":"status"}>
      {message.error ? <AlertTriangle size={18}/> : <Check size={18}/>}
      <span>{message.text}</span>
      <button type="button" aria-label="Fechar aviso" onClick={() => setMessage(null)}><X size={17}/></button>
    </div>}

    <section className="ska-team-owner" aria-labelledby="ska-owner-title">
      <div className="ska-team-owner-icon"><ShieldCheck size={27} aria-hidden="true"/></div>
      <div className="ska-team-owner-info">
        <span className="ska-team-kicker">{isOwner?"RESPONSÁVEL PELO PAINEL":"PERFIL DO FUNCIONÁRIO"}</span>
        <h2 id="ska-owner-title">{isOwner?"Administrador principal":"Minha conta"}</h2>
        <p><Mail size={15} aria-hidden="true"/>{isOwner ? accountName : currentUser.username}</p>
        <small>{isOwner ? "Acesso total: estoque, funcionários e configurações de acesso." :
          "Você tem acesso ao estoque. A gestão da equipe é exclusiva do administrador principal."}</small>
      </div>
      <span className="ska-team-owner-badge"><ShieldCheck size={14}/> {isOwner ? "Proprietário" : "Funcionário"}</span>
    </section>

    {!isOwner ? <section className="ska-team-info">
      <UserRound size={25} aria-hidden="true"/>
      <div><h3>Seu acesso ao catálogo está ativo</h3>
        <p>Você pode cadastrar veículos, editar preços, gerenciar fotografias,
          publicar e despublicar. Somente o administrador principal pode
          gerenciar funcionários e excluir veículos definitivamente.</p>
      </div>
    </section> : <>
      <div className="ska-team-columns">
        <section className="ska-team-create" aria-labelledby="ska-create-title">
          <div className="ska-team-card-heading">
            <div className="ska-team-card-icon"><UserPlus size={23} aria-hidden="true"/></div>
            <div><h2 id="ska-create-title">Adicionar funcionário</h2>
              <p>Crie uma conta e libere o acesso imediatamente.</p></div>
          </div>
          <form className="ska-team-form" onSubmit={createAccess}>
            <label htmlFor="ska-team-email">E-mail do funcionário
              <input id="ska-team-email" type="email" name="email" required autoComplete="off"
                placeholder="funcionario@gmail.com" maxLength={254}
                value={email} disabled={pending} onChange={event => setEmail(event.target.value)}/>
            </label>
            <label htmlFor="ska-team-password">Senha inicial
              <span className="ska-team-password">
                <input id="ska-team-password" name="new-staff-password"
                  type={showPassword?"text":"password"} required autoComplete="new-password"
                  minLength={12} maxLength={72} value={password} disabled={pending}
                  placeholder="Mínimo de 12 caracteres"
                  onChange={event => setPassword(event.target.value)}/>
                <button type="button" aria-label={showPassword?"Ocultar senha":"Mostrar senha"}
                  aria-pressed={showPassword} disabled={pending}
                  onClick={() => setShowPassword(value => !value)}>
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </span>
            </label>
            <p className="ska-team-note">Use pelo menos 12 caracteres, incluindo letras e números.
              Compartilhe a senha com o funcionário por um canal privado.</p>
            <div className="ska-team-permission">
              <UserCheck size={18} aria-hidden="true"/>
              <span><strong>Permissão: funcionário</strong>
                <small>Gerenciar veículos e fotos, sem administrar contas nem excluir veículos.</small></span>
            </div>
            <button type="submit" className="ska-button ska-button--red"
              disabled={pending || employees.length >= staffLimit}>
              <UserPlus size={17} aria-hidden="true"/>
              {pending ? "Criando acesso..." : "Criar acesso"}
            </button>
          </form>
        </section>

        <section className="ska-team-members" aria-labelledby="ska-members-title">
          <div className="ska-team-members-header">
            <div><h2 id="ska-members-title">Funcionários cadastrados</h2>
              <p>Ative, suspenda ou redefina as senhas quando necessário.</p></div>
            <span>{employees.length}/{staffLimit}</span>
          </div>
          {loading ? <div className="ska-team-empty">Carregando funcionários...</div> :
            employees.length===0 ? <div className="ska-team-empty">
              <UsersRound size={29} aria-hidden="true"/>
              <strong>Nenhum funcionário cadastrado</strong>
              <p>Cadastre o primeiro funcionário pelo formulário ao lado.</p>
            </div> : <div className="ska-team-member-list">
              {employees.map(member => <article className="ska-team-member" key={member.id}>
                <div className="ska-team-member-top">
                  <div className="ska-team-member-avatar"><UserRound size={21} aria-hidden="true"/></div>
                  <div className="ska-team-member-info">
                    <strong title={member.username}>{member.username}</strong>
                    <small>Funcionário · Último acesso: {dateLabel(member.last_login_at)}</small>
                  </div>
                  <span className={"ska-team-state"+(member.is_active?" is-active":" is-inactive")}>
                    {member.is_active ? "Ativo" : "Suspenso"}
                  </span>
                </div>
                <div className="ska-team-member-actions">
                  <button type="button" className="ska-team-secondary"
                    disabled={Boolean(busyId)} onClick={() => {
                      setResetId(resetId===member.id?null:member.id);
                      setResetPassword("");setShowResetPassword(false);setMessage(null);
                    }}>
                    <KeyRound size={15} aria-hidden="true"/> Alterar senha
                  </button>
                  <button type="button" className={member.is_active?"ska-team-danger":"ska-team-enable"}
                    disabled={Boolean(busyId)} onClick={() => void switchAccess(member)}>
                    {member.is_active ? <UserX size={15}/> : <UserCheck size={15}/>}
                    {member.is_active ? "Suspender" : "Reativar"}
                  </button>
                </div>
                {resetId===member.id && <form className="ska-team-reset" onSubmit={saveNewPassword}>
                  <label htmlFor={"ska-new-pass-"+member.id}>Nova senha do funcionário
                    <span className="ska-team-password">
                      <input id={"ska-new-pass-"+member.id} type={showResetPassword?"text":"password"}
                        autoComplete="new-password" required minLength={12} maxLength={72}
                        value={resetPassword} disabled={Boolean(busyId)}
                        onChange={event=>setResetPassword(event.target.value)}
                        placeholder="Nova senha (12 caracteres ou mais)"/>
                      <button type="button" disabled={Boolean(busyId)}
                        aria-label={showResetPassword?"Ocultar senha":"Mostrar senha"}
                        onClick={()=>setShowResetPassword(value=>!value)}>
                        {showResetPassword?<EyeOff size={17}/>:<Eye size={17}/>}
                      </button>
                    </span>
                  </label>
                  <div className="ska-team-reset-actions">
                    <button type="button" className="ska-team-secondary" onClick={()=>{
                      setResetId(null);setResetPassword("");setShowResetPassword(false);
                    }}>Cancelar</button>
                    <button type="submit" className="ska-button ska-button--red"
                      disabled={Boolean(busyId)}>Salvar nova senha</button>
                  </div>
                </form>}
              </article>)}
            </div>}
        </section>
      </div>
      <div className="ska-team-footer-note"><ShieldCheck size={18} aria-hidden="true"/>
        <p>Funcionários não podem convidar outras pessoas nem alterar seu acesso.
          Suspender um funcionário encerra imediatamente as sessões dele, preservando
          todos os veículos e fotografias já cadastrados.</p>
      </div>
    </>}
  </div>;
}
