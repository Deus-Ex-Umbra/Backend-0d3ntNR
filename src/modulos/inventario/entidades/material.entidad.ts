import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, DeleteDateColumn } from 'typeorm';
import { Producto } from './producto.entidad';
import { ReservaMaterial } from './reserva-material.entidad';

@Entity()
export class Material {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({ nullable: true })
    nro_lote: string;
    @Column({ nullable: true })
    nro_serie: string;
    @Column({ nullable: true })
    fecha_vencimiento: Date;

    @Column('decimal', { precision: 10, scale: 2 })
    cantidad_actual: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    cantidad_reservada: number;

    @Column('decimal', { precision: 10, scale: 2 })
    costo_unitario: number;

    @CreateDateColumn()
    fecha_ingreso: Date;

    @Column({ default: true })
    activo: boolean;

    @ManyToOne(() => Producto, (producto) => producto.materiales, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    producto: Producto;

    @OneToMany(() => ReservaMaterial, (reserva) => reserva.material)
    reservas: ReservaMaterial[];

    @DeleteDateColumn({ nullable: true })
    eliminado_en?: Date | null;
}
