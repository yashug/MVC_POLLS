import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { PreviewBanner } from "@/components/PreviewBanner";
import { ZariBand } from "@/components/ZariBand";
import { getT } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session.villaId) redirect("/");
  const { t, lang } = await getT();

  return (
    <main className="flex min-h-dvh flex-col">
      <PreviewBanner lang={lang} />
      <ZariBand height={10} />
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <header className="mb-8 text-center">
          <p className="text-[0.68rem] uppercase tracking-[0.3em] text-zari">{t("community")}</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-[1.05] text-leaf">
            Ganesh
            <br />
            Chaturthi
            <span className="ml-2 align-super text-lg text-kumkum">2026</span>
          </h1>
          <p className="mt-3 text-sm text-leaf-soft">14 – 19 September</p>
        </header>

        <LoginForm
          labels={{
            loginTitle: t("loginTitle"), villaNumber: t("villaNumber"), pin: t("pin"),
            setPin: t("setPin"), confirmPin: t("confirmPin"), yourName: t("yourName"),
            phone: t("phone"), continueBtn: t("continueBtn"), firstTime: t("firstTime"),
            forgotPin: t("forgotPin"), back: t("back"),
          }}
        />
      </div>
    </main>
  );
}
