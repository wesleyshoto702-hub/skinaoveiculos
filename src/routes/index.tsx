import { createFileRoute } from "@tanstack/react-router";
import { CarScroll3D } from "../components/CarScroll3D";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, CalendarDays,
  CarFront, Check, ChevronLeft, ChevronRight, Clock3, Fuel, Gauge,
  Instagram, MapPin, Menu, MessageCircle, Search, ShieldCheck,
  SlidersHorizontal, Sparkles, X,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

type Vehicle = {
  id: number;
  brand: string;
  model: string;
  version: string;
  year: string;
  km: number;
  transmission: string;
  fuel: string;
  price: number;
  type: string;
  color: string;
  badge?: string;
  photo: string;
  gallery: string[];
  features: string[];
};

const image = (id: string, width = 900) =>
  "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=" + width + "&q=82";

const vehicles: Vehicle[] = [
  {
    id: 1, brand: "Volkswagen", model: "Polo", version: "1.0 TSI Comfortline",
    year: "2023", km: 28600, transmission: "Automático", fuel: "Flex",
    price: 84900, type: "Hatch", color: "Prata", badge: "DESTAQUE",
    photo: image("photo-1549317661-bd32c8ce0db2"),
    gallery: [image("photo-1549317661-bd32c8ce0db2", 1400), image("photo-1494905998402-395d579af36f", 1400), image("photo-1507136566006-cfc505b114fc", 1400)],
    features: ["Ar-condicionado", "Direção elétrica", "Central multimídia", "Vidros elétricos", "Airbags", "Freios ABS"],
  },
  {
    id: 2, brand: "Chevrolet", model: "Onix", version: "LT 1.0 Turbo",
    year: "2022", km: 41200, transmission: "Manual", fuel: "Flex",
    price: 72900, type: "Hatch", color: "Branco", badge: "OPORTUNIDADE",
    photo: image("photo-1507136566006-cfc505b114fc"),
    gallery: [image("photo-1507136566006-cfc505b114fc", 1400), image("photo-1494905998402-395d579af36f", 1400)],
    features: ["Ar-condicionado", "Câmera de ré", "Bluetooth", "Airbags", "Computador de bordo"],
  },
  {
    id: 3, brand: "Jeep", model: "Compass", version: "Longitude 2.0",
    year: "2021", km: 56800, transmission: "Automático", fuel: "Flex",
    price: 119900, type: "SUV", color: "Preto", badge: "NOVIDADE",
    photo: image("photo-1519641471654-76ce0107ad1b"),
    gallery: [image("photo-1519641471654-76ce0107ad1b", 1400), image("photo-1533473359331-0135ef1b58bf", 1400)],
    features: ["Bancos em couro", "Piloto automático", "Câmera de ré", "Multimídia", "Controle de estabilidade"],
  },
  {
    id: 4, brand: "Fiat", model: "Strada", version: "Volcano 1.3",
    year: "2023", km: 33200, transmission: "Manual", fuel: "Flex",
    price: 107900, type: "Picape", color: "Vermelho",
    photo: image("photo-1533473359331-0135ef1b58bf"),
    gallery: [image("photo-1533473359331-0135ef1b58bf", 1400), image("photo-1494905998402-395d579af36f", 1400)],
    features: ["Cabine dupla", "Ar-condicionado", "Central multimídia", "Controle de tração", "Direção elétrica"],
  },
  {
    id: 5, brand: "Toyota", model: "Corolla", version: "XEi 2.0",
    year: "2020", km: 63500, transmission: "Automático", fuel: "Flex",
    price: 109900, type: "Sedã", color: "Cinza", badge: "DESTAQUE",
    photo: image("photo-1552519507-da3b142c6e3d"),
    gallery: [image("photo-1552519507-da3b142c6e3d", 1400), image("photo-1489824904134-891ab64532f1", 1400)],
    features: ["Câmbio CVT", "Ar digital", "Câmera de ré", "Controle de estabilidade", "Rodas de liga leve"],
  },
  {
    id: 6, brand: "Ford", model: "Ranger", version: "XLS 2.2 Diesel 4x4",
    year: "2022", km: 69400, transmission: "Automático", fuel: "Diesel",
    price: 159900, type: "Picape", color: "Prata",
    photo: image("photo-1494905998402-395d579af36f"),
    gallery: [image("photo-1494905998402-395d579af36f", 1400), image("photo-1519641471654-76ce0107ad1b", 1400)],
    features: ["Tração 4x4", "Cabine dupla", "Controle de tração", "Multimídia", "Piloto automático"],
  },
];

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
const kilometers = (value: number) => new Intl.NumberFormat("pt-BR").format(value) + " km";
const waNumber = (import.meta.env.VITE_SKINAO_WHATSAPP || "").replace(/\D/g, "");
const instagram = "https://www.instagram.com/skinaoveiculos/";

