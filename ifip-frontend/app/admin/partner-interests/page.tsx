import { redirect } from "next/navigation";

export default function PartnerInterestsRedirect() {
  redirect("/admin/partners?tab=intern-requests");
}
