import React, { useState, useMemo } from "react";
import {
  FileText,
  Send,
  CheckCircle2,
  Upload,
  Paperclip,
  ClipboardList,
  BarChart3,
  Building2,
  Clock,
  Sparkles,
  Inbox,
  TrendingUp,
  LayoutDashboard,
} from "lucide-react";

/* ---------------------------------------------------------------
   DATOS DE REFERENCIA (simulados para el demo — en producción
   vienen del RIT digitalizado y del historial real del trabajador)
---------------------------------------------------------------- */

const RUTINAS = [
  { id: "caja", label: "Protocolo de manejo de caja", gravedad: "leve", articulo: "Art. 24, inciso b" },
  { id: "tardanza", label: "Tardanza reiterada", gravedad: "leve", articulo: "Art. 19, inciso a" },
  { id: "descuentos", label: "Uso indebido de política de descuentos", gravedad: "grave", articulo: "Art. 31, inciso c" },
  { id: "atencion", label: "Incumplimiento de protocolo de atención al cliente", gravedad: "leve", articulo: "Art. 22, inciso a" },
  { id: "respeto", label: "Falta de respeto a cliente o compañero", gravedad: "grave", articulo: "Art. 35, inciso a" },
  { id: "ausencia", label: "Ausencia injustificada", gravedad: "muy_grave", articulo: "Art. 40, inciso b" },
];

const HISTORIAL_FALTAS = { "jorge ramirez": 2, "lucia paredes": 1 };

const SANCION_POR_GRAVEDAD = {
  leve: "Amonestación escrita",
  grave: "Suspensión (2 días sin goce de haber)",
  muy_grave: "Carta de preaviso de despido",
};

const ESCALA = ["leve", "grave", "muy_grave"];
const escalar = (g, niveles) => ESCALA[Math.min(ESCALA.indexOf(g) + niveles, ESCALA.length - 1)];
const SEV_LABEL = { leve: "Leve", grave: "Grave", muy_grave: "Muy grave" };

const CASOS_INICIALES = [
  { id: "EXP-2026-0137", trabajador: "Diego Farfán", falta: "Ausencia injustificada", gravedad: "muy_grave", estado: "rechazado", fecha: "30 jun" },
  { id: "EXP-2026-0139", trabajador: "Milagros Soto", falta: "Tardanza reiterada", gravedad: "leve", estado: "cerrado", fecha: "02 jul" },
  { id: "EXP-2026-0141", trabajador: "Renzo Villar", falta: "Uso indebido de descuentos", gravedad: "grave", estado: "entregado_pendiente_cargo", fecha: "08 jul" },
  { id: "EXP-2026-0144", trabajador: "Jorge Ramírez", falta: "Falta de respeto a compañero", gravedad: "muy_grave", estado: "aprobado_pendiente_entrega", fecha: "11 jul" },
  { id: "EXP-2026-0146", trabajador: "Lucía Paredes", falta: "Protocolo de manejo de caja", gravedad: "grave", estado: "enviado_aprobacion", fecha: "14 jul" },
];

const ESTADO_META = {
  generado_no_enviado: { label: "Generado — no enviado", tone: "muted", accion: "enviar" },
  enviado_aprobacion: { label: "En revisión de Legal", tone: "info", accion: null },
  aprobado_pendiente_entrega: { label: "Aprobado — pendiente de entrega", tone: "warn", accion: "entregar" },
  entregado_pendiente_cargo: { label: "Entregado — falta subir cargo", tone: "warn", accion: "cargo" },
  cerrado: { label: "Cerrado", tone: "ok", accion: null },
  rechazado: { label: "Rechazado por Legal", tone: "bad", accion: null },
};

const ACTIVIDAD_RECIENTE = [
  { id: "EXP-2026-0146", texto: "enviado a Legal para aprobación", cuando: "hace 2 horas" },
  { id: "EXP-2026-0144", texto: "aprobado por Legal, pendiente de entrega en tienda", cuando: "ayer" },
  { id: "EXP-2026-0141", texto: "entregado al trabajador, falta subir cargo firmado", cuando: "hace 3 días" },
  { id: "EXP-2026-0137", texto: "rechazado por Legal — falta sustento adicional", cuando: "hace 2 semanas" },
];

/* ---------------------------------------------------------------
   COMPONENTES DE APOYO
---------------------------------------------------------------- */

function SelloGravedad({ gravedad }) {
  return <span className={`sello sello--${gravedad}`}>{SEV_LABEL[gravedad]}</span>;
}

function Pastilla({ estado }) {
  const meta = ESTADO_META[estado];
  return <span className={`pastilla pastilla--${meta.tone}`}>{meta.label}</span>;
}

function Paso({ n, activo, hecho, children }) {
  return (
    <div className={`paso ${activo ? "paso--activo" : ""} ${hecho ? "paso--hecho" : ""}`}>
      <span className="paso__n">{hecho ? <CheckCircle2 size={14} /> : n}</span>
      <span>{children}</span>
    </div>
  );
}

