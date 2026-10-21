# Panel administracyjny — uzgodniony zakres

Panel jest częścią aplikacji React pod `/admin`. Codzienna obsługa portfolio i zgłoszeń nie wymaga Supabase Studio. Supabase zapewnia zaplecze: Auth, Postgres, Storage oraz endpoint przyjmowania zgłoszeń. Konto i projekt Supabase wymagają jednorazowej konfiguracji.

## Numeracja

Numery oznaczają wyłącznie kolejność opublikowanych prac: pierwsza `01`, druga `02` itd. Po przestawieniu lub ukryciu projektu numeracja przelicza się bez luk. Każda praca ma osobne, niezmienne ID w bazie. Numery nie są kluczami ani identyfikatorami plików.

Przy zgłoszeniu zapisujemy stan kolejności galerii z chwili wysłania. Dzięki temu późniejsza zmiana kolejności nie zmieni interpretacji numeru wpisanego przez klienta. Oryginalne pliki i `logo2.png` pozostają zachowane.

## Sekcje panelu

- `flashbook`: dodawanie prac, miniatury, podmiana grafiki, kolejność, szkic/publikacja, archiwizacja i przywracanie.
- `tattoos`: posty bez opisów, zdjęcia i filmy, kolejność slajdów, okładka, szkic/publikacja i archiwizacja. Przycisk `delete` otwiera okno potwierdzenia z okładką; dopiero `delete post` trwale usuwa wybrany post i powiązania slajdów. Zdjęcia i filmy zostają w bibliotece. Import linków do własnych postów i rolek Instagram opisano w `instagram-import.md`.
- `waitlist`: zgłoszenia, wyszukiwanie, filtrowanie, szczegóły, prywatne notatki i statusy `new`, `contacted`, `accepted`, `archived`.
- jedno konto administratora; bez publicznej rejestracji; logowanie, wylogowanie i odzyskiwanie dostępu.

Interfejs: angielski, małe litery, Courier New, białe tło, czarne elementy, responsywny układ.

## Bezpieczeństwo i dane

Uprawnienia administratora wynikają z chronionej listy kont w bazie, a nie z edytowalnych danych profilu ani samego routingu React. RLS chroni tabele oraz Storage. Szkice i zgłoszenia są prywatne; publiczny odczyt obejmuje wyłącznie opublikowane materiały.

Formularz waitlist zapisuje dane przez walidowany endpoint serwerowy z ochroną przed spamem i limitem zgłoszeń. Gość nie ma prawa odczytywania zgłoszeń ani bezpośredniego zapisu do tabeli. Potwierdzenie wysłania pojawia się po faktycznym zapisie, a nie po samej walidacji.

W repozytorium znajdują się migracje, typy i przykładowa konfiguracja bez prawdziwych kluczy. Konfiguracja klienta trafia do ignorowanego pliku środowiskowego; klucze administracyjne pozostają po stronie zaplecza. Logowanie do konta i ustawienie haseł wykonuje właściciel.

## Koszty i utrzymanie

Wybrany plan: Supabase Free, bez płatnych dodatków i bez automatycznego przejścia na plan płatny. Zweryfikowano 2026-10-20: 500 MB bazy, 1 GB plików, 5 GB transferu i 5 GB transferu z cache. Projekt Free może być usypiany przy małej aktywności w okresie siedmiu dni. Darmowość obowiązuje w ramach limitów usługi; nie jest obietnicą nieograniczonego miejsca, transferu ani ciągłości działania.

Miniatury przygotowujemy własnym kodem; nie używamy płatnej transformacji obrazów Supabase. Obecne 51 projektów może nadal korzystać z plików statycznych, ograniczając zajętość Storage. Dla nowych plików i filmów panel będzie egzekwował limity typów oraz rozmiarów.

Źródła: [cennik](https://supabase.com/pricing), [usypianie projektów](https://supabase.com/docs/guides/platform/free-project-pausing).

## Kolejność

1. Utworzenie projektu Free na koncie właściciela i konfiguracja dostępu.
2. Migracje, reguły RLS, Storage i import metadanych obecnych prac.
3. Logowanie i układ `/admin`.
4. Zarządzanie flashbookiem oraz podłączenie opublikowanych projektów.
5. Posty tattoos i publiczne karuzele.
6. Obsługa zgłoszeń waitlist, testy uprawnień, interakcji, plików i buildu.

Prace prowadzone na `redesign`. Obecne GitHub Pages oraz DNS nie są zmieniane. Publikacja nowej wersji pozostaje osobnym krokiem.
