import { redirect } from "next/navigation";

/** The console replaced the original plain admin list. */
export default function AdminIndex() {
  redirect("/dashboard");
}
