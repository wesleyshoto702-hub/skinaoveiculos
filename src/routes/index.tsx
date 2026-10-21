import { createFileRoute } from "@tanstack/react-router";
import { CarScroll3D } from "../components/CarScroll3D";
import { LoadingScreen } from "../components/LoadingScreen";
import { HeroBackdropCars } from "../components/HeroBackdropCars";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Instagram, Menu, MessageCircle, Search, X } from "lucide-react";
import logoAsset from "../assets/skinao-logo.png.asset.json";

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
const waNumber = (import.meta.env["VITE_SKINAO_WHATSAPP"] || "").replace(/\D/g, "");
const instagram = "https://www.instagram.com/skinaoveiculos/";

function whatsApp(message: string) {
  const prefix = waNumber ? "https://wa.me/" + waNumber + "?text=" : "https://api.whatsapp.com/send?text=";
  window.open(prefix + encodeURIComponent(message), "_blank", "noopener,noreferrer");
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a href="#inicio" className={"brand " + (compact ? "brand--compact" : "")} aria-label="Skinão Veículos — início">
      <img className="brand-logo" src={logoAsset.url} alt="SKINÃO VEÍCULOS" width={167} height={46} />
    </a>
  );
}

function SectionTitle({ eyebrow, title, accent, description }: { eyebrow: string; title: string; accent?: string; description?: string }) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}{accent ? <> <span className="heading-accent">{accent}</span></> : null}</h2>
      {description && <p className="section-description">{description}</p>}
    </div>
  );
}


// Reveal each title and its description as one piece, only when it reaches
// the viewport. This never updates React state on scroll.
function BenefitsList() {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver === "undefined" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rows = Array.from(list.querySelectorAll<HTMLElement>(".benefit-row"));
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("benefit-row--visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    list.classList.add("benefits-list--animate");
    rows.forEach(row => observer.observe(row));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={listRef} className="benefits-list">
      {[
        {title:"ENCONTRE UM MODELO",description:"Use os filtros por marca, categoria, câmbio e preço no catálogo demonstrativo."},
        {title:"VEJA OS DETALHES",description:"Abra cada modelo para consultar dados e imagens de exemplo em uma única tela."},
        {title:"FALE COM A SKINÃO",description:"Confirme diretamente com a equipe quais veículos e condições estão disponíveis em Lavras."},
      ].map(item => <div className="benefit-row" key={item.title}>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>)}
    </div>
  );
}

