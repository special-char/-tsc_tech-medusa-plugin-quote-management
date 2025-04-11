import { Button, FocusModal, Input, Label, toast } from "@medusajs/ui";
import { useState } from "react";

import { Spinner } from "@medusajs/icons";
import { sdk } from "../lib/sdk";
type CustomerCreateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
  onCreate: (customer: { id: string; email: string }) => void;
};

const CustomerCreateModal = ({
  open,
  onOpenChange,
  defaultEmail = "",
  onCreate,
}: CustomerCreateModalProps) => {
  const [email, setEmail] = useState(defaultEmail);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email) {
      toast.warning("Email is required");
      return;
    }

    setLoading(true);

    try {
      const res = await sdk.admin.customer.create({
        email,
        first_name: firstName,
        last_name: lastName,
      });

      const newCustomer = res.customer;

      onCreate({
        id: newCustomer.id,
        email: newCustomer.email,
      });

      onOpenChange(false);
      toast.success("Customer created");
    } catch (error: any) {
      toast.error("Failed to create customer", {
        description: error.message || "Unexpected error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <span className="text-lg font-medium">Create New Customer</span>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-y-4 p-4">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              required
            />
          </div>
          <div>
            <Label>First Name</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
            />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name"
            />
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            {" "}
            {loading ? <Spinner className="animate-spin" /> : "Create Customer"}
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
};

export default CustomerCreateModal;
