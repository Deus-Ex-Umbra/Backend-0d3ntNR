import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Medicamento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ default: true })
  activo: boolean;
}