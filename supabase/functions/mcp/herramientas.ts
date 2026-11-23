// Lo que hace cada herramienta del MCP de Cruce, sin saber de MCP ni de Supabase: recibe Datos (la base, como la
// persona que conectó Claude) y devuelve el texto completo para Claude y los mismos datos con estructura para las
// pantallas. servidor.ts las registra en el servidor MCP.
import type { Categoria, CruceFila, Datos, MovimientoFila, TipoReparto } from "./datos.ts";
import {
  estadoParche,
  fraseCruce,
  fraseMiSaldoParche,
  fraseMovimiento,
  frasePagoParche,
  lineaSaldoParche,
  saldoParche,
} from "./frases.ts";
import { formatoPesos, MONTO_MAXIMO, parte } from "./pesos.ts";

/** Los mensajes que ve la persona. Los cuatro primeros son los de la spec herramientas-claude. */
export const MENSAJES = {
  monto: "El monto debe ser de $1 a $999.999.999.",
  concepto: "El concepto debe tener de 1 a 80 caracteres.",
  cruceCerrado: "Este cruce está cerrado: ya no acepta gastos.",
  cruceNoEncontrado: "No encontré ese cruce.",
  parcheNoEncontrado: "No encontré ese parche.",
  porcentaje: "El porcentaje para quien no pagó debe ser un número entero de 0 a 100.",
  repartoConPorcentaje: "porcentaje_otro solo va con el reparto «porcentaje»: quita uno de los dos.",
  fecha: "La fecha debe ir como AAAA-MM-DD (por ejemplo 2026-11-22).",
  noSePudoAnotar: "No pude anotar el gasto. Intenta de nuevo en un momento.",
} as const;

export const CATEGORIAS: Record<Categoria, string> = {
  comida: "Comida",
  mercado: "Mercado",
  transporte: "Transporte",
  hogar: "Hogar",
  ocio: "Ocio",
  prestamo: "Préstamo",
  otro: "Otro",
};

/** Una respuesta de herramienta: `texto` siempre va completo, para los clientes sin pantallas. */
export interface Respuesta<T> {
  texto: string;
  datos: T;
  error?: false;
}

/** Un rechazo con el mensaje para la persona. No se guardó nada. */
export interface Rechazo {
  texto: string;
  error: true;
  datos?: undefined;
}

const rechazo = (texto: string): Rechazo => ({ texto, error: true });

const MOVIMIENTOS_POR_DEFECTO = 20;
const MOVIMIENTOS_MAXIMO = 100;

/** La fecha (AAAA-MM-DD) de un instante en Bogotá. */
function fechaEnBogota(instante: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date(instante));
}

// ─────────────────────────────────────────────────────────────
// ver_cruces
// ─────────────────────────────────────────────────────────────

export interface CruceVista {
  cruce_id: string;
  con: string;
  usuario: string | null;
  /** El color fijo de la otra persona, para la pantalla; null si borró su cuenta (se pinta gris). */
  color: string | null;
  abierto: boolean;
  neto: number;
  frase: string;
  monto: string;
}

export async function verCruces(datos: Datos): Promise<Respuesta<{ cruces: CruceVista[] }>> {
  const [cruces, saldos] = await Promise.all([datos.misCruces(), datos.saldos()]);
  const vistas = cruces.map((c): CruceVista => {
    const neto = saldos.get(c.ledger_id) ?? 0;
    return {
      cruce_id: c.ledger_id,
      con: c.partner_name,
      usuario: c.partner_username,
      color: c.partner_deleted ? null : c.partner_color,
      abierto: c.closed_at === null,
      neto,
      frase: fraseCruce(neto, c.partner_name),
      monto: formatoPesos(Math.abs(neto)),
    };
  });
  if (vistas.length === 0) return { texto: "Aún no tienes cruces.", datos: { cruces: [] } };
  const lineas = vistas.map((v) =>
    `- Cruce con ${v.con}${v.usuario ? ` (@${v.usuario})` : ""}, ${v.abierto ? "abierto" : "cerrado"}: ${v.frase}.` +
    ` (cruce_id: ${v.cruce_id})`
  );
  return { texto: `Tus cruces:\n${lineas.join("\n")}`, datos: { cruces: vistas } };
}

