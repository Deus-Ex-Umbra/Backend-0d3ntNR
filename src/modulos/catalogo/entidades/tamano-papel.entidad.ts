import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('tamanos_papel')
export class TamanoPapel {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  nombre: string; // Carta, Legal, A4, etc.

  @Column('decimal', { precision: 6, scale: 2 })
  ancho: number; // mm

  @Column('decimal', { precision: 6, scale: 2 })
  alto: number; // mm

  @Column({ nullable: true })
  descripcion: string; // Texto que se mostrará entre paréntesis (solo mm o mm + pulgadas)

  @Column({ default: false })
  protegido: boolean; // No se puede actualizar ni eliminar cuando true

  @Column({ default: true })
  activo: boolean; // Borrado lógico
}