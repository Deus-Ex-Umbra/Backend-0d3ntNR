import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Inventario } from './inventario.entidad';
import { Producto } from './producto.entidad';
import { Material } from './material.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

// Tipos de movimiento para el Kardex
export enum TipoMovimientoKardex {
    // Entradas
    COMPRA = 'compra',
    REGALO = 'regalo',
    DONACION = 'donacion',
    OTRO_INGRESO = 'otro_ingreso',
    // Salidas
    CONSUMO_CITA = 'consumo_cita',
    CONSUMO_TRATAMIENTO = 'consumo_tratamiento',
    VENTA = 'venta',
    DESECHO = 'desecho',
    ROBO = 'robo',
    AJUSTE = 'ajuste',
}

export enum TipoOperacionKardex {
    ENTRADA = 'entrada',
    SALIDA = 'salida',
}

@Entity()
@Index(['inventario', 'fecha'])
@Index(['producto', 'fecha'])
export class Kardex {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Inventario, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    inventario: Inventario;

    @ManyToOne(() => Producto, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    producto: Producto;

    @ManyToOne(() => Material, { nullable: true, onDelete: 'SET NULL' })
    material: Material;

    @Column({
        type: 'varchar',
        enum: TipoMovimientoKardex,
    })
    tipo: TipoMovimientoKardex;

    @Column({
        type: 'varchar',
        enum: TipoOperacionKardex,
    })
    operacion: TipoOperacionKardex;

    @Column('decimal', { precision: 10, scale: 2 })
    cantidad: number;

    @Column('decimal', { precision: 10, scale: 2 })
    stock_anterior: number;

    @Column('decimal', { precision: 10, scale: 2 })
    stock_nuevo: number;

    // Para compras: costo total. Para ventas: monto de venta
    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    monto: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    costo_unitario: number;

    // Referencia a la entidad relacionada (cita_id, tratamiento_id, etc.)
    @Column({ nullable: true })
    referencia_tipo: string;

    @Column({ nullable: true })
    referencia_id: number;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @CreateDateColumn()
    fecha: Date;

    @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
    usuario: Usuario;
}
