import { Migration } from '@mikro-orm/migrations';

export class Migration20250410061643 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "quotes" drop constraint if exists "quotes_status_check";`);

    this.addSql(`alter table if exists "quotes" add column if not exists "valid_till" timestamptz null;`);
    this.addSql(`alter table if exists "quotes" add constraint "quotes_status_check" check("status" in ('pending', 'accepted', 'rejected', 'expired'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "quotes" drop constraint if exists "quotes_status_check";`);

    this.addSql(`alter table if exists "quotes" drop column if exists "valid_till";`);

    this.addSql(`alter table if exists "quotes" add constraint "quotes_status_check" check("status" in ('pending_merchant', 'pending_customer', 'accepted', 'customer_rejected', 'merchant_rejected'));`);
  }

}