// ─────────────────────────────────────────────────────────────
// ver_movimientos
// ─────────────────────────────────────────────────────────────

export interface MovimientoVista {
  id: string;
  fecha: string;
  concepto: string;
  categoria: string;
  tipo: "gasto" | "pago para saldar";
  monto: number;
  pago: string;
  le_toca_a_quien_no_pago: number;
  detalle: string;
}

/** Busca el cruce entre los de quien pregunta; uno ajeno o inexistente da undefined. */
async function buscarCruce(datos: Datos, cruceId: string): Promise<CruceFila | undefined> {
  return (await datos.misCruces()).find((c) => c.ledger_id === cruceId);
}

export async function verMovimientos(
  datos: Datos,
  entrada: { cruce_id: string; limite?: number },
): Promise<Respuesta<MovimientosVista> | Rechazo> {
  const cruce = await buscarCruce(datos, entrada.cruce_id);
  if (!cruce) return rechazo(MENSAJES.cruceNoEncontrado);
  const pedido = Number.isFinite(entrada.limite) ? Math.trunc(entrada.limite!) : MOVIMIENTOS_POR_DEFECTO;
  const limite = Math.min(Math.max(pedido, 1), MOVIMIENTOS_MAXIMO);
  const [filas, miNombre, saldos] = await Promise.all([
    datos.movimientos(cruce.ledger_id, limite),
    datos.miNombre(),
    datos.saldos(),
  ]);
  const movimientos = filas.map((m) => vistaMovimiento(m, datos.miId, miNombre, cruce.partner_name));
  const neto = saldos.get(cruce.ledger_id) ?? 0;
  const vista: MovimientosVista = {
    cruce_id: cruce.ledger_id,
    con: cruce.partner_name,
    abierto: cruce.closed_at === null,
    neto,
    saldo: fraseCruce(neto, cruce.partner_name),
    movimientos,
  };
  const titulo = `Movimientos con ${cruce.partner_name}`;
  if (movimientos.length === 0) return { texto: `${titulo}: aún no hay ninguno.`, datos: vista };
  const lineas = movimientos.map((m) =>
    `- ${m.fecha} · ${m.concepto} (${m.categoria}) · ${formatoPesos(m.monto)} · ${m.detalle}`
  );
  return { texto: `${titulo}, del más reciente al más antiguo:\n${lineas.join("\n")}`, datos: vista };
}

/** Lo que devuelve ver_movimientos: además de la lista, el saldo y si el cruce acepta gastos (para la pantalla). */
export interface MovimientosVista {
  cruce_id: string;
  con: string;
  abierto: boolean;
  neto: number;
  saldo: string;
  movimientos: MovimientoVista[];
}

function vistaMovimiento(m: MovimientoFila, miId: string, miNombre: string, otra: string): MovimientoVista {
  const pago = m.payer_id === miId ? miNombre : otra;
  const noPago = m.payer_id === miId ? otra : miNombre;
  return {
    id: m.id,
    fecha: fechaEnBogota(m.occurred_at),
    concepto: m.concept,
    categoria: CATEGORIAS[m.category] ?? m.category,
    tipo: m.kind === "settlement" ? "pago para saldar" : "gasto",
    monto: m.amount,
    pago,
    le_toca_a_quien_no_pago: m.owed_by_other,
    detalle: fraseMovimiento({
      tipo: m.kind,
      pagador: pago,
      otro: noPago,
      monto: m.amount,
      porcentajeOtro: m.other_share_percent,
    }),
  };
}

// ─────────────────────────────────────────────────────────────
// ver_parches y ver_parche
// ─────────────────────────────────────────────────────────────

export interface ParcheVista {
  parche_id: string;
  nombre: string;
  estado: string;
  abierto: boolean;
  personas: number;
  neto: number;
  frase: string;
}

