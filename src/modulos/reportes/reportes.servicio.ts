import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Paciente } from '../pacientes/entidades/paciente.entidad';
import { Cita } from '../agenda/entidades/cita.entidad';
import { PlanTratamiento } from '../tratamientos/entidades/plan-tratamiento.entidad';
import { Pago } from '../finanzas/entidades/pago.entidad';
import { Egreso } from '../finanzas/entidades/egreso.entidad';
import { Inventario } from '../inventario/entidades/inventario.entidad';
import { Producto } from '../inventario/entidades/producto.entidad';
import { GeminiServicio } from '../gemini/gemini.servicio';
import { GenerarReporteDto, AreaReporte } from './dto/generar-reporte.dto';
import PDFDocument from 'pdfkit';

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
    private readonly gemini_servicio: GeminiServicio,
  ) {}

  async generarReporte(usuario_id: number, dto: GenerarReporteDto): Promise<Buffer> {
    const fecha_inicio = dto.fecha_inicio ? new Date(dto.fecha_inicio) : new Date(0);
    const fecha_fin = dto.fecha_fin ? new Date(dto.fecha_fin) : new Date();
    fecha_fin.setHours(23, 59, 59, 999);

    const datos_reporte: any = {
      fecha_generacion: new Date(),
      periodo: {
        inicio: fecha_inicio,
        fin: fecha_fin,
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
          datos_reporte.areas.inventario = await this.obtenerDatosInventario(usuario_id);
          break;
      }
    }

    const texto_gemini = await this.generarTextoConGemini(datos_reporte, dto.areas);

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

    return {
      total_ingresos,
      total_egresos,
      balance,
      cantidad_pagos: pagos.length,
      cantidad_egresos: egresos.length,
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

  private async obtenerDatosInventario(usuario_id: number): Promise<any> {
    const inventarios = await this.inventario_repositorio.find({
      where: { 
        propietario: { id: usuario_id },
        activo: true,
      },
      relations: ['productos', 'productos.lotes', 'productos.activos'],
    });

    const total_productos = inventarios.reduce((sum, inv) => {
      return sum + inv.productos.filter(p => p.activo).length;
    }, 0);

    const productos_bajo_stock = inventarios.flatMap(inv => 
      inv.productos.filter(p => {
        if (!p.activo) return false;
        if (p.tipo_gestion === 'consumible') {
          const stock_actual = p.lotes
            .filter(l => l.activo)
            .reduce((sum, l) => sum + Number(l.cantidad_actual), 0);
          return stock_actual < p.stock_minimo;
        }
        return false;
      })
    );

    return {
      total_inventarios: inventarios.length,
      total_productos,
      productos_bajo_stock: productos_bajo_stock.length,
      alertas: productos_bajo_stock.map(p => ({
        nombre: p.nombre,
        stock_minimo: p.stock_minimo,
        stock_actual: p.lotes
          .filter(l => l.activo)
          .reduce((sum, l) => sum + Number(l.cantidad_actual), 0),
      })),
    };
  }

  private async generarTextoConGemini(datos_reporte: any, areas: AreaReporte[]): Promise<string> {
    const datos_json = JSON.stringify(datos_reporte, null, 2);
    
    const prompt = `
Eres un asistente experto en análisis de datos para clínicas dentales. 
A continuación te proporciono datos de un reporte que incluye las siguientes áreas: ${areas.join(', ')}.

Datos del reporte:
${datos_json}

Por favor, genera un análisis profesional y conciso que incluya:
1. Un resumen ejecutivo de 2-3 párrafos
2. Observaciones clave por cada área incluida
3. Recomendaciones prácticas basadas en los datos

El texto debe ser profesional, claro y en español. Usa un tono formal pero accesible.
NO incluyas formato markdown, solo texto plano con saltos de línea para separar secciones.
`;

    return this.gemini_servicio.generarContenido(prompt, false);
  }

  private generarPDF(datos_reporte: any, texto_gemini: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdf_buffer = Buffer.concat(buffers);
          resolve(pdf_buffer);
        });

        doc.fontSize(20).text('Reporte de Clínica Dental', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12).text(`Fecha de generación: ${new Date(datos_reporte.fecha_generacion).toLocaleDateString('es-BO')}`);
        doc.text(`Período: ${new Date(datos_reporte.periodo.inicio).toLocaleDateString('es-BO')} - ${new Date(datos_reporte.periodo.fin).toLocaleDateString('es-BO')}`);
        doc.moveDown(2);

        doc.fontSize(16).text('Análisis General', { underline: true });
        doc.moveDown();
        doc.fontSize(11).text(texto_gemini, { align: 'justify' });
        doc.moveDown(2);

        if (datos_reporte.areas.finanzas) {
          this.agregarSeccionFinanzas(doc, datos_reporte.areas.finanzas);
        }

        if (datos_reporte.areas.agenda) {
          this.agregarSeccionAgenda(doc, datos_reporte.areas.agenda);
        }

        if (datos_reporte.areas.tratamientos) {
          this.agregarSeccionTratamientos(doc, datos_reporte.areas.tratamientos);
        }

        if (datos_reporte.areas.inventario) {
          this.agregarSeccionInventario(doc, datos_reporte.areas.inventario);
        }

        doc.end();
      } catch (error) {
        reject(new InternalServerErrorException('Error al generar el PDF'));
      }
    });
  }

  private agregarSeccionFinanzas(doc: PDFKit.PDFDocument, datos: any): void {
    doc.addPage();
    doc.fontSize(16).text('Finanzas', { underline: true });
    doc.moveDown();
    
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

    if (datos.pagos.length > 0) {
      doc.fontSize(14).text('Últimos Pagos:', { underline: true });
      doc.fontSize(10);
      datos.pagos.forEach((pago: any) => {
        doc.text(`• ${new Date(pago.fecha).toLocaleDateString('es-BO')} - ${pago.paciente}: Bs. ${pago.monto.toFixed(2)}`);
      });
    }
  }

  private agregarSeccionAgenda(doc: PDFKit.PDFDocument, datos: any): void {
    doc.addPage();
    doc.fontSize(16).text('Agenda', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Total de citas: ${datos.total_citas}`);
    doc.moveDown();
    
    doc.fontSize(14).text('Citas por estado:');
    doc.fontSize(11);
    doc.text(`• Pendientes: ${datos.citas_por_estado.pendiente}`);
    doc.text(`• Pagadas: ${datos.citas_por_estado.pagado}`);
    doc.text(`• Canceladas: ${datos.citas_por_estado.cancelado}`);
    doc.text(`• Sin paciente: ${datos.citas_por_estado.sin_paciente}`);
    doc.moveDown();

    if (datos.proximas_citas.length > 0) {
      doc.fontSize(14).text('Próximas Citas:', { underline: true });
      doc.fontSize(10);
      datos.proximas_citas.forEach((cita: any) => {
        doc.text(`• ${new Date(cita.fecha).toLocaleString('es-BO')} - ${cita.paciente}`);
      });
    }
  }

  private agregarSeccionTratamientos(doc: PDFKit.PDFDocument, datos: any): void {
    doc.addPage();
    doc.fontSize(16).text('Tratamientos', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Total de planes: ${datos.total_planes}`);
    doc.text(`Planes activos: ${datos.planes_activos}`);
    doc.text(`Planes finalizados: ${datos.planes_finalizados}`);
    doc.text(`Total por cobrar: Bs. ${datos.total_por_cobrar.toFixed(2)}`);
    doc.moveDown();

    if (datos.tratamientos_mas_comunes.length > 0) {
      doc.fontSize(14).text('Tratamientos más comunes:', { underline: true });
      doc.fontSize(11);
      datos.tratamientos_mas_comunes.forEach((t: any) => {
        doc.text(`• ${t.nombre}: ${t.cantidad} veces`);
      });
    }
  }

  private agregarSeccionInventario(doc: PDFKit.PDFDocument, datos: any): void {
    doc.addPage();
    doc.fontSize(16).text('Inventario', { underline: true });
    doc.moveDown();
    
    doc.fontSize(12);
    doc.text(`Total de inventarios: ${datos.total_inventarios}`);
    doc.text(`Total de productos: ${datos.total_productos}`);
    doc.text(`Productos con stock bajo: ${datos.productos_bajo_stock}`);
    doc.moveDown();

    if (datos.alertas.length > 0) {
      doc.fillColor('red');
      doc.fontSize(14).text('Alertas de Stock Bajo:', { underline: true });
      doc.fillColor('black');
      doc.fontSize(10);
      datos.alertas.forEach((alerta: any) => {
        doc.text(`• ${alerta.nombre}: ${alerta.stock_actual} (mínimo: ${alerta.stock_minimo})`);
      });
    }
  }
}