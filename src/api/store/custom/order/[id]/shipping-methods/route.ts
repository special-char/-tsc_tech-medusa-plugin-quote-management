import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { Modules, OrderChangeStatus } from "@medusajs/framework/utils";
import { createDraftOrderEditShippingMethodWorkflow } from "../../../../../../workflows/update-draft-order-shipping-methods";

export async function POST(
  req: MedusaRequest<{ shipping_option_id: string }>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;
    const { shipping_option_id } = req.body;
    console.log({ id, shipping_option_id });
    if (!shipping_option_id) {
      res.send({ error: "shipping_option_id is required" }).status(400);
      return;
    }
    const query = req.scope.resolve("query");
    const { data: order } = await query.graph({
      entity: "orders",
      fields: [
        "id",
        "status",
        "currency_code",
        "canceled_at",
        "payment_collections.*",
      ],
      filters: { id },
    });
    const { data: shippingOptions } = await query.graph({
      entity: "shipping_option",
      fields: ["id", "name", "price_set_link.price_set_id"],
      filters: {
        id: shipping_option_id,
      },
    });
    const pricingModuleService = req.scope.resolve(Modules.PRICING);
    const price = await pricingModuleService.calculatePrices(
      { id: [shippingOptions?.[0]?.price_set_link?.price_set_id!] },
      {
        context: {
          region_id: order[0].region_id!,
          currency_code: order[0].currency_code,
        },
      }
    );
    const calculatedShippingOptions = {
      ...shippingOptions[0],
      calculated_price: price[0],
    };

    const { data: orderChange } = await query.graph({
      entity: "order_change",
      fields: ["id", "status", "version"],
      filters: {
        order_id: id,
        status: [OrderChangeStatus.PENDING, OrderChangeStatus.REQUESTED],
      },
    });

    const { result } = await createDraftOrderEditShippingMethodWorkflow(
      req.scope
    ).run({
      input: {
        order_id: id,
        shipping_option_id,
        orderChange: orderChange[0],
        shippingOptions: calculatedShippingOptions,
        order: order[0],
      },
    });
    res.json({ result });
  } catch (error) {
    res.json({ error }).status(500);
  }
}
