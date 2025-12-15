import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservasServicio } from './reservas.servicio';

@Injectable()
export class EstadoActivosCron {
    private readonly logger = new Logger(EstadoActivosCron.name);

    constructor(
        private readonly reservas_servicio: ReservasServicio,
    ) { }
    @Cron(CronExpression.EVERY_MINUTE)
    async actualizarEstadosActivos() {
        try {
            const { procesados: iniciados } = await this.reservas_servicio.procesarIniciosCitas();
            const { procesados: finalizados } = await this.reservas_servicio.procesarFinesCitas();

            if (iniciados > 0 || finalizados > 0) {
                this.logger.log(`Estados actualizados: ${iniciados} activos en uso, ${finalizados} activos liberados`);
            }
        } catch (error) {
            this.logger.error('Error al actualizar estados de activos:', error);
        }
    }
}
