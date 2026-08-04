import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polityka prywatności i plików cookies",
  description:
    "Zasady przetwarzania danych osobowych oraz wykorzystania plików cookies w serwisie Media House.",
};

export default function PolitykaPrywatnosciPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">
        Polityka prywatności i plików cookies
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        Ostatnia aktualizacja:{" "}
        {new Date().toLocaleDateString("pl-PL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            1. Administrator danych
          </h2>
          <p>
            Administratorem danych osobowych Użytkowników serwisu Media House
            (dalej „Serwis") jest Media House (dalej „Administrator"). We
            wszelkich sprawach dotyczących ochrony danych osobowych można
            kontaktować się z Administratorem pod adresem e-mail wskazanym w
            Serwisie.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            2. Zakres i cel przetwarzania danych
          </h2>
          <p>
            Administrator przetwarza dane niezbędne do świadczenia usług:
            adres e-mail, imię i nazwisko oraz — w przypadku zamówień — dane do
            faktury (nazwa firmy, adres, NIP). Dane przetwarzane są w celu:
            założenia i obsługi konta, realizacji zamówień kampanii,
            wystawiania dokumentów sprzedaży oraz kontaktu z Użytkownikiem.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            3. Podstawa prawna
          </h2>
          <p>
            Dane przetwarzane są zgodnie z Rozporządzeniem RODO na podstawie:
            niezbędności do wykonania umowy (art. 6 ust. 1 lit. b), obowiązku
            prawnego ciążącego na Administratorze, np. przepisów podatkowych
            (art. 6 ust. 1 lit. c) oraz prawnie uzasadnionego interesu
            Administratora (art. 6 ust. 1 lit. f).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            4. Okres przechowywania
          </h2>
          <p>
            Dane konta przechowywane są przez okres jego istnienia. Dane
            związane z zamówieniami i dokumentami księgowymi przechowywane są
            przez okres wymagany przepisami prawa (co do zasady 5 lat).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            5. Prawa Użytkownika
          </h2>
          <p>
            Użytkownikowi przysługuje prawo dostępu do danych, ich
            sprostowania, usunięcia lub ograniczenia przetwarzania, prawo do
            przenoszenia danych, wniesienia sprzeciwu oraz prawo wniesienia
            skargi do Prezesa Urzędu Ochrony Danych Osobowych.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            6. Pliki cookies
          </h2>
          <p>
            Serwis wykorzystuje pliki cookies (niewielkie pliki tekstowe
            zapisywane w przeglądarce). Stosujemy cookies niezbędne do
            działania Serwisu, w tym do utrzymania sesji zalogowanego
            Użytkownika oraz zapamiętania zawartości koszyka. Użytkownik może
            zarządzać plikami cookies w ustawieniach swojej przeglądarki, w tym
            je zablokować — może to jednak wpłynąć na dostępność niektórych
            funkcji Serwisu.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            7. Powierzenie i odbiorcy danych
          </h2>
          <p>
            Dane mogą być powierzane podmiotom wspierającym działanie Serwisu
            (np. dostawcom hostingu i infrastruktury, dostawcom usług
            płatniczych) wyłącznie w zakresie niezbędnym do świadczenia usług i
            na podstawie stosownych umów.
          </p>
        </section>

        <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
          Powyższy dokument stanowi wzór o charakterze informacyjnym i przed
          publikacją produkcyjną powinien zostać zweryfikowany pod kątem
          prawnym oraz uzupełniony o pełne dane Administratora i faktycznie
          wykorzystywane narzędzia (analityka, płatności, hosting).
        </p>
      </div>
    </div>
  );
}
