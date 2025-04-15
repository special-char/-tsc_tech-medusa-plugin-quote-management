import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  refetchEntities,
  refetchEntity,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { MedusaPricingContext } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";

export const applyAndAndOrOperators = (schema: z.ZodObject<any>) => {
  return schema.merge(
    z.object({
      $and: z.lazy(() => schema.array()).optional(),
      $or: z.lazy(() => schema.array()).optional(),
    })
  );
};

export const booleanString = () =>
  z
    .union([z.boolean(), z.string()])
    .refine((value) => {
      return ["true", "false"].includes(value.toString().toLowerCase());
    })
    .transform((value) => {
      return value.toString().toLowerCase() === "true";
    });
export const createSelectParams = () => {
  return z.object({
    fields: z.string().optional(),
  });
};
export const createFindParams = ({
  offset,
  limit,
  order,
}: {
  offset?: number;
  limit?: number;
  order?: string;
} = {}) => {
  const selectParams = createSelectParams();

  return selectParams.merge(
    z.object({
      offset: z.preprocess(
        (val) => {
          if (val && typeof val === "string") {
            return parseInt(val);
          }
          return val;
        },
        z
          .number()
          .optional()
          .default(offset ?? 0)
      ),
      limit: z.preprocess(
        (val) => {
          if (val && typeof val === "string") {
            return parseInt(val);
          }
          return val;
        },
        z
          .number()
          .optional()
          .default(limit ?? 20)
      ),
      order: order
        ? z.string().optional().default(order)
        : z.string().optional(),
    })
  );
};
export const createOperatorMap = (
  type?: z.ZodType,
  valueParser?: (val: any) => any
) => {
  if (!type) {
    type = z.string();
  }

  let simpleType: any = type.optional();
  if (valueParser) {
    simpleType = z.preprocess(valueParser, type).optional();
  }

  const arrayType: any = z.array(type).optional();
  const unionType: any = z.union([simpleType, arrayType]).optional();

  return z.union([
    unionType,
    z.object({
      $eq: unionType,
      $ne: unionType,
      $in: arrayType,
      $nin: arrayType,
      $like: simpleType,
      $ilike: simpleType,
      $re: simpleType,
      $contains: simpleType,
      $gt: simpleType,
      $gte: simpleType,
      $lt: simpleType,
      $lte: simpleType,
    }),
  ]);
};
export const AdminGetProductVariantsParamsFields = z.object({
  q: z.string().optional(),
  region_id: z.string().optional(),
  id: z.union([z.string(), z.array(z.string())]).optional(),
  manage_inventory: booleanString().optional(),
  allow_backorder: booleanString().optional(),
  created_at: createOperatorMap().optional(),
  updated_at: createOperatorMap().optional(),
  deleted_at: createOperatorMap().optional(),
});

export type AdminGetProductVariantsParamsType = z.infer<
  typeof AdminGetProductVariantsParams
>;
export const AdminGetProductVariantsParams = createFindParams({
  offset: 0,
  limit: 50,
})
  .merge(AdminGetProductVariantsParamsFields)
  .merge(applyAndAndOrOperators(AdminGetProductVariantsParamsFields));

export function setPricingContext() {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const withCalculatedPrice = req.queryConfig.fields.some((field) =>
      field.startsWith("variants.calculated_price")
    );
    if (!withCalculatedPrice) {
      return next();
    }

    // We validate the region ID in the previous middleware
    const region = await refetchEntity(
      "region",
      req.filterableFields.region_id!,
      req.scope,
      ["id", "currency_code"]
    );

    if (!region) {
      try {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Region with id ${req.filterableFields.region_id} not found when populating the pricing context`
        );
      } catch (e) {
        return next(e);
      }
    }

    const pricingContext: MedusaPricingContext = {
      region_id: region.id,
      currency_code: region.currency_code,
    };

    // Find all the customer groups the customer is a part of and set
    if ((req as any).auth_context?.actor_id) {
      const customerGroups = await refetchEntities(
        "customer_group",
        { customers: { id: (req as any).auth_context.actor_id } },
        req.scope,
        ["id"]
      );

      pricingContext.customer = { groups: [] };
      customerGroups.map((cg) =>
        pricingContext.customer?.groups?.push({ id: cg.id })
      );
    }

    req.pricingContext = pricingContext;
    return next();
  };
}
