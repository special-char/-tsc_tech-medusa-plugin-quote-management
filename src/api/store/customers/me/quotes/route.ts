import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { getLastPaymentStatus } from "../../../../admin/quotes/[id]/route";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  console.log("🚀 ~ query:");

  const { data: quote } = await query.graph(
    {
      entity: "quotes",
      filters: { customer_id: req.auth_context.actor_id },
      fields: req.queryConfig.fields,
    },
    { throwIfKeyNotFound: true } //TODO::: test need
  );

  const orderModuleService = req.scope.resolve(Modules.ORDER);
  const quoteData: any = [];
  await Promise.all(
    quote.map(async (e) => {
      const preview = await orderModuleService.previewOrderChange(
        e.draft_order_id
      );
      const payment_status = getLastPaymentStatus(e.draft_order);
      quoteData.push({ ...e, order_preview: preview, payment_status });
    })
  );

  res.status(200).json(quoteData);
};
