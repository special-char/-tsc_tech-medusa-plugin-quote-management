import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { authPaymentWorkflowCustom } from "../../../../../../workflows/authorized-workflow";

export async function POST(
  req: MedusaRequest<{ payment_session_id: string }>,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;

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
        "payment_collections.*",
        "shipping_address.*",
      ],
      filters: { id },
    });

    if (!orderQuery || orderQuery.data.length === 0) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    await authPaymentWorkflowCustom(req.scope).run({
      input: {
        payment_session_id: req.body?.payment_session_id || "",
      },
    });
    return res.json({ orderQuery });
  } catch (error) {
    console.error("POST /update-payment-collection error:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
}