export async function verParches(datos: Datos): Promise<Respuesta<{ parches: ParcheVista[] }>> {
  const parches = await datos.misParches();
  const resumenes = await Promise.all(parches.map((p) => datos.resumenParche(p.id)));
  const vistas: ParcheVista[] = [];
  for (const resumen of resumenes) {
    if (!resumen) continue;
    const yo = resumen.people.find((p) => p.is_me);
    const neto = yo?.net ?? 0;
    vistas.push({
      parche_id: resumen.parche_id,
      nombre: resumen.name,
      estado: estadoParche(resumen.status, resumen.people.map((p) => p.net)),
      abierto: resumen.status === "open",
      personas: resumen.people.length,
      neto,
      frase: saldoParche(neto, true),
    });
  }
  if (vistas.length === 0) return { texto: "Aún no tienes parches.", datos: { parches: [] } };
  const lineas = vistas.map((v) => {
    const personas = v.personas === 1 ? "1 persona" : `${v.personas} personas`;
    return `- ${v.nombre} · ${v.estado} · ${personas} · ${v.frase} (parche_id: ${v.parche_id})`;
  });
  return { texto: `Tus parches:\n${lineas.join("\n")}`, datos: { parches: vistas } };
}

export interface ParcheDetalleVista {
  parche_id: string;
  nombre: string;
  estado: string;
  tu_saldo: string;
  saldos: { nombre: string; tu: boolean; sin_la_app: boolean; neto: number; frase: string }[];
  para_saldar: { de: string; a: string; monto: number; frase: string }[];
}

export async function verParche(
  datos: Datos,
  entrada: { parche_id: string },
): Promise<Respuesta<ParcheDetalleVista> | Rechazo> {
  const resumen = await datos.resumenParche(entrada.parche_id);
  if (!resumen) return rechazo(MENSAJES.parcheNoEncontrado);
  const netos = resumen.people.map((p) => p.net);
  const todosEnCero = resumen.expense_count > 0 && netos.every((n) => n === 0);
  const saldado = resumen.status === "closed" && netos.every((n) => n === 0);
  const yo = resumen.people.find((p) => p.is_me);
  const nombre = (id: string) => resumen.people.find((p) => p.participant_id === id)?.name ?? "Alguien";
  const vista: ParcheDetalleVista = {
    parche_id: resumen.parche_id,
    nombre: resumen.name,
    estado: estadoParche(resumen.status, netos),
    tu_saldo: fraseMiSaldoParche({ miNeto: yo?.net ?? 0, todosEnCero, saldado }),
    saldos: resumen.people.map((p) => ({
      nombre: p.name,
      tu: p.is_me,
      sin_la_app: !p.has_app && !p.deleted,
      neto: p.net,
      frase: lineaSaldoParche(p.net, p.is_me),
    })),
    para_saldar: resumen.transfers.map((t) => ({
      de: nombre(t.from_id),
      a: nombre(t.to_id),
      monto: t.amount,
      frase: frasePagoParche({
        de: nombre(t.from_id),
        a: nombre(t.to_id),
        monto: t.amount,
        deEsTu: t.from_id === resumen.my_participant_id,
        aEsTu: t.to_id === resumen.my_participant_id,
      }),
    })),
  };
  const partes = [`Parche ${vista.nombre} · ${vista.estado}`, `Tu saldo: ${vista.tu_saldo}.`];
  if (todosEnCero) {
    partes.push("Nadie le debe nada a nadie.");
  } else {
    const etiqueta = (s: ParcheDetalleVista["saldos"][number]) =>
      s.nombre + (s.tu ? " (tú)" : "") + (s.sin_la_app ? " (sin la app)" : "");
    partes.push(`Saldos:\n${vista.saldos.map((s) => `- ${etiqueta(s)}: ${s.frase}`).join("\n")}`);
    if (vista.para_saldar.length > 0) {
      partes.push(`Para saldar:\n${vista.para_saldar.map((t) => `- ${t.frase}`).join("\n")}`);
    }
  }
  return { texto: partes.join("\n"), datos: vista };
}

