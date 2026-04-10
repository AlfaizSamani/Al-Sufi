import { MessageCircle } from "lucide-react";

const WhatsAppButton = () => {
  const phone = "919876543210"; // Update with actual number
  const message = encodeURIComponent("Hi! I'd like to place an order from Al-Sufi Frozen Foods.");

  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-[hsl(142,70%,45%)] text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
};

export default WhatsAppButton;
