import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { updateDraftOrderWorkflow } from "../../../../../workflows/update-order";
import { updateCartWorkflow } from "@medusajs/medusa/core-flows";

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
        "cart.*",
        "*",
      ],
      filters: { id },
    });
    const body = req.body as object;
    const inputBody = {
      id,
      orderQuery,
      ...body,
    } as any;

    const quoteData = await query.graph({
      entity: "quotes",
      fields: ["*"],
      filters: { id: inputBody?.quote_id },
    });

    const { result: updateCartWorkflowResult } = await updateCartWorkflow(
      req.scope
    ).run({
      input: {
        id: quoteData.data[0].cart_id,
        shipping_address: {
          first_name: inputBody?.shipping_address?.first_name,
          last_name: inputBody?.shipping_address?.last_name,
          address_1: inputBody?.shipping_address?.address_1,
          address_2: inputBody?.shipping_address?.address_2,
          company: inputBody?.shipping_address?.company,
          postal_code: inputBody?.shipping_address?.postal_code,
          city: inputBody?.shipping_address?.city,
          country_code: inputBody?.shipping_address?.country_code,
          province: inputBody?.shipping_address?.province,
          phone: inputBody?.shipping_address?.phone,
        },
        billing_address: {
          first_name: inputBody?.billing_address?.first_name,
          last_name: inputBody?.billing_address?.last_name,
          address_1: inputBody?.billing_address?.address_1,
          address_2: inputBody?.billing_address?.address_2,
          company: inputBody?.billing_address?.company,
          postal_code: inputBody?.billing_address?.postal_code,
          city: inputBody?.billing_address?.city,
          country_code: inputBody?.billing_address?.country_code,
          province: inputBody?.billing_address?.province,
          phone: inputBody?.billing_address?.phone,
        },
        ...(inputBody?.metadata?.gstNumber && {
          metadata: {
            gstNumber: inputBody?.metadata?.gstNumber,
          },
        }),
      },
    });

    const { result } = await updateDraftOrderWorkflow.run({
      input: inputBody,
    });

    res.json(result);
  } catch (error) {
    res.json(error).status(500);
  }
}