function VehicleCard({ vehicle, onDetails }: { vehicle: Vehicle; onDetails: (vehicle: Vehicle) => void }) {
  const label = vehicle.brand + " " + vehicle.model;
  return (
    <article className="vehicle-card">
      <button type="button" className="vehicle-card-photo" onClick={() => onDetails(vehicle)} aria-label={"Ver detalhes de " + label}>
        <img src={vehicle.photo} alt={"Imagem ilustrativa: " + label} loading="lazy" decoding="async"/>
      </button>
      <div className="vehicle-card-body">
        <div className="vehicle-title"><div><span className="vehicle-brand">{vehicle.brand}</span><h3>{vehicle.model}</h3></div><span className="vehicle-year">{vehicle.year}</span></div>
        <p className="vehicle-version">{vehicle.version}</p>
        <div className="vehicle-specs">
          <span>{kilometers(vehicle.km)}</span>
          <span>{vehicle.transmission}</span>
          <span>{vehicle.fuel}</span>
        </div>
        <div className="vehicle-price"><div><small>PREÇO ILUSTRATIVO</small><strong>{money(vehicle.price)}</strong></div>
        </div>
        <button type="button" className="vehicle-more" onClick={() => onDetails(vehicle)}>VER DETALHES DO MODELO</button>
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
        <div className="dialog-top"><span>CATÁLOGO DEMONSTRATIVO</span><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar detalhes"><X size={23}/></button></div>
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
            <p className="eyebrow">DETALHES DO VEÍCULO</p>
            <h2 id="vehicle-modal-title">{vehicle.brand} <strong>{vehicle.model}</strong></h2>
            <p className="dialog-version">{vehicle.version}</p>
            <div className="dialog-price"><small>PREÇO DEMONSTRATIVO</small><strong>{money(vehicle.price)}</strong></div>
            <div className="dialog-stats">
              <div><span>Ano<strong>{vehicle.year}</strong></span></div>
              <div><span>Quilometragem<strong>{kilometers(vehicle.km)}</strong></span></div>
              <div><span>Câmbio<strong>{vehicle.transmission}</strong></span></div>
              <div><span>Combustível<strong>{vehicle.fuel}</strong></span></div>
            </div>
            <h3>Itens e diferenciais</h3>
            <div className="feature-list">{vehicle.features.map(feature => <span key={feature}>{feature}</span>)}</div>
            <p className="dialog-disclaimer">Este veículo é um exemplo de layout. Modelo, imagens, valores, características e disponibilidade não representam o estoque real da Skinão Veículos.</p>
            <button type="button" className="btn btn-red dialog-contact" onClick={() => whatsApp("Olá! Gostaria de saber quais veículos semelhantes a " + vehicle.brand + " " + vehicle.model + " estão disponíveis na Skinão Veículos.")}><MessageCircle size={19}/> CONSULTAR MODELOS SEMELHANTES</button>
            {!waNumber && <p className="contact-config-note">O número oficial do WhatsApp ainda precisa ser configurado para direcionar a mensagem à loja.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Keep scroll-driven updates inside the Hero: previously each scroll frame
 * re-rendered the entire Home (catalog, finance, navigation and all cards).
 */
function HeroScroll({ onSceneReady }: { onSceneReady: () => void }) {
  const heroRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [heroInView, setHeroInView] = useState(true);
  const [showBackgroundCars, setShowBackgroundCars] = useState(false);

  // Run the light 2D finale only while the cinematic section is onscreen.
  // Avoid continuing SVG/CSS animations after the visitor reaches the catalog.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => {
      setHeroInView(entries[0]?.isIntersecting ?? false);
    });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  // Wait a real second after the final Hero introduction is legible.
  // Boolean dependency avoids restarting the timer on every scroll frame.
  // Rewinding or leaving the Hero pauses and resets the reveal.
  const finalIntroActive = progress >= 0.985 && heroInView;
  useEffect(() => {
    if (!finalIntroActive) {
      setShowBackgroundCars(false);
      return;
    }
    const timeout = window.setTimeout(() => setShowBackgroundCars(true), 1000);
    return () => window.clearTimeout(timeout);
  }, [finalIntroActive]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) { setProgress(0.94); return; }

    let sectionTop = 0;
    let scrollRange = 1;
    let scheduled = 0;

    // A layout measurement is needed only at mount/resize, not on every scroll.
    const measure = () => {
      const hero = heroRef.current;
      if (!hero) return;
      sectionTop = hero.getBoundingClientRect().top + window.scrollY;
      scrollRange = Math.max(1, hero.offsetHeight - window.innerHeight);
    };
    const update = () => {
      const next = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / scrollRange));
      setProgress(old => Math.abs(old - next) > 0.001 ? next : old);
    };
    const onScroll = () => {
      if (scheduled) return;
      scheduled = window.requestAnimationFrame(() => {
        scheduled = 0;
        update();
      });
    };
    const onResize = () => { measure(); onScroll(); };

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (scheduled) window.cancelAnimationFrame(scheduled);
    };
  }, []);

  // Real 3D camera on a single model, synchronized with native vertical scroll.
  const phase = (start: number, end: number) => {
    const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
    return t * t * (3 - 2 * t);
  };
  // The camera reaches a full, centered frontal hold before BOTH headlights flash.
  const lightIgnition = phase(0.785, 0.855);
  const fullFlash = phase(0.865, 0.925) * (1 - phase(0.935, 0.978));
  const sceneDarkness = phase(0.938, 0.982);
  const titleFirst = phase(0.945, 0.973);
  const titleSecond = phase(0.958, 0.985);
  const descriptionIn = phase(0.970, 0.992);
  const buttonsIn = phase(0.977, 0.999);
  // Two distinct scroll-driven messages. The second never overlaps the first
  // and both finish well before the headlight/brand reveal (starts at 0.785).
  const introFirstOpacity = 1 - phase(0.145, 0.245);
  const introSecondOpacity = phase(0.295, 0.39) * (1 - phase(0.565, 0.68));
  const heroStyle = {
    "--headlight-opacity": lightIgnition.toFixed(3),
    "--flood-opacity": fullFlash.toFixed(3),
    "--flood-center-opacity": Math.min(1, fullFlash * 1.3).toFixed(3),
    "--scene-darkness": sceneDarkness.toFixed(3),
    "--three-opacity": (1 - phase(0.86, 0.960)).toFixed(3),
    "--intro-first-opacity": introFirstOpacity.toFixed(3),
    "--intro-first-y": (-phase(0.145, 0.245) * 18).toFixed(1) + "px",
    "--intro-second-opacity": introSecondOpacity.toFixed(3),
    "--intro-second-y": ((1 - phase(0.295, 0.39)) * 20 - phase(0.565, 0.68) * 16).toFixed(1) + "px",
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


  return (
        <section ref={heroRef} className="hero-scroll" aria-label="Apresentação Skinão Veículos">
          <div className="hero-sticky" style={heroStyle}>
            <CarScroll3D progress={progress} onSceneReady={onSceneReady}/>
            <div className="hero-exit-curtain" aria-hidden="true"/>
            <div className="hero-light-flood" aria-hidden="true">
              <span className="hero-light-flood-glow"/>
              <span className="hero-light-flood-center"/>
            </div>
            <div className="hero-intro">
              <span className="hero-intro-text hero-intro-text--first">SEU PRÓXIMO CARRO</span>
              <span className="hero-intro-text hero-intro-text--second">COMEÇA AQUI.</span>
            </div>
            <div className={"hero-reveal" + (finalIntroActive ? " hero-reveal--complete" : "")}>
              <HeroBackdropCars visible={showBackgroundCars}/>
              <div className="hero-finale-content">
                <h1 aria-label="Skinão Veículos">
                  <span className="hero-brand-line"><span className="hero-brand-line-inner hero-brand-first">SKINÃO</span></span>
                  <span className="hero-brand-line hero-brand-line--accent"><span className="hero-brand-line-inner hero-brand-second">VEÍCULOS</span></span>
                </h1>
                <p className="hero-reveal-description">Veja os modelos desta prévia e fale com a loja para consultar disponibilidade.</p>
                <div className="hero-cta-row">
                  <a href="#estoque" className="btn btn-red">VER CATÁLOGO</a>
                </div>
              </div>
            </div>
            <div className="hero-bottom">
              <span className="scroll-cue">ROLE PARA CONTINUAR</span>
            </div>
            <div className="hero-progress" aria-hidden="true"><span style={{width:(progress*100)+"%"}}/></div>
          </div>
        </section>
  );
}

