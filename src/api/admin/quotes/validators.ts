import { createFindParams } from "@medusajs/medusa/api/utils/validators";
import { z } from "zod";

export const AdminGetQuoteParams = createFindParams({
  limit: 15,
  offset: 0,
}).strict();

export type GetQuoteParamsType = z.infer<typeof AdminGetQuoteParams>;

export type CreateQuoteType = z.infer<typeof AdminCreateQuote>;
export const AdminCreateQuote = z.object({
  customer_id: z.string(),
  region_id: z.string(),
  variant_id: z.string(),
  quantity: z.number(),
});
