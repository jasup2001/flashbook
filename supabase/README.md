# Zaplecze panelu portfolio

Projekt `flashbook` w organizacji `jasup2001`, region Frankfurt, plan Free. Ref: `btjmrmiqnxnkzsmqcaew`. Projekt został utworzony za zgodą właściciela; wycena przy tworzeniu wynosiła 0 USD/miesiąc. Repozytorium nie zawiera kluczy projektu ani hasła właściciela.

## Konfiguracja aplikacji

W `frontend/` skopiuj `.env.example` do `.env.local` i uzupełnij URL oraz **publishable key** z ustawień projektu. Obecna kopia robocza ma już ignorowany `.env.local`. Nigdy nie dodawaj `service_role`, secret key ani hasła do zmiennych `VITE_`. Po zmianie środowiska uruchom ponownie Vite. Serwer deweloperski działa na `http://127.0.0.1:5174`, a podgląd buildu na `http://127.0.0.1:4173`; oba adresy są dopuszczone przez CORS. Reset hasła z podglądu wraca do skonfigurowanego w Auth adresu `http://127.0.0.1:5174/admin`.

Bez konfiguracji publiczna strona pokazuje lokalne 51 prac, formularz działa jako podgląd, a panel informuje o braku połączenia. Przy skonfigurowanym zapleczu błąd API nie zastępuje galerii starymi danymi — ukryte projekty nie wracają przez taki fallback.

## Dostęp właściciela

Właściciel utworzył konto w Supabase Auth, potwierdził e-mail, wyłączył publiczną rejestrację i skonfigurował Site URL / Redirect URL. Konto jest wpisane do `private.admin_users`. Ta lista jest niedostępna do zapisu przez klientów. Uprawnienia nie zależą od `user_metadata`, samego zalogowania ani widoczności `/admin`.

Dla nowej instalacji utwórz konto w Auth i dodaj jego UUID do `private.admin_users` przez zaufane połączenie administracyjne. Nie dodawaj adresu e-mail właściciela ani jego hasła do migracji. Codzienne zarządzanie odbywa się pod `/admin`, bez Supabase Studio.

Panel oferuje logowanie, wylogowanie i odzyskiwanie hasła. Wbudowany SMTP Supabase jest ograniczony do adresów członków organizacji i ma małe limity wysyłki; rzeczywiste doręczenie resetu zależy od konfiguracji dostawcy. Przycisk nie wysyła żadnej wiadomości, dopóki właściciel go nie użyje. Przed publikacją trzeba ustawić docelowe URL-e przekierowań Auth. Nie zmienia to DNS.

## Dane i pliki

- `portfolio_assets`: oryginały i warianty miniatur. Obecne 51 plików jest statyczne; importowane są wyłącznie metadane. `node supabase/scripts/create-legacy-seed.mjs` odtwarza `seed.sql` z lokalnego manifestu, bez kopiowania zdjęć do Supabase.
- `flash_designs`: kolejność i status prac. Numer widoczny to pozycja wśród opublikowanych prac: `01`, `02` itd. UUID pozostaje stałe.
- `tattoo_posts` / `tattoo_slides`: posty i uporządkowane slajdy. Pierwszy slajd jest okładką. Galeria i edytor nie wyświetlają opisów; dawne wartości pola `caption` zachowano w bazie dla zgodności. RPC `save_tattoo_post` zapisuje całość w jednej transakcji.
- `waitlist_entries`: zgłoszenia, statusy, prywatne notatki oraz snapshot numerów, ID prac i wersji grafik z chwili wysłania.

Nowe pliki trafiają do prywatnego bucketu `portfolio-media`. RLS udostępnia gościom wyłącznie materiały powiązane z opublikowanymi pracami lub postami. Podpisane URL-e wygasają po 10 minutach; otwarte galerie odświeżają je co 5 minut. Poprzednio podpisany URL może działać do wygaśnięcia po ukryciu pracy. Stare statyczne oryginały były publiczne już wcześniej i pozostają dostępne pod ich adresami — ukrycie usuwa je z nowej galerii, nie z istniejącej strony produkcyjnej.

Panel generuje miniatury 360/720/1200 px w przeglądarce, zachowując proporcje. Limit nowej grafiki: 20 MB; filmu: 50 MB. Obsługiwane typy: PNG/JPEG/WebP i MP4/WebM; zgodność kodeków wideo zależy od przeglądarki. Nie ma płatnej transformacji obrazów ani transkodowania. Oficjalny import z Instagrama opisano w `../docs/instagram-import.md`.

