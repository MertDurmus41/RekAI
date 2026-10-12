import { AdBrowser } from "@/components/AdBrowser";
import { createClient } from "@/lib/supabase/server";

export default async function GalleryPage() {
  // Supabase ayarlıysa giriş yapmış kullanıcının e-postası üst çubukta gösterilir.
  let email: string | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
  }
  return <AdBrowser email={email} />;
}
