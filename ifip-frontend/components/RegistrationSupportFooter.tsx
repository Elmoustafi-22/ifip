import { TbBrandWhatsapp, TbMail } from "react-icons/tb";

export default function RegistrationSupportFooter() {
  return (
    <footer className="border-t border-[#cbd8e8] bg-[#f8f5ef] px-4 py-3">
      <nav aria-label="Registration support" className="mx-auto flex max-w-5xl flex-wrap justify-center gap-x-6 text-sm font-semibold text-[#101f3f]">
        <a href="https://wa.me/2349060356610" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-[#12617e] hover:bg-white hover:text-[#101f3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]">
          <TbBrandWhatsapp className="size-5 text-[#12617e]" aria-hidden="true" />
          WhatsApp support
        </a>
        <a href="mailto:ifip.program@gmail.com" className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-[#12617e] hover:bg-white hover:text-[#101f3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12617e]">
          <TbMail className="size-5 text-[#12617e]" aria-hidden="true" />
          Email support
        </a>
      </nav>
    </footer>
  );
}
