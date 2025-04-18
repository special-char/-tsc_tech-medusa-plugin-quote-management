import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createRequestForQuoteWorkflow } from "../../../../workflows/create-request-for-quote";
import { CreateQuoteType } from "../../validators";
import {
  createCartWorkflow,
  createCustomersWorkflow,
} from "@medusajs/medusa/core-flows";

export const POST = async (
  req:
    | MedusaRequest<CreateQuoteType>
    | AuthenticatedMedusaRequest<CreateQuoteType>,
  res: MedusaResponse
) => {
  let customer_id = (req as AuthenticatedMedusaRequest).auth_context?.actor_id;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  if (!customer_id) {
    console.log("customer");
    //first check if customer already exists
    const { data: customer } = await query.graph<any>({
      entity: "customer",
      fields: ["id", "first_name", "last_name", "email", "has_account"],
      filters: {
        email: req.body.email,
      },
    });

    if (customer && customer.length > 0 && customer[0].id) {
      customer_id = customer[0].id;
    }

    //create customer
    if (!customer_id) {
      const createdCustomers = await createCustomersWorkflow(req.scope).run({
        input: {
          customersData: [
            {
              first_name: req.body.first_name,
              last_name: req.body.last_name,
              email: req.body.email,
            },
          ],
        },
      });
      customer_id = createdCustomers.result[0].id;
      //TODO: customer invite
      // if (!createdCustomers.result[0].has_account) {
      //   customerInviteFuncion({ ids: [createdCustomers.result[0].id] });
      // }
    }
  }
  let cart_id = req.body.cart_id;
  if (!cart_id) {
    console.log("cart_id");
    //create carta
    const cart = await createCartWorkflow(req.scope).run({
      input: {
        region_id: req.body.region_id,
        items: [
          {
            variant_id: req.body.variant_id,
            quantity: req.body.quantity || 0,
          },
        ],
        customer_id: customer_id,
      },
    });
    cart_id = cart.result.id;
  }

  const {
    result: { quote: createdQuote },
  } = await createRequestForQuoteWorkflow(req.scope).run({
    input: {
      cart_id: cart_id,
      customer_id: customer_id,
      note: req.body.note
    },
  });

  const {
    data: [quote],
  } = await query.graph(
    {
      entity: "quotes",
      fields: req.queryConfig.fields,
      filters: { id: createdQuote.id },
    },
    { throwIfKeyNotFound: true }
  );

  return res.json({ quote });
};
