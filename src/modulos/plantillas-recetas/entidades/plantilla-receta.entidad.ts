import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class PlantillaReceta {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  usuario: Usuario;

  @Column()
  nombre: string;

  @Column('text')
  contenido: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  fecha_creacion: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  fecha_actualizacion: Date;

  @Column({ type: 'varchar', default: 'carta' })
  tamano_papel: 'carta' | 'legal' | 'a4';

  @Column({ type: 'integer', nullable: true })
  tamano_hoja_id: number | null;

  @Column({ type: 'integer', nullable: true })
  ancho_mm: number | null;

  @Column({ type: 'integer', nullable: true })
  alto_mm: number | null;

  @Column({ type: 'integer', default: 20 })
  margen_superior: number;

  @Column({ type: 'integer', default: 20 })
  margen_inferior: number;

  @Column({ type: 'integer', default: 20 })
  margen_izquierdo: number;

  @Column({ type: 'integer', default: 20 })
  margen_derecho: number;
}
