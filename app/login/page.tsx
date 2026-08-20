import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { PreviewBanner } from "@/components/PreviewBanner";
import { Toranam } from "@/components/Toranam";
import { ZariBand } from "@/components/ZariBand";
import { getT } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session.villaId) redirect("/");
  const { t, lang } = await getT();

  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden bg-dusk"
      style={{
        // Lamplight behind the panel you are walking toward.
        backgroundImage:
          "radial-gradient(115% 70% at 50% 44%, #2a1a0e 0%, rgba(42,26,14,0.45) 34%, rgba(12,19,16,0) 68%)",
      }}
    >
      <PreviewBanner lang={lang} />
      <Toranam />

      <div className="flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-2">
        <header className="rise-1 mb-9 text-center">
          <p className="text-[0.66rem] uppercase tracking-[0.32em] text-zari">{t("community")}</p>
          <h1
            className="mt-4 font-[family-name:var(--font-display)] text-[2.6rem] leading-[0.98] text-zari-pale"
            style={{ textShadow: "0 0 34px rgba(233,180,76,0.34)" }}
          >
            Ganesh
            <br />
            Chaturthi
          </h1>
          {/* The year rides with the dates instead of hanging off the title,
              which was pulling the second line off centre. */}
          <p lang={lang} className="mt-4 text-sm tracking-wide text-zari/85">
            {lang === "te" ? "సెప్టెంబర్ 14 – 19, 2026" : "14 – 19 September 2026"}
          </p>
        </header>

        <div className="rise-2 w-full max-w-sm">
          <LoginForm
            labels={{
              loginTitle: t("loginTitle"), villaNumber: t("villaNumber"), pin: t("pin"),
              setPin: t("setPin"), confirmPin: t("confirmPin"), yourName: t("yourName"),
              phone: t("phone"), continueBtn: t("continueBtn"), firstTime: t("firstTime"),
              forgotPin: t("forgotPin"), back: t("back"),
              alreadyRegistered: t("alreadyRegistered"),
            }}
          />
        </div>
      </div>

      <ZariBand height={10} tone="night" />
    </main>
  );
}
