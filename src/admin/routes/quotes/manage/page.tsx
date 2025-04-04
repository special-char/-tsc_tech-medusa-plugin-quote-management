import { useLocation, useParams } from "react-router-dom";
import { Container, Heading, Toaster } from "@medusajs/ui";
import { ManageQuoteForm } from "../../../components/manage-quote-form";
import { useQuote } from "../../../hooks/quotes";

const QuoteManage = () => {
  const { state } = useLocation();
  const { id } = state;
  const { quote, isLoading } = useQuote(id!, {
    fields: "*draft_order.customer",
  });

  if (isLoading) {
    return <></>;
  }

  if (!quote) {
    throw "quote not found";
  }

  return (
    <>
      <Container className="divide-y p-0">
        <Heading className="flex items-center justify-between px-6 py-4">
          Manage Quote
        </Heading>

        <ManageQuoteForm order={quote.draft_order} />
      </Container>
      <Toaster />
    </>
  );
};

export default QuoteManage;
