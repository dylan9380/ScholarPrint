import OrderForm from "../../order-form";

export default function NewOrderPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <h1 className="font-display text-2xl font-semibold mb-2">Order a poster</h1>
      <p className="text-ink/60 mb-8 text-sm">
        One standard 3 ft × 4 ft matte poster. Upload a PDF or PPTX to preview it before submitting.
      </p>
      <OrderForm />
    </div>
  );
}