function Home() {
  const [showLoading, setShowLoading] = useState(true);
  const [heroReady, setHeroReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [type, setType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [order, setOrder] = useState("featured");
  const [finance, setFinance] = useState({ name: "", phone: "", model: "", entry: "" });

  // Lock page scrolling only while the cinematic introduction covers the page.
  // The 3D scene can initialize underneath it and is already visible on exit.
  useEffect(() => {
    if (!showLoading) return;
    const oldHtmlOverflow = document.documentElement.style.overflow;
    const oldBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = oldHtmlOverflow;
      document.body.style.overflow = oldBodyOverflow;
    };
  }, [showLoading]);

  // Keep the navigation completely out of sight while the scroll-driven Hero
  // is playing. Reveal only when the user scrolls beyond its sticky endpoint.
  // Recalculate geometry on resize, never on individual scroll events.
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".hero-scroll");
    if (!hero) return;

    let revealScrollY = Number.POSITIVE_INFINITY;
    let wasVisible = false;
    const update = () => {
      const shouldShow = window.scrollY > revealScrollY;
      if (shouldShow !== wasVisible) {
        wasVisible = shouldShow;
        setHeaderVisible(shouldShow);
      }
    };
    const measure = () => {
      const heroTop = hero.getBoundingClientRect().top + window.scrollY;
      const heroScrollEnd = heroTop + hero.offsetHeight - window.innerHeight;
      // At progress 1 the 3D motion is complete; allow a little extra
      // scrolling before sliding the bar in over the finishing Hero.
      const extraScroll = Math.min(80, Math.max(48, window.innerHeight * 0.08));
      revealScrollY = heroScrollEnd + extraScroll;
      update();
    };
    measure();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (!headerVisible) setMenuOpen(false);
  }, [headerVisible]);

  useEffect(() => { document.body.classList.toggle("menu-open", menuOpen); return () => document.body.classList.remove("menu-open"); }, [menuOpen]);
  const openDetails = (vehicle: Vehicle) => setSelected(vehicle);
  const closeDetails = () => setSelected(null);
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
    <>
      {showLoading && (
        <LoadingScreen sceneReady={heroReady} onFinished={() => setShowLoading(false)} />
      )}
      <div className="site-root" id="inicio" inert={showLoading}>
      <header className={"site-header" + (headerVisible && !showLoading ? " site-header--visible" : "")} inert={!headerVisible || showLoading} aria-hidden={!headerVisible || showLoading}>
        <div className="site-header-inner container"><Brand/>
          <nav className={"site-nav " + (menuOpen ? "site-nav--open" : "")} aria-label="Navegação principal">
            {[["#inicio","Início"],["#estoque","Estoque"],["#financiamento","Financiamento"],["#sobre","Sobre"],["#contato","Contato"]].map(([url,label]) =>
              <a href={url} key={url} onClick={() => setMenuOpen(false)}>{label}</a>)}
          </nav>
          <div className="header-actions"><button type="button" className="header-contact" onClick={() => whatsApp("Olá, Skinão Veículos! Vim pelo site e gostaria de conversar.")}>FALAR NO WHATSAPP</button>
            <button type="button" className="menu-toggle" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen?<X size={24}/>:<Menu size={24}/>}</button></div>
        </div>
      </header>

      <main>
        <HeroScroll onSceneReady={() => setHeroReady(true)}/>

        <section className="intro-section section-pad">
          <div className="container intro-grid">
            <div><h2>ESCOLHA UM MODELO.<br/>FALE COM A <span className="heading-accent">LOJA.</span></h2></div>
            <div className="intro-right"><p>Veja a apresentação dos veículos, filtre o que interessa e converse com a Skinão sobre a disponibilidade real.</p>
              <a className="text-link" href="#estoque">VER MODELOS</a></div>
          </div>
        </section>

        <section className="stock-section section-pad" id="estoque">
          <div className="container">
            <div className="stock-heading-row"><SectionTitle eyebrow="CATÁLOGO DEMONSTRATIVO" title="CONHEÇA OS" accent="MODELOS." description="Explore os exemplos, compare informações e escolha o que deseja consultar com a loja."/>
            </div>
            <div className="demo-notice"><p><strong>Catálogo de demonstração.</strong> As fotos, modelos, especificações e os preços abaixo são ilustrativos; não representam veículos disponíveis. Confirme o estoque atual diretamente com a Skinão.</p></div>
            <div className="stock-filters" role="search" aria-label="Buscar veículos">
              <label className="search-field"><Search size={19}/><input aria-label="Buscar por modelo ou marca" placeholder="Qual carro você procura?" value={query} onChange={event=>setQuery(event.target.value)}/></label>
              <label className="select-field"><span className="sr-only">Marca</span><select aria-label="Filtrar por marca" value={brand} onChange={event=>setBrand(event.target.value)}><option value="">Todas as marcas</option>{Array.from(new Set(vehicles.map(v=>v.brand))).sort().map(b=><option key={b} value={b}>{b}</option>)}</select></label>
              <label className="select-field"><span className="sr-only">Categoria</span><select aria-label="Filtrar por categoria" value={type} onChange={event=>setType(event.target.value)}><option value="">Todos os tipos</option>{Array.from(new Set(vehicles.map(v=>v.type))).sort().map(t=><option key={t} value={t}>{t}</option>)}</select></label>
              <label className="select-field"><span className="sr-only">Câmbio</span><select aria-label="Filtrar por câmbio" value={transmission} onChange={event=>setTransmission(event.target.value)}><option value="">Qualquer câmbio</option><option>Automático</option><option>Manual</option></select></label>
              <label className="select-field"><span className="sr-only">Preço máximo</span><select aria-label="Filtrar por preço máximo" value={maxPrice} onChange={event=>setMaxPrice(event.target.value)}><option value="">Qualquer preço</option><option value="80000">Até R$ 80 mil</option><option value="100000">Até R$ 100 mil</option><option value="120000">Até R$ 120 mil</option><option value="160000">Até R$ 160 mil</option></select></label>
            </div>
            <div className="results-bar"><span><strong>{matches.length.toString().padStart(2,"0")}</strong> MODELOS DE EXEMPLO</span>
              <div className="results-actions"><button type="button" onClick={resetFilters} className="clear-filters">LIMPAR FILTROS</button>
                <select aria-label="Ordenar veículos" value={order} onChange={event=>setOrder(event.target.value)}><option value="featured">Ordenar: destaques</option><option value="low">Menor preço</option><option value="high">Maior preço</option><option value="new">Mais recentes</option></select></div>
            </div>
            {matches.length>0 ? <div className="stock-grid">{matches.map(vehicle=><VehicleCard key={vehicle.id} vehicle={vehicle} onDetails={openDetails}/>)}</div> :
              <div className="empty-results"><Search size={30}/><h3>Nenhum veículo encontrado</h3><p>Tente ajustar os filtros para encontrar outras opções.</p><button type="button" className="btn btn-outline" onClick={resetFilters}>LIMPAR FILTROS</button></div>}
            <div className="stock-bottom"><p>Quer saber quais veículos estão disponíveis hoje?</p><button className="text-link" type="button" onClick={()=>whatsApp("Olá, Skinão Veículos! Procuro um veículo e gostaria de conhecer as opções disponíveis.")}>CONSULTAR DISPONIBILIDADE NO WHATSAPP</button></div>
          </div>
        </section>

        <section className="benefits-section section-pad" aria-label="Como consultar os veículos">
          <div className="container benefits-layout">
            <div className="benefits-title">
              <SectionTitle eyebrow="COMO FUNCIONA" title="DO CATÁLOGO À" accent="CONVERSA." description="Veja o que você pode fazer nesta página."/>
            </div>
            <BenefitsList/>
          </div>
        </section>

        <section className="finance-section section-pad" id="financiamento">
          <div className="container finance-grid">
            <div className="finance-copy"><p className="eyebrow">FINANCIAMENTO</p><h2>QUER FINANCIAR?<br/>VAMOS <span className="heading-accent">CONVERSAR.</span></h2>
              <p>Informe o carro de interesse e o valor de entrada. A Skinão poderá orientar sobre as opções e os próximos passos.</p>
              <div className="finance-steps"><div>ESCOLHA O VEÍCULO</div><div>CONTE SUA IDEIA</div><div>FALE COM A EQUIPE</div></div>
              <small>A aprovação e as condições dependem de análise da instituição financeira. Não realizamos aprovação automática pelo site.</small>
            </div>
            <form className="finance-form" onSubmit={sendFinance}><span className="form-kicker">CONSULTA PELO WHATSAPP</span><h3>CONTE O QUE PROCURA.</h3><p>Ao continuar, você poderá revisar a mensagem no WhatsApp antes de enviar.</p>
              <label>SEU NOME <input required maxLength={100} value={finance.name} placeholder="Como podemos te chamar?" onChange={e=>setFinance({...finance,name:e.target.value})}/></label>
              <label>WHATSAPP COM DDD <input required type="tel" inputMode="tel" minLength={10} maxLength={20} value={finance.phone} placeholder="(35) 99999-9999" onChange={e=>setFinance({...finance,phone:e.target.value})}/></label>
              <label>VEÍCULO DE INTERESSE <select value={finance.model} onChange={e=>setFinance({...finance,model:e.target.value})}><option value="">Ainda estou escolhendo</option>{vehicles.map(v=><option key={v.id} value={v.brand+" "+v.model}>{v.brand} {v.model} (exemplo)</option>)}</select></label>
              <label>ENTRADA PRETENDIDA <input maxLength={40} value={finance.entry} placeholder="Ex.: R$ 20.000 ou a combinar" onChange={e=>setFinance({...finance,entry:e.target.value})}/></label>
              <button type="submit" className="btn btn-red">REVISAR MENSAGEM NO WHATSAPP</button>
              <span className="form-foot">Seus dados não são armazenados nesta versão.</span>
              {!waNumber && <span className="form-foot">O envio direto para a loja será ativado após configurar o WhatsApp oficial.</span>}
            </form>
          </div>
        </section>

        <section className="about-section section-pad" id="sobre">
          <div className="container about-grid"><div className="about-image"><img src={image("photo-1503376780353-7e6692767b70",1200)} loading="lazy" alt="Fotografia ilustrativa de um automóvel esportivo"/></div>
            <div className="about-copy"><SectionTitle eyebrow="A LOJA" title="SKINÃO VEÍCULOS"/><p>A Skinão Veículos é uma loja multimarcas em Lavras, Minas Gerais.</p><p>Este site é uma prévia do espaço digital da loja. Os veículos apresentados são ilustrativos; entre em contato para consultar modelos e disponibilidade.</p></div>
          </div>
        </section>

        <section className="contact-section section-pad" id="contato">
          <div className="container contact-content"><p className="eyebrow">CONTATO</p><h2>JÁ TEM UM<br/>CARRO EM <span className="heading-accent">MENTE?</span></h2>
            <p>Pergunte sobre disponibilidade, preços e possibilidades de financiamento. A conversa começa com a equipe da Skinão.</p>
            <div className="contact-buttons"><button type="button" onClick={()=>whatsApp("Olá, Skinão Veículos! Conheci o novo site e gostaria de falar sobre os veículos disponíveis.")} className="btn btn-red">FALAR NO WHATSAPP</button><a href={instagram} className="btn btn-outline instagram-btn" target="_blank" rel="noopener noreferrer"><Instagram size={19} strokeWidth={2} aria-hidden="true"/> VER INSTAGRAM</a></div>
            {!waNumber && <p className="contact-config-note">Prévia: o número oficial do WhatsApp precisa ser configurado para direcionar o contato à loja.</p>}
          </div>
          <div className="contact-bottom container"><span>LAVRAS, MINAS GERAIS</span><span>CONFIRME O HORÁRIO DE ATENDIMENTO COM A LOJA</span></div>
        </section>
      </main>

      <footer className="site-footer"><div className="container footer-top"><Brand compact/><div><p>VEÍCULOS MULTIMARCAS<br/>LAVRAS · MINAS GERAIS</p></div><a href="#inicio" className="back-top" aria-label="Voltar ao início">VOLTAR AO INÍCIO</a></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} SKINÃO VEÍCULOS. TODOS OS DIREITOS RESERVADOS.</span><span>CATÁLOGO ILUSTRATIVO · CONSULTAR DISPONIBILIDADE</span><a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram Skinão Veículos"><Instagram size={18}/></a></div></footer>
      {selected && <VehicleModal key={selected.id} vehicle={selected} onClose={closeDetails}/>}
      </div>
    </>
  );
}
