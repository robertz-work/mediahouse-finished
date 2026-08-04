import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Regulamin",
  description: "Regulamin korzystania z serwisu Media House.",
};

export default function RegulaminPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Regulamin</h1>
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
            § 1. Postanowienia ogólne
          </h2>
          <p>
            Niniejszy regulamin określa zasady korzystania z serwisu
            internetowego Media House (dalej „Serwis"), za pośrednictwem którego
            Użytkownicy mogą przeglądać ofertę nośników reklamowych oraz
            składać zamówienia na kampanie reklamowe. Operatorem Serwisu jest
            Media House (dalej „Operator"). Korzystanie z Serwisu oznacza
            akceptację niniejszego regulaminu.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            § 2. Definicje
          </h2>
          <p>
            Użyte w regulaminie pojęcia oznaczają: Użytkownik — osoba
            korzystająca z Serwisu; Klient — Użytkownik posiadający konto i
            składający zamówienia; Nośnik — powierzchnia reklamowa (billboard,
            baner) prezentowana w Serwisie; Kampania — zamówienie obejmujące
            rezerwację jednego lub wielu Nośników na wskazany okres.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            § 3. Konto i rejestracja
          </h2>
          <p>
            Założenie konta jest dobrowolne i bezpłatne. Podczas rejestracji
            Użytkownik podaje adres e-mail oraz hasło. Użytkownik zobowiązuje
            się do podania danych zgodnych z prawdą oraz do zachowania danych
            logowania w poufności. Operator może usunąć konto naruszające
            postanowienia regulaminu.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            § 4. Składanie zamówień
          </h2>
          <p>
            Zamówienie kampanii następuje poprzez dodanie wybranych Nośników do
            koszyka, wskazanie okresu ekspozycji oraz zatwierdzenie zamówienia.
            Ceny prezentowane w Serwisie są cenami netto i nie zawierają podatku
            VAT, o ile nie wskazano inaczej. Rezerwacja Nośnika jest wiążąca po
            potwierdzeniu zamówienia i, w zależności od wybranej metody
            płatności, po jej opłaceniu.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            § 5. Płatności
          </h2>
          <p>
            Dostępne metody płatności prezentowane są w podsumowaniu zamówienia.
            W przypadku płatności na podstawie faktury pro forma Klient
            zobowiązany jest do jej opłacenia w terminie wskazanym na
            dokumencie. Brak płatności w terminie może skutkować anulowaniem
            rezerwacji.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            § 6. Reklamacje
          </h2>
          <p>
            Reklamacje dotyczące funkcjonowania Serwisu lub realizacji zamówień
            można zgłaszać na adres e-mail Operatora. Reklamacje rozpatrywane są
            w terminie 14 dni od dnia otrzymania zgłoszenia.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">
            § 7. Postanowienia końcowe
          </h2>
          <p>
            Operator zastrzega sobie prawo do zmiany regulaminu. O zmianach
            Użytkownicy zostaną poinformowani poprzez publikację nowej wersji w
            Serwisie. W sprawach nieuregulowanych niniejszym regulaminem
            zastosowanie mają przepisy prawa polskiego.
          </p>
        </section>

        <p className="rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
          Powyższy dokument stanowi wzór o charakterze informacyjnym i przed
          publikacją produkcyjną powinien zostać zweryfikowany pod kątem
          prawnym oraz uzupełniony o pełne dane Operatora (nazwa, adres, NIP,
          dane kontaktowe).
        </p>
      </div>
    </div>
  );
}
