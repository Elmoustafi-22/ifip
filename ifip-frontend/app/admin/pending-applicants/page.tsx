import { redirect } from "next/navigation";

export default function PendingApplicantsPage() {
  redirect("/admin/applications?view=pending");
}
