import { container, MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { LinkDefinition } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { createOrderPaymentCollectionWorkflowCustom } from "../../../../../../workflows/update-order-payment-collection";

export async function POST(
  req: MedusaRequest<{ cart_id: string }>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;
    const { cart_id } = req.body;
    if (!id) {
      return res.status(400).json({
        message: "Order ID is required",
      });
    }

    const query = req.scope.resolve("query");

    const orderQuery = await query.graph({
      entity: "order",
      fields: [
        "id",
        "status",
        "email",
        "total",
        "currency_code",
        "cart.payment_collection.*",
        "payment_collections.*",
      ],
      filters: { id },
    });
    console.log("🚀 ~ orderQuery:", orderQuery);
    const cart = await query.graph({
      entity: "cart",
      fields: ["*", "payment_collection.*"],
      filters: { id: cart_id },
    });
    console.log("🚀 ~ cart:", cart);

    if (!orderQuery || orderQuery.data.length === 0) {
      return res.status(404).json({
        message: "Order not found",
      });
    }
    const existingPaymentCollection =
      orderQuery.data[0].payment_collections?.map((i) => i?.id) || [];

    const existingCartPaymentCollection = [cart.data[0].payment_collection?.id];

    console.log("🚀 ~ orderQuery:", existingCartPaymentCollection);
    console.log("🚀 ~ existingPaymentCollection:", existingPaymentCollection);

    const order = orderQuery.data[0];
    const remoteLink = container.resolve("remoteLink");
    const links: LinkDefinition[] = [];

    // 🧹 DELETE EXISTING PAYMENT COLLECTIONS FOR CART
    for (const pc of existingCartPaymentCollection) {
      if (typeof pc === "string") {
        await remoteLink.delete({
          [Modules.CART]: { cart_id },
          [Modules.PAYMENT]: { payment_collection_id: pc },
        });
      }
    }

    // 🧹 DELETE EXISTING PAYMENT COLLECTIONS FOR ORDER
    for (const pc of existingPaymentCollection) {
      if (typeof pc === "string") {
        await remoteLink.delete({
          [Modules.ORDER]: { order_id: id },
          [Modules.PAYMENT]: { payment_collection_id: pc },
        });
      }
    }

    const { result } = await createOrderPaymentCollectionWorkflowCustom.run({
      input: {
        order_id: id,
        amount: Number(order.total),
        currency_code: order.currency_code,
      },
    });

    let paymentCollectionId = result[0].id;

    // Link order to payment
    links.push({
      [Modules.ORDER]: { order_id: id },
      [Modules.PAYMENT]: { payment_collection_id: paymentCollectionId },
    });

    // Link cart to payment if cart exists
    if (cart_id) {
      links.push({
        [Modules.CART]: { cart_id: cart_id },
        [Modules.PAYMENT]: { payment_collection_id: paymentCollectionId },
      });
    }

    // Case 2: Payment collection exists — check if cart link is missing

    if (links.length > 0) {
      console.log("🚀 ~ POST ~ Creating remote links:", links);
      await remoteLink.create(links);
    }

    return res.json({ paymentCollectionId });
  } catch (error) {
    console.error("POST /update-payment-collection error:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
}