Biblioteka pozwala ponownie użyć grafik i przywrócić poprzedni oryginał po podmianie. Archiwizacja jest odwracalna. W tattoos można również trwale usunąć post przyciskiem `delete`, po zatwierdzeniu w osobnym oknie. Usuwany jest post i jego powiązania slajdów; pliki oraz rekordy mediów pozostają do ponownego użycia. RLS ogranicza usuwanie do administratora. Trwałe kasowanie plików nie należy do tej wersji. W projekcie zachowano jeden zarchiwizowany testowy upload, jeden zarchiwizowany post i jedno zarchiwizowane zgłoszenie z testu końcowego. Żadna testowa praca ani testowy post nie są opublikowane.

## Formularz

Funkcja `submit-waitlist` została wdrożona wyłącznie do nowego projektu Supabase. Rozpoznaje publishable key w swoim handlerze (`verify_jwt=false`, ponieważ ten klucz nie jest JWT). Nie udostępnia klientowi uprawnień serwisowych. Sprawdza metodę, origin, rozmiar strumienia, pola, honeypot i minimalny czas wypełnienia.

Postgres atomowo ogranicza przyjęcia: 5 na fingerprint klienta/godzinę, 3 na e-mail/dobę, 100 globalnie/godzinę i 1000 na 30 dni. Hash IP jest wyliczany po stronie serwera; ochrona nie polega wyłącznie na nagłówku IP. To podstawowa ochrona przed spamem, nie CAPTCHA. Przy większym ruchu można dodać Turnstile. Gość nie może czytać zgłoszeń ani wywoływać RPC zapisu bezpośrednio. UI potwierdza przyjęcie dopiero po odpowiedzi z ID zapisanego rekordu. Nie wysyła automatycznych maili do zgłaszających.

## Weryfikacja

```sh
cd frontend
pnpm test
pnpm typecheck
pnpm build
node --env-file=.env.local scripts/check-backend.mjs
```

`supabase/tests/access.sql` sprawdza RLS jako anon, zwykły użytkownik i właściciel, transakcyjny zapis karuzeli oraz snapshot zgłoszenia. Test uruchamia się na projekcie testowym przez `execute_sql`; wszystkie jego rekordy są wycofywane przez `ROLLBACK`. `check-backend.mjs` używa wyłącznie publishable key i potwierdza także wyłączoną rejestrację oraz działanie wdrożonego endpointu. Nie korzysta z sesji właściciela.

`supabase/tests/instagram-access.sql` dodatkowo sprawdza niedostępność poświadczeń i RPC importu dla ról przeglądarkowych, szyfrowany zapis/odczyt Vault, transakcyjny szkic, blokadę duplikatów i niewidoczność szkicu dla gości. Używa wyłącznie sztucznego, niedziałającego tokenu i `ROLLBACK`; nie drukuje poświadczeń. Wymaga istniejącego prywatnego uploadu do próby powiązania slajdu.

`supabase/tests/delete-post.sql` sprawdza odmowę usunięcia dla gościa i zwykłego konta, usunięcie wybranego syntetycznego posta przez administratora, kaskadowe usunięcie slajdów i zachowanie mediów. Całość kończy się `ROLLBACK` i nie usuwa rzeczywistych postów.

Migracje utworzono Supabase CLI i zastosowano w kolejności z `migrations/`. Nie uruchamiaj `seed.sql` na cudzym projekcie i nie resetuj istniejącej bazy. Wprowadzając nowe zmiany, utwórz nową migrację i sprawdź doradców bezpieczeństwa po jej zastosowaniu.

Doradca bezpieczeństwa nie wskazał braków RLS. Pozostaje ostrzeżenie o [wyłączonej ochronie przed wyciekłymi hasłami](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection): ta funkcja jest dostępna od Pro. Plan pozostaje Free. Informacja o nieużywanym indeksie przy pustej galerii tattoos jest spodziewana po utworzeniu bazy.

## Free i publikacja

Plan ma limity, m.in. 500 MB bazy, 1 GB plików i limity transferu. Projekt o małej aktywności może zostać uśpiony. [Cennik](https://supabase.com/pricing) i [zasady usypiania](https://supabase.com/docs/guides/platform/free-project-pausing). Nie włączono płatnych dodatków ani zmiany planu.

Frontend jest wyłącznie na lokalnej gałęzi `redesign`. GitHub Pages, pliki pierwotnej strony i DNS nie zostały zmienione. Publikacja frontendu, polityka prywatności formularza, docelowe redirect URL-e oraz ewentualna konfiguracja dostawcy poczty pozostają do uzgodnienia przed udostępnieniem klientom.
