"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Lang } from "./i18n";

export async function setLang(lang: Lang) {
  const c = await cookies();
  c.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}
