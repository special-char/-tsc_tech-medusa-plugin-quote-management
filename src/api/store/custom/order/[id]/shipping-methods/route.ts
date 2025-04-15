import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { Modules, OrderChangeStatus } from "@medusajs/framework/utils";
import QuoteModuleService from "../../../../../../modules/quotes/service";
import { QUOTE_MODULE } from "../../../../../../modules/quotes";
import { attachShippingMethodWorkflow } from "../../../../../../workflows/attach-shipping-method-to-order-workflow";
import {
  OrderChangeDTO,
  OrderDTO,
  ShippingOptionDTO,
} from "@medusajs/framework/types";
export async function POST(
  req: MedusaRequest<{ shipping_option_id: string; cart_id: string }>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;
    const { shipping_option_id, cart_id } = req.body;
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
        "region.*",
        "shipping_methods.*",
      ],
      filters: { id },
    });
    const alredyExist = order[0].shipping_methods?.some(
      (item) => item?.shipping_option_id === shipping_option_id
    );

    if (alredyExist) {
      return res.send(order);
    }
    const existingShippingMethodIds =
      order[0].shipping_methods
        ?.filter((sm) => sm !== null)
        .map((sm) => sm!.id) ?? [];
    console.log("🚀 ~ existingShippingMethodIds:", existingShippingMethodIds);

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

    const quoteService: QuoteModuleService = req.scope.resolve(QUOTE_MODULE);
    await quoteService.deleteShippingMethod(existingShippingMethodIds, id);
    const collectionIds =
      order[0].payment_collections?.map((item) => item?.id as string) || [];

    const { result } = await attachShippingMethodWorkflow(req.scope).run({
      input: {
        order_id: id,
        shipping_option_id,
        orderChange: orderChange[0] as unknown as OrderChangeDTO,
        shippingOptions:
          calculatedShippingOptions as unknown as ShippingOptionDTO,
        order: order[0] as unknown as OrderDTO,
        cart_id,
        payment_collections: collectionIds,
        existingShippingMethodIds,
      },
    });
    await quoteService.updatePaymentCollectionAmount(Number(result.total), id);

    res.json({ result });
  } catch (error) {
    res.json({ error }).status(500);
  }
}
