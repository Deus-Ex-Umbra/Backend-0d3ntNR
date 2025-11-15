import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Usuario } from '../../usuarios/entidades/usuario.entidad';

@Entity()
export class PlantillaConsentimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  usuario: Usuario;

  @Column()
  nombre: string;

  @Column('text')
  contenido: string;

  @Column({ type: 'integer', default: 20 })
  margen_superior: number;

  @Column({ type: 'integer', default: 20 })
  margen_inferior: number;

  @Column({ type: 'integer', default: 20 })
  margen_izquierdo: number;

  @Column({ type: 'integer', default: 20 })
  margen_derecho: number;
}