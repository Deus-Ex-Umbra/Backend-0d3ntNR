import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { MaterialPlantilla } from './material-plantilla.entidad';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class Tratamiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column()
  numero_citas: number;

  @Column('decimal', { precision: 10, scale: 2 })
  costo_total: number;

  @Column({ default: 0 })
  intervalo_dias: number;

  @Column({ default: 0 })
  intervalo_semanas: number;

  @Column({ default: 0 })
  intervalo_meses: number;

  @Column({ default: 0 })
  horas_aproximadas_citas: number;

  @Column({ default: 30 })
  minutos_aproximados_citas: number;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => MaterialPlantilla, (material) => material.tratamiento, { cascade: true })
  materiales: MaterialPlantilla[];

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ nullable: true })
  usuario_id: number;
}