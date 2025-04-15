import {
  InjectManager,
  MedusaContext,
  MedusaService,
  Modules,
} from "@medusajs/framework/utils";
import { Quote } from "./models/quote";
import { SqlEntityManager } from "@mikro-orm/knex";
import { Context } from "@medusajs/types/dist/shared-context";
import { container } from "@medusajs/framework";
import { IOrderModuleService } from "@medusajs/types";
class QuoteModuleService extends MedusaService({
  Quote,
}) {
  @InjectManager()
  async updatePaymentCollectionAmount(
    amount: number,
    orderId: string,
    @MedusaContext() sharedContext?: Context<SqlEntityManager>
  ): Promise<void> {
    if (!sharedContext?.manager) {
      throw new Error("Shared context or manager is undefined.");
    }

    await sharedContext.manager.execute(
      `UPDATE public.order_summary
			SET totals = jsonb_set(totals::jsonb, '{raw_pending_difference,value}', '"?"')
			WHERE order_id = ?;
			`,
      [amount, orderId]
    );
    await sharedContext.manager.execute(
      `UPDATE public.order_summary
			SET totals = jsonb_set(totals::jsonb, '{pending_difference}', '?')
			WHERE order_id = ?;
			`,
      [amount, orderId]
    );
    await sharedContext.manager.execute(
      `UPDATE public.order_summary
			SET totals = jsonb_set(totals::jsonb, '{current_order_total}', '?')
			WHERE order_id = ?;
			`,
      [amount, orderId]
    );
    await sharedContext.manager.execute(
      `UPDATE public.order_summary
			SET totals = jsonb_set(totals::jsonb, '{accounting_total}', '?')
			WHERE order_id = ?;
			`,
      [amount, orderId]
    );
    await sharedContext.manager.execute(
      `UPDATE public.order_summary
			SET totals = jsonb_set(totals::jsonb, '{raw_accounting_total,value}', '"?"')
			WHERE order_id = ?;
			`,
      [amount, orderId]
    );
    await sharedContext.manager.execute(
      `UPDATE public.order_summary
			SET totals = jsonb_set(totals::jsonb, '{raw_current_order_total,value}', '"?"')
			WHERE order_id = ?;
			`,
      [amount, orderId]
    );
    return;
  }
  @InjectManager()
  async deleteShippingMethod(
    shippingMethodIds: string[],
    orderId: string,
    @MedusaContext() sharedContext?: Context<SqlEntityManager>
  ): Promise<void> {
    if (!sharedContext?.manager) {
      throw new Error("Shared context or manager is undefined.");
    }
    if (shippingMethodIds.length > 0) {
      // Build the placeholders dynamically based on the number of shippingMethodIds
      const placeholders = shippingMethodIds.map((e) => `${e}`).join(",");

      console.log("🚀 ~ QuoteModuleService ~ placeholders:", placeholders);
      await sharedContext.manager.execute(
        `DELETE FROM order_shipping WHERE order_id = ? AND shipping_method_id IN (?)`,
        [orderId, placeholders]
      );
      const service = container.resolve<IOrderModuleService>(Modules.ORDER);

      const deleted = await service.deleteOrderShippingMethods(
        shippingMethodIds
      );
    }
    return;
  }
}

export default QuoteModuleService;
