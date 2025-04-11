import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
	HttpTypes,
	PriceDTO,
	ProductVariantDTO,
} from "@medusajs/framework/types";
import {
	ContainerRegistrationKeys,
	getTotalVariantAvailability,
	QueryContext,
} from "@medusajs/framework/utils";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
	const withInventoryQuantity = req.queryConfig.fields.some((field) =>
		field.includes("inventory_quantity")
	);

	if (withInventoryQuantity) {
		req.queryConfig.fields = req.queryConfig.fields.filter(
			(field) => !field.includes("inventory_quantity")
		);
	}
	req.queryConfig.fields.pop();
	delete req.filterableFields.region_id;

	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
	const { data: variants, metadata } = await query.graph<any>({
		entity: "variant",
		fields: req.queryConfig.fields,
		filters: {
			...req.filterableFields,
		},
		context: {
			calculated_price: QueryContext({
				region_id: req.pricingContext?.region_id,
				currency_code: req.pricingContext?.currency_code,
			}),
		},
		pagination: req.queryConfig.pagination,
	});

	if (withInventoryQuantity) {
		await wrapVariantsWithTotalInventoryQuantity(req, variants || []);
	}

	res.json({
		variants: variants,
		count: metadata?.count,
		offset: metadata?.skip,
		limit: metadata?.take,
	});
};

export const buildRules = (price: PriceDTO) => {
	const rules: Record<string, string> = {};

	for (const priceRule of price.price_rules || []) {
		const ruleAttribute = priceRule.attribute;

		if (ruleAttribute) {
			rules[ruleAttribute] = priceRule.value;
		}
	}

	return rules;
};

export const remapVariantResponse = (
	variant: ProductVariantDTO
): HttpTypes.AdminProductVariant => {
	if (!variant) {
		return variant;
	}

	const resp = {
		...variant,
		prices: (variant as any).price_set?.prices?.map((price) => ({
			id: price.id,
			amount: price.amount,
			currency_code: price.currency_code,
			min_quantity: price.min_quantity,
			max_quantity: price.max_quantity,
			variant_id: variant.id,
			created_at: price.created_at,
			updated_at: price.updated_at,
			rules: buildRules(price),
		})),
	};

	delete (resp as any).price_set;

	// TODO: Remove any once all typings are cleaned up
	return resp as any;
};
type VariantInput = {
	id: string;
	inventory_quantity?: number;
	manage_inventory?: boolean;
};

const isPricing = (fieldName: string) =>
	fieldName.startsWith("variants.prices") ||
	fieldName.startsWith("*variants.prices") ||
	fieldName.startsWith("prices") ||
	fieldName.startsWith("*prices");

export const remapKeysForVariant = (selectFields: string[]) => {
	const variantFields = selectFields.filter(
		(fieldName: string) => !isPricing(fieldName)
	);

	const pricingFields = selectFields
		.filter((fieldName: string) => isPricing(fieldName))
		.map((fieldName: string) =>
			fieldName.replace("prices.", "price_set.prices.")
		);

	return [...variantFields, ...pricingFields];
};
type VariantAvailability = Awaited<
	ReturnType<typeof getTotalVariantAvailability>
>;
const wrapVariants = (
	variants: VariantInput[],
	availability: VariantAvailability
) => {
	for (const variant of variants) {
		if (!variant.manage_inventory) {
			continue;
		}

		variant.inventory_quantity = availability[variant.id].availability;
	}
};

export const wrapVariantsWithTotalInventoryQuantity = async (
	req: MedusaRequest,
	variants: VariantInput[]
) => {
	const variantIds = (variants ?? []).map((variant) => variant.id).flat(1);

	if (!variantIds.length) {
		return;
	}

	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
	const availability = await getTotalVariantAvailability(query, {
		variant_ids: variantIds,
	});

	wrapVariants(variants, availability);
};
