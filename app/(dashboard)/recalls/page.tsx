import { createClient } from "@/lib/supabase/server";
import RecallManager from "@/components/RecallManager";

export default async function RecallsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: items }, { data: products }, { data: profile }] = await Promise.all([
    supabase
      .from("recall_items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("products").select("id, sku, current_stock"),
    user
      ? supabase.from("profiles").select("role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <RecallManager
      initialItems={items ?? []}
      products={products ?? []}
      canEdit={profile?.role === "admin" || profile?.role === "staff"}
    />
  );
}
