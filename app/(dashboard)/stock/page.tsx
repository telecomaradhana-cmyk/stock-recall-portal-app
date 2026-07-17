import { createClient } from "@/lib/supabase/server";
import StockManager from "@/components/StockManager";

export default async function StockPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: products }, { data: profile }] = await Promise.all([
    supabase.from("products").select("*").order("name"),
    user
      ? supabase.from("profiles").select("role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <StockManager
      initialProducts={products ?? []}
      canEdit={profile?.role === "admin" || profile?.role === "staff"}
    />
  );
}
