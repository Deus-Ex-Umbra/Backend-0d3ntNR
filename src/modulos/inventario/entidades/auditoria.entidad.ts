import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { Inventario } from './inventario.entidad';
import { Producto } from './producto.entidad';
import { Material } from './material.entidad';
import { Activo } from './activo.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

export enum TipoAccionAuditoria {
    PRODUCTO_CREADO = 'producto_creado',
    PRODUCTO_EDITADO = 'producto_editado',
    PRODUCTO_ELIMINADO = 'producto_eliminado',
    MATERIAL_CREADO = 'material_creado',
    MATERIAL_EDITADO = 'material_editado',
    MATERIAL_ELIMINADO = 'material_eliminado',
    ACTIVO_CREADO = 'activo_creado',
    ACTIVO_EDITADO = 'activo_editado',
    ACTIVO_ELIMINADO = 'activo_eliminado',
    ACTIVO_VENDIDO = 'activo_vendido',
    AJUSTE_STOCK = 'ajuste_stock',
    INVENTARIO_CREADO = 'inventario_creado',
    INVENTARIO_EDITADO = 'inventario_editado',
    INVENTARIO_ELIMINADO = 'inventario_eliminado',
}

export enum CategoriaAuditoria {
    PRODUCTO = 'producto',
    MATERIAL = 'material',
    ACTIVO = 'activo',
    AJUSTE = 'ajuste',
    INVENTARIO = 'inventario',
}

@Entity()
@Index(['inventario', 'fecha'])
@Index(['accion', 'fecha'])
@Index(['usuario', 'fecha'])
@Index(['categoria', 'fecha'])
export class Auditoria {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Inventario, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    inventario: Inventario;

    @Column({
        type: 'varchar',
        enum: TipoAccionAuditoria,
    })
    accion: TipoAccionAuditoria;

    @Column({
        type: 'varchar',
        enum: CategoriaAuditoria,
    })
    categoria: CategoriaAuditoria;

    @ManyToOne(() => Producto, { nullable: true, onDelete: 'SET NULL' })
    producto: Producto;

    @ManyToOne(() => Material, { nullable: true, onDelete: 'SET NULL' })
    material: Material;

    @ManyToOne(() => Activo, { nullable: true, onDelete: 'SET NULL' })
    activo: Activo;
    @Column({ type: 'text', nullable: true })
    datos_anteriores: string;
    @Column({ type: 'text', nullable: true })
    datos_nuevos: string;

    @Column({ type: 'text', nullable: true })
    motivo: string;

    @CreateDateColumn()
    fecha: Date;

    @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
    usuario: Usuario;
    @Column({ nullable: true })
    ip_address: string;

    @Column({ nullable: true })
    user_agent: string;
}
