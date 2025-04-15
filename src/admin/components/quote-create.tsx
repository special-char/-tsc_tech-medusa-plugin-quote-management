import { Controller, UseFormReturn } from "react-hook-form";
import {
  Button,
  ProgressStatus,
  ProgressTabs,
  Input,
  Label,
  CurrencyInput,
  DatePicker,
  FocusModal,
} from "@medusajs/ui";
import { useState } from "react";
import { Spinner, Plus } from "@medusajs/icons";
import { sdk } from "../lib/sdk";
import ErrorMessage from "./ErrorMessage";
import CustomerCreateModal from "./create-customer";
import { useComboboxData } from "../hooks/use-combobox-data";
import { Combobox } from "./combobox";

type Region = {
  id: string;
  name: string;
  currency_code: string;
  offset: number;
  limit: number;
  count: number;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  offset: number;
  limit: number;
  count: number;
};

type Variant = {
  id: string;
  name: string;
  sku: string;
  product: {
    id: string;
    title: string;
    thumbnail: string;
  };
  calculated_price: number;
};

type RegionResponse = {
  regions: Array<{
    id: string;
    name: string;
    currency_code: string;
  }>;
  offset: number;
  limit: number;
  count: number;
};

type CustomerResponse = {
  customers: Array<{
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
  }>;
  offset: number;
  limit: number;
  count: number;
};

type VariantResponse = {
  variants: Array<{
    id: string;
    title: string;
    sku: string | null;
    calculated_price: any;
    product: {
      thumbnail: string | null;
    };
  }>;
  offset: number;
  limit: number;
  count: number;
};

type ComboboxOption = {
  value: string;
  label: string;
  disabled?: boolean;
  image?: string;
  price?: number;
  currency_code?: string;
};

type RegionOption = {
  value: string;
  label: string;
  currency_code: string;
};

type Props = {
  form: UseFormReturn<any, any, undefined>;
  onSubmit: (data: any) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export enum QuoteCreateTab {
  QUOTE_CREATE = "Quote-Create",
}

type TabState = Record<QuoteCreateTab, ProgressStatus>;

const QuoteCreateForm = (props: Props) => {
  const [tab, setTab] = useState<QuoteCreateTab>(QuoteCreateTab.QUOTE_CREATE);
  const [tabState, setTabState] = useState<TabState>({
    [QuoteCreateTab.QUOTE_CREATE]: "in-progress",
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [currencyCode, setCurrencyCode] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [customerKey, setCustomerKey] = useState(0);

  const handleTabChange = async (tab: QuoteCreateTab) => {
    if (tab === QuoteCreateTab.QUOTE_CREATE) {
      setTab(tab);
      setTabState((prev) => ({
        ...prev,
        [QuoteCreateTab.QUOTE_CREATE]: "in-progress",
      }));
      return;
    }
    const valid = await props.form.trigger([
      "region_id",
      "customer_id",
      "quantity",
      "variant_id",
      "unit_price",
      "valid_till",
    ]);
    if (!valid) {
      return;
    }
  };

  const handleContinue = async () => {
    switch (tab) {
      case QuoteCreateTab.QUOTE_CREATE: {
        const valid = await props.form.trigger([
          "quantity",
          "variant_id",
          "customer_id",
          "region_id",
          "unit_price",
          "valid_till",
        ]);
        if (valid) {
          handleTabChange(QuoteCreateTab.QUOTE_CREATE);
        }
        break;
      }
      default:
        break;
    }
    await props.form.handleSubmit(props.onSubmit)();
  };

  const {
    options: regionOptions,
    searchValue: regionSearchValue,
    onSearchValueChange: onRegionSearchValueChange,
    isFetchingNextPage: isFetchingNextRegions,
    hasNextPage: hasNextRegions,
    fetchNextPage: fetchNextRegions,
  } = useComboboxData<
    RegionResponse,
    { q?: string; offset?: number; limit?: number }
  >({
    queryKey: ["regions"],
    queryFn: (params) => sdk.admin.region.list(params),
    getOptions: (data) =>
      data.regions.map((region) => ({
        label: region.name,
        value: region.id,
        currency_code: region.currency_code,
      })) as ComboboxOption[],
  });

  const {
    options: customerOptions,
    searchValue: customerSearchValue,
    onSearchValueChange: onCustomerSearchValueChange,
    fetchNextPage: fetchNextCustomers,
    isFetchingNextPage: isFetchingNextCustomers,
    refetch: refetchCustomers,
  } = useComboboxData<
    CustomerResponse,
    { q?: string; offset?: number; limit?: number }
  >({
    queryKey: ["customers"],
    queryFn: async ({ q, offset, limit }) => {
      const response = await sdk.client.fetch<CustomerResponse>(
        "/admin/customers",
        {
          query: { q, offset, limit },
        }
      );
      return response;
    },
    getOptions: (data) =>
      data.customers.map((customer) => ({
        label: `${customer.email}`.trim(),
        value: customer.id,
      })),
  });

  const selectedRegionId = props.form.watch("region_id");

  const { options: variantOptions } = useComboboxData<
    VariantResponse,
    { q?: string; offset?: number; limit?: number }
  >({
    queryKey: ["variants", selectedRegionId],
    queryFn: async ({ q, offset, limit }) => {
      if (!selectedRegionId) {
        return {
          variants: [],
          offset: 0,
          limit: 0,
          count: 0,
        };
      }
      const response = await sdk.client.fetch<VariantResponse>(
        "/admin/product-variant",
        {
          query: {
            q,
            offset,
            limit,
            region_id: selectedRegionId,
            fields: "*variants.calculated_price",
          },
        }
      );
      return response;
    },
    getOptions: (data) =>
      data.variants.map((variant) => ({
        label: variant.title,
        value: variant.id,
        thumbnail: variant.product?.thumbnail,
        price: variant.calculated_price.calculated_amount,
      })),
  });

  return (
    <FocusModal open={props.open} onOpenChange={props.onOpenChange}>
      <FocusModal.Content>
        <ProgressTabs
          value={tab}
          onValueChange={(v) => handleTabChange(v as QuoteCreateTab)}
          className="flex h-full flex-col overflow-hidden"
        >
          <FocusModal.Header>
            <div className="flex w-full items-center justify-between gap-x-4">
              <div className="-my-2 w-full max-w-[600px] border-l">
                <ProgressTabs.List className="grid w-full grid-cols-4">
                  <ProgressTabs.Trigger
                    className="w-full"
                    value={QuoteCreateTab.QUOTE_CREATE}
                    status={tabState[QuoteCreateTab.QUOTE_CREATE]}
                  >
                    Quote
                  </ProgressTabs.Trigger>
                </ProgressTabs.List>
              </div>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="size-full overflow-hidden">
            <ProgressTabs.Content
              value={QuoteCreateTab.QUOTE_CREATE}
              className="flex h-full flex-col items-center overflow-y-auto"
            >
              <div className="flex w-full max-w-3xl flex-col gap-4 p-16">
                <Controller
                  control={props.form.control}
                  name="region_id"
                  rules={{ required: "Region is required" }}
                  render={({ field }) => {
                    return (
                      <div>
                        <Label>Region</Label>
                        <Combobox
                          {...field}
                          options={regionOptions}
                          searchValue={regionSearchValue}
                          onSearchValueChange={onRegionSearchValueChange}
                          fetchNextPage={fetchNextRegions}
                          isFetchingNextPage={isFetchingNextRegions}
                          placeholder="Select a region"
                          aria-label="Region selection"
                          onChange={(e) => {
                            const selectedRegion = regionOptions.find(
                              (option) => option.value === e
                            ) as
                              | (ComboboxOption & { currency_code: string })
                              | undefined;
                            setCurrencyCode(
                              selectedRegion?.currency_code || ""
                            );
                            props.form.setValue("variant_id", "");
                            setPrice("");
                            field.onChange(e);
                          }}
                        />
                        <ErrorMessage
                          control={props.form.control}
                          name={field.name}
                          rules={{ required: "Region is required" }}
                        />
                      </div>
                    );
                  }}
                />
                <Controller
                  name="customer_id"
                  control={props.form.control}
                  rules={{ required: "Customer is required" }}
                  render={({ field }) => {
                    return (
                      <div>
                        <div className="flex items-center justify-between pb-1">
                          <Label>Customer</Label>
                          {customerSearchValue &&
                            !customerOptions.some(
                              (opt) =>
                                opt.label.toLowerCase() ===
                                customerSearchValue.toLowerCase()
                            ) && (
                              <div
                                className="text-ui-fg-base mt-2 cursor-pointer text-sm"
                                onClick={() => setShowCustomerModal(true)}
                              >
                                <div className="flex items-center gap-x-1">
                                  <Plus className="h-4 w-4" />
                                  <span>Create New Customer</span>
                                </div>
                              </div>
                            )}
                        </div>
                        <Combobox
                          {...field}
                          key={customerKey}
                          options={customerOptions}
                          searchValue={customerSearchValue}
                          onSearchValueChange={onCustomerSearchValueChange}
                          fetchNextPage={fetchNextCustomers}
                          isFetchingNextPage={isFetchingNextCustomers}
                          placeholder="Select a customer"
                          aria-label="Customer selection"
                        />
                        <CustomerCreateModal
                          open={showCustomerModal}
                          onOpenChange={setShowCustomerModal}
                          defaultEmail={customerSearchValue}
                          onCreate={async (newCustomer) => {
                            setCustomerKey((prev) => prev + 1);
                            await refetchCustomers();
                            field.onChange(newCustomer.id);
                            setShowCustomerModal(false);
                          }}
                        />
                        <ErrorMessage
                          control={props.form.control}
                          name={field.name}
                          rules={{ required: "Customer is required" }}
                        />
                      </div>
                    );
                  }}
                />
                <Controller
                  control={props.form.control}
                  name="variant_id"
                  rules={{ required: "Variant is required" }}
                  render={({ field }) => {
                    return (
                      <div>
                        <Label>Variant</Label>
                        <Combobox
                          {...field}
                          options={variantOptions}
                          value={field.value}
                          onChange={(e) => {
                            const selectedVariant = variantOptions.find(
                              (option: ComboboxOption) => option.value === e
                            );
                            console.log(
                              "selectedVariant?.price:::::",
                              selectedVariant?.price
                            );
                            console.log(
                              " selectedVariant.price?.calculated_amount::::",
                              selectedVariant?.price?.calculated_amount
                            );

                            if (selectedVariant?.price) {
                              setPrice(selectedVariant.price.toString());
                            }
                            field.onChange(e);
                          }}
                          placeholder="Select a variant"
                          aria-label="Variant selection"
                        />
                        <ErrorMessage
                          control={props.form.control}
                          name={field.name}
                          rules={{ required: "Variant is required" }}
                        />
                      </div>
                    );
                  }}
                />
                <Controller
                  control={props.form.control}
                  name="quantity"
                  rules={{ required: "Quantity is required" }}
                  render={({ field }) => {
                    return (
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          {...field}
                          placeholder="Enter quantity"
                          className="w-full"
                          onChange={(e) => {
                            field.onChange(e.target.value);
                          }}
                        />
                        <ErrorMessage
                          control={props.form.control}
                          name={field.name}
                          rules={{ required: "Quantity is required" }}
                        />
                      </div>
                    );
                  }}
                />

                <Controller
                  control={props.form.control}
                  name="unit_price"
                  rules={{ required: "Unit price is required" }}
                  render={({ field }) => {
                    return (
                      <div>
                        <div className="flex items-center justify-between pb-1">
                          <Label>Unit Price</Label>
                          {price && (
                            <Label>
                              Variant calculated price: {price}{" "}
                              {currencyCode.toUpperCase()}
                            </Label>
                          )}
                        </div>
                        <CurrencyInput
                          symbol={currencyCode}
                          code={currencyCode}
                          type="numeric"
                          max={999999999999999}
                          min={0}
                          style={{ textAlign: "left" }}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/,/g, "");
                            const numericValue = Number(raw);
                            if (!isNaN(numericValue)) {
                              field.onChange(numericValue);
                            } else {
                              field.onChange("");
                            }
                          }}
                          className="bg-ui-bg-field-component hover:bg-ui-bg-field-component-hover"
                        />
                        <ErrorMessage
                          control={props.form.control}
                          name={field.name}
                          rules={{ required: "Unit Price is required" }}
                        />
                      </div>
                    );
                  }}
                />
                <Controller
                  control={props.form.control}
                  name="valid_till"
                  rules={{ required: "valid till is required" }}
                  render={({ field }) => {
                    return (
                      <div>
                        <Label>Valid Till</Label>
                        <DatePicker
                          granularity="minute"
                          shouldCloseOnSelect={false}
                          minValue={new Date()}
                          {...field}
                        />
                        <ErrorMessage
                          control={props.form.control}
                          name={field.name}
                          rules={{ required: "valid till is required" }}
                        />
                      </div>
                    );
                  }}
                />
              </div>
            </ProgressTabs.Content>
          </FocusModal.Body>
        </ProgressTabs>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <FocusModal.Close asChild>
              <Button variant="secondary" size="small">
                Cancel
              </Button>
            </FocusModal.Close>

            <Button
              key="continue-btn"
              type="button"
              onClick={handleContinue}
              size="small"
            >
              {props.form.formState.isSubmitting ? (
                <Spinner className="animate-spin" />
              ) : (
                "Create Quote"
              )}
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
};

export default QuoteCreateForm;
