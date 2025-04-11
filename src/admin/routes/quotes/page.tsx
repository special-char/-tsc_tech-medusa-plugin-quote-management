import { defineRouteConfig } from "@medusajs/admin-sdk";
import { DocumentText, Link } from "@medusajs/icons";
import {
  Button,
  Container,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  Heading,
  Toaster,
  useDataTable,
} from "@medusajs/ui";
import { useNavigate } from "react-router-dom";
import { useQuotes } from "../../hooks/quotes";
import { useState } from "react";
import { AdminQuote } from "../../types";

const StatusTitles: Record<string, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  pending: "Pending",
};

const columnHelper = createDataTableColumnHelper<AdminQuote>();

const columns = [
  columnHelper.accessor("draft_order.display_id", {
    header: "ID",
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => StatusTitles[getValue()],
  }),
  columnHelper.accessor("customer.email", {
    header: "Email",
  }),
  columnHelper.accessor("draft_order.customer.first_name", {
    header: "First Name",
  }),
  columnHelper.accessor("draft_order.customer.company_name", {
    header: "Company Name",
  }),
  columnHelper.accessor("draft_order.total", {
    header: "Total",
    cell: ({ getValue, row }) =>
      `${row.original.draft_order.currency_code.toUpperCase()} ${getValue()}`,
  }),
  columnHelper.accessor("created_at", {
    header: "Created At",
    cell: ({ getValue }) => new Date(getValue()).toLocaleDateString(),
  }),
];

const Quotes = () => {
  const navigate = useNavigate();
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: 15,
    pageIndex: 0,
  });
  const {
    quotes = [],
    count,
    isPending,
  } = useQuotes({
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    fields: "+draft_order.total,*draft_order.customer",
    order: "-created_at",
  });

  const table = useDataTable({
    columns,
    data: quotes,
    getRowId: (quote) => quote.id,
    rowCount: count,
    isLoading: isPending,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    onRowClick(event, row) {
      console.log("row", row);

      navigate(`/quotes/detail`, {
        state: { id: row.id },
      });
    },
  });

  return (
    <>
      <Container className="flex flex-col p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Quotes</Heading>
          <Button size="small" variant="secondary" asChild>
            <Button
              size="small"
              variant="secondary"
              onClick={() => navigate("/quotes/create")}
            >
              Create
            </Button>
          </Button>
        </div>
        <DataTable instance={table}>
          <DataTable.Toolbar>
            <Heading>Products</Heading>
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </Container>
      <Toaster />
    </>
  );
};

export const config = defineRouteConfig({
  label: "Quotes",
  icon: DocumentText,
});

export default Quotes;