/* ---------------------------------------------------------------
   VISTA — REPORTAR CASO
---------------------------------------------------------------- */

function ReportarCaso({ onCasoEnviado }) {
  const [etapa, setEtapa] = useState("formulario");
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({ trabajador: "", puesto: "", fechaIncidente: "", rutina: "", descripcion: "", testigos: "" });
  const [evidencia, setEvidencia] = useState([]);
  const [analisis, setAnalisis] = useState(null);
  const [documento, setDocumento] = useState(null);
  const [ultimoId, setUltimoId] = useState(null);

  const rutinaSeleccionada = useMemo(() => RUTINAS.find((r) => r.id === form.rutina), [form.rutina]);

  const camposClave = ["trabajador", "puesto", "fechaIncidente", "rutina", "descripcion"];
  const camposCompletos = camposClave.filter((c) => form[c] && form[c].toString().trim().length > 0).length;

  const faltantes = [];
  if (!form.trabajador.trim()) faltantes.push("nombre del trabajador");
  if (!form.puesto.trim()) faltantes.push("puesto");
  if (!form.fechaIncidente) faltantes.push("fecha del incidente");
  if (!form.rutina) faltantes.push("rutina o protocolo incumplido");
  if (form.descripcion.trim().length <= 10) faltantes.push("descripción (mínimo 11 caracteres)");
  const puedeAnalizar = faltantes.length === 0;

  function actualizar(campo, valor) { setForm((f) => ({ ...f, [campo]: valor })); }

  function adjuntarEvidencia() {
    const n = evidencia.length + 1;
    setEvidencia((e) => [...e, `evidencia_${n}.jpg`]);
  }

  function analizarCaso() {
    setCargando(true);
    setTimeout(() => {
      const reincidencias = HISTORIAL_FALTAS[form.trabajador.trim().toLowerCase()] || 0;
      const gravedadFinal = escalar(rutinaSeleccionada.gravedad, reincidencias >= 2 ? 2 : reincidencias >= 1 ? 1 : 0);
      const impacto = reincidencias >= 2 ? "Alto" : reincidencias === 1 ? "Medio" : "Bajo";
      const nombreCorto = form.trabajador.split(" ")[0];

      const pasos = [
        `Se identificó la rutina incumplida: "${rutinaSeleccionada.label}", tipificada como falta ${SEV_LABEL[rutinaSeleccionada.gravedad].toLowerCase()} en el RIT.`,
        reincidencias > 0
          ? `Se revisó el historial de ${nombreCorto}: ${reincidencias} falta(s) registrada(s) en los últimos 6 meses.`
          : `Se revisó el historial de ${nombreCorto}: no se encontraron faltas previas en los últimos 6 meses.`,
        reincidencias > 0
          ? `Por reincidencia, la gravedad se escala de ${SEV_LABEL[rutinaSeleccionada.gravedad].toLowerCase()} a ${SEV_LABEL[gravedadFinal].toLowerCase()}, según la escala disciplinaria vigente.`
          : `Sin reincidencia, se mantiene la gravedad base: ${SEV_LABEL[gravedadFinal].toLowerCase()}.`,
        `Se calculó el impacto de la falta como "${impacto}" y se determinó la sanción aplicable: ${SANCION_POR_GRAVEDAD[gravedadFinal]}.`,
      ];

      const articulosConsultados = [rutinaSeleccionada.articulo, "Art. 52 — Escala de gravedad y reincidencia", "Art. 58 — Procedimiento de sanción"];

      setAnalisis({
        rutina: rutinaSeleccionada.label,
        articulo: rutinaSeleccionada.articulo,
        reincidencias,
        impacto,
        gravedad: gravedadFinal,
        sancion: SANCION_POR_GRAVEDAD[gravedadFinal],
        pasos,
        articulosConsultados,
        confianza: reincidencias > 0 ? 91 : 97,
        tiempoAnalisis: (1.1 + Math.random() * 0.6).toFixed(1),
        razonamiento:
          reincidencias > 0
            ? `${nombreCorto} registra ${reincidencias} falta(s) previa(s) en los últimos 6 meses, lo que eleva la gravedad de "${rutinaSeleccionada.label.toLowerCase()}" de ${SEV_LABEL[rutinaSeleccionada.gravedad].toLowerCase()} a ${SEV_LABEL[gravedadFinal].toLowerCase()}, según ${rutinaSeleccionada.articulo} del RIT.`
            : `No se registran faltas previas. Se mantiene la gravedad base de "${rutinaSeleccionada.label.toLowerCase()}" según ${rutinaSeleccionada.articulo} del RIT.`,
      });
      setCargando(false);
      setEtapa("analizado");
    }, 1100);
  }

  function generarDocumento() {
    setCargando(true);
    setTimeout(() => {
      const tituloPorSancion = {
        leve: "AMONESTACIÓN ESCRITA",
        grave: "SUSPENSIÓN SIN GOCE DE HABER",
        muy_grave: "CARTA DE PREAVISO DE DESPIDO",
      };
      const fechaEmision = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
      const fechaIncidenteLegible = form.fechaIncidente
        ? new Date(form.fechaIncidente + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })
        : form.fechaIncidente;

      setDocumento({
        titulo: tituloPorSancion[analisis.gravedad],
        fechaEmision,
        hechos: `Con fecha ${fechaIncidenteLegible}, se reportó que ${form.trabajador}, en su condición de ${form.puesto}, incurrió en un incumplimiento vinculado a "${analisis.rutina.toLowerCase()}". Los hechos reportados señalan lo siguiente: "${form.descripcion.trim()}"${form.testigos ? ` El incidente cuenta con el testimonio de ${form.testigos}.` : " No se registran testigos adicionales al reporte."}`,
        fundamento: analisis.razonamiento,
        sancion: `En virtud de lo expuesto, y conforme a la escala de faltas vigente, corresponde imponer la sanción de "${analisis.sancion}", clasificada como falta de gravedad ${SEV_LABEL[analisis.gravedad].toLowerCase()}.`,
        apelacion: "El trabajador tiene derecho a presentar sus descargos o solicitar una reconsideración de la presente sanción dentro de los cinco (5) días hábiles siguientes a su notificación, mediante comunicación dirigida al área de Relaciones Laborales.",
      });
      setCargando(false);
      setEtapa("documento");
    }, 900);
  }

  function enviarAprobacion() {
    const nuevoId = `EXP-2026-${Math.floor(1000 + Math.random() * 8999)}`;
    onCasoEnviado({ id: nuevoId, trabajador: form.trabajador, falta: analisis.rutina, gravedad: analisis.gravedad, estado: "enviado_aprobacion", fecha: "hoy" });
    setUltimoId(nuevoId);
    setEtapa("enviado");
  }

  function reiniciar() {
    setForm({ trabajador: "", puesto: "", fechaIncidente: "", rutina: "", descripcion: "", testigos: "" });
    setEvidencia([]);
    setAnalisis(null);
    setDocumento(null);
    setEtapa("formulario");
  }

  return (
    <div className="grid-reporte">
      <aside className="rail">
        <p className="rail__eyebrow">Expediente en curso</p>
        <Paso n={1} activo={etapa === "formulario"} hecho={etapa !== "formulario"}>Registrar incidente</Paso>
        <Paso n={2} activo={etapa === "analizado" && !documento} hecho={!!analisis}>Analizar caso</Paso>
        <Paso n={3} activo={etapa === "documento"} hecho={!!documento}>Generar documento</Paso>
        <Paso n={4} activo={etapa === "enviado"} hecho={etapa === "enviado"}>Enviar para aprobación</Paso>

        <div className="rail__ficha">
          <p className="rail__ficha-titulo">Ficha rápida</p>
          <div className="rail__ficha-fila"><span>Trabajador</span><strong>{form.trabajador || "—"}</strong></div>
          <div className="rail__ficha-fila"><span>Puesto</span><strong>{form.puesto || "—"}</strong></div>
          <div className="rail__ficha-fila"><span>Fecha</span><strong>{form.fechaIncidente || "—"}</strong></div>
          <div className="rail__ficha-progreso">
            <div className="rail__ficha-pista"><div className="rail__ficha-relleno" style={{ width: `${(camposCompletos / camposClave.length) * 100}%` }} /></div>
            <span>{camposCompletos}/{camposClave.length} campos</span>
          </div>
        </div>
      </aside>

      <div className="panel">
        {etapa === "enviado" ? (
          <div className="confirmacion">
            <CheckCircle2 size={28} />
            <h3>Caso enviado a Legal</h3>
            <p className="confirmacion__id">{ultimoId}</p>
            <p>Legal revisará el análisis y firmará el documento. Cuando esté aprobado, aparecerá en tu Dashboard para que lo imprimas y entregues en tienda.</p>
            <button className="btn btn--fantasma" onClick={reiniciar}>Reportar otro caso</button>
          </div>
        ) : (
          <>
            <header className="panel__header">
              <h2>Reportar incidente</h2>
              <p>Completa los datos del caso. El sistema revisa el historial del trabajador y sugiere la sanción aplicable según el reglamento interno.</p>
            </header>

            <div className="campo-doble">
              <div className="campo">
                <label>Nombre del trabajador</label>
                <input value={form.trabajador} onChange={(e) => actualizar("trabajador", e.target.value)} placeholder="Ej. Jorge Ramírez" disabled={etapa !== "formulario"} />
              </div>
              <div className="campo">
                <label>Puesto</label>
                <input value={form.puesto} onChange={(e) => actualizar("puesto", e.target.value)} placeholder="Ej. Cajero" disabled={etapa !== "formulario"} />
              </div>
            </div>

            <div className="campo-doble">
              <div className="campo">
                <label>Fecha del incidente</label>
                <input type="date" value={form.fechaIncidente} onChange={(e) => actualizar("fechaIncidente", e.target.value)} disabled={etapa !== "formulario"} />
              </div>
              <div className="campo">
                <label>Rutina o protocolo incumplido</label>
                <select value={form.rutina} onChange={(e) => actualizar("rutina", e.target.value)} disabled={etapa !== "formulario"}>
                  <option value="">Selecciona una opción</option>
                  {RUTINAS.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}
                </select>
              </div>
            </div>

            <div className="campo">
              <label>Descripción del incidente</label>
              <textarea rows={4} value={form.descripcion} onChange={(e) => actualizar("descripcion", e.target.value)} placeholder="Describe qué ocurrió, cuándo y quiénes estuvieron involucrados." disabled={etapa !== "formulario"} />
              <span className="campo__ayuda">{form.descripcion.trim().length} caracteres — mínimo 10</span>
            </div>

            <div className="campo">
              <label>Testigos <span className="campo__opcional">(opcional)</span></label>
              <input value={form.testigos} onChange={(e) => actualizar("testigos", e.target.value)} placeholder="Ej. Ana Quispe, supervisora de turno" disabled={etapa !== "formulario"} />
            </div>

            <div className="campo">
              <label>Evidencia <span className="campo__opcional">(opcional)</span></label>
              <div className="adjuntos">
                {evidencia.map((e) => (<span className="adjuntos__chip" key={e}><Paperclip size={12} />{e}</span>))}
                {etapa === "formulario" && (
                  <button type="button" className="adjuntos__boton" onClick={adjuntarEvidencia}><Upload size={13} /> Adjuntar archivo</button>
                )}
              </div>
            </div>

            {etapa === "formulario" && (
              <>
                <button className="btn btn--primario" disabled={!puedeAnalizar || cargando} onClick={analizarCaso}>
                  {cargando ? "Analizando…" : (<><Sparkles size={16} /> Analizar caso</>)}
                </button>
                {!puedeAnalizar && (
                  <p className="campo__ayuda campo__ayuda--pendiente">Falta completar: {faltantes.join(", ")}.</p>
                )}
              </>
            )}

            {analisis && (
              <div className="recomendacion">
                <div className="recomendacion__top">
                  <span className="recomendacion__eyebrow"><Sparkles size={12} /> Análisis con IA</span>
                  <div className="recomendacion__badges">
                    <span className="badge-confianza">{analisis.confianza}% confianza</span>
                    <span className="badge-tiempo">{analisis.tiempoAnalisis}s</span>
                    <SelloGravedad gravedad={analisis.gravedad} />
                  </div>
                </div>

                <dl className="recomendacion__grid">
                  <div><dt>Rutina incumplida</dt><dd>{analisis.rutina}</dd></div>
                  <div><dt>Reincidencia</dt><dd>{analisis.reincidencias} falta(s) previa(s)</dd></div>
                  <div><dt>Impacto</dt><dd>{analisis.impacto}</dd></div>
                  <div><dt>Sanción sugerida</dt><dd>{analisis.sancion}</dd></div>
                </dl>

                <div className="razonamiento">
                  <h4>Cómo llegó a esta conclusión</h4>
                  <ol className="razonamiento__lista">
                    {analisis.pasos.map((paso, i) => (
                      <li key={i}><span className="razonamiento__n">{i + 1}</span><span>{paso}</span></li>
                    ))}
                  </ol>
                </div>

                <div className="articulos">
                  <span className="articulos__label">Artículos del RIT consultados</span>
                  <div className="articulos__lista">
                    {analisis.articulosConsultados.map((a) => (<span className="articulos__chip" key={a}>{a}</span>))}
                  </div>
                </div>

                {etapa === "analizado" && (
                  <button className="btn btn--primario" disabled={cargando} onClick={generarDocumento}>
                    {cargando ? "Generando…" : (<><FileText size={16} /> Generar documento</>)}
                  </button>
                )}
              </div>
            )}

            {documento && (
              <div className="documento">
                <div className="documento__sello">BORRADOR</div>
                <div className="documento__membrete">
                  <span className="documento__empresa">Retail Group S.A. · Relaciones Laborales</span>
                  <span className="documento__fecha">{documento.fechaEmision}</span>
                </div>
                <h3 className="documento__titulo">{documento.titulo}</h3>
                <div className="documento__meta">
                  <div><span>Trabajador</span><strong>{form.trabajador}</strong></div>
                  <div><span>Puesto</span><strong>{form.puesto}</strong></div>
                  <div><span>Tienda</span><strong>Tienda San Isidro</strong></div>
                </div>

                <div className="documento__seccion">
                  <h4>I. Hechos</h4>
                  <p>{documento.hechos}</p>
                </div>
                <div className="documento__seccion">
                  <h4>II. Fundamento legal</h4>
                  <p>{documento.fundamento}</p>
                </div>
                <div className="documento__seccion">
                  <h4>III. Sanción impuesta</h4>
                  <p>{documento.sancion}</p>
                </div>
                <div className="documento__seccion">
                  <h4>IV. Derecho de defensa</h4>
                  <p>{documento.apelacion}</p>
                </div>

                <div className="documento__firma">
                  <div className="documento__firma-linea" />
                  <span>Relaciones Laborales — Retail Group S.A.</span>
                  <span className="documento__firma-nota">Firma digital pendiente de aprobación</span>
                </div>

                <button className="btn btn--primario" onClick={enviarAprobacion}><Send size={16} /> Enviar para aprobación</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   VISTA — DASHBOARD (resumen/KPIs + mis casos)
---------------------------------------------------------------- */

function Dashboard({ casos, onAccion }) {
  const [tab, setTab] = useState("resumen");

  const kpis = useMemo(() => {
    const total = casos.length;
    const cerrados = casos.filter((c) => c.estado === "cerrado").length;
    const rechazados = casos.filter((c) => c.estado === "rechazado").length;
    const enTramite = total - cerrados - rechazados;
    const finalizados = cerrados + rechazados;
    const tasaAprobacion = finalizados > 0 ? Math.round((cerrados / finalizados) * 100) : 100;
    const estaSemana = casos.filter((c) => ["08 jul", "11 jul", "14 jul", "hoy"].includes(c.fecha)).length;

    const porFalta = casos.reduce((acc, c) => { acc[c.falta] = (acc[c.falta] || 0) + 1; return acc; }, {});
    const maxFalta = Math.max(1, ...Object.values(porFalta));

    const porGravedad = { leve: 0, grave: 0, muy_grave: 0 };
    casos.forEach((c) => { porGravedad[c.gravedad] += 1; });
    const maxGravedad = Math.max(1, ...Object.values(porGravedad));

    return { total, cerrados, enTramite, tasaAprobacion, estaSemana, porFalta, maxFalta, porGravedad, maxGravedad };
  }, [casos]);

  return (
    <div>
      <div className="subnav">
        <button className={`subnav__item ${tab === "resumen" ? "subnav__item--activo" : ""}`} onClick={() => setTab("resumen")}>
          <BarChart3 size={15} /> KPIs
        </button>
        <button className={`subnav__item ${tab === "casos" ? "subnav__item--activo" : ""}`} onClick={() => setTab("casos")}>
          <Inbox size={15} /> Mis casos
        </button>
      </div>

      {tab === "resumen" ? (
        <div className="kpis">
          <div className="kpis__resumen">
            <div className="kpi-card"><span className="kpi-card__valor">{kpis.total}</span><span className="kpi-card__label">Casos totales</span></div>
            <div className="kpi-card"><span className="kpi-card__valor">{kpis.enTramite}</span><span className="kpi-card__label">En trámite</span></div>
            <div className="kpi-card"><span className="kpi-card__valor">{kpis.cerrados}</span><span className="kpi-card__label">Cerrados</span></div>
            <div className="kpi-card"><span className="kpi-card__valor">{kpis.tasaAprobacion}%</span><span className="kpi-card__label">Tasa de aprobación</span></div>
            <div className="kpi-card"><span className="kpi-card__valor">2.4 días</span><span className="kpi-card__label">Tiempo promedio a cierre</span></div>
            <div className="kpi-card"><span className="kpi-card__valor">{kpis.estaSemana}</span><span className="kpi-card__label">Casos esta semana</span></div>
          </div>

          <div className="kpis__dos-columnas">
            <div className="kpis__bloque">
              <h4><TrendingUp size={14} /> Causas más frecuentes</h4>
              {Object.entries(kpis.porFalta).map(([falta, n]) => (
                <div className="barra" key={falta}>
                  <span className="barra__label">{falta}</span>
                  <div className="barra__pista"><div className="barra__relleno" style={{ width: `${(n / kpis.maxFalta) * 100}%` }} /></div>
                  <span className="barra__valor">{n}</span>
                </div>
              ))}
            </div>

            <div className="kpis__bloque">
              <h4><BarChart3 size={14} /> Distribución por gravedad</h4>
              {Object.entries(kpis.porGravedad).map(([g, n]) => (
                <div className="barra" key={g}>
                  <span className="barra__label">{SEV_LABEL[g]}</span>
                  <div className="barra__pista"><div className={`barra__relleno barra__relleno--${g}`} style={{ width: `${(n / kpis.maxGravedad) * 100}%` }} /></div>
                  <span className="barra__valor">{n}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="kpis__bloque kpis__actividad">
            <h4><Clock size={14} /> Actividad reciente</h4>
            <ul className="actividad">
              {ACTIVIDAD_RECIENTE.map((a) => (
                <li key={a.id + a.texto}>
                  <span className="actividad__id">{a.id}</span>
                  <span className="actividad__texto">{a.texto}</span>
                  <span className="actividad__cuando">{a.cuando}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="tabla">
          <div className="tabla__fila tabla__fila--cabecera">
            <span>Expediente</span><span>Trabajador</span><span>Falta</span><span>Gravedad</span><span>Estado</span><span></span>
          </div>
          {casos.map((c) => {
            const meta = ESTADO_META[c.estado];
            return (
              <div className="tabla__fila" key={c.id}>
                <span className="tabla__id">{c.id}</span>
                <span>{c.trabajador}</span>
                <span className="tabla__falta">{c.falta}</span>
                <span><SelloGravedad gravedad={c.gravedad} /></span>
                <span><Pastilla estado={c.estado} /></span>
                <span>
                  {meta.accion === "enviar" && (<button className="btn btn--mini" onClick={() => onAccion(c.id, "enviado_aprobacion")}>Enviar</button>)}
                  {meta.accion === "entregar" && (<button className="btn btn--mini" onClick={() => onAccion(c.id, "entregado_pendiente_cargo")}>Marcar entregado</button>)}
                  {meta.accion === "cargo" && (<button className="btn btn--mini" onClick={() => onAccion(c.id, "cerrado")}><Upload size={13} /> Subir cargo</button>)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   APP
---------------------------------------------------------------- */

export default function VistaTienda() {
  const [vista, setVista] = useState("dashboard");
  const [casos, setCasos] = useState(CASOS_INICIALES);

  function agregarCaso(caso) { setCasos((prev) => [caso, ...prev]); }
  function actualizarEstado(id, nuevoEstado) { setCasos((prev) => prev.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c))); }

  return (
    <div className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');

        .app-shell {
          --ink: #12211E; --paper: #EEF1EC; --surface: #FFFFFF; --brass: #8A6D3B; --brass-dark: #6B5229;
          --line: #D9DED8; --muted: #5B6660; --leve: #2F6846; --grave: #B7791F; --muy_grave: #9B2C2C; --bad: #9B2C2C;
          font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
          background: var(--paper); color: var(--ink); min-height: 100%; padding: 28px; border-radius: 14px;
        }
        .app-shell * { box-sizing: border-box; }
        .app-shell :focus-visible { outline: 2px solid var(--brass); outline-offset: 2px; }

        .topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 12px; }
        .topbar__marca { display: flex; align-items: center; gap: 10px; }
        .topbar__marca-icono { width: 34px; height: 34px; border-radius: 8px; background: var(--ink); color: var(--paper); display: flex; align-items: center; justify-content: center; }
        .topbar__titulo { font-family: 'Source Serif 4', Georgia, serif; font-size: 19px; font-weight: 600; line-height: 1.1; }
        .topbar__sub { font-size: 12px; color: var(--muted); }

        .nav { display: flex; gap: 6px; background: var(--surface); padding: 4px; border-radius: 10px; border: 1px solid var(--line); }
        .nav__item { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 7px; font-size: 13px; font-weight: 500; color: var(--muted); background: transparent; border: none; cursor: pointer; }
        .nav__item--activo { background: var(--ink); color: var(--paper); }

        .grid-reporte { display: grid; grid-template-columns: 210px 1fr; gap: 22px; }
        @media (max-width: 720px) { .grid-reporte { grid-template-columns: 1fr; } }

        .rail { display: flex; flex-direction: column; gap: 4px; padding-top: 6px; }
        .rail__eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: 0 0 10px 2px; }
        .paso { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-radius: 8px; font-size: 13px; color: var(--muted); position: relative; }
        .paso:not(:last-child)::after { content: ""; position: absolute; left: 19px; top: 34px; width: 1px; height: 14px; background: var(--line); }
        .paso__n { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; background: var(--surface); }
        .paso--activo { color: var(--ink); font-weight: 600; }
        .paso--activo .paso__n { border-color: var(--brass); color: var(--brass); }
        .paso--hecho .paso__n { background: var(--ink); border-color: var(--ink); color: var(--paper); }

        .rail__ficha { margin-top: 18px; border: 1px solid var(--line); border-radius: 10px; padding: 12px; background: var(--surface); }
        .rail__ficha-titulo { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin: 0 0 8px; }
        .rail__ficha-fila { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; margin-bottom: 6px; }
        .rail__ficha-fila span { color: var(--muted); }
        .rail__ficha-fila strong { font-weight: 500; text-align: right; }
        .rail__ficha-progreso { margin-top: 10px; display: flex; align-items: center; gap: 8px; }
        .rail__ficha-pista { flex: 1; height: 5px; background: #ECEEE9; border-radius: 4px; overflow: hidden; }
        .rail__ficha-relleno { height: 100%; background: var(--brass); border-radius: 4px; }
        .rail__ficha-progreso span { font-size: 10.5px; color: var(--muted); white-space: nowrap; }

        .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 24px; }
        .panel__header h2 { font-family: 'Source Serif 4', Georgia, serif; font-size: 20px; margin: 0 0 4px; }
        .panel__header p { font-size: 13px; color: var(--muted); margin: 0 0 20px; }

        .campo-doble { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 560px) { .campo-doble { grid-template-columns: 1fr; } }

        .campo { margin-bottom: 14px; }
        .campo label { display: block; font-size: 12.5px; font-weight: 500; margin-bottom: 5px; color: var(--ink); }
        .campo__opcional { font-weight: 400; color: var(--muted); }
        .campo__ayuda { display: block; font-size: 11px; color: var(--muted); margin-top: 4px; }
        .campo__ayuda--pendiente { margin-top: 10px; color: var(--brass-dark); }
        .campo input, .campo select, .campo textarea { width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 9px 11px; font-size: 16px; font-family: inherit; background: var(--surface); color: var(--ink); }
        @media (min-width: 768px) { .campo input, .campo select, .campo textarea { font-size: 13.5px; } }
        .campo input:disabled, .campo select:disabled, .campo textarea:disabled { background: #F5F6F4; color: var(--muted); }
        .campo textarea { resize: vertical; }

        .adjuntos { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .adjuntos__chip { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; background: #F5F6F4; border: 1px solid var(--line); padding: 5px 10px; border-radius: 6px; color: var(--muted); }
        .adjuntos__boton { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; border: 1px dashed var(--line); background: transparent; padding: 6px 12px; border-radius: 6px; color: var(--brass-dark); cursor: pointer; }

        .btn { display: inline-flex; align-items: center; gap: 7px; border: none; border-radius: 8px; padding: 10px 16px; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn--primario { background: var(--brass); color: #fff; }
        .btn--primario:hover:not(:disabled) { background: var(--brass-dark); }
        .btn--fantasma { background: transparent; border: 1px solid var(--line); color: var(--ink); margin-top: 14px; }
        .btn--mini { background: var(--ink); color: var(--paper); padding: 6px 10px; font-size: 12px; border-radius: 6px; }

        .sello { display: inline-block; font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; letter-spacing: 0.03em; padding: 3px 8px; border-radius: 4px; border: 1px solid currentColor; text-transform: uppercase; }
        .sello--leve { color: var(--leve); }
        .sello--grave { color: var(--grave); }
        .sello--muy_grave { color: var(--muy_grave); }

        .pastilla { font-size: 12px; padding: 4px 9px; border-radius: 999px; font-weight: 500; }
        .pastilla--muted { background: #ECEEE9; color: var(--muted); }
        .pastilla--info { background: #E8EEFB; color: #2C4C8C; }
        .pastilla--warn { background: #FBF1DE; color: var(--brass-dark); }
        .pastilla--ok { background: #E6F0E9; color: var(--leve); }
        .pastilla--bad { background: #FBEAEA; color: var(--bad); }

        .recomendacion { margin-top: 18px; border: 1px solid var(--line); border-radius: 10px; padding: 18px; background: #FAFBF9; }
        .recomendacion__top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
        .recomendacion__eyebrow { display: flex; align-items: center; gap: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); font-weight: 600; }
        .recomendacion__badges { display: flex; align-items: center; gap: 6px; }
        .badge-confianza { font-size: 11px; background: #E6F0E9; color: var(--leve); padding: 3px 8px; border-radius: 999px; font-weight: 600; }
        .badge-tiempo { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--muted); background: #ECEEE9; padding: 3px 8px; border-radius: 999px; }
        .recomendacion__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; margin: 0 0 16px; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
        .recomendacion__grid dt { font-size: 11px; color: var(--muted); margin-bottom: 2px; }
        .recomendacion__grid dd { font-size: 13px; margin: 0; font-weight: 500; }

        .razonamiento { margin-bottom: 16px; }
        .razonamiento h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink); margin: 0 0 10px; font-weight: 600; }
        .razonamiento__lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
        .razonamiento__lista li { display: flex; gap: 10px; font-size: 12.5px; color: var(--ink); line-height: 1.5; }
        .razonamiento__n { flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; background: var(--ink); color: var(--paper); font-size: 10px; display: flex; align-items: center; justify-content: center; margin-top: 1px; font-family: 'IBM Plex Mono', monospace; }

        .articulos { margin-bottom: 16px; }
        .articulos__label { display: block; font-size: 11px; color: var(--muted); margin-bottom: 8px; }
        .articulos__lista { display: flex; flex-wrap: wrap; gap: 6px; }
        .articulos__chip { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--brass-dark); background: #F1ECE1; border: 1px solid #E3D9C4; padding: 4px 9px; border-radius: 5px; }

        .documento { position: relative; margin-top: 18px; border: 1px solid var(--line); border-radius: 10px; padding: 26px 28px; background: #FCFCFA; overflow: hidden; }
        .documento__sello {
          position: absolute; top: 38px; right: -34px; transform: rotate(28deg);
          font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 500; letter-spacing: 0.12em;
          color: var(--muy_grave); border: 1.5px solid var(--muy_grave); padding: 3px 34px; opacity: 0.45; pointer-events: none;
        }
        .documento__membrete { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; padding-bottom: 10px; border-bottom: 1px solid var(--line); margin-bottom: 16px; }
        .documento__titulo { font-family: 'Source Serif 4', Georgia, serif; font-size: 18px; text-align: center; letter-spacing: 0.02em; margin: 0 0 18px; }
        .documento__meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
        .documento__meta span { display: block; font-size: 10.5px; color: var(--muted); margin-bottom: 2px; }
        .documento__meta strong { font-size: 12.5px; font-weight: 500; }
        .documento__seccion { margin-bottom: 16px; }
        .documento__seccion h4 { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--brass-dark); margin: 0 0 6px; font-weight: 600; }
        .documento__seccion p { font-size: 13px; line-height: 1.6; color: var(--ink); margin: 0; font-family: 'Source Serif 4', Georgia, serif; }
        .documento__firma { margin: 22px 0 18px; text-align: center; font-size: 12px; color: var(--muted); }
        .documento__firma-linea { width: 200px; height: 1px; background: var(--line); margin: 0 auto 8px; }
        .documento__firma-nota { display: block; font-size: 11px; font-style: italic; margin-top: 2px; }

        .confirmacion { text-align: center; padding: 30px 10px; color: var(--leve); }
        .confirmacion h3 { color: var(--ink); font-family: 'Source Serif 4', Georgia, serif; margin: 10px 0 2px; }
        .confirmacion__id { font-family: 'IBM Plex Mono', monospace; color: var(--brass-dark); font-size: 12.5px; margin: 0 0 10px; }
        .confirmacion p:last-of-type { color: var(--muted); font-size: 13px; max-width: 360px; margin: 0 auto; }

        .subnav { display: flex; gap: 6px; margin-bottom: 16px; }
        .subnav__item { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); font-size: 13px; color: var(--muted); cursor: pointer; }
        .subnav__item--activo { background: var(--ink); color: var(--paper); border-color: var(--ink); }

        .tabla { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
        .tabla__fila { display: grid; grid-template-columns: 120px 1.2fr 1.6fr 90px 1.4fr 110px; align-items: center; gap: 10px; padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--line); }
        .tabla__fila:last-child { border-bottom: none; }
        .tabla__fila--cabecera { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); background: #FAFBF9; padding: 10px 16px; }
        .tabla__id { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--brass-dark); }
        .tabla__falta { color: var(--muted); }
        @media (max-width: 820px) { .tabla__fila { grid-template-columns: 1fr; gap: 4px; } .tabla__fila--cabecera { display: none; } }

        .kpis__resumen { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
        @media (max-width: 980px) { .kpis__resumen { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 560px) { .kpis__resumen { grid-template-columns: repeat(2, 1fr); } }
        .kpi-card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
        .kpi-card__valor { font-family: 'Source Serif 4', Georgia, serif; font-size: 23px; font-weight: 600; }
        .kpi-card__label { font-size: 11.5px; color: var(--muted); }

        .kpis__dos-columnas { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 780px) { .kpis__dos-columnas { grid-template-columns: 1fr; } }

        .kpis__bloque { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 18px; }
        .kpis__bloque h4 { display: flex; align-items: center; gap: 7px; margin: 0 0 14px; font-size: 13.5px; font-family: 'Source Serif 4', Georgia, serif; color: var(--ink); }

        .barra { display: grid; grid-template-columns: 1fr 100px 24px; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 12.5px; }
        .barra__label { color: var(--muted); }
        .barra__pista { background: #ECEEE9; border-radius: 4px; height: 8px; overflow: hidden; }
        .barra__relleno { background: var(--brass); height: 100%; border-radius: 4px; }
        .barra__relleno--leve { background: var(--leve); }
        .barra__relleno--grave { background: var(--grave); }
        .barra__relleno--muy_grave { background: var(--muy_grave); }
        .barra__valor { text-align: right; font-weight: 600; }

        .actividad { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .actividad li { display: grid; grid-template-columns: 105px 1fr auto; gap: 10px; align-items: baseline; font-size: 12.5px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }
        .actividad li:last-child { border-bottom: none; padding-bottom: 0; }
        .actividad__id { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: var(--brass-dark); }
        .actividad__texto { color: var(--ink); }
        .actividad__cuando { color: var(--muted); font-size: 11.5px; white-space: nowrap; }
        @media (max-width: 620px) { .actividad li { grid-template-columns: 1fr; gap: 2px; } }
      `}</style>

      <div className="topbar">
        <div className="topbar__marca">
          <div className="topbar__marca-icono"><Building2 size={17} /></div>
          <div>
            <div className="topbar__titulo">Gestión Disciplinaria</div>
            <div className="topbar__sub">Tienda San Isidro · Jefe de Tienda</div>
          </div>
        </div>
        <nav className="nav">
          <button className={`nav__item ${vista === "dashboard" ? "nav__item--activo" : ""}`} onClick={() => setVista("dashboard")}>
            <LayoutDashboard size={15} /> Dashboard
          </button>
          <button className={`nav__item ${vista === "reportar" ? "nav__item--activo" : ""}`} onClick={() => setVista("reportar")}>
            <ClipboardList size={15} /> Reportar caso
          </button>
        </nav>
      </div>

      {vista === "dashboard" ? (
        <Dashboard casos={casos} onAccion={actualizarEstado} />
      ) : (
        <ReportarCaso onCasoEnviado={agregarCaso} />
      )}
    </div>
  );
}
