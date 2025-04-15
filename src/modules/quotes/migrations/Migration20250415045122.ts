import { Migration } from '@mikro-orm/migrations';

export class Migration20250415045122 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "quotes" add column if not exists "notes" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "quotes" drop column if exists "notes";`);
  }

}
