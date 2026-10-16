import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const locale = (await cookies()).get("paufer_locale")?.value ?? "es";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
