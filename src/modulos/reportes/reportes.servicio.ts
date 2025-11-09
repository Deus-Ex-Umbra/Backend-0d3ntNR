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
import { Reporte } from './entidades/reporte.entidad';
import { GeminiServicio } from '../gemini/gemini.servicio';
import { GenerarReporteDto, AreaReporte } from './dto/generar-reporte.dto';
import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createReadStream } from 'fs';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

@Injectable()
export class ReportesServicio {
  private readonly ruta_reportes = join(process.cwd(), 'reportes-generados');

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
    @InjectRepository(Reporte)
    private readonly reporte_repositorio: Repository<Reporte>,
    private readonly gemini_servicio: GeminiServicio,
  ) {
    this.inicializarDirectorioReportes();
  }

  private async inicializarDirectorioReportes() {
    try {
      await fs.mkdir(this.ruta_reportes, { recursive: true });
    } catch (error) {
      console.error('Error al crear directorio de reportes:', error);
    }
  }

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

  private async generarPDF(datos_reporte: any, texto_gemini: string): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdf_buffer = Buffer.concat(buffers);
          resolve(pdf_buffer);
        });

        // Usar Times New Roman
        doc.font('Times-Roman');

        doc.fontSize(20).text('Reporte de Clínica Dental', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12).text(`Fecha de generación: ${new Date(datos_reporte.fecha_generacion).toLocaleDateString('es-BO')}`);
        doc.text(`Período: ${new Date(datos_reporte.periodo.inicio).toLocaleDateString('es-BO')} - ${new Date(datos_reporte.periodo.fin).toLocaleDateString('es-BO')}`);
        doc.moveDown(2);

        doc.font('Times-Bold');
        doc.fontSize(16).text('Análisis General', { underline: true });
        doc.moveDown();
        doc.font('Times-Roman');
        doc.fontSize(11).text(texto_gemini, { align: 'justify' });
        doc.moveDown(2);

        if (datos_reporte.areas.finanzas) {
          await this.agregarSeccionFinanzas(doc, datos_reporte.areas.finanzas);
        }

        if (datos_reporte.areas.agenda) {
          await this.agregarSeccionAgenda(doc, datos_reporte.areas.agenda);
        }

        if (datos_reporte.areas.tratamientos) {
          await this.agregarSeccionTratamientos(doc, datos_reporte.areas.tratamientos);
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

  private async agregarSeccionFinanzas(doc: PDFKit.PDFDocument, datos: any): Promise<void> {
    doc.addPage();
    doc.font('Times-Bold');
    doc.fontSize(16).text('Finanzas', { underline: true });
    doc.moveDown();
    
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

    // Generar gráfico de ingresos vs egresos si hay datos suficientes
    if (datos.pagos.length > 0 || datos.egresos.length > 0) {
      try {
        const grafico_buffer = await this.generarGraficoIngresosEgresos(datos);
        const posicion_y_actual = doc.y;
        
        // Verificar si hay espacio suficiente en la página
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
        doc.text(`• ${new Date(pago.fecha).toLocaleDateString('es-BO')} - ${pago.paciente}: Bs. ${pago.monto.toFixed(2)}`);
      });
    }
  }

  private async generarGraficoIngresosEgresos(datos: any): Promise<Buffer> {
    const width = 800;
    const height = 400;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

    // Agrupar pagos y egresos por mes
    const meses_map = new Map<string, { ingresos: number; egresos: number }>();
    
    // Procesar pagos (ingresos)
    datos.pagos.forEach((pago: any) => {
      const fecha = new Date(pago.fecha);
      const mes_key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!meses_map.has(mes_key)) {
        meses_map.set(mes_key, { ingresos: 0, egresos: 0 });
      }
      meses_map.get(mes_key)!.ingresos += pago.monto;
    });

    // Procesar egresos
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

    // Ordenar por fecha y preparar datos
    const meses_ordenados = Array.from(meses_map.keys()).sort();
    const labels = meses_ordenados.map(mes => {
      const [year, month] = mes.split('-');
      const fecha = new Date(parseInt(year), parseInt(month) - 1);
      return fecha.toLocaleDateString('es-BO', { month: 'short', year: 'numeric' });
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
            backgroundColor: 'rgba(34, 197, 94, 0.7)',
            borderColor: 'rgba(34, 197, 94, 1)',
            borderWidth: 1,
          },
          {
            label: 'Egresos',
            data: egresos,
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: 'rgba(239, 68, 68, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Ingresos vs Egresos Mensuales',
            font: {
              size: 16,
              family: 'Times New Roman',
            },
          },
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: 'Times New Roman',
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value: any) {
                return 'Bs. ' + value.toFixed(0);
              },
              font: {
                family: 'Times New Roman',
              },
            },
          },
          x: {
            ticks: {
              font: {
                family: 'Times New Roman',
              },
            },
          },
        },
      },
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
  }

  private async agregarSeccionAgenda(doc: PDFKit.PDFDocument, datos: any): Promise<void> {
    doc.addPage();
    doc.font('Times-Bold');
    doc.fontSize(16).text('Agenda', { underline: true });
    doc.moveDown();
    
    doc.font('Times-Roman');
    doc.fontSize(12);
    doc.text(`Total de citas: ${datos.total_citas}`);
    doc.moveDown();
    
    // Agregar gráfico de citas por estado
    if (datos.citas_por_estado && datos.total_citas > 0) {
      try {
        const grafico_buffer = await this.generarGraficoCitasPorEstado(datos.citas_por_estado);
        const posicion_y_actual = doc.y;
        
        // Verificar si hay espacio suficiente en la página
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
        doc.text(`• ${new Date(cita.fecha).toLocaleString('es-BO')} - ${cita.paciente}`);
      });
    }
  }

  private async generarGraficoCitasPorEstado(citas_por_estado: any): Promise<Buffer> {
    const width = 600;
    const height = 400;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

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
              'rgba(234, 179, 8, 0.7)',   // Amarillo para pendientes
              'rgba(34, 197, 94, 0.7)',   // Verde para pagadas
              'rgba(239, 68, 68, 0.7)',   // Rojo para canceladas
              'rgba(156, 163, 175, 0.7)', // Gris para sin paciente
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
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Distribución de Citas por Estado',
            font: {
              size: 16,
              family: 'Times New Roman',
            },
          },
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: 'Times New Roman',
                size: 12,
              },
              padding: 15,
            },
          },
        },
      },
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
  }

  private async agregarSeccionTratamientos(doc: PDFKit.PDFDocument, datos: any): Promise<void> {
    doc.addPage();
    doc.font('Times-Bold');
    doc.fontSize(16).text('Tratamientos', { underline: true });
    doc.moveDown();
    
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
        
        // Verificar si hay espacio suficiente en la página
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
    const width = 800;
    const height = 500;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

    // Tomar los top 10 tratamientos más comunes
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
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: 'y', // Barras horizontales
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Tratamientos Más Comunes',
            font: {
              size: 16,
              family: 'Times New Roman',
            },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: {
                family: 'Times New Roman',
              },
            },
          },
          y: {
            ticks: {
              font: {
                family: 'Times New Roman',
                size: 10,
              },
            },
          },
        },
      },
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
  }

  private agregarSeccionInventario(doc: PDFKit.PDFDocument, datos: any): void {
    doc.addPage();
    doc.font('Times-Bold');
    doc.fontSize(16).text('Inventario', { underline: true });
    doc.moveDown();
    
    doc.font('Times-Roman');
    doc.fontSize(12);
    doc.text(`Total de inventarios: ${datos.total_inventarios}`);
    doc.text(`Total de productos: ${datos.total_productos}`);
    doc.text(`Productos con stock bajo: ${datos.productos_bajo_stock}`);
    doc.moveDown();

    if (datos.alertas.length > 0) {
      doc.fillColor('red');
      doc.font('Times-Bold');
      doc.fontSize(14).text('Alertas de Stock Bajo:', { underline: true });
      doc.fillColor('black');
      doc.font('Times-Roman');
      doc.fontSize(10);
      datos.alertas.forEach((alerta: any) => {
        doc.text(`• ${alerta.nombre}: ${alerta.stock_actual} (mínimo: ${alerta.stock_minimo})`);
      });
    }
  }

  async generarYGuardarReporte(usuario_id: number, dto: GenerarReporteDto) {
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
    const pdf_buffer = await this.generarPDF(datos_reporte, texto_gemini);

    // Guardar el PDF en el sistema de archivos
    const timestamp = Date.now();
    const nombre_archivo = `reporte-${usuario_id}-${timestamp}.pdf`;
    const ruta_completa = join(this.ruta_reportes, nombre_archivo);
    
    await fs.writeFile(ruta_completa, pdf_buffer);

    // Guardar metadata en la base de datos
    const reporte = new Reporte();
    reporte.nombre = `Reporte ${new Date().toLocaleDateString('es-BO')}`;
    reporte.areas = JSON.stringify(dto.areas);
    if (dto.fecha_inicio) reporte.fecha_inicio = new Date(dto.fecha_inicio);
    if (dto.fecha_fin) reporte.fecha_fin = new Date(dto.fecha_fin);
    reporte.ruta_archivo = ruta_completa;
    reporte.usuario = { id: usuario_id } as any;

    await this.reporte_repositorio.save(reporte);

    return {
      id: reporte.id,
      nombre: reporte.nombre,
      areas: JSON.parse(reporte.areas),
      fecha_inicio: reporte.fecha_inicio,
      fecha_fin: reporte.fecha_fin,
      fecha_creacion: reporte.fecha_creacion,
    };
  }

  async obtenerReportesUsuario(usuario_id: number) {
    const reportes = await this.reporte_repositorio.find({
      where: { usuario: { id: usuario_id } },
      order: { fecha_creacion: 'DESC' },
    });

    return reportes.map(r => ({
      id: r.id,
      nombre: r.nombre,
      areas: JSON.parse(r.areas),
      fecha_inicio: r.fecha_inicio,
      fecha_fin: r.fecha_fin,
      fecha_creacion: r.fecha_creacion,
    }));
  }

  async obtenerArchivoReporte(usuario_id: number, reporte_id: number) {
    const reporte = await this.reporte_repositorio.findOne({
      where: { id: reporte_id, usuario: { id: usuario_id } },
    });

    if (!reporte) {
      throw new NotFoundException('Reporte no encontrado');
    }

    const archivo = createReadStream(reporte.ruta_archivo);
    return { archivo, nombre: reporte.nombre };
  }

  async eliminarReporte(usuario_id: number, reporte_id: number) {
    const reporte = await this.reporte_repositorio.findOne({
      where: { id: reporte_id, usuario: { id: usuario_id } },
    });

    if (!reporte) {
      throw new NotFoundException('Reporte no encontrado');
    }

    // Eliminar archivo físico
    try {
      await fs.unlink(reporte.ruta_archivo);
    } catch (error) {
      console.error('Error al eliminar archivo de reporte:', error);
    }

    // Eliminar registro de la base de datos
    await this.reporte_repositorio.remove(reporte);
  }
}