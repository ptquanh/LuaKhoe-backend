import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { AuditWithTimezone } from '@shared/common/audit.entity';

@Entity('nutritions')
export class Nutritions extends AuditWithTimezone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string;

  /**
   * pgvector embedding column.
   * Dimension depends on the embedding model used:
   * - Gemini text-embedding-004 / gemini-embedding-001: 3072 dims
   * - ERD specifies 1536 (placeholder — update when model is finalized)
   *
   * TypeORM does not natively support VECTOR type.
   * This column is created via migration/raw SQL:
   *   ALTER TABLE nutritions ADD COLUMN embedding VECTOR(3072);
   *   ALTER TABLE nutritions ALTER COLUMN embedding TYPE VECTOR(3072);
   */
  @Column({
    type: 'float4',
    array: true,
    nullable: true,
  })
  embedding: number[];

  @Column({ name: 'chunk_metadata', type: 'jsonb', nullable: true })
  chunkMetadata: Record<string, any>;
}
