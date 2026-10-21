import { useEffect, useState } from "react";

// Operating hours shown in the public listing supplied by the customer.
// Sunday: closed; Monday–Friday: 08:00–18:00; Saturday: 08:00–12:00.
// Always evaluate by the store's clock, never the visitor's timezone.
const brasiliaClock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function isOpenInBrasilia(now: Date): boolean {
  const parts = brasiliaClock.formatToParts(now);
  const weekday = parts.find(part => part.type === "weekday")?.value;
  const hour = Number(parts.find(part => part.type === "hour")?.value);
  const minute = Number(parts.find(part => part.type === "minute")?.value);
  if (!weekday || !Number.isFinite(hour) || !Number.isFinite(minute) || weekday === "Sun") {
    return false;
  }

  const currentMinute = hour * 60 + minute;
  const closingMinute = weekday === "Sat" ? 12 * 60 : 18 * 60;
  return currentMinute >= 8 * 60 && currentMinute < closingMinute;
}

export function BusinessHours() {
  // A neutral initial value prevents server/client hydration disagreement.
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const refresh = () => setIsOpen(isOpenInBrasilia(new Date()));
    refresh();

    // Re-evaluate across opening/closing boundaries and on tab restoration.
    const timer = window.setInterval(refresh, 15_000);
    const onVisibility = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <div className="visit-hours-card" aria-label="Horário de funcionamento da Skinão Veículos">
      <div className="footer-hours-heading">
        <span className="footer-hours-label">HORÁRIO DE FUNCIONAMENTO</span>
        <span className={"footer-hours-status" + (isOpen === null ? " footer-hours-status--pending" : isOpen ? " footer-hours-status--open" : " footer-hours-status--closed")} role="status" aria-live="polite" aria-atomic="true">
          <span className="footer-hours-dot" aria-hidden="true"/>
          {isOpen === null ? "CONSULTANDO" : isOpen ? "ABERTO" : "FECHADO"}
        </span>
      </div>
      <div className="footer-hours-schedule" aria-label="Horários por dia">
        <span>Dom <strong>Fechado</strong></span>
        <span>Seg–Sex <strong>08h–18h</strong></span>
        <span>Sáb <strong>08h–12h</strong></span>
      </div>
    </div>
  );
}