function whatsApp(message: string) {
  const prefix = waNumber ? "https://wa.me/" + waNumber + "?text=" : "https://api.whatsapp.com/send?text=";
  window.open(prefix + encodeURIComponent(message), "_blank", "noopener,noreferrer");
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a href="#inicio" className={"brand " + (compact ? "brand--compact" : "")} aria-label="Skinão Veículos — início">
      <span className="brand-drawing" aria-hidden="true"><CarFront size={26} strokeWidth={1.4}/><span/></span>
      <span className="brand-words"><strong>SKINÃO</strong><em>VEÍCULOS</em></span>
    </a>
  );
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="section-heading">
      <p className="eyebrow"><span className="eyebrow-line"/> {eyebrow}</p>
      <h2>{title}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}

function VehicleCard({ vehicle, onDetails }: { vehicle: Vehicle; onDetails: (vehicle: Vehicle) => void }) {
  const label = vehicle.brand + " " + vehicle.model;
  return (
    <article className="vehicle-card">
      <button type="button" className="vehicle-card-photo" onClick={() => onDetails(vehicle)} aria-label={"Ver detalhes de " + label}>
        <img src={vehicle.photo} alt={"Imagem ilustrativa: " + label} loading="lazy" decoding="async"/>
        {vehicle.badge && <span className="vehicle-tag">{vehicle.badge}</span>}
        <span className="photo-corner"><ArrowUpRight size={18}/></span>
      </button>
      <div className="vehicle-card-body">
        <div className="vehicle-title"><div><span className="vehicle-brand">{vehicle.brand}</span><h3>{vehicle.model}</h3></div><span className="vehicle-year">{vehicle.year}</span></div>
        <p className="vehicle-version">{vehicle.version}</p>
        <div className="vehicle-specs">
          <span><Gauge size={15}/>{kilometers(vehicle.km)}</span>
          <span><SlidersHorizontal size={15}/>{vehicle.transmission}</span>
          <span><Fuel size={15}/>{vehicle.fuel}</span>
        </div>
        <div className="vehicle-price"><div><small>VALOR ILUSTRATIVO</small><strong>{money(vehicle.price)}</strong></div>
          <button type="button" className="vehicle-card-arrow" onClick={() => onDetails(vehicle)} aria-label={"Ver " + label}><ArrowUpRight size={22}/></button>
        </div>
        <button type="button" className="vehicle-more" onClick={() => onDetails(vehicle)}>Ver detalhes do veículo <ArrowRight size={16}/></button>
      </div>
    </article>
  );
}

