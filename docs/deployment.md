# Publikacja na jasup2001.site

Pierwsze wdrożenie: 2026-10-21, [GitHub Actions](https://github.com/jasup2001/flashbook/actions/runs/39666876081), commit `8cdf766`. Przeszły wszystkie 56 testów w CI, kontrola TypeScript, build i weryfikacja artefaktu. Pod publiczną domeną sprawdzono wszystkie bezpośrednie wejścia na podstrony, przekierowanie www, 404, oryginalne logo i przykładowe grafiki, produkcyjny CORS, walidację waitlist bez tworzenia zgłoszenia oraz odmowę niezalogowanego dostępu do importera. W przeglądarce sprawdzono logo, 51 projektów, podgląd projektu, galerię tattoos, formularz i ekran logowania admina.

Frontend React jest publikowany przez GitHub Pages z repozytorium `jasup2001/flashbook`, z gałęzi `redesign`. Workflow `.github/workflows/pages.yml` buduje i testuje aplikację, a następnie przesyła wyłącznie `frontend/dist` do środowiska `github-pages`. Domena i certyfikat pozostają zarządzane przez istniejące GitHub Pages; publikacja nie wymaga zmiany DNS.

## Kolejne aktualizacje

1. Pracuj na `redesign` i uruchom `pnpm test` oraz `pnpm build` w `frontend/`.
2. Zapisz zmiany w Git i wyślij `git push origin redesign`.
3. Sprawdź zakończenie workflow **deploy portfolio to github pages** w GitHub Actions.

Zmiany mediów, publikowanie postów i obsługa zgłoszeń odbywają się przez `https://jasup2001.site/admin/` i nie wymagają nowego buildu. Po zmianie kodu podgląd lokalny na porcie 4173 wymaga ponownego buildu i odświeżenia karty.

## Konfiguracja

Repozytorium ma dwa sekrety GitHub Actions: `VITE_SUPABASE_URL` i `VITE_SUPABASE_PUBLISHABLE_KEY`. Są ustawiane poza kodem. Publishable key jest przeznaczony do publicznej aplikacji; uprawnienia danych nadal wymusza RLS. Nigdy nie dodawaj do sekretów frontendu klucza `service_role`, `sb_secret_...`, tokenu Instagram ani hasła właściciela. Brak poprawnej konfiguracji blokuje build przed publikacją.

W Settings → Pages źródłem jest **GitHub Actions**. Środowisko `github-pages` dopuszcza gałąź `redesign`; wcześniejsza reguła `main` pozostaje do ewentualnego powrotu. Akcje są przypięte do zweryfikowanych SHA. Uprawnienia publikacji i OIDC ma wyłącznie zadanie `deploy`.

W Supabase → Authentication → URL Configuration używaj produkcyjnego Site URL `https://jasup2001.site` oraz dokładnych redirect URL-i `https://jasup2001.site/admin` i `https://jasup2001.site/admin/`. Zachowaj lokalne URL-e na potrzeby rozwoju. Wyłączona publiczna rejestracja pozostaje bez zmian. Funkcje waitlist i Instagram dopuszczają produkcyjny origin `https://jasup2001.site` oraz `https://www.jasup2001.site`; www jest przekierowywane na domenę główną przez GitHub Pages.

## Routing i oryginały

`postbuild` przygotowuje osobne pliki wejściowe dla `/flashbook/`, `/flashes/`, `/tattoos/`, `/waitlist/`, `/other/` i `/admin/`, co pozwala odświeżać te strony bez błędu 404. GitHub Pages może przekierować adres bez końcowego ukośnika na wariant z ukośnikiem. Fragmenty odzyskiwania hasła pozostają przy adresie; nie używamy przekierowania przez JavaScript na stronę główną. `404.html` uruchamia stronę błędu aplikacji dla nieznanych adresów. `_redirects` pozostaje dostępny dla ewentualnego przyszłego hostingu Cloudflare, ale GitHub Pages go nie używa.

W artefakcie zachowane są wszystkie stare URL-e `/img/...`, pliki logo i favicon. Nowa galeria korzysta z `/media/` i responsywnych WebP. Skrypty budowania nie modyfikują oryginałów. `pnpm pages` weryfikuje bezpośrednie wejścia, domenę, 404 i sumy kontrolne oryginalnych grafik w artefakcie.

## Powrót do poprzedniej strony

Gałąź `main` zachowuje oryginalną stronę Jekyll, a jej bazowy commit to `c43402dd6e6c8a569513342385ad9f9064fc85e7`. Aby wrócić do niej, zmień Settings → Pages → Source na **Deploy from a branch**, wybierz `main`, katalog `/ (root)` i zachowaj domenę `jasup2001.site` oraz HTTPS. Nie resetuj bazy Supabase ani nie usuwaj oryginalnych plików. To zmiana źródła publikacji; DNS nie wymaga zmiany.
