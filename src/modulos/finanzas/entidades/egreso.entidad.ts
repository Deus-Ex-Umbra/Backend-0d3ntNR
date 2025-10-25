import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Egreso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  concepto: string;

  @Column()
  fecha: Date;

  @Column('decimal', { precision: 10, scale: 2 })
  monto: number;
}