"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/session";

export async function adminSignIn(formData: FormData): Promise<{ ok: false; error: string } | void> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const admin = await db.query.admins.findFirst({ where: eq(admins.username, username) });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return { ok: false, error: "Wrong username or password." };
  }

  const session = await getSession();
  session.isAdmin = true;
  await session.save();
  await audit({ actorType: "admin", actorId: username, action: "admin.signed_in", entity: "admin" });
  redirect("/admin");
}

export async function adminSignOut() {
  const session = await getSession();
  session.destroy();
  redirect("/admin/login");
}
