import { redirect } from "next/navigation";

export default function SignupPage() {
  redirect("/?auth=required&mode=signup");
}
