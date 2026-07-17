import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsersManager from "@/components/UsersManager";

export default async function UsersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (myProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return <UsersManager initialProfiles={profiles ?? []} currentUserId={user.id} />;
}
