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
        // Validate region before continuing
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
  const [customerKey, setCustomerKey] = useState(0);
  const region = useComboboxData({
    queryKey: ["region"],
    queryFn: (params) => sdk.admin.region.list(params),
    getOptions: (data) =>
      data.regions.map((type) => ({
        label: type.name,
        value: type.id,
        currency_code: type.currency_code,
      })),
  });
  const customer = useComboboxData({
    queryKey: ["customer"],
    queryFn: (params) => sdk.admin.customer.list(params),
    getOptions: (data) =>
      data.customers.map((type) => ({
        label: type.email,
        value: type.id,
      })),
  });
  const selectedRegionId = props.form.watch("region_id");
  const variant = useComboboxData({
    queryKey: ["variant", selectedRegionId],
    queryFn: (params: any) =>
      sdk.client.fetch<any>(
        `admin/product-variant?region_id=${selectedRegionId}&fields=*variants.calculated_price`,
        params
      ),
    getOptions: (data) => {
      return data.variants.map((type: any) => {
        return {
          label: type.title + " - " + type.sku,
          value: type.id,
          image: type.product?.thumbnail,
          price: type.calculated_price,
        };
      });
    },
  });
  return (
    <FocusModal open={props.open} onOpenChange={props.onOpenChange}>
      <FocusModal.Content>
        {/* <KeyboundForm
        hidden={true}
        className="flex h-full flex-col"
        onSubmit={props.form.handleSubmit(props.onSubmit)}
      > */}
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
              {/* region_id, customer_id, quantity, variant_id */}

              <div className="flex w-full max-w-3xl flex-col gap-4 p-16">
                <Controller
                  control={props.form.control}
                  name="region_id"
                  rules={{ required: "Region is required" }}
                  render={({ field }) => {
                    return (
                      <div>
                        <Label>Region</Label>
                        {/* <Combobox
                          {...field}
                          options={region.options}
                          searchValue={region.searchValue}
                          onSearchValueChange={region.onSearchValueChange}
                          fetchNextPage={region.fetchNextPage}
                          onChange={(e) => {
                            const selectedRegion = region.options.find(
                              (option) => option.value === e
                            );
                            const newCurrencyCode =
                              (selectedRegion as any)?.currency_code || "";
                            setCurrencyCode(newCurrencyCode);

                            props.form.setValue("variant_id", "");
                            setPrice("");

                            field.onChange(e);
                          }}
                        /> */}
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
                  control={props.form.control}
                  name="customer_id"
                  rules={{ required: "Customer is required" }}
                  render={({ field }) => {
                    return (
                      <div>
                        <div className="flex items-center justify-between pb-1">
                          <Label>Customer</Label>
                          {
                            // condition to show create customer button
                            customer.searchValue &&
                              !customer.options.some(
                                (opt) =>
                                  opt.label.toLowerCase() ===
                                  customer.searchValue.toLowerCase()
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
                              )
                          }
                        </div>
                        {/* <Combobox
                          {...field}
                          // key={customerKey}
                          options={customer.options}
                          searchValue={customer.searchValue}
                          onSearchValueChange={customer.onSearchValueChange}
                          fetchNextPage={customer.fetchNextPage}
                        /> */}

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
                        {/* <Combobox
                          {...field}
                          options={variant.options}
                          searchValue={variant.searchValue}
                          onSearchValueChange={variant.onSearchValueChange}
                          fetchNextPage={variant.fetchNextPage}
                          onChange={(e) => {
                            const selectedVariant = variant.options.find(
                              (option: any) => option.value === e
                            );

                            setPrice(
                              (selectedVariant as any)?.price
                                ?.calculated_amount || ""
                            );
                            field.onChange(e);
                          }}
                        /> */}
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
                <CustomerCreateModal
                  open={showCustomerModal}
                  onOpenChange={setShowCustomerModal}
                  defaultEmail={customer.searchValue}
                  onCreate={(newCustomer) => {
                    setCustomerKey((prev) => prev + 1);
                    customer.refetch?.();
                    props.form.setValue("customer_id", newCustomer.id);
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
              onClick={props.form.handleSubmit(props.onSubmit)}
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
        {/* </KeyboundForm> */}
      </FocusModal.Content>
    </FocusModal>
  );
};

export default QuoteCreateForm;
