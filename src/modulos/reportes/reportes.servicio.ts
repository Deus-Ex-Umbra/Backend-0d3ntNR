import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Paciente } from '../pacientes/entidades/paciente.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { Pago } from '../finanzas/entidades/pago.entidad';
import { Egreso } from '../finanzas/entidades/egreso.entidad';
import { Inventario } from '../inventario/entidades/inventario.entidad';
import { Producto } from '../inventario/entidades/producto.entidad';
import { Kardex, TipoOperacionKardex } from '../inventario/entidades/kardex.entidad';
import { Activo } from '../inventario/entidades/activo.entidad';
import { Reporte } from './entidades/reporte.entidad';
import { Usuario } from '../usuarios/entidades/usuario.entidad';
import { ConfiguracionClinica } from '../catalogo/entidades/configuracion-clinica.entidad';
import { GeminiServicio } from '../gemini/gemini.servicio';
import { GenerarReporteDto, AreaReporte } from './dto/generar-reporte.dto';
import { AlmacenamientoServicio, TipoDocumento } from '../almacenamiento/almacenamiento.servicio';
import PDFDocument from 'pdfkit';
import { createReadStream } from 'fs';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

@Injectable()
export class ReportesServicio {
  constructor(
    @InjectRepository(Paciente)
    private readonly paciente_repositorio: Repository<Paciente>,
    @InjectRepository(Cita)
    private readonly cita_repositorio: Repository<Cita>,
    @InjectRepository(PlanTratamiento)
    private readonly plan_repositorio: Repository<PlanTratamiento>,
    @InjectRepository(Pago)
    private readonly pago_repositorio: Repository<Pago>,
    @InjectRepository(Egreso)
    private readonly egreso_repositorio: Repository<Egreso>,
    @InjectRepository(Inventario)
    private readonly inventario_repositorio: Repository<Inventario>,
    @InjectRepository(Producto)
    private readonly producto_repositorio: Repository<Producto>,
    @InjectRepository(Kardex)
    private readonly kardex_repositorio: Repository<Kardex>,
    @InjectRepository(Activo)
    private readonly activo_repositorio: Repository<Activo>,
    @InjectRepository(Reporte)
    private readonly reporte_repositorio: Repository<Reporte>,
    @InjectRepository(Usuario)
    private readonly usuario_repositorio: Repository<Usuario>,
    @InjectRepository(ConfiguracionClinica)
    private readonly configuracion_clinica_repositorio: Repository<ConfiguracionClinica>,
    private readonly gemini_servicio: GeminiServicio,
    private readonly almacenamiento_servicio: AlmacenamientoServicio,
  ) { }

  async generarReporte(usuario_id: number, dto: GenerarReporteDto): Promise<Buffer> {
    // Parsear fechas asegurando que se interpreten como locales (00:00:00) y no UTC
    let fecha_inicio = new Date(0);
    if (dto.fecha_inicio) {
      const [year, month, day] = dto.fecha_inicio.toString().split('-').map(Number);
      fecha_inicio = new Date(year, month - 1, day);
    }

    let fecha_fin = new Date();
    if (dto.fecha_fin) {
      const [year, month, day] = dto.fecha_fin.toString().split('-').map(Number);
      fecha_fin = new Date(year, month - 1, day);
    }
    // Establecer final del día para la fecha fin
    fecha_fin.setHours(23, 59, 59, 999);

    const usuario = await this.usuario_repositorio.findOne({ where: { id: usuario_id } });
    const config_clinica = await this.configuracion_clinica_repositorio.findOne({ where: { usuario: { id: usuario_id } } });

    const datos_reporte: any = {
      fecha_generacion: new Date(),
      periodo: {
        inicio: fecha_inicio,
        fin: fecha_fin,
      },
      metadatos: {
        nombre_usuario: usuario ? usuario.nombre : 'Usuario',
        nombre_clinica: config_clinica?.nombre_clinica || 'Clínica Dental',
      },
      areas: {},
    };

    for (const area of dto.areas) {
      switch (area) {
        case AreaReporte.FINANZAS:
          datos_reporte.areas.finanzas = await this.obtenerDatosFinanzas(usuario_id, fecha_inicio, fecha_fin);
          break;
        case AreaReporte.AGENDA:
          datos_reporte.areas.agenda = await this.obtenerDatosAgenda(usuario_id, fecha_inicio, fecha_fin);
          break;
        case AreaReporte.TRATAMIENTOS:
          datos_reporte.areas.tratamientos = await this.obtenerDatosTratamientos(usuario_id, fecha_inicio, fecha_fin);
          break;
        case AreaReporte.INVENTARIO:
          datos_reporte.areas.inventario = await this.obtenerDatosInventario(usuario_id, fecha_inicio, fecha_fin);
          break;
      }
    }

    const incluir_sugerencias = dto.incluir_sugerencias !== false;
    const texto_gemini = await this.generarTextoConGemini(datos_reporte, dto.areas, incluir_sugerencias);

    return this.generarPDF(datos_reporte, texto_gemini);
  }

