import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class ColorCategoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column()
  color: string;

  @Column({ nullable: true })
  descripcion: string;

  @Column({ default: true })
  activo: boolean;
}