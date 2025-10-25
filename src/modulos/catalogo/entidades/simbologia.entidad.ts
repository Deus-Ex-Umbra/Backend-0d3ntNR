import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Simbologia {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column('text')
  imagen_base64: string;

  @Column({ default: true })
  activo: boolean;
}