  private async obtenerDatosFinanzas(usuario_id: number, fecha_inicio: Date, fecha_fin: Date): Promise<any> {
    const pagos = await this.pago_repositorio.find({
      where: {
        fecha: Between(fecha_inicio, fecha_fin),
        usuario: { id: usuario_id }
      },
      relations: ['plan_tratamiento', 'plan_tratamiento.paciente'],
    });

    const egresos = await this.egreso_repositorio.find({
      where: {
        fecha: Between(fecha_inicio, fecha_fin),
        usuario: { id: usuario_id }
      },
    });

    const total_ingresos = pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    const total_egresos = egresos.reduce((sum, e) => sum + Number(e.monto), 0);
    const balance = total_ingresos - total_egresos;

    const categorias_egresos: { [key: string]: { cantidad: number; monto: number } } = {};
    egresos.forEach(e => {
      const concepto_base = e.concepto?.split(':')[0]?.trim() || 'Otros';
      if (!categorias_egresos[concepto_base]) {
        categorias_egresos[concepto_base] = { cantidad: 0, monto: 0 };
      }
      categorias_egresos[concepto_base].cantidad++;
      categorias_egresos[concepto_base].monto += Number(e.monto);
    });

    const top_egresos = Object.entries(categorias_egresos)
      .map(([concepto, datos]) => ({ concepto, ...datos }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);

    const dias_periodo = Math.max(1, Math.ceil((fecha_fin.getTime() - fecha_inicio.getTime()) / (1000 * 60 * 60 * 24)));
    const promedio_diario_ingresos = total_ingresos / dias_periodo;
    const promedio_diario_egresos = total_egresos / dias_periodo;

    return {
      total_ingresos,
      total_egresos,
      balance,
      cantidad_pagos: pagos.length,
      cantidad_egresos: egresos.length,
      promedio_diario_ingresos,
      promedio_diario_egresos,
      top_categorias_egresos: top_egresos,
      pagos: pagos.slice(0, 10).map(p => ({
        fecha: p.fecha,
        monto: Number(p.monto),
        concepto: p.concepto,
        paciente: p.plan_tratamiento?.paciente ?
          `${p.plan_tratamiento.paciente.nombre} ${p.plan_tratamiento.paciente.apellidos}` :
          'N/A',
      })),
      egresos: egresos.slice(0, 10).map(e => ({
        fecha: e.fecha,
        monto: Number(e.monto),
        concepto: e.concepto,
      })),
    };
  }

  private async obtenerDatosAgenda(usuario_id: number, fecha_inicio: Date, fecha_fin: Date): Promise<any> {
    const citas = await this.cita_repositorio.find({
      where: {
        fecha: Between(fecha_inicio, fecha_fin),
        usuario: { id: usuario_id }
      },
      relations: ['paciente', 'plan_tratamiento'],
    });

    const citas_por_estado = {
      pendiente: citas.filter(c => c.estado_pago === 'pendiente').length,
      pagado: citas.filter(c => c.estado_pago === 'pagado').length,
      cancelado: citas.filter(c => c.estado_pago === 'cancelado').length,
      sin_paciente: citas.filter(c => !c.paciente).length,
    };

    return {
      total_citas: citas.length,
      citas_por_estado,
      proximas_citas: citas
        .filter(c => new Date(c.fecha) > new Date())
        .slice(0, 10)
        .map(c => ({
          fecha: c.fecha,
          descripcion: c.descripcion,
          paciente: c.paciente ? `${c.paciente.nombre} ${c.paciente.apellidos}` : 'Sin paciente',
          estado_pago: c.estado_pago,
        })),
    };
  }

  private async obtenerDatosTratamientos(usuario_id: number, fecha_inicio: Date, fecha_fin: Date): Promise<any> {
    const planes = await this.plan_repositorio.find({
      where: { usuario: { id: usuario_id } },
      relations: ['paciente', 'tratamiento', 'citas'],
    });

    const planes_activos = planes.filter(p => !p.finalizado);
    const planes_finalizados = planes.filter(p => p.finalizado);

    const total_por_cobrar = planes_activos.reduce((sum, p) => {
      return sum + (Number(p.costo_total) - Number(p.total_abonado));
    }, 0);

    return {
      total_planes: planes.length,
      planes_activos: planes_activos.length,
      planes_finalizados: planes_finalizados.length,
      total_por_cobrar,
      tratamientos_mas_comunes: this.obtenerTratamientosMasComunes(planes),
      planes_recientes: planes.slice(0, 10).map(p => ({
        paciente: `${p.paciente.nombre} ${p.paciente.apellidos}`,
        tratamiento: p.tratamiento.nombre,
        costo_total: Number(p.costo_total),
        abonado: Number(p.total_abonado),
        pendiente: Number(p.costo_total) - Number(p.total_abonado),
        finalizado: p.finalizado,
      })),
    };
  }

  private obtenerTratamientosMasComunes(planes: PlanTratamiento[]): any[] {
    const conteo: { [key: string]: { nombre: string; cantidad: number } } = {};

    planes.forEach(p => {
      const nombre = p.tratamiento.nombre;
      if (!conteo[nombre]) {
        conteo[nombre] = { nombre, cantidad: 0 };
      }
      conteo[nombre].cantidad++;
    });

    return Object.values(conteo)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }

  private async obtenerDatosInventario(usuario_id: number, fecha_inicio: Date, fecha_fin: Date): Promise<any> {
    const inventarios = await this.inventario_repositorio.find({
      where: {
        propietario: { id: usuario_id },
        activo: true,
      },
      relations: ['productos', 'productos.materiales', 'productos.activos'],
    });

    const inventarios_ids = inventarios.map(inv => inv.id);

    let movimientos_kardex: Kardex[] = [];
    if (inventarios_ids.length > 0) {
      movimientos_kardex = await this.kardex_repositorio
        .createQueryBuilder('kardex')
        .leftJoinAndSelect('kardex.producto', 'producto')
        .where('kardex.inventario IN (:...ids)', { ids: inventarios_ids })
        .andWhere('kardex.fecha BETWEEN :inicio AND :fin', { inicio: fecha_inicio, fin: fecha_fin })
        .orderBy('kardex.fecha', 'DESC')
        .getMany();
    }

    const entradas = movimientos_kardex.filter(m => m.operacion === TipoOperacionKardex.ENTRADA);
    const salidas = movimientos_kardex.filter(m => m.operacion === TipoOperacionKardex.SALIDA);
    const total_entradas = entradas.reduce((sum, m) => sum + Number(m.cantidad), 0);
    const total_salidas = salidas.reduce((sum, m) => sum + Number(m.cantidad), 0);
    const monto_entradas = entradas.reduce((sum, m) => sum + Number(m.monto || 0), 0);
    const monto_salidas = salidas.reduce((sum, m) => sum + Number(m.monto || 0), 0);

    const movimientos_por_tipo: { [key: string]: { cantidad: number; monto: number } } = {};
    movimientos_kardex.forEach(m => {
      if (!movimientos_por_tipo[m.tipo]) {
        movimientos_por_tipo[m.tipo] = { cantidad: 0, monto: 0 };
      }
      movimientos_por_tipo[m.tipo].cantidad += Number(m.cantidad);
      movimientos_por_tipo[m.tipo].monto += Number(m.monto || 0);
    });

    let activos_por_estado: { [key: string]: number } = {};
    let total_activos = 0;
    if (inventarios_ids.length > 0) {
      const activos = await this.activo_repositorio
        .createQueryBuilder('activo')
        .leftJoin('activo.producto', 'producto')
        .leftJoin('producto.inventario', 'inventario')
        .where('inventario.id IN (:...ids)', { ids: inventarios_ids })
        .getMany();

      total_activos = activos.length;
      activos.forEach(a => {
        const estado = a.estado || 'desconocido';
        activos_por_estado[estado] = (activos_por_estado[estado] || 0) + 1;
      });
    }

    const total_productos = inventarios.reduce((sum, inv) => {
      return sum + inv.productos.filter(p => p.activo).length;
    }, 0);

    const productos_bajo_stock = inventarios.flatMap(inv =>
      inv.productos.filter(p => {
        if (!p.activo) return false;
        if (p.tipo === 'material') {
          const stock_actual = p.materiales
            .filter(m => m.activo)
            .reduce((sum, m) => sum + Number(m.cantidad_actual), 0);
          return stock_actual < p.stock_minimo;
        }
        return false;
      })
    );

    return {
      total_inventarios: inventarios.length,
      total_productos,
      total_activos,
      productos_bajo_stock: productos_bajo_stock.length,
      movimientos: {
        total_movimientos: movimientos_kardex.length,
        entradas: { cantidad: total_entradas, monto: monto_entradas, registros: entradas.length },
        salidas: { cantidad: total_salidas, monto: monto_salidas, registros: salidas.length },
        por_tipo: movimientos_por_tipo,
      },
      activos_por_estado,
      alertas: productos_bajo_stock.map(p => ({
        nombre: p.nombre,
        stock_minimo: p.stock_minimo,
        stock_actual: p.materiales
          .filter(m => m.activo)
          .reduce((sum, m) => sum + Number(m.cantidad_actual), 0),
      })),
    };
  }

  private async generarTextoConGemini(datos_reporte: any, areas: AreaReporte[], incluir_sugerencias: boolean): Promise<any> {
    const datos_json = JSON.stringify(datos_reporte, null, 2);

    const prompt = `
Eres un asistente experto en análisis de datos para clínicas dentales. 
A continuación te proporciono datos de un reporte que incluye las siguientes áreas: ${areas.join(', ')}.

Fecha del reporte: ${new Date(datos_reporte.fecha_generacion)}
Período analizado: ${new Date(datos_reporte.periodo.inicio)} - ${new Date(datos_reporte.periodo.fin)}

Datos del reporte:
${datos_json}

Por favor, genera un análisis profesional y coherente.
IMPORTANTE: Debes responder ÚNICAMENTE con un objeto JSON válido (sin bloques de código markdown) con la siguiente estructura:
{
  "resumen": "Un resumen ejecutivo de 2-3 párrafos con el estado general de la clínica.",
  "finanzas": "Análisis específico de finanzas (si aplica), tendencias de ingresos/egresos.",
  "agenda": "Análisis de la agenda, citas, ausentismo, etc.",
  "tratamientos": "Análisis de tratamientos más comunes y rentabilidad.",
  "inventario": "Análisis de estado de inventario, alertas de stock y movimientos.",
  "conclusiones": "Conclusiones finales y recomendaciones prácticas."
}

Si un área no está incluida en los datos, puedes dejar el campo vacío o null.
El texto dentro de cada campo debe usar formato Markdown simple (negritas, listas).
`;

    const respuesta = await this.gemini_servicio.generarContenido(prompt, false);
    try {
      const jsonStr = respuesta.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Error al parsear respuesta de Gemini:', e);
      return {
        resumen: respuesta,
        finanzas: '',
        agenda: '',
        tratamientos: '',
        inventario: '',
        conclusiones: ''
      };
    }
  }

  private async generarPDF(datos_reporte: any, analisis_gemini: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdf_buffer = Buffer.concat(buffers);
          resolve(pdf_buffer);
        });

        doc.font('Times-Roman');

        doc.fontSize(24).text(datos_reporte.metadatos.nombre_clinica, { align: 'center' });
        doc.moveDown(0.5);

        doc.fontSize(20).text('Reporte General', { align: 'center' });
        doc.moveDown();

        const fechaGen = new Date(datos_reporte.fecha_generacion);
        const inicio = new Date(datos_reporte.periodo.inicio);
        const fin = new Date(datos_reporte.periodo.fin);

        const formatoFecha = (d: Date) => {
          return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        };

        const formatoFechaHoraAmigable = (d: Date) => {
          return new Intl.DateTimeFormat('es-BO', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(d);
        };
        // Capitalizar primera letra
        const fechaAmigable = formatoFechaHoraAmigable(fechaGen);
        const fechaFinal = fechaAmigable.charAt(0).toUpperCase() + fechaAmigable.slice(1);

        doc.fontSize(12).text(`Generado por: ${datos_reporte.metadatos.nombre_usuario}`);
        doc.text(`Fecha: ${fechaFinal}`);
        doc.text(`Período: ${formatoFecha(inicio)} - ${formatoFecha(fin)}`);
        doc.moveDown(2);

        if (analisis_gemini.resumen) {
          doc.font('Times-Bold');
          doc.fontSize(16).text('Resumen Ejecutivo', { underline: true });
          doc.moveDown();
          this.agregarTextoMarkdown(doc, analisis_gemini.resumen);
          doc.moveDown(2);
        }

        if (datos_reporte.areas.finanzas) {
          await this.agregarSeccionFinanzas(doc, datos_reporte.areas.finanzas, analisis_gemini.finanzas);
        }

        if (datos_reporte.areas.agenda) {
          await this.agregarSeccionAgenda(doc, datos_reporte.areas.agenda, analisis_gemini.agenda);
        }

        if (datos_reporte.areas.tratamientos) {
          await this.agregarSeccionTratamientos(doc, datos_reporte.areas.tratamientos, analisis_gemini.tratamientos);
        }

        if (datos_reporte.areas.inventario) {
          await this.agregarSeccionInventario(doc, datos_reporte.areas.inventario, analisis_gemini.inventario);
        }

        if (analisis_gemini.conclusiones) {
          doc.addPage();
          doc.font('Times-Bold');
          doc.fontSize(16).text('Conclusiones y Recomendaciones', { underline: true });
          doc.moveDown();
          this.agregarTextoMarkdown(doc, analisis_gemini.conclusiones);
        }

        doc.end();
      } catch (error) {
        reject(new InternalServerErrorException('Error al generar el PDF'));
      }
    });
  }

  private agregarTextoMarkdown(doc: PDFKit.PDFDocument, texto: string): void {
    const lineas = texto.split('\n');

    for (const linea of lineas) {
      if (!linea.trim()) {
        doc.moveDown(0.5);
        continue;
      }
      if (linea.trim().match(/^-{3,}$/) || linea.trim().match(/^\*{3,}$/)) {
        doc.moveDown(0.3);
        const posY = doc.y;
        doc.moveTo(50, posY).lineTo(doc.page.width - 50, posY).stroke();
        doc.moveDown(0.5);
        continue;
      }
      if (linea.startsWith('# ') && !linea.startsWith('## ')) {
        doc.font('Times-Bold');
        doc.fontSize(16).text(linea.substring(2), { continued: false });
        doc.moveDown(0.6);
        doc.font('Times-Roman');
        doc.fontSize(11);
        continue;
      }
      if (linea.startsWith('## ')) {
        doc.font('Times-Bold');
        doc.fontSize(14).text(linea.substring(3), { continued: false });
        doc.moveDown(0.5);
        doc.font('Times-Roman');
        doc.fontSize(11);
        continue;
      }
      if (linea.startsWith('### ')) {
        doc.font('Times-Bold');
        doc.fontSize(12).text(linea.substring(4), { continued: false });
        doc.moveDown(0.3);
        doc.font('Times-Roman');
        doc.fontSize(11);
        continue;
      }
      if (linea.startsWith('#### ')) {
        doc.font('Times-Bold');
        doc.fontSize(11).text(linea.substring(5), { continued: false });
        doc.moveDown(0.3);
        doc.font('Times-Roman');
        doc.fontSize(11);
        continue;
      }
      if (linea.trim().startsWith('- ') || linea.trim().startsWith('* ')) {
        const texto_lista = linea.trim().substring(2);
        doc.fontSize(11);
        this.procesarLineaConFormato(doc, `  • ${texto_lista}`);
        doc.moveDown(0.2);
        continue;
      }
      const match_numerada = linea.trim().match(/^(\d+)\.\s+(.*)$/);
      if (match_numerada) {
        const numero = match_numerada[1];
        const texto_item = match_numerada[2];
        doc.fontSize(11);
        this.procesarLineaConFormato(doc, `  ${numero}. ${texto_item}`);
        doc.moveDown(0.2);
        continue;
      }
      doc.fontSize(11);
      this.procesarLineaConFormato(doc, linea);
      doc.moveDown(0.3);
    }
  }

  private procesarLineaConFormato(doc: PDFKit.PDFDocument, linea: string): void {
    const regex_negrita = /\*\*([^*]+)\*\*/g;
    let ultima_posicion = 0;
    let match;

    const posiciones: Array<{ inicio: number; fin: number; texto: string; negrita: boolean }> = [];

    while ((match = regex_negrita.exec(linea)) !== null) {
      if (match.index > ultima_posicion) {
        posiciones.push({
          inicio: ultima_posicion,
          fin: match.index,
          texto: linea.substring(ultima_posicion, match.index),
          negrita: false,
        });
      }
      posiciones.push({
        inicio: match.index,
        fin: regex_negrita.lastIndex,
        texto: match[1],
        negrita: true,
      });
      ultima_posicion = regex_negrita.lastIndex;
    }

    if (ultima_posicion < linea.length) {
      posiciones.push({
        inicio: ultima_posicion,
        fin: linea.length,
        texto: linea.substring(ultima_posicion),
        negrita: false,
      });
    }
    if (posiciones.length === 0) {
      doc.text(linea);
      return;
    }
    posiciones.forEach((pos, index) => {
      doc.font(pos.negrita ? 'Times-Bold' : 'Times-Roman');
      doc.text(pos.texto, { continued: index < posiciones.length - 1 });
    });
    doc.font('Times-Roman');
  }

  private async agregarSeccionFinanzas(doc: PDFKit.PDFDocument, datos: any, analisis: string): Promise<void> {
    doc.addPage();
    doc.font('Times-Bold');
    doc.fontSize(16).text('Finanzas', { underline: true });
    doc.moveDown();
    if (analisis) {
      this.agregarTextoMarkdown(doc, analisis);
      doc.moveDown();
    }

    doc.font('Times-Roman');
    doc.fontSize(12);
    doc.text(`Total Ingresos: Bs. ${datos.total_ingresos.toFixed(2)}`);
    doc.text(`Total Egresos: Bs. ${datos.total_egresos.toFixed(2)}`);
    if (datos.balance >= 0) {
      doc.fillColor('green');
    } else {
      doc.fillColor('red');
    }
    doc.text(`Balance: Bs. ${datos.balance.toFixed(2)}`);
    doc.fillColor('black');
    doc.moveDown();

    doc.text(`Cantidad de pagos: ${datos.cantidad_pagos}`);
    doc.text(`Cantidad de egresos: ${datos.cantidad_egresos}`);
    doc.moveDown();

    if (datos.pagos.length > 0 || datos.egresos.length > 0) {
      try {
        const grafico_buffer = await this.generarGraficoIngresosEgresos(datos);
        const posicion_y_actual = doc.y;
        if (posicion_y_actual > 500) {
          doc.addPage();
        }

        doc.image(grafico_buffer, {
          fit: [500, 250],
          align: 'center',
        });
        doc.moveDown(2);
      } catch (error) {
        console.error('Error al generar gráfico de finanzas:', error);
      }
    }

    if (datos.pagos.length > 0) {
      doc.font('Times-Bold');
      doc.fontSize(14).text('Últimos Pagos:', { underline: true });
      doc.font('Times-Roman');
      doc.fontSize(10);
      datos.pagos.forEach((pago: any) => {
        doc.text(`• ${new Date(pago.fecha)} - ${pago.paciente}: Bs. ${pago.monto.toFixed(2)}`);
      });
    }
  }

  private async generarGraficoIngresosEgresos(datos: any): Promise<Buffer> {
    const width = 1200;
    const height = 600;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });
    const meses_map = new Map<string, { ingresos: number; egresos: number }>();

    datos.pagos.forEach((pago: any) => {
      const fecha = new Date(pago.fecha);
      const mes_key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (!meses_map.has(mes_key)) {
        meses_map.set(mes_key, { ingresos: 0, egresos: 0 });
      }
      meses_map.get(mes_key)!.ingresos += pago.monto;
    });

    if (datos.egresos && Array.isArray(datos.egresos)) {
      datos.egresos.forEach((egreso: any) => {
        const fecha = new Date(egreso.fecha);
        const mes_key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        if (!meses_map.has(mes_key)) {
          meses_map.set(mes_key, { ingresos: 0, egresos: 0 });
        }
        meses_map.get(mes_key)!.egresos += egreso.monto;
      });
    }

    const meses_ordenados = Array.from(meses_map.keys()).sort();
    const labels = meses_ordenados.map(mes => {
      const [year, month] = mes.split('-');
      const fecha = new Date(parseInt(year), parseInt(month) - 1);
      return fecha;
    });

    const ingresos = meses_ordenados.map(mes => meses_map.get(mes)!.ingresos);
    const egresos = meses_ordenados.map(mes => meses_map.get(mes)!.egresos);

    const configuration: any = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos',
            data: ingresos,
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 2,
          },
          {
            label: 'Egresos',
            data: egresos,
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: false,
        devicePixelRatio: 2,
        plugins: {
          title: {
            display: true,
            text: 'Ingresos vs Egresos Mensuales',
            font: { size: 24, family: 'Helvetica', weight: 'bold' },
            padding: 20,
          },
          datalabels: {
            display: true,
            color: '#000',
            anchor: 'end',
            align: 'top',
            font: { weight: 'bold', size: 14, family: 'Helvetica' },
            formatter: function (value: number) {
              return 'Bs. ' + value.toFixed(0);
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value: any) { return 'Bs. ' + value.toFixed(0); },
              font: { family: 'Helvetica', size: 14 },
            },
          },
          x: {
            ticks: { font: { family: 'Helvetica', size: 14 } },
          },
        },
      },
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
  }

  private async agregarSeccionAgenda(doc: PDFKit.PDFDocument, datos: any, analisis: string): Promise<void> {
    doc.addPage();
    doc.font('Times-Bold');
    doc.fontSize(16).text('Agenda', { underline: true });
    doc.moveDown();

    if (analisis) {
      this.agregarTextoMarkdown(doc, analisis);
      doc.moveDown();
    }

    doc.font('Times-Roman');
    doc.fontSize(12);
    doc.text(`Total de citas: ${datos.total_citas}`);
    doc.moveDown();
    if (datos.citas_por_estado && datos.total_citas > 0) {
      try {
        const grafico_buffer = await this.generarGraficoCitasPorEstado(datos.citas_por_estado);
        const posicion_y_actual = doc.y;
        if (posicion_y_actual > 450) {
          doc.addPage();
        }

        doc.image(grafico_buffer, {
          fit: [400, 300],
          align: 'center',
        });
        doc.moveDown(2);
      } catch (error) {
        console.error('Error al generar gráfico de citas:', error);
      }
    }

    doc.font('Times-Bold');
    doc.fontSize(14).text('Citas por estado:');
    doc.font('Times-Roman');
    doc.fontSize(11);
    doc.text(`• Pendientes: ${datos.citas_por_estado.pendiente}`);
    doc.text(`• Pagadas: ${datos.citas_por_estado.pagado}`);
    doc.text(`• Canceladas: ${datos.citas_por_estado.cancelado}`);
    doc.text(`• Sin paciente: ${datos.citas_por_estado.sin_paciente}`);
    doc.moveDown();

    if (datos.proximas_citas.length > 0) {
      doc.font('Times-Bold');
      doc.fontSize(14).text('Próximas Citas:', { underline: true });
      doc.font('Times-Roman');
      doc.fontSize(10);
      datos.proximas_citas.forEach((cita: any) => {
        doc.text(`• ${new Date(cita.fecha)} - ${cita.paciente}`);
      });
    }
  }

  private async generarGraficoCitasPorEstado(citas_por_estado: any): Promise<Buffer> {
    const width = 800;
    const height = 600;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });

    const total_citas = (citas_por_estado.pendiente || 0) + (citas_por_estado.pagado || 0) +
      (citas_por_estado.cancelado || 0) + (citas_por_estado.sin_paciente || 0);

    const configuration: any = {
      type: 'doughnut',
      data: {
        labels: ['Pendientes', 'Pagadas', 'Canceladas', 'Sin Paciente'],
        datasets: [
          {
            data: [
              citas_por_estado.pendiente || 0,
              citas_por_estado.pagado || 0,
              citas_por_estado.cancelado || 0,
              citas_por_estado.sin_paciente || 0,
            ],
            backgroundColor: [
              'rgba(234, 179, 8, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(156, 163, 175, 0.8)',
            ],
            borderColor: [
              'rgba(234, 179, 8, 1)',
              'rgba(34, 197, 94, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(156, 163, 175, 1)',
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: false,
        devicePixelRatio: 2,
        plugins: {
          title: {
            display: true,
            text: 'Distribución de Citas por Estado',
            font: { size: 24, family: 'Helvetica', weight: 'bold' },
            padding: 20,
          },
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Helvetica', size: 16 },
              padding: 20,
              generateLabels: function (chart: any) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map(function (label: string, i: number) {
                    const value = data.datasets[0].data[i];
                    const percentage = total_citas > 0 ? ((value / total_citas) * 100).toFixed(2) : '0.00';
                    return {
                      text: `${label}: ${value} (${percentage}%)`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      hidden: false,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
        },
      },
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
  }

  private async agregarSeccionTratamientos(doc: PDFKit.PDFDocument, datos: any, analisis: string): Promise<void> {
    doc.addPage();
    doc.font('Times-Bold');
    doc.fontSize(16).text('Tratamientos', { underline: true });
    doc.moveDown();

    if (analisis) {
      this.agregarTextoMarkdown(doc, analisis);
      doc.moveDown();
    }

    doc.font('Times-Roman');
    doc.fontSize(12);
    doc.text(`Total de planes: ${datos.total_planes}`);
    doc.text(`Planes activos: ${datos.planes_activos}`);
    doc.text(`Planes finalizados: ${datos.planes_finalizados}`);
    doc.text(`Total por cobrar: Bs. ${datos.total_por_cobrar.toFixed(2)}`);
    doc.moveDown();

    if (datos.tratamientos_mas_comunes && datos.tratamientos_mas_comunes.length > 0) {
      try {
        const grafico_buffer = await this.generarGraficoTratamientos(datos.tratamientos_mas_comunes);
        const posicion_y_actual = doc.y;
        if (posicion_y_actual > 450) {
          doc.addPage();
        }

        doc.image(grafico_buffer, {
          fit: [500, 300],
          align: 'center',
        });
        doc.moveDown(2);
      } catch (error) {
        console.error('Error al generar gráfico de tratamientos:', error);
      }

      doc.font('Times-Bold');
      doc.fontSize(14).text('Tratamientos más comunes:', { underline: true });
      doc.font('Times-Roman');
      doc.fontSize(11);
      datos.tratamientos_mas_comunes.forEach((t: any) => {
        doc.text(`• ${t.nombre}: ${t.cantidad} veces`);
      });
    }
  }

  private async generarGraficoTratamientos(tratamientos: any[]): Promise<Buffer> {
    const width = 1000;
    const height = 600;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });
    const top_tratamientos = tratamientos.slice(0, 10);
    const labels = top_tratamientos.map(t => t.nombre);
    const datos = top_tratamientos.map(t => t.cantidad);

    const configuration: any = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Cantidad de veces',
            data: datos,
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: false,
        devicePixelRatio: 2,
        plugins: {
          title: {
            display: true,
            text: 'Tratamientos Más Comunes',
            font: { size: 24, family: 'Helvetica', weight: 'bold' },
            padding: 20,
          },
          legend: { display: false },
          datalabels: {
            display: true,
            color: '#000',
            anchor: 'end',
            align: 'right',
            font: { weight: 'bold', size: 14, family: 'Helvetica' },
            formatter: function (value: number) { return value.toString(); },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: { family: 'Helvetica', size: 14 },
            },
          },
          y: {
            ticks: { font: { family: 'Helvetica', size: 14 } },
          },
        },
      },
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
  }

  private async agregarSeccionInventario(doc: PDFKit.PDFDocument, datos: any, analisis: string): Promise<void> {
    doc.addPage();
    doc.font('Times-Bold');
    doc.fontSize(16).text('Inventario', { underline: true });
    doc.moveDown();

    if (analisis) {
      this.agregarTextoMarkdown(doc, analisis);
      doc.moveDown();
    }

    doc.font('Times-Roman');
    doc.fontSize(12);
    doc.text(`Total de inventarios: ${datos.total_inventarios}`);
    doc.text(`Total de productos: ${datos.total_productos}`);
    doc.text(`Productos con stock bajo: ${datos.productos_bajo_stock}`);
    doc.moveDown();

    if (datos.activos_por_estado && Object.keys(datos.activos_por_estado).length > 0) {
      try {
        const grafico_buffer = await this.generarGraficoInventario(datos.activos_por_estado);
        const posicion_y_actual = doc.y;
        if (posicion_y_actual > 450) {
          doc.addPage();
        }

        doc.image(grafico_buffer, {
          fit: [400, 300],
          align: 'center',
        });
        doc.moveDown(2);
      } catch (error) {
        console.error('Error al generar gráfico de inventario:', error);
      }
    }

    if (datos.alertas.length > 0) {
      doc.fillColor('red');
      doc.font('Times-Bold');
      doc.fontSize(14).text('Alertas de Stock Bajo:', { underline: true });
      doc.fillColor('black');
      doc.font('Times-Roman');
      doc.fontSize(10);

      doc.moveDown(0.5);
      const startX = 50;
      let currentY = doc.y;

      doc.font('Times-Bold');
      doc.text('Producto', startX, currentY);
      doc.text('Stock Actual', startX + 250, currentY);
      doc.text('Mínimo', startX + 350, currentY);
      doc.text('Estado', startX + 450, currentY);

      doc.moveTo(startX, currentY + 15).lineTo(550, currentY + 15).stroke();
      currentY += 20;
      doc.font('Times-Roman');

      datos.alertas.forEach((alerta: any) => {
        if (currentY > 700) {
          doc.addPage();
          currentY = 50;
        }
        doc.text(alerta.nombre, startX, currentY);
        doc.text(alerta.stock_actual.toString(), startX + 250, currentY);
        doc.text(alerta.stock_minimo.toString(), startX + 350, currentY);
        doc.fillColor('red');
        doc.text('BAJO', startX + 450, currentY);
        doc.fillColor('black');
        currentY += 15;
      });
      doc.moveDown();
    }

    if (datos.movimientos) {
      doc.font('Times-Bold');
      doc.fontSize(14).text('Resumen de Movimientos:', { underline: true });
      doc.font('Times-Roman');
      doc.fontSize(11);
      doc.moveDown(0.5);

      doc.text(`• Total Movimientos: ${datos.movimientos.total_movimientos}`);
      doc.text(`• Entradas: ${datos.movimientos.entradas.cantidad} unidades (Bs. ${datos.movimientos.entradas.monto.toFixed(2)})`);
      doc.text(`• Salidas: ${datos.movimientos.salidas.cantidad} unidades (Bs. ${datos.movimientos.salidas.monto.toFixed(2)})`);
    }
  }

  private async generarGraficoInventario(activos_por_estado: any): Promise<Buffer> {
    const width = 600;
    const height = 400;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: 'white' });

    const labels = Object.keys(activos_por_estado);
    const data = Object.values(activos_por_estado);

    const configuration: any = {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data: data,
            backgroundColor: [
              'rgba(34, 197, 94, 0.7)',
              'rgba(234, 179, 8, 0.7)',
              'rgba(239, 68, 68, 0.7)',
              'rgba(59, 130, 246, 0.7)',
              'rgba(156, 163, 175, 0.7)',
            ],
            borderColor: [
              'rgba(34, 197, 94, 1)',
              'rgba(234, 179, 8, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(59, 130, 246, 1)',
              'rgba(156, 163, 175, 1)',
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Estado de Activos',
            font: { size: 16, family: 'Times New Roman' },
          },
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Times New Roman', size: 12 } },
          },
          datalabels: {
            display: true,
            color: '#000',
            font: { weight: 'bold', size: 14, family: 'Helvetica' },
            formatter: function (value: number, ctx: any) {
              let sum = 0;
              const dataArr = ctx.chart.data.datasets[0].data;
              dataArr.map((data: number) => {
                sum += data;
              });
              const percentage = (value * 100 / sum).toFixed(1) + "%";
              return percentage;
            },
          },
        },
      },
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
  }

  async generarYGuardarReporte(usuario_id: number, dto: GenerarReporteDto) {
    // Parsear fechas asegurando que se interpreten como locales (00:00:00) y no UTC
    let fecha_inicio = new Date(0);
    if (dto.fecha_inicio) {
      const [year, month, day] = dto.fecha_inicio.toString().split('-').map(Number);
      fecha_inicio = new Date(year, month - 1, day);
    }

    let fecha_fin = new Date();
    if (dto.fecha_fin) {
      const [year, month, day] = dto.fecha_fin.toString().split('-').map(Number);
      fecha_fin = new Date(year, month - 1, day);
    }
    // Establecer final del día para la fecha fin
    fecha_fin.setHours(23, 59, 59, 999);

    const usuario = await this.usuario_repositorio.findOne({ where: { id: usuario_id } });
    const config_clinica = await this.configuracion_clinica_repositorio.findOne({ where: { usuario: { id: usuario_id } } });

    const datos_reporte: any = {
      fecha_generacion: new Date(),
      periodo: {
        inicio: fecha_inicio,
        fin: fecha_fin,
      },
      metadatos: {
        nombre_usuario: usuario ? usuario.nombre : 'Usuario',
        nombre_clinica: config_clinica?.nombre_clinica || 'Clínica Dental',
      },
      areas: {},
    };

    for (const area of dto.areas) {
      switch (area) {
        case AreaReporte.FINANZAS:
          datos_reporte.areas.finanzas = await this.obtenerDatosFinanzas(usuario_id, fecha_inicio, fecha_fin);
          break;
        case AreaReporte.AGENDA:
          datos_reporte.areas.agenda = await this.obtenerDatosAgenda(usuario_id, fecha_inicio, fecha_fin);
          break;
        case AreaReporte.TRATAMIENTOS:
          datos_reporte.areas.tratamientos = await this.obtenerDatosTratamientos(usuario_id, fecha_inicio, fecha_fin);
          break;
        case AreaReporte.INVENTARIO:
          datos_reporte.areas.inventario = await this.obtenerDatosInventario(usuario_id, fecha_inicio, fecha_fin);
          break;
      }
    }

    const incluir_sugerencias = dto.incluir_sugerencias !== false;
    const texto_gemini = await this.generarTextoConGemini(datos_reporte, dto.areas, incluir_sugerencias);
    const pdf_buffer = await this.generarPDF(datos_reporte, texto_gemini);
    const timestamp = Date.now();
    const nombre_archivo = `reporte-${usuario_id}-${timestamp}`;
    const nombre_archivo_guardado = await this.almacenamiento_servicio.guardarArchivoDesdeBuffer(
      pdf_buffer,
      'pdf',
      TipoDocumento.REPORTE,
      nombre_archivo
    );
    const reporte = new Reporte();
    const fecha_actual = new Date();
    const fecha_formateada = `${fecha_actual.getDate().toString().padStart(2, '0')}/${(fecha_actual.getMonth() + 1).toString().padStart(2, '0')}/${fecha_actual.getFullYear()}`;
    reporte.nombre = `Reporte ${fecha_formateada}`;
    reporte.areas = JSON.stringify(dto.areas);
    if (dto.fecha_inicio) {
      const [year, month, day] = dto.fecha_inicio.toString().split('-').map(Number);
      reporte.fecha_inicio = new Date(year, month - 1, day);
    }
    if (dto.fecha_fin) {
      const [year, month, day] = dto.fecha_fin.toString().split('-').map(Number);
      reporte.fecha_fin = new Date(year, month - 1, day);
    }
    reporte.ruta_archivo = nombre_archivo_guardado;

    reporte.analisis_gemini = typeof texto_gemini === 'object'
      ? (texto_gemini.resumen + '\n\n' + texto_gemini.conclusiones)
      : texto_gemini;

    reporte.usuario = { id: usuario_id } as any;

    await this.reporte_repositorio.save(reporte);

    // Ajustar fecha_creacion a hora local para evitar problemas de zona horaria en el frontend
    const fecha_creacion_local = new Date(reporte.fecha_creacion.getTime() - reporte.fecha_creacion.getTimezoneOffset() * 60000);

    return {
      id: reporte.id,
      nombre: reporte.nombre,
      areas: JSON.parse(reporte.areas),
      fecha_inicio: reporte.fecha_inicio,
      fecha_fin: reporte.fecha_fin,
      fecha_creacion: fecha_creacion_local,
      analisis_gemini: reporte.analisis_gemini,
    };
  }

  async obtenerReportesUsuario(usuario_id: number) {
    const reportes = await this.reporte_repositorio.find({
      where: { usuario: { id: usuario_id } },
      order: { fecha_creacion: 'DESC' },
    });

    return reportes.map(r => {
      // Ajustar fecha_creacion a hora local para evitar problemas de zona horaria en el frontend
      const fecha_creacion_local = new Date(r.fecha_creacion.getTime() - r.fecha_creacion.getTimezoneOffset() * 60000);
      
      return {
        id: r.id,
        nombre: r.nombre,
        areas: JSON.parse(r.areas),
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        fecha_creacion: fecha_creacion_local,
        analisis_gemini: r.analisis_gemini,
      };
    });
  }

  async obtenerArchivoReporte(usuario_id: number, reporte_id: number) {
    const reporte = await this.reporte_repositorio.findOne({
      where: { id: reporte_id, usuario: { id: usuario_id } },
    });

    if (!reporte) {
      throw new NotFoundException('Reporte no encontrado');
    }

    const ruta_completa = this.almacenamiento_servicio.obtenerRutaArchivo(
      reporte.ruta_archivo,
      TipoDocumento.REPORTE
    );
    const archivo = createReadStream(ruta_completa);
    return { archivo, nombre: reporte.nombre };
  }

  async eliminarReporte(usuario_id: number, reporte_id: number) {
    const reporte = await this.reporte_repositorio.findOne({
      where: { id: reporte_id, usuario: { id: usuario_id } },
    });

    if (!reporte) {
      throw new NotFoundException('Reporte no encontrado');
    }
    await this.almacenamiento_servicio.eliminarArchivo(
      reporte.ruta_archivo,
      TipoDocumento.REPORTE
    );
    await this.reporte_repositorio.remove(reporte);
  }
}