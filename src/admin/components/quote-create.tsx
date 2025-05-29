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
  IconButton,
  Checkbox,
} from "@medusajs/ui";
import { useState } from "react";
import { Spinner, Plus, XMark } from "@medusajs/icons";
import { sdk } from "../lib/sdk";
import ErrorMessage from "./ErrorMessage";
import CustomerCreateModal from "./create-customer";
import { useComboboxData } from "../hooks/use-combobox-data";
import { Combobox } from "./combobox";
import { CountrySelect } from "./country-select";
import { AdminRegionListResponse } from "@medusajs/framework/types";

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
    has_account: boolean;
    metadata: {
      gstNumber: string;
    };
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
      title: string;
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
  ADDRESS = "Address",
}

type TabState = Record<QuoteCreateTab, ProgressStatus>;

const QuoteCreateForm = (props: Props) => {
  const [tab, setTab] = useState<QuoteCreateTab>(QuoteCreateTab.QUOTE_CREATE);
  const [tabState, setTabState] = useState<TabState>({
    [QuoteCreateTab.QUOTE_CREATE]: "in-progress",
    [QuoteCreateTab.ADDRESS]: "not-started",
  });
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [currencyCode, setCurrencyCode] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [customerKey, setCustomerKey] = useState(0);

  const handleTabChange = async (tab: QuoteCreateTab) => {
    // Don't do anything if trying to navigate to current tab
    if (tab === QuoteCreateTab.QUOTE_CREATE) {
      setTab(tab);
      setTabState((prev) => ({
        ...prev,
        [QuoteCreateTab.QUOTE_CREATE]: "in-progress",
        [QuoteCreateTab.ADDRESS]: "not-started",
      }));
      return;
    }

    if (tab === QuoteCreateTab.ADDRESS) {
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

      setTab(tab);
      setTabState((prev) => ({
        ...prev,
        [QuoteCreateTab.QUOTE_CREATE]: "completed",
        [QuoteCreateTab.ADDRESS]: "in-progress",
      }));
      return;
    }
  };

  const handleContinue = async () => {
    switch (tab) {
      case QuoteCreateTab.QUOTE_CREATE: {
        const valid = await props.form.trigger([
          "region_id",
          "customer_id",
          "quantity",
          "variant_id",
          "unit_price",
          "valid_till",
        ]);
        if (valid) {
          handleTabChange(QuoteCreateTab.ADDRESS);
        }
        break;
      }

      case QuoteCreateTab.ADDRESS:
        await props.form.handleSubmit(props.onSubmit)();
        break;
    }
  };
  const {
    options: regionOptions,
    searchValue: regionSearchValue,
    onSearchValueChange: onRegionSearchValueChange,
    isFetchingNextPage: isFetchingNextRegions,
    hasNextPage: hasNextRegions,
    fetchNextPage: fetchNextRegions,
  } = useComboboxData<
    AdminRegionListResponse,
    { q?: string; offset?: number; limit?: number }
  >({
    queryKey: ["regions"],
    queryFn: (params) =>
      sdk.admin.region.list({ ...params, fields: "*countries" }),
    getOptions: (data) =>
      data.regions.map((region) => ({
        label: region.name,
        value: region.id,
        currency_code: region.currency_code,
        countries: region.countries,
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
        label: `${customer.email} (${
          customer?.has_account === false ? "Guest" : "Registered"
        })`.trim(),
        value: customer.id,
        gstNumber: customer.metadata?.gstNumber,
        first_name: customer.first_name,
        last_name: customer.last_name,
      })),
  });

  const selectedRegionId = props.form.watch("region_id");

  const {
    options: variantOptions,
    fetchNextPage: fetchNextVariants,
    searchValue: variantSearchValue,
    onSearchValueChange: onVariantSearchValueChange,
    isFetchingNextPage: isFetchingNextVariants,
  } = useComboboxData<
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
        label: `${variant.title} - ${variant?.product?.title}`,
        value: variant.id,
        image: variant.product?.thumbnail,
        price: variant?.calculated_price?.calculated_amount,
      })),
  });

  const {
    options: customerAddressOptions,
    searchValue: customerAddressSearchValue,
    onSearchValueChange: onCustomerAddressSearchValueChange,
    fetchNextPage: fetchNextCustomerAddresses,
  } = useComboboxData<any, { q?: string; offset?: number; limit?: number }>({
    queryKey: ["customer-address", props.form.watch("customer_id")],
    queryFn: async (params) => {
      const customerId = props.form.watch("customer_id");
      if (!customerId) return { addresses: [] };
      // Fetch addresses for the customer
      return await sdk.client.fetch(
        `/admin/customers/${customerId}/addresses?fields=+address_name`
      );
    },
    getOptions: (data) =>
      data.addresses.map((address: any) => {
        console.log(address);
        return {
          label: address
            ? `${address?.first_name ?? ""} ${address?.last_name ?? ""} ${
                address?.address_1
              } (${address.address_name ?? ""})`
            : "Saved Address",
          value: address.id,
          ...address,
        };
      }),
  });

  return (
    <FocusModal open={props.open} onOpenChange={props.onOpenChange}>
      <FocusModal.Content>
        <ProgressTabs
          value={tab}
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
                    onClick={() => handleTabChange(QuoteCreateTab.QUOTE_CREATE)}
                  >
                    Quote
                  </ProgressTabs.Trigger>
                  <ProgressTabs.Trigger
                    className="w-full"
                    value={QuoteCreateTab.ADDRESS}
                    status={tabState[QuoteCreateTab.ADDRESS]}
                    onClick={() => handleTabChange(QuoteCreateTab.ADDRESS)}
                  >
                    Address
                  </ProgressTabs.Trigger>
                </ProgressTabs.List>
              </div>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col min-h-0">
            <ProgressTabs.Content
              value={QuoteCreateTab.QUOTE_CREATE}
              className="flex-1 min-h-0 overflow-y-auto"
            >
              <div className="w-full flex justify-center">
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
                            onChange={(e) => {
                              field.onChange(e);
                              const selectedCustomer = customerOptions.find(
                                (opt) => opt.value === e
                              );
                              if (selectedCustomer) {
                                props.form.setValue(
                                  "shipping_first_name",
                                  selectedCustomer.first_name ?? ""
                                );
                                props.form.setValue(
                                  "shipping_last_name",
                                  selectedCustomer.last_name ?? ""
                                );
                                props.form.setValue(
                                  "billing_first_name",
                                  selectedCustomer.first_name ?? ""
                                );
                                props.form.setValue(
                                  "billing_last_name",
                                  selectedCustomer.last_name ?? ""
                                );
                              }
                              if (
                                selectedCustomer &&
                                selectedCustomer.gstNumber
                              ) {
                                props.form.setValue(
                                  "gstNumber",
                                  selectedCustomer.gstNumber
                                );
                              }
                            }}
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
                            searchValue={variantSearchValue}
                            onSearchValueChange={onVariantSearchValueChange}
                            fetchNextPage={fetchNextVariants}
                            isFetchingNextPage={isFetchingNextVariants}
                            onChange={(e) => {
                              const selectedVariant = variantOptions.find(
                                (option: ComboboxOption) => option.value === e
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
              </div>
            </ProgressTabs.Content>
            <ProgressTabs.Content
              value={QuoteCreateTab.ADDRESS}
              className="flex-1 min-h-0 overflow-y-auto"
            >
              <div className="w-full flex items-center flex-col justify-center">
                <div className="flex w-full max-w-3xl flex-col gap-4 p-10">
                  <div className="flex gap-4 justify-between items-center">
                    <h2 className="text-xl font-semibold">Shipping Address</h2>
                    <Controller
                      control={props.form.control}
                      name="billing_same_as_shipping"
                      defaultValue={true}
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (checked) {
                                // Copy shipping to billing
                                const shipping = props.form.getValues();
                                props.form.setValue(
                                  "billing_first_name",
                                  shipping.shipping_first_name
                                );
                                props.form.setValue(
                                  "billing_last_name",
                                  shipping.shipping_last_name
                                );
                                props.form.setValue(
                                  "billing_address_1",
                                  shipping.shipping_address_1
                                );
                                props.form.setValue(
                                  "billing_address_2",
                                  shipping.shipping_address_2
                                );
                                props.form.setValue(
                                  "billing_company",
                                  shipping.shipping_company
                                );
                                props.form.setValue(
                                  "billing_country_code",
                                  shipping.shipping_country_code
                                );
                                props.form.setValue(
                                  "billing_city",
                                  shipping.shipping_city
                                );
                                props.form.setValue(
                                  "billing_postal_code",
                                  shipping.shipping_postal_code
                                );
                                props.form.setValue(
                                  "billing_state",
                                  shipping.shipping_state
                                );
                                props.form.setValue(
                                  "billing_phone_number",
                                  shipping.shipping_phone_number
                                );
                              }
                            }}
                          />
                          <Label>
                            Billing address same as shipping address
                          </Label>
                        </div>
                      )}
                    />
                  </div>
                  <Controller
                    control={props.form.control}
                    name="shipping_address_id"
                    render={({ field }) => (
                      <div>
                        <Label>Choose Existing Address</Label>
                        <div className="relative">
                          <Combobox
                            {...field}
                            options={customerAddressOptions}
                            searchValue={customerAddressSearchValue}
                            onSearchValueChange={
                              onCustomerAddressSearchValueChange
                            }
                            fetchNextPage={fetchNextCustomerAddresses}
                            onChange={(value) => {
                              field.onChange(value);
                              const selected = customerAddressOptions.find(
                                (opt) => opt.value === value
                              );
                              if (selected) {
                                props.form.setValue(
                                  "shipping_address_1",
                                  selected.address_1
                                );
                                props.form.setValue(
                                  "shipping_address_2",
                                  selected.address_2
                                );
                                props.form.setValue(
                                  "shipping_company",
                                  selected.company
                                );
                                props.form.setValue(
                                  "shipping_country_code",
                                  selected.country_code
                                );
                                props.form.setValue(
                                  "shipping_city",
                                  selected.city
                                );
                                props.form.setValue(
                                  "shipping_postal_code",
                                  selected.postal_code
                                );
                                props.form.setValue(
                                  "shipping_state",
                                  selected.province
                                );
                                props.form.setValue(
                                  "shipping_phone_number",
                                  selected.phone
                                );
                                props.form.setValue(
                                  "shipping_address_name",
                                  selected.address_name
                                );
                              }
                            }}
                          />
                          {field.value && (
                            <IconButton
                              type="button"
                              variant="transparent"
                              className="absolute right-10 top-1/2 -translate-y-1/2 rounded-none"
                              onClick={() => {
                                field.onChange("");
                                props.form.setValue("shipping_address_1", "");
                                props.form.setValue("shipping_address_2", "");
                                props.form.setValue("shipping_company", "");
                                props.form.setValue(
                                  "shipping_country_code",
                                  ""
                                );
                                props.form.setValue("shipping_city", "");
                                props.form.setValue("shipping_postal_code", "");
                                props.form.setValue("shipping_state", "");
                                props.form.setValue(
                                  "shipping_phone_number",
                                  ""
                                );
                              }}
                            >
                              <XMark />
                            </IconButton>
                          )}
                        </div>
                      </div>
                    )}
                  />
                  {/* <Controller
                    control={props.form.control}
                    name="shipping_address_name"
                    rules={{ required: "Address Name is required" }}
                    render={({ field }) => (
                      <div>
                        <Label>Address Name</Label>
                        <Input
                          type="text"
                          {...field}
                          placeholder="Enter address name"
                          className="w-full"
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                        <ErrorMessage
                          control={props.form.control}
                          name={field.name}
                          rules={{ required: "Address Name is required" }}
                        />
                      </div>
                    )}
                  /> */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={props.form.control}
                      name="shipping_first_name"
                      // rules={{ required: "First Name is required" }}
                      render={({ field }) => (
                        <div>
                          <Label>First Name</Label>
                          <Input
                            type="text"
                            {...field}
                            placeholder="Enter first name"
                            className="w-full"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          {/* <ErrorMessage
                            control={props.form.control}
                            name={field.name}
                            rules={{ required: "First Name is required" }}
                          /> */}
                        </div>
                      )}
                    />
                    <Controller
                      control={props.form.control}
                      name="shipping_last_name"
                      // rules={{ required: "Last Name is required" }}
                      render={({ field }) => (
                        <div>
                          <Label>Last Name</Label>
                          <Input
                            type="text"
                            {...field}
                            placeholder="Enter last name"
                            className="w-full"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          {/* <ErrorMessage
                            control={props.form.control}
                            name={field.name}
                            rules={{ required: "Last Name is required" }}
                          /> */}
                        </div>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={props.form.control}
                      name="shipping_address_1"
                      rules={{ required: "Address is required" }}
                      render={({ field }) => (
                        <div>
                          <Label>Address</Label>
                          <Input
                            type="text"
                            {...field}
                            placeholder="Enter address"
                            className="w-full"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          <ErrorMessage
                            control={props.form.control}
                            name={field.name}
                            rules={{ required: "Address is required" }}
                          />
                        </div>
                      )}
                    />
                    <Controller
                      control={props.form.control}
                      name="shipping_address_2"
                      // rules={{ required: "Apartment, suite, etc. is required" }}
                      render={({ field }) => (
                        <div>
                          <Label>Apartment, suite, etc.</Label>
                          <Input
                            type="text"
                            {...field}
                            placeholder="Enter Apartment, suite, etc."
                            className="w-full"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          {/* <ErrorMessage
                            control={props.form.control}
                            name={field.name}
                            rules={{
                              required: "Apartment, suite, etc. is required",
                            }}
                          /> */}
                        </div>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={props.form.control}
                      name="shipping_phone_number"
                      // rules={{ required: "Phone Number is required" }}
                      render={({ field }) => (
                        <div>
                          <Label>Phone Number</Label>
                          <Input
                            type="text"
                            {...field}
                            placeholder="Enter phone number"
                            className="w-full"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          {/* <ErrorMessage
                            control={props.form.control}
                            name={field.name}
                            rules={{ required: "Phone Number is required" }}
                          /> */}
                        </div>
                      )}
                    />
                    <Controller
                      control={props.form.control}
                      name="shipping_company"
                      // rules={{ required: "Company is required" }}
                      render={({ field }) => (
                        <div>
                          <Label>Company</Label>
                          <Input
                            type="text"
                            {...field}
                            placeholder="Enter company"
                            className="w-full"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          {/* <ErrorMessage
                            control={props.form.control}
                            name={field.name}
                            rules={{ required: "Company is required" }}
                          /> */}
                        </div>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={props.form.control}
                      name="shipping_postal_code"
                      // rules={{ required: "Postal Code is required" }}
                      render={({ field }) => (
                        <div>
                          <Label>Postal Code</Label>
                          <Input
                            type="text"
                            {...field}
                            placeholder="Enter postal code"
                            className="w-full"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          {/* <ErrorMessage
                            control={props.form.control}
                            name={field.name}
                            rules={{ required: "Postal Code is required" }}
                          /> */}
                        </div>
                      )}
                    />
                    <Controller
                      control={props.form.control}
                      name="shipping_city"
                      // rules={{ required: "City is required" }}
                      render={({ field }) => (
                        <div>
                          <Label>City</Label>
                          <Input
                            type="text"
                            {...field}
                            placeholder="Enter city"
                            className="w-full"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          {/* <ErrorMessage
                            control={props.form.control}
                            name={field.name}
                            rules={{ required: "City is required" }}
                          /> */}
                        </div>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      control={props.form.control}
                      name="shipping_state"
                      // rules={{ required: "State is required" }}
                      render={({ field }) => (
                        <div>
                          <Label>State</Label>
                          <Input
                            type="text"
                            {...field}
                            placeholder="Enter state"
                            className="w-full"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          {/* <ErrorMessage
                            control={props.form.control}
                            name={field.name}
                            rules={{ required: "State is required" }}
                          /> */}
                        </div>
                      )}
                    />
                    <Controller
                      control={props.form.control}
                      name="shipping_country_code"
                      rules={{ required: "Country Code is required" }}
                      render={({ field }) => (
                        <div>
                          <Label>Country Code</Label>
                          <CountrySelect
                            {...field}
                            countries={
                              regionOptions?.find(
                                (region) =>
                                  region.value ===
                                  props.form.getValues("region_id")
                              )?.countries
                            }
                            defaultValue={props.form.getValues(
                              "shipping_country_code"
                            )}
                          />
                          <ErrorMessage
                            control={props.form.control}
                            name={field.name}
                            rules={{ required: "Country Code is required" }}
                          />
                        </div>
                      )}
                    />
                  </div>
                  <Controller
                    control={props.form.control}
                    name="gstNumber"
                    render={({ field }) => (
                      <div>
                        <Label>GST Number</Label>
                        <Input
                          {...field}
                          placeholder="Enter GST Number"
                          maxLength={15}
                          title="Enter a valid 15-character GST number"
                          data-testid="address-gst-input"
                        />
                        <ErrorMessage
                          control={props.form.control}
                          name={field.name}
                          rules={{
                            pattern: {
                              value:
                                /^([0-3][0-9])[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                              message: "Invalid GST Number",
                            },
                          }}
                        />
                      </div>
                    )}
                  />
                </div>

                {!props.form.watch("billing_same_as_shipping") && (
                  <div className="flex w-full max-w-3xl flex-col gap-4 p-10">
                    <h2 className="text-xl font-semibold">Billing Address</h2>
                    <Controller
                      control={props.form.control}
                      name="billing_address_id"
                      render={({ field }) => (
                        <div>
                          <Label>Choose Existing Address</Label>
                          <div className="relative">
                            <Combobox
                              {...field}
                              options={customerAddressOptions}
                              searchValue={customerAddressSearchValue}
                              onSearchValueChange={
                                onCustomerAddressSearchValueChange
                              }
                              fetchNextPage={fetchNextCustomerAddresses}
                              onChange={(value) => {
                                field.onChange(value);
                                const selected = customerAddressOptions.find(
                                  (opt) => opt.value === value
                                );
                                if (selected) {
                                  props.form.setValue(
                                    "billing_address_1",
                                    selected.address_1
                                  );
                                  props.form.setValue(
                                    "billing_address_2",
                                    selected.address_2
                                  );
                                  props.form.setValue(
                                    "billing_company",
                                    selected.company
                                  );
                                  props.form.setValue(
                                    "billing_country_code",
                                    selected.country_code
                                  );
                                  props.form.setValue(
                                    "billing_city",
                                    selected.city
                                  );
                                  props.form.setValue(
                                    "billing_postal_code",
                                    selected.postal_code
                                  );
                                  props.form.setValue(
                                    "billing_state",
                                    selected.province
                                  );
                                  props.form.setValue(
                                    "billing_phone_number",
                                    selected.phone
                                  );
                                  props.form.setValue(
                                    "billing_address_name",
                                    selected.address_name
                                  );
                                }
                              }}
                            />
                            {field.value && (
                              <IconButton
                                type="button"
                                variant="transparent"
                                className="absolute right-10 top-1/2 -translate-y-1/2 rounded-none"
                                onClick={() => {
                                  field.onChange("");
                                  props.form.setValue("billing_address_1", "");
                                  props.form.setValue("billing_address_2", "");
                                  props.form.setValue("billing_company", "");
                                  props.form.setValue(
                                    "billing_country_code",
                                    ""
                                  );
                                  props.form.setValue("billing_city", "");
                                  props.form.setValue(
                                    "billing_postal_code",
                                    ""
                                  );
                                  props.form.setValue("billing_state", "");
                                  props.form.setValue(
                                    "billing_phone_number",
                                    ""
                                  );
                                }}
                              >
                                <XMark />
                              </IconButton>
                            )}
                          </div>
                        </div>
                      )}
                    />
                    {/* <Controller
                      control={props.form.control}
                      name="billing_address_name"
                      rules={{ required: "Address Name is required" }}
                      render={({ field }) => (
                        <div>
                          <Label>Address Name</Label>
                          <Input
                            type="text"
                            {...field}
                            placeholder="Enter address name"
                            className="w-full"
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          <ErrorMessage
                            control={props.form.control}
                            name={field.name}
                            rules={{ required: "Address Name is required" }}
                          />
                        </div>
                      )}
                    /> */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Controller
                        control={props.form.control}
                        name="billing_first_name"
                        // rules={{ required: "First Name is required" }}
                        render={({ field }) => (
                          <div>
                            <Label>First Name</Label>
                            <Input
                              type="text"
                              {...field}
                              placeholder="Enter first name"
                              className="w-full"
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            {/* <ErrorMessage
                              control={props.form.control}
                              name={field.name}
                              rules={{ required: "First Name is required" }}
                            /> */}
                          </div>
                        )}
                      />
                      <Controller
                        control={props.form.control}
                        name="billing_last_name"
                        // rules={{ required: "Last Name is required" }}
                        render={({ field }) => (
                          <div>
                            <Label>Last Name</Label>
                            <Input
                              type="text"
                              {...field}
                              placeholder="Enter last name"
                              className="w-full"
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            {/* <ErrorMessage
                              control={props.form.control}
                              name={field.name}
                              rules={{ required: "Last Name is required" }}
                            /> */}
                          </div>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Controller
                        control={props.form.control}
                        name="billing_address_1"
                        rules={{ required: "Address is required" }}
                        render={({ field }) => (
                          <div>
                            <Label>Address</Label>
                            <Input
                              type="text"
                              {...field}
                              placeholder="Enter address"
                              className="w-full"
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            <ErrorMessage
                              control={props.form.control}
                              name={field.name}
                              rules={{ required: "Address is required" }}
                            />
                          </div>
                        )}
                      />
                      <Controller
                        control={props.form.control}
                        name="billing_address_2"
                        // rules={{
                        //   required: "Apartment, suite, etc. is required",
                        // }}
                        render={({ field }) => (
                          <div>
                            <Label>Apartment, suite, etc.</Label>
                            <Input
                              type="text"
                              {...field}
                              placeholder="Enter Apartment, suite, etc."
                              className="w-full"
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            {/* <ErrorMessage
                              control={props.form.control}
                              name={field.name}
                              rules={{
                                required: "Apartment, suite, etc. is required",
                              }}
                            /> */}
                          </div>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Controller
                        control={props.form.control}
                        name="billing_phone_number"
                        // rules={{ required: "Phone Number is required" }}
                        render={({ field }) => (
                          <div>
                            <Label>Phone Number</Label>
                            <Input
                              type="text"
                              {...field}
                              placeholder="Enter phone number"
                              className="w-full"
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            {/* <ErrorMessage
                              control={props.form.control}
                              name={field.name}
                              rules={{ required: "Phone Number is required" }}
                            /> */}
                          </div>
                        )}
                      />
                      <Controller
                        control={props.form.control}
                        name="billing_company"
                        // rules={{ required: "Company is required" }}
                        render={({ field }) => (
                          <div>
                            <Label>Company</Label>
                            <Input
                              type="text"
                              {...field}
                              placeholder="Enter company"
                              className="w-full"
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            {/* <ErrorMessage
                              control={props.form.control}
                              name={field.name}
                              rules={{ required: "Company is required" }}
                            /> */}
                          </div>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Controller
                        control={props.form.control}
                        name="billing_postal_code"
                        // rules={{ required: "Postal Code is required" }}
                        render={({ field }) => (
                          <div>
                            <Label>Postal Code</Label>
                            <Input
                              type="text"
                              {...field}
                              placeholder="Enter postal code"
                              className="w-full"
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            {/* <ErrorMessage
                              control={props.form.control}
                              name={field.name}
                              rules={{ required: "Postal Code is required" }}
                            /> */}
                          </div>
                        )}
                      />
                      <Controller
                        control={props.form.control}
                        name="billing_city"
                        // rules={{ required: "City is required" }}
                        render={({ field }) => (
                          <div>
                            <Label>City</Label>
                            <Input
                              type="text"
                              {...field}
                              placeholder="Enter city"
                              className="w-full"
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            {/* <ErrorMessage
                              control={props.form.control}
                              name={field.name}
                              rules={{ required: "City is required" }}
                            /> */}
                          </div>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Controller
                        control={props.form.control}
                        name="billing_state"
                        // rules={{ required: "State is required" }}
                        render={({ field }) => (
                          <div>
                            <Label>State</Label>
                            <Input
                              type="text"
                              {...field}
                              placeholder="Enter state"
                              className="w-full"
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                            {/* <ErrorMessage
                              control={props.form.control}
                              name={field.name}
                              rules={{ required: "State is required" }}
                            /> */}
                          </div>
                        )}
                      />
                      <Controller
                        control={props.form.control}
                        name="billing_country_code"
                        rules={{ required: "Country Code is required" }}
                        render={({ field }) => (
                          <div>
                            <Label>Country Code</Label>
                            <CountrySelect
                              {...field}
                              countries={
                                regionOptions?.find(
                                  (region) =>
                                    region.value ===
                                    props.form.getValues("region_id")
                                )?.countries
                              }
                              defaultValue={props.form.getValues(
                                "billing_country_code"
                              )}
                            />
                            <ErrorMessage
                              control={props.form.control}
                              name={field.name}
                              rules={{ required: "Country Code is required" }}
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>
                )}
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
              {tab === QuoteCreateTab.ADDRESS ? (
                props.form.formState.isSubmitting ? (
                  <Spinner className="animate-spin" />
                ) : (
                  "Submit"
                )
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
};

export default QuoteCreateForm;
