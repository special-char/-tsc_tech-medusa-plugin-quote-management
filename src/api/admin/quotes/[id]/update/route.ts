import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CreateQuoteUpdateType } from "../../validators";
import { merchantUpdateQuoteWorkflow } from "../../../../../workflows/update-quote";

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateQuoteUpdateType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  await merchantUpdateQuoteWorkflow(req.scope).run({
    input: {
      quote_id: id,
      valid_till: new Date(req.body.valid_till),
    },
  });

  const {
    data: [quote],
  } = await query.graph(
    {
      entity: "quotes",
      filters: { id },
      fields: req.queryConfig.fields,
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ quote });
};
