import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Enfermedad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ default: true })
  activo: boolean;
}