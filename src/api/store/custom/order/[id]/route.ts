import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { updateDraftOrderWorkflow } from "../../../../../workflows/update-order";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .json({
          message: "Order ID is required",
        })
        .status(400);
    }
    const query = req.scope.resolve("query");
    const orderQuery = await query.graph({
      entity: "order",
      fields: [
        "id",
        "status",
        "email",
        "shipping_address.*",
        "billing_address.*",
        "metadata",
      ],
      filters: { id },
    });
    const body = req.body as object;
    const inputBody = {
      id,
      orderQuery,
      ...body,
    };

    const { result } = await updateDraftOrderWorkflow.run({
      input: inputBody,
    });

    res.json(result);
  } catch (error) {
    res.json(error).status(500);
  }
}
