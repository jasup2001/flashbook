# jasup2001 — frontend i panel administracyjny

Minimalistyczny frontend React + TypeScript + Vite, rozwijany na gałęzi `redesign` i publikowany przez GitHub Pages pod `https://jasup2001.site`. Katalog główny i gałąź `main` zachowują oryginalną stronę Jekyll. Supabase Free obsługuje dane i logowanie. Publikacja używa istniejącej domeny bez zmiany DNS; szczegóły i powrót do poprzedniej wersji opisano w `../docs/deployment.md`.

## Uruchomienie lokalne

Wymagania: Node.js 22.12+ (sprawdzono na 24.19) i pnpm 11.25.0. pnpm można zainstalować poleceniem `npm install -g pnpm@11.25.0`.

```sh
git switch redesign
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Otwórz http://127.0.0.1:5174. Port jest stały, aby zgadzał się z konfiguracją Auth i CORS. Pierwsze uruchomienie przygotowuje 153 miniatury WebP i kopie oryginałów; może potrwać kilkadziesiąt sekund. Lokalny podgląd statycznej galerii nie wymaga konta; pełny panel i zapisywanie zgłoszeń wymagają ignorowanego `.env.local`, opisanego w `../supabase/README.md`. Obecna kopia robocza ma już tę konfigurację.

```sh
pnpm test       # przygotowanie assetów i testy
pnpm typecheck  # kontrola TypeScript (po wygenerowaniu assetów)
pnpm build     # przygotowanie assetów, TypeScript i produkcyjny build
pnpm preview   # lokalny podgląd produkcyjnego dist/
```

`pnpm assets` odtwarza same assety i manifest. `dev`, `test` i `build` uruchamiają ten krok automatycznie. Wygenerowane pliki i `dist/` nie trafiają do Git.

`pnpm preview` udostępnia ostatni build pod http://127.0.0.1:4173. Po zmianie kodu ponownie uruchom `pnpm build`. Panel jest pod `/admin`; nie ma linku do niego w publicznej nawigacji. Reset hasła z podglądu lokalnego wraca do skonfigurowanego adresu http://127.0.0.1:5174/admin, więc do tego kroku uruchom również `pnpm dev`.

## Co można obejrzeć

- `/` — wyłącznie niezmienione logo `logo2.png` i cztery linki.
- `/flashbook` — wszystkie 51 oryginalnych projektów, responsywne miniatury, lazy loading, pełnoekranowy dialog, oryginalna jakość na żądanie, zoom 1–6×, przesuwanie powiększonego obrazu, pinch, double click/tap, swipe między arkuszami przy powiększeniu 100%, strzałki i Esc. Dialog zatrzymuje fokus i po zamknięciu oddaje go wybranemu arkuszowi. Dawny adres `/flashes` przekierowuje na `/flashbook`.
- `/tattoos` — trzykolumnowa siatka okładek bez opisów. Kliknięcie otwiera zdjęcia, rolkę lub karuzelę w pełnoekranowym podglądzie. Dopóki nie opublikujesz postów, pozostają nagłówek i link do flashbooka.
- `/waitlist` — zapis zgłoszeń przez walidowany endpoint Supabase; bez konfiguracji działa wyłącznie podgląd formularza.
- `/other` — miejsce na przyszłe projekty.
- `/admin` — prywatny panel: logowanie, flashbook, biblioteka mediów, posty tattoos i zgłoszenia. Uprawnienia są sprawdzane w bazie przez RLS.
- Nieznane adresy — strona 404 z powrotem do galerii.

## Struktura

```text
frontend/
  src/
    app/                 # routing i zachowanie przy zmianie strony
    components/          # wspólny layout, nawigacja, nagłówek
    pages/               # strony
    features/flashes/    # typy, karta projektu i viewer
    data/flashes.json    # generowany manifest
    test/                # testy interakcji i integralności assetów
    styles.css           # mobile-first, czarno-biały design
  scripts/prepare-assets.mjs
  public/
    _redirects           # fallback routingu dla przyszłego Cloudflare Pages
    media/               # generowane WebP i niezmienione kopie oryginałów
  dist/                  # gotowy statyczny build
docs/
  redesign-stage-1.md     # analiza i kierunek rozwoju
  legacy-checksums.json   # SHA-256 wszystkich oryginalnych plików
```

Oryginały w `../img/` oraz logo i favicon w katalogu głównym są jedynymi źródłami assetów. Skrypt zapisuje tylko do `frontend/public/media/` i `frontend/src/data/`. Kopie oryginałów zachowują identyczne bajty i nazwy (także spacje); adresy są kodowane. Miniatury zachowują proporcje, bez cropowania. W siatce używamy ramek A4, także dla trzech projektów o innych proporcjach.

Każdy projekt ma warianty 360, 720 i 1200 px (`srcset`/`sizes`). 51 oryginałów waży 86,72 MiB, a komplet wariantów 360 px 1,86 MiB (~98% mniej), 720 px 6,18 MiB (~93% mniej). Przeglądarka wybiera jeden wariant według szerokości i gęstości ekranu. Oryginał ładuje się dopiero w viewerze; do tego czasu widać WebP. Logo główne pozostaje oryginalnym PNG.

## Zaplecze i publikacja

Kod panelu jest w `src/features/admin`, klient i generowane typy w `src/lib`, a migracje, endpointy oraz testy RLS w `../supabase`. Sekcja tattoos umożliwia import zdjęć, karuzel i rolek z linków do własnego konta @jasup2001, bez opisów. Jednorazowe połączenie i ograniczenia opisano w `../docs/instagram-import.md`. Prawdziwe klucze pozostają poza Git.

Statyczny build to `frontend/dist`, z komendą `pnpm build` uruchamianą w `frontend/`. `postbuild` przygotowuje wejścia podstron dla GitHub Pages, `CNAME`, `.nojekyll`, stronę 404 i kopie starych URL-i grafik. Workflow publikuje zmiany wysłane na `redesign`, używając konfiguracji frontendu z sekretów GitHub Actions. Plik `_redirects` zachowano dla ewentualnego przyszłego hostingu Cloudflare.