// ─────────────────────────────────────────────────────────────
// anotar_gasto
// ─────────────────────────────────────────────────────────────

export type Reparto = "a_medias" | "porcentaje" | "todo_del_otro";

export interface EntradaGasto {
  cruce_id: string;
  monto: number;
  concepto: string;
  quien_pago: "yo" | "la_otra_persona";
  reparto?: Reparto;
  porcentaje_otro?: number;
  categoria?: Categoria;
  fecha?: string;
}

export interface Reloj {
  ahora: () => Date;
  nuevoId: () => string;
}

/** El reparto como lo guarda la base: `equal`/50, `percentage`/n o `full_other`/100. */
function repartoEnLaBase(porcentajeOtro: number): { split_type: TipoReparto; other_share_percent: number } {
  if (porcentajeOtro === 50) return { split_type: "equal", other_share_percent: 50 };
  if (porcentajeOtro === 100) return { split_type: "full_other", other_share_percent: 100 };
  return { split_type: "percentage", other_share_percent: porcentajeOtro };
}

/** El mediodía de Bogotá (UTC−5, sin horario de verano) de una fecha AAAA-MM-DD; null si la fecha no existe. */
function mediodiaEnBogota(fecha: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const instante = new Date(`${fecha}T12:00:00-05:00`);
  if (Number.isNaN(instante.getTime()) || fechaEnBogota(instante) !== fecha) return null;
  return instante.toISOString();
}

export async function anotarGasto(
  datos: Datos,
  entrada: EntradaGasto,
  reloj: Reloj,
): Promise<Respuesta<{ gasto: MovimientoVista; saldo: string; neto: number }> | Rechazo> {
  // 1. Lo que se puede revisar sin la base.
  if (!Number.isInteger(entrada.monto) || entrada.monto < 1 || entrada.monto > MONTO_MAXIMO) {
    return rechazo(MENSAJES.monto);
  }
  const concepto = (entrada.concepto ?? "").trim();
  // Como char_length en Postgres: se cuentan caracteres, no unidades de UTF-16.
  const largo = [...concepto].length;
  if (largo < 1 || largo > 80) return rechazo(MENSAJES.concepto);
  // Un porcentaje sin reparto es un reparto por porcentaje; con otro reparto, se rechaza en vez de ignorarlo.
  const repartoPedido = entrada.reparto ?? (entrada.porcentaje_otro !== undefined ? "porcentaje" : undefined);
  if (repartoPedido !== "porcentaje" && entrada.porcentaje_otro !== undefined) {
    return rechazo(MENSAJES.repartoConPorcentaje);
  }
  let porcentajePedido: number | undefined;
  if (repartoPedido === "a_medias") porcentajePedido = 50;
  if (repartoPedido === "todo_del_otro") porcentajePedido = 100;
  if (repartoPedido === "porcentaje") {
    const n = entrada.porcentaje_otro;
    if (n === undefined || !Number.isInteger(n) || n < 0 || n > 100) return rechazo(MENSAJES.porcentaje);
    porcentajePedido = n;
  }
  let ocurrio = reloj.ahora().toISOString();
  if (entrada.fecha !== undefined) {
    const mediodia = mediodiaEnBogota(entrada.fecha);
    if (!mediodia) return rechazo(MENSAJES.fecha);
    ocurrio = mediodia;
  }

  // 2. El cruce tiene que ser de quien pregunta y estar abierto; de ahí sale el reparto por defecto.
  const cruce = await buscarCruce(datos, entrada.cruce_id);
  if (!cruce) return rechazo(MENSAJES.cruceNoEncontrado);
  if (cruce.closed_at !== null) return rechazo(MENSAJES.cruceCerrado);
  const reparto = repartoEnLaBase(porcentajePedido ?? cruce.default_other_percent);

  // 3. Se inserta con el cliente de la persona: RLS y los triggers de la base vuelven a revisar todo.
  const gasto = {
    id: reloj.nuevoId(),
    ledger_id: cruce.ledger_id,
    kind: "expense" as const,
    payer_id: entrada.quien_pago === "yo" ? datos.miId : cruce.partner_id,
    amount: entrada.monto,
    concept: concepto,
    category: entrada.categoria ?? "otro",
    ...reparto,
    occurred_at: ocurrio,
  };
  const error = await datos.anotarGasto(gasto);
  // 4. Se cerró entre la lectura y la escritura.
  if (error?.hint === "cruceClosed") return rechazo(MENSAJES.cruceCerrado);
  if (error) {
    console.error("anotar_gasto: la base rechazó el gasto", error.hint ?? "", error.message);
    return rechazo(MENSAJES.noSePudoAnotar);
  }

  // 5. El gasto y el saldo nuevo, leído otra vez de la base.
  const [saldos, miNombre] = await Promise.all([datos.saldos(), datos.miNombre()]);
  const neto = saldos.get(cruce.ledger_id) ?? 0;
  const saldo = fraseCruce(neto, cruce.partner_name);
  const vista = vistaMovimiento(
    { ...gasto, owed_by_other: parte(gasto.amount, gasto.other_share_percent) },
    datos.miId,
    miNombre,
    cruce.partner_name,
  );
  return {
    texto: `Anoté «${vista.concepto}» (${vista.categoria}) por ${formatoPesos(vista.monto)} el ${vista.fecha}. ` +
      `${vista.detalle}.\nSaldo con ${cruce.partner_name}: ${saldo}.`,
    datos: { gasto: vista, saldo, neto },
  };
}

