import OrderForm from "../../order-form";

export const metadata = {
  title: "Order a Poster Online",
  description:
    "Upload and preview a print-ready PDF or PPTX for a 36 × 48 in matte academic poster. Choose local delivery or tracked shipping across Canada.",
  alternates: {
    canonical: "/order/new",
  },
};

export default function NewOrderPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-display text-2xl font-semibold mb-2">Order a poster</h1>
      <p className="text-ink/60 mb-8 text-sm">
        One standard 3 ft × 4 ft matte poster. Upload a PDF or PPTX to preview it before submitting.
      </p>
      <OrderForm />
    </div>
  );
}
