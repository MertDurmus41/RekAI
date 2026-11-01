import { AdBrowser } from "@/components/AdBrowser";
import { createClient } from "@/lib/supabase/server";

export default async function GalleryPage() {
  // Supabase ayarlıysa giriş yapmış kullanıcının e-postası üst çubukta gösterilir.
  let email: string | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    email = (claims?.user_metadata?.email_label as string | undefined) ?? claims?.email ?? null;
  }
  return <AdBrowser email={email} />;
}
