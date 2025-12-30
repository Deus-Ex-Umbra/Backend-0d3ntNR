import { Entity, PrimaryGeneratedColumn, Column, Index, DeleteDateColumn } from 'typeorm';

@Entity('tamanos_papel')
export class TamanoPapel {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  nombre: string;

  @Column('decimal', { precision: 6, scale: 2 })
  ancho: number;

  @Column('decimal', { precision: 6, scale: 2 })
  alto: number;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ default: false })
  protegido: boolean;

  @Column({ default: true })
  activo: boolean;
  @DeleteDateColumn({ select: false })
  eliminado_en: Date;
}