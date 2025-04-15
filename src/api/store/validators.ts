import { createFindParams } from "@medusajs/medusa/api/utils/validators";
import { z } from "zod";

export type GetQuoteParamsType = z.infer<typeof GetQuoteParams>;
export const GetQuoteParams = createFindParams({
  limit: 15,
  offset: 0,
});

export type CreateQuoteType = z.infer<typeof CreateQuote>;
export const CreateQuote = z.object({
  cart_id: z.string().optional(),
  customer_id: z.string().optional(),
  region_id: z.string().optional(),
  variant_id: z.string().optional(),
  quantity: z.number().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  note: z.string().optional(),
});