function VehicleModal({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", handleKey); };
  }, [onClose]);
  const currentIndex = (photoIndex + vehicle.gallery.length) % vehicle.gallery.length;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="vehicle-dialog" role="dialog" aria-modal="true" aria-labelledby="vehicle-modal-title">
        <div className="dialog-top"><span><span className="red-dot"/> CATÁLOGO DEMONSTRATIVO</span><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar detalhes"><X size={23}/></button></div>
        <div className="dialog-content">
          <div className="dialog-gallery">
            <div className="dialog-image"><img src={vehicle.gallery[currentIndex]} alt={"Foto ilustrativa " + (currentIndex+1) + " de " + vehicle.model}/>
              <button className="gallery-left" type="button" aria-label="Foto anterior" onClick={() => setPhotoIndex(currentIndex-1)}><ChevronLeft size={20}/></button>
              <button className="gallery-right" type="button" aria-label="Próxima foto" onClick={() => setPhotoIndex(currentIndex+1)}><ChevronRight size={20}/></button>
              <span className="gallery-count">{currentIndex+1} / {vehicle.gallery.length}</span>
            </div>
            <div className="gallery-thumbs">{vehicle.gallery.map((photo, index) => <button type="button" className={index===currentIndex?"active":""} onClick={() => setPhotoIndex(index)} key={index} aria-label={"Selecionar foto " + (index+1)}><img src={photo} loading="lazy" alt=""/></button>)}</div>
          </div>
          <div className="dialog-details">
            <p className="eyebrow"><span className="eyebrow-line"/> DETALHES DO VEÍCULO</p>
            <h2 id="vehicle-modal-title">{vehicle.brand} <strong>{vehicle.model}</strong></h2>
            <p className="dialog-version">{vehicle.version}</p>
            <div className="dialog-price"><small>PREÇO DEMONSTRATIVO</small><strong>{money(vehicle.price)}</strong></div>
            <div className="dialog-stats">
              <div><CalendarDays size={17}/><span>Ano<strong>{vehicle.year}</strong></span></div>
              <div><Gauge size={17}/><span>Quilometragem<strong>{kilometers(vehicle.km)}</strong></span></div>
              <div><SlidersHorizontal size={17}/><span>Câmbio<strong>{vehicle.transmission}</strong></span></div>
              <div><Fuel size={17}/><span>Combustível<strong>{vehicle.fuel}</strong></span></div>
            </div>
            <h3>Itens e diferenciais</h3>
            <div className="feature-list">{vehicle.features.map(feature => <span key={feature}><Check size={15}/>{feature}</span>)}</div>
            <p className="dialog-disclaimer">Este veículo é um exemplo de layout. Modelo, imagens, valores, características e disponibilidade não representam o estoque real da Skinão Veículos.</p>
            <button type="button" className="btn btn-red dialog-contact" onClick={() => whatsApp("Olá! Gostaria de saber quais veículos semelhantes a " + vehicle.brand + " " + vehicle.model + " estão disponíveis na Skinão Veículos.")}><MessageCircle size={19}/> Consultar modelos semelhantes <ArrowUpRight size={19}/></button>
            {!waNumber && <p className="contact-config-note">O número oficial do WhatsApp ainda precisa ser configurado para direcionar a mensagem à loja.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Home() {
  const heroRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [type, setType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [order, setOrder] = useState("featured");
  const [finance, setFinance] = useState({ name: "", phone: "", model: "", entry: "" });

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) { setProgress(0.94); return; }
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const hero = heroRef.current;
      if (!hero) return;
      const start = hero.getBoundingClientRect().top + window.scrollY;
      const range = Math.max(1, hero.offsetHeight - window.innerHeight);
      const next = Math.max(0, Math.min(1, (window.scrollY - start) / range));
      setProgress(old => Math.abs(old-next)>0.002 ? next : old);
    };
    const onScroll = () => { if (!scheduled) { scheduled = true; window.requestAnimationFrame(update); } };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  useEffect(() => { document.body.classList.toggle("menu-open", menuOpen); return () => document.body.classList.remove("menu-open"); }, [menuOpen]);
  const openDetails = (vehicle: Vehicle) => setSelected(vehicle);
  const closeDetails = () => setSelected(null);
  // Real 3D camera on a single model, synchronized with native vertical scroll.
  const phase = (start: number, end: number) => {
    const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
    return t * t * (3 - 2 * t);
  };
  const lightIgnition = phase(0.08, 0.26);
  const fullFlash = phase(0.78, 0.87) * (1 - phase(0.885, 0.945));
  const sceneDarkness = phase(0.88, 0.969);
  const titleFirst = phase(0.905, 0.956);
  const titleSecond = phase(0.924, 0.973);
  const descriptionIn = phase(0.947, 0.986);
  const buttonsIn = phase(0.964, 0.996);
  const heroStyle = {
    "--headlight-opacity": lightIgnition.toFixed(3),
    "--flood-opacity": fullFlash.toFixed(3),
    "--flood-center-opacity": Math.min(1, fullFlash * 1.3).toFixed(3),
    "--scene-darkness": sceneDarkness.toFixed(3),
    "--three-opacity": (1 - phase(0.86, 0.960)).toFixed(3),
    "--intro-opacity": (1 - phase(0.055, 0.22)).toFixed(3),
    "--reveal-opacity": titleFirst.toFixed(3),
    "--brand-first-opacity": titleFirst.toFixed(3),
    "--brand-first-y": ((1 - titleFirst) * 110).toFixed(1) + "%",
    "--brand-second-opacity": titleSecond.toFixed(3),
    "--brand-second-y": ((1 - titleSecond) * 110).toFixed(1) + "%",
    "--reveal-description-opacity": descriptionIn.toFixed(3),
    "--reveal-description-y": ((1 - descriptionIn) * 28).toFixed(1) + "px",
    "--reveal-buttons-opacity": buttonsIn.toFixed(3),
    "--reveal-buttons-y": ((1 - buttonsIn) * 32).toFixed(1) + "px",
    "--reveal-pointer": buttonsIn > 0.92 ? "auto" : "none",
  } as CSSProperties;

  const matches = vehicles.filter(vehicle => {
    const search = (vehicle.brand + " " + vehicle.model + " " + vehicle.version).toLocaleLowerCase("pt-BR");
    return (!query || search.includes(query.toLocaleLowerCase("pt-BR"))) &&
      (!brand || vehicle.brand === brand) && (!type || vehicle.type === type) &&
      (!transmission || vehicle.transmission === transmission) &&
      (!maxPrice || vehicle.price <= Number(maxPrice));
  }).sort((a,b) => order==="low" ? a.price-b.price : order==="high" ? b.price-a.price : order==="new" ? Number(b.year)-Number(a.year) : a.id-b.id);
  const resetFilters = () => { setQuery(""); setBrand(""); setType(""); setTransmission(""); setMaxPrice(""); setOrder("featured"); };

  const sendFinance = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    whatsApp("Olá, Skinão Veículos! Gostaria de conversar sobre financiamento.\nNome: " + finance.name.trim() + "\nTelefone: " + finance.phone.trim() + "\nVeículo de interesse: " + (finance.model || "Ainda não decidi") + "\nEntrada pretendida: " + (finance.entry || "A combinar"));
  };

  return (
    <div className="site-root" id="inicio">
      <header className="site-header">
        <div className="site-header-inner container"><Brand/>
          <nav className={"site-nav " + (menuOpen ? "site-nav--open" : "")} aria-label="Navegação principal">
            {[["#inicio","Início"],["#estoque","Estoque"],["#financiamento","Financiamento"],["#sobre","Sobre"],["#contato","Contato"]].map(([url,label]) =>
              <a href={url} key={url} onClick={() => setMenuOpen(false)}>{label}</a>)}
            <button type="button" className="nav-mobile-cta" onClick={() => { setMenuOpen(false); whatsApp("Olá, Skinão Veículos! Vim pelo site e gostaria de conversar."); }}><MessageCircle size={17}/> Falar no WhatsApp</button>
          </nav>
          <div className="header-actions"><button type="button" className="header-contact" onClick={() => whatsApp("Olá, Skinão Veículos! Vim pelo site e gostaria de conversar.")}>FALE COM A GENTE <ArrowUpRight size={16}/></button>
            <button type="button" className="menu-toggle" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen?<X size={24}/>:<Menu size={24}/>}</button></div>
        </div>
      </header>

      <main>
        <section ref={heroRef} className="hero-scroll" aria-label="Apresentação Skinão Veículos">
          <div className="hero-sticky" style={heroStyle}>
            <CarScroll3D progress={progress}/>
            <div className="hero-exit-curtain" aria-hidden="true"/>
            <div className="hero-light-flood" aria-hidden="true">
              <span className="hero-light-flood-glow"/>
              <span className="hero-light-flood-center"/>
            </div>
            <div className="hero-intro">
              <span className="hero-intro-label"><span className="red-dot"/> UMA NOVA EXPERIÊNCIA SOBRE QUATRO RODAS</span>
              <span className="hero-intro-text">PREPARE-SE PARA <em>ACELERAR.</em></span>
            </div>
            <div className="hero-reveal">
              <p className="hero-reveal-overline"><span/> A ESTRADA COMEÇA AQUI</p>
              <h1 aria-label="Skinão Veículos">
                <span className="hero-brand-line"><span className="hero-brand-line-inner hero-brand-first">SKINÃO</span></span>
                <span className="hero-brand-line hero-brand-line--accent"><span className="hero-brand-line-inner hero-brand-second">VEÍCULOS<span className="hero-period">.</span></span></span>
              </h1>
              <p className="hero-reveal-description">Seu próximo capítulo começa aqui. Encontre o carro que combina com você.</p>
              <div className="hero-cta-row">
                <a href="#estoque" className="btn btn-red">EXPLORAR ESTOQUE <ArrowUpRight size={18}/></a>
                <a href="#sobre" className="btn btn-outline">CONHEÇA A SKINÃO <ArrowRight size={17}/></a>
              </div>
            </div>
            <div className="hero-side-mark" aria-hidden="true">PERFORMANCE · ESTILO · MOVIMENTO</div>
            <div className="hero-bottom">
              <span>SKINÃO VEÍCULOS <span className="muted-separator">/</span> LAVRAS — MG</span>
              <span className="scroll-cue">ROLE PARA DESCOBRIR <ArrowDown size={15}/></span>
              <span className="hero-scroll-counter">0{Math.max(1, Math.ceil(progress*4))} <span>/</span> 04</span>
            </div>
            <a className="hero-model-credit" href="https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6" target="_blank" rel="noopener noreferrer">Modelo 3D ilustrativo: vicent091036 · CC BY 4.0</a>
            <div className="hero-progress" aria-hidden="true"><span style={{width:(progress*100)+"%"}}/></div>
          </div>
        </section>

        <div className="ticker" aria-hidden="true"><div className="ticker-track"><span>ESCOLHA SEU PRÓXIMO CAMINHO</span><Sparkles size={17}/><span>ESTILO QUE TE MOVE</span><Sparkles size={17}/><span>MUITO ALÉM DE QUATRO RODAS</span><Sparkles size={17}/><span>ESCOLHA SEU PRÓXIMO CAMINHO</span><Sparkles size={17}/><span>ESTILO QUE TE MOVE</span><Sparkles size={17}/></div></div>

        <section className="intro-section section-pad">
          <div className="container intro-grid">
            <div><p className="eyebrow"><span className="eyebrow-line"/> O PRÓXIMO PASSO É SEU</p>
              <h2>O CARRO CERTO.<br/><span>A HISTÓRIA CERTA.</span></h2></div>
            <div className="intro-right"><p>Encontrar o próximo carro deveria ser tão incrível quanto dirigir. Uma experiência feita para você explorar, comparar e escolher com confiança.</p>
              <a className="text-link" href="#estoque">DESCUBRA NOSSO CATÁLOGO <ArrowUpRight size={18}/></a></div>
          </div>
        </section>

        <section className="stock-section section-pad" id="estoque">
          <div className="container">
            <div className="stock-heading-row"><SectionTitle eyebrow="EXPLORE AS POSSIBILIDADES" title="NOSSO ESTOQUE." description="Encontre o modelo que tem a sua cara. Explore marcas, estilos e diferentes faixas de valor."/>
              <div className="stock-heading-side"><CarFront size={22}/><span>CATÁLOGO INDEPENDENTE</span></div>
            </div>
            <div className="demo-notice"><BadgeCheck size={18}/><p><strong>Prévia de desenvolvimento:</strong> os veículos, fotos, preços e especificações abaixo são exemplos ilustrativos. O estoque oficial será conectado na próxima etapa.</p></div>
            <div className="stock-filters" role="search" aria-label="Buscar veículos">
              <label className="search-field"><Search size={19}/><input aria-label="Buscar por modelo ou marca" placeholder="Qual carro você procura?" value={query} onChange={event=>setQuery(event.target.value)}/></label>
              <label className="select-field"><span className="sr-only">Marca</span><select aria-label="Filtrar por marca" value={brand} onChange={event=>setBrand(event.target.value)}><option value="">Todas as marcas</option>{Array.from(new Set(vehicles.map(v=>v.brand))).sort().map(b=><option key={b} value={b}>{b}</option>)}</select></label>
              <label className="select-field"><span className="sr-only">Categoria</span><select aria-label="Filtrar por categoria" value={type} onChange={event=>setType(event.target.value)}><option value="">Todos os tipos</option>{Array.from(new Set(vehicles.map(v=>v.type))).sort().map(t=><option key={t} value={t}>{t}</option>)}</select></label>
              <label className="select-field"><span className="sr-only">Câmbio</span><select aria-label="Filtrar por câmbio" value={transmission} onChange={event=>setTransmission(event.target.value)}><option value="">Qualquer câmbio</option><option>Automático</option><option>Manual</option></select></label>
              <label className="select-field"><span className="sr-only">Preço máximo</span><select aria-label="Filtrar por preço máximo" value={maxPrice} onChange={event=>setMaxPrice(event.target.value)}><option value="">Qualquer preço</option><option value="80000">Até R$ 80 mil</option><option value="100000">Até R$ 100 mil</option><option value="120000">Até R$ 120 mil</option><option value="160000">Até R$ 160 mil</option></select></label>
            </div>
            <div className="results-bar"><span><strong>{matches.length.toString().padStart(2,"0")}</strong> VEÍCULOS NA DEMONSTRAÇÃO</span>
              <div className="results-actions"><button type="button" onClick={resetFilters} className="clear-filters">LIMPAR FILTROS <X size={14}/></button>
                <select aria-label="Ordenar veículos" value={order} onChange={event=>setOrder(event.target.value)}><option value="featured">Ordenar: destaques</option><option value="low">Menor preço</option><option value="high">Maior preço</option><option value="new">Mais recentes</option></select></div>
            </div>
            {matches.length>0 ? <div className="stock-grid">{matches.map(vehicle=><VehicleCard key={vehicle.id} vehicle={vehicle} onDetails={openDetails}/>)}</div> :
              <div className="empty-results"><Search size={30}/><h3>Nenhum veículo encontrado</h3><p>Tente ajustar os filtros para encontrar outras opções.</p><button type="button" className="btn btn-outline" onClick={resetFilters}>LIMPAR FILTROS <ArrowRight size={16}/></button></div>}
            <div className="stock-bottom"><p>Não encontrou o que procura? Converse com a nossa equipe.</p><button className="text-link" type="button" onClick={()=>whatsApp("Olá, Skinão Veículos! Procuro um veículo e gostaria de conhecer as opções disponíveis.")}>CONSULTAR DISPONIBILIDADE <ArrowUpRight size={18}/></button></div>
          </div>
        </section>

        <section className="statement-section" aria-label="Um novo jeito de escolher seu carro">
          <div className="statement-photo" aria-hidden="true"/>
          <div className="statement-overlay"/>
          <div className="container statement-content"><p className="eyebrow"><span className="eyebrow-line"/> SUA PRÓXIMA CONQUISTA COMEÇA AQUI</p><h2>MAIS QUE UM CARRO.<br/><span>UMA NOVA FASE.</span></h2><p>O caminho fica ainda melhor quando a escolha faz sentido para você.</p><a href="#financiamento" className="btn btn-white">CONHEÇA SUAS POSSIBILIDADES <ArrowUpRight size={18}/></a></div>
          <span className="statement-index" aria-hidden="true">01 / 03</span>
        </section>

        <section className="benefits-section section-pad">
          <div className="container"><div className="benefits-title"><SectionTitle eyebrow="PRAZER EM FAZER PARTE DA SUA JORNADA" title="ESCOLHA COM CONFIANÇA." description="Pensamos em uma experiência mais simples, organizada e transparente do primeiro clique à conversa com a loja."/></div>
            <div className="benefits-grid">
              {[{icon:ShieldCheck,n:"01",title:"INFORMAÇÃO CLARA",description:"Visualize os principais detalhes de cada veículo em um só lugar."},{icon:CarFront,n:"02",title:"VARIEDADE MULTIMARCAS",description:"Explore diferentes estilos, modelos e faixas de preço no mesmo catálogo."},{icon:MessageCircle,n:"03",title:"CONTATO DIRETO",description:"Tire dúvidas sobre o carro que chamou a sua atenção sem complicações."}].map(item=><div className="benefit-card" key={item.n}><div className="benefit-top"><item.icon size={33} strokeWidth={1.35}/><span>{item.n}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="benefit-line"/></div>)}
            </div>
          </div>
        </section>

        <section className="finance-section section-pad" id="financiamento">
          <div className="container finance-grid">
            <div className="finance-copy"><p className="eyebrow"><span className="eyebrow-line"/> PLANEJE SUA PRÓXIMA CONQUISTA</p><h2>SEU PRÓXIMO<br/>CARRO PODE ESTAR<br/><span>MAIS PERTO.</span></h2>
              <p>Quer avaliar possibilidades de financiamento? Conte um pouco sobre o que procura e comece uma conversa com a equipe.</p>
              <div className="finance-steps"><div><span>01</span> ESCOLHA O VEÍCULO</div><div><span>02</span> CONTE SUA IDEIA</div><div><span>03</span> FALE COM A EQUIPE</div></div>
              <small>A aprovação e as condições dependem de análise da instituição financeira. Não realizamos aprovação automática pelo site.</small>
            </div>
            <form className="finance-form" onSubmit={sendFinance}><span className="form-kicker"><span className="red-dot"/> COMECE POR AQUI</span><h3>VAMOS CONVERSAR?</h3><p>Preencha os dados e prepare uma mensagem para o atendimento.</p>
              <label>SEU NOME <input required maxLength={100} value={finance.name} placeholder="Como podemos te chamar?" onChange={e=>setFinance({...finance,name:e.target.value})}/></label>
              <label>WHATSAPP COM DDD <input required type="tel" inputMode="tel" minLength={10} maxLength={20} value={finance.phone} placeholder="(35) 99999-9999" onChange={e=>setFinance({...finance,phone:e.target.value})}/></label>
              <label>VEÍCULO DE INTERESSE <select value={finance.model} onChange={e=>setFinance({...finance,model:e.target.value})}><option value="">Ainda estou escolhendo</option>{vehicles.map(v=><option key={v.id} value={v.brand+" "+v.model}>{v.brand} {v.model} (exemplo)</option>)}</select></label>
              <label>ENTRADA PRETENDIDA <input maxLength={40} value={finance.entry} placeholder="Ex.: R$ 20.000 ou a combinar" onChange={e=>setFinance({...finance,entry:e.target.value})}/></label>
              <button type="submit" className="btn btn-red">PREPARAR CONSULTA <ArrowUpRight size={18}/></button>
              <span className="form-foot"><ShieldCheck size={15}/> Seus dados não são armazenados nesta versão.</span>
              {!waNumber && <span className="form-foot">O envio direto para a loja será ativado após configurar o WhatsApp oficial.</span>}
            </form>
          </div>
        </section>

        <section className="about-section section-pad" id="sobre">
          <div className="container about-grid"><div className="about-image"><img src={image("photo-1503376780353-7e6692767b70",1200)} loading="lazy" alt="Fotografia ilustrativa de um automóvel esportivo"/><span className="about-image-caption">UMA NOVA PERSPECTIVA SOBRE SUA PRÓXIMA ESCOLHA.</span></div>
            <div className="about-copy"><SectionTitle eyebrow="CONHEÇA A SKINÃO" title="A PAIXÃO POR CARROS NOS MOVE."/><p>A Skinão Veículos é uma loja multimarcas de Lavras, Minas Gerais. Nosso novo espaço digital foi pensado para aproximar você do veículo que procura, com uma apresentação organizada e fácil de explorar.</p><p>Mais do que uma vitrine, um ponto de partida para boas conversas e novos caminhos.</p><a href="#contato" className="text-link">VAMOS CONVERSAR <ArrowUpRight size={19}/></a></div>
          </div>
        </section>

        <section className="contact-section section-pad" id="contato">
          <div className="container contact-content"><p className="eyebrow"><span className="eyebrow-line"/> SUA PRÓXIMA CONQUISTA COMEÇA COM UMA CONVERSA</p><h2>VAMOS ENCONTRAR<br/><span>SEU PRÓXIMO CARRO?</span></h2>
            <p>Fale com a equipe, tire suas dúvidas e descubra o próximo passo da sua jornada.</p>
            <div className="contact-buttons"><button type="button" onClick={()=>whatsApp("Olá, Skinão Veículos! Conheci o novo site e gostaria de falar sobre os veículos disponíveis.")} className="btn btn-red"><MessageCircle size={20}/> CONVERSAR NO WHATSAPP <ArrowUpRight size={18}/></button><a href={instagram} className="btn btn-outline" target="_blank" rel="noopener noreferrer"><Instagram size={19}/> ACOMPANHE NO INSTAGRAM <ArrowUpRight size={18}/></a></div>
            {!waNumber && <p className="contact-config-note">Prévia: o número oficial do WhatsApp precisa ser configurado para direcionar o contato à loja.</p>}
          </div>
          <div className="contact-bottom container"><span><MapPin size={16}/> LAVRAS, MINAS GERAIS</span><span><Clock3 size={16}/> ATENDIMENTO: CONSULTE OS HORÁRIOS COM A LOJA</span></div>
        </section>
      </main>

      <footer className="site-footer"><div className="container footer-top"><Brand compact/><div><p>UMA NOVA FORMA DE<br/>ENCONTRAR SEU CAMINHO.</p></div><a href="#inicio" className="back-top" aria-label="Voltar ao início"><ArrowUpRight size={22}/></a></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} SKINÃO VEÍCULOS. TODOS OS DIREITOS RESERVADOS.</span><span>SITE CONCEITUAL EM DESENVOLVIMENTO · LAVRAS / MG</span><a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram Skinão Veículos"><Instagram size={18}/></a></div></footer>
      {selected && <VehicleModal key={selected.id} vehicle={selected} onClose={closeDetails}/>}
    </div>
  );
}
