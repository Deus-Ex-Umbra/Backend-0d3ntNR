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
        // Fixed assets are no longer reserved - they follow lifecycle:
        // Disponible -> En Mantenimiento <-> Desechado/Vendido
        // This cron is now a no-op but kept for future use if needed
    }
}
