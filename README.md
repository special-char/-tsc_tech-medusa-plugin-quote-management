# Quote Management System

This project includes a comprehensive quote management system that handles various aspects of quoting, such as cart quotes, customer quotes, order changes, and order quotes.

## Features

1. **Cart Quotes**

   - Handles the creation and management of quotes associated with shopping carts.
   - Includes logic for calculating discounts, taxes, and total amounts.

2. **Customer Quotes**

   - Manages quotes specific to individual customers.
   - Supports personalized pricing and customer-specific terms.

3. **Order Change Quotes**

   - Facilitates quotes for changes to existing orders.
   - Ensures accurate recalculations for modifications.

4. **Order Quotes**

   - Generates quotes for finalized orders.
   - Includes support for order-specific adjustments and promotions.

5. **Quote Modules**
   - Contains reusable modules and utilities for quote management.
   - Provides a centralized location for shared quote-related logic.

## How It Works

1. **Initialization**: Quotes are initialized based on the context (cart, customer, or order).
2. **Calculation**: The system calculates the quote details, including pricing, discounts, and taxes.
3. **Validation**: Ensures all required fields are populated and the quote meets business rules.
4. **Finalization**: Once approved, the quote is converted into an order or saved for future reference.

---

## API Documentation

### 1. Preview Quote

**Endpoint**: `GET /store/customers/me/quotes/{{quoteId}}/preview`

```bash
curl -X GET "{{backend_url}}/store/customers/me/quotes/{{quoteId}}/preview" \
-H "Authorization: Bearer {{token}}" \
-H "x-publishable-api-key: {{x-publishable-api-key}}"
```

### 2. Customer Accept Quote

**Endpoint**: `POST /store/customers/me/quotes/{{quoteId}}/accept`

```bash
curl -X POST "{{backend_url}}/store/customers/me/quotes/{{quoteId}}/accept" \
-H "Authorization: Bearer {{token}}" \
-H "x-publishable-api-key: {{x-publishable-api-key}}"
```

### 3. Create Request for Quote

**Endpoint**: `POST /store/customers/quotes`

```bash
curl -X POST "{{backend_url}}/store/customers/quotes" \
-H "Authorization: Bearer {{token}}" \
-H "x-publishable-api-key: {{x-publishable-api-key}}" \
-H "Content-Type: application/json" \
-d '{
  "region_id": "reg_01JQ950RWSF4HPHKQHB4FMB1EM",
  "first_name": "fn",
  "last_name": "ln",
  "quantity": 5,
  "email": "testquote111@yopmail.com",
  "variant_id": "variant_01JQ950S0R2YJ8WN7KJ6K0YZA7"
}'
```

### 4. Get Customer Quotes

**Endpoint**: `GET /store/customers/me/quotes`

```bash
curl -X GET "{{backend_url}}/store/customers/me/quotes" \
-H "Authorization: Bearer {{token}}" \
-H "x-publishable-api-key: {{x-publishable-api-key}}"
```

### 5. Customer Reject Quote

**Endpoint**: `POST /store/customers/me/quotes/{{quoteId}}/reject`

```bash
curl -X POST "{{backend_url}}/store/customers/me/quotes/{{quoteId}}/reject" \
-H "Authorization: Bearer {{token}}" \
-H "x-publishable-api-key: {{x-publishable-api-key}}"
```

### 6. Admin Get All Quotes

**Endpoint**: `GET /admin/quotes`

```bash
curl -X GET "{{backend_url}}/admin/quotes" \
-H "Authorization: Bearer {{adminAuth}}"
```

### 8. Admin Reject Quote

**Endpoint**: `POST /admin/quotes/{{quoteId}}/reject`

```bash
curl -X POST "{{backend_url}}/admin/quotes/{{quoteId}}/reject" \
-H "Authorization: Bearer {{adminAuth}}"
```

### 9. Admin Create Quote

**Endpoint**: `POST /admin/quotes`

```bash
curl -X POST "{{backend_url}}/admin/quotes" \
-H "Authorization: Bearer {{adminAuth}}" \
-H "Content-Type: application/json" \
-d '{
  "customer_id": "cus_01JQNBNXTHYW6KNH2GX85YQGVZ",
  "region_id": "reg_01JQN8EF6A9SPHZ0E33EAD9ASW",
  "variant_id": "variant_01JQN8EFBEKQ25BS7QW71X5BBF",
  "quantity": 5
}'
```

### 10. Admin Send Quote

**Endpoint**: `POST /admin/quotes/{{quoteId}}/send`

```bash
curl -X POST "{{backend_url}}/admin/quotes/{{quoteId}}/send" \
-H "Authorization: Bearer {{adminAuth}}"
```