// ─────────────────────────────────────────────────────────────
// abrir_anotar
// ─────────────────────────────────────────────────────────────

/** Lo que necesita el formulario de anotar (pantalla anotar.html). */
export interface FormularioVista {
  cruce_id: string;
  /** El nombre de quien conectó Claude y el de la otra persona, para «¿Quién pagó?». */
  yo: string;
  con: string;
  porcentaje_por_defecto: number;
  neto: number;
  saldo: string;
  categorias: { id: Categoria; nombre: string }[];
}

/** El reparto en palabras: «a medias», «todo es del otro» o «70 % para quien no pagó». */
function repartoEnPalabras(porcentajeOtro: number): string {
  if (porcentajeOtro === 50) return "a medias";
  if (porcentajeOtro === 100) return "todo es del otro";
  return `${porcentajeOtro} % para quien no pagó`;
}

/**
 * Abre el formulario para anotar en un cruce. No escribe nada: guardar lo hace anotar_gasto, con sus reglas. Sin
 * pantallas, el texto dice qué hace falta para anotar.
 */
export async function abrirAnotar(
  datos: Datos,
  entrada: { cruce_id: string },
): Promise<Respuesta<FormularioVista> | Rechazo> {
  const cruce = await buscarCruce(datos, entrada.cruce_id);
  if (!cruce) return rechazo(MENSAJES.cruceNoEncontrado);
  if (cruce.closed_at !== null) return rechazo(MENSAJES.cruceCerrado);
  const [miNombre, saldos] = await Promise.all([datos.miNombre(), datos.saldos()]);
  const neto = saldos.get(cruce.ledger_id) ?? 0;
  const vista: FormularioVista = {
    cruce_id: cruce.ledger_id,
    yo: miNombre,
    con: cruce.partner_name,
    porcentaje_por_defecto: cruce.default_other_percent,
    neto,
    saldo: fraseCruce(neto, cruce.partner_name),
    categorias: (Object.entries(CATEGORIAS) as [Categoria, string][]).map(([id, nombre]) => ({ id, nombre })),
  };
  return {
    texto: `Para anotar un gasto con ${vista.con} necesito el monto, el concepto, quién pagó (tú o ${vista.con}), ` +
      `el reparto (si no lo dices, ${repartoEnPalabras(vista.porcentaje_por_defecto)}) y la categoría.\n` +
      `Saldo de hoy: ${vista.saldo}.`,
    datos: vista,
  };
}
