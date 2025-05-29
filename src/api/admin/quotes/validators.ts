import { createFindParams } from "@medusajs/medusa/api/utils/validators";
import { z } from "zod";

export const AdminGetQuoteParams = createFindParams({
  limit: 15,
  offset: 0,
}).strict();

export type GetQuoteParamsType = z.infer<typeof AdminGetQuoteParams>;
export const AddressSchema = z
  .object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    phone: z.string().optional(),
    address_1: z.string(),
    address_2: z.string().optional(),
    company: z.string().optional(),
    country_code: z.string(),
    province: z.string().optional(),
  })
  .optional();

export type CreateQuoteType = z.infer<typeof AdminCreateQuote>;
export const AdminCreateQuote = z.object({
  customer_id: z.string(),
  region_id: z.string(),
  variant_id: z.string(),
  quantity: z.number(),
  valid_till: z.string(),
  unit_price: z.number(),
  shipping_address: AddressSchema,
  billing_address: AddressSchema,
  shipping_address_id: z.string().optional(),
  billing_address_id: z.string().optional(),
  gstNumber: z.string().optional(),
});

export type CreateQuoteUpdateType = z.infer<typeof AdminCreateQuote>;
export const AdminCreateUpdateQuote = z.object({
  valid_till: z.string(),
});
