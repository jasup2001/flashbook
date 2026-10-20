# JASUP2001 — frontend / etap 1

Minimalistyczny frontend React + TypeScript + Vite, rozwijany wyłącznie na gałęzi `redesign`. Katalog główny repozytorium nadal zawiera oryginalną stronę Jekyll. Nie zmieniono konfiguracji GitHub Pages ani DNS i niczego nie wdrożono.

## Uruchomienie lokalne

Wymagania: Node.js 22.12+ (sprawdzono na 24.19) i pnpm 11.25.0. pnpm można zainstalować poleceniem `npm install -g pnpm@11.25.0`.

```sh
git switch redesign
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Otwórz adres wypisany przez Vite (domyślnie http://127.0.0.1:5173). Pierwsze uruchomienie przygotowuje 153 miniatury WebP i kopie oryginałów; może potrwać kilkadziesiąt sekund. Nie wymaga pliku `.env`, kluczy API ani kont w usługach zewnętrznych.

```sh
pnpm test       # przygotowanie assetów i testy
pnpm typecheck  # kontrola TypeScript (po wygenerowaniu assetów)
pnpm build     # przygotowanie assetów, TypeScript i produkcyjny build
pnpm preview   # lokalny podgląd produkcyjnego dist/
```

`pnpm assets` odtwarza same assety i manifest. `dev`, `test` i `build` uruchamiają ten krok automatycznie. Wygenerowane pliki i `dist/` nie trafiają do Git.

## Co można obejrzeć

- `/` — wyłącznie niezmienione logo `logo2.png` i cztery linki.
- `/flashes` — wszystkie 51 oryginalnych projektów, responsywne miniatury, lazy loading, pełnoekranowy dialog, oryginalna jakość na żądanie, zoom 1–6×, przesuwanie powiększonego obrazu, pinch, double click/tap, swipe między arkuszami przy powiększeniu 100%, strzałki i Esc. Dialog zatrzymuje fokus i po zamknięciu oddaje go wybranemu arkuszowi.
- `/tattoos` — placeholder przyszłej galerii zdjęć/wideo i karuzel. Nie użyto flashów jako fikcyjnych zdjęć wykonanych tatuaży.
- `/waitlist` — lokalny podgląd formularza z walidacją przeglądarki. Nie wysyła, nie zapisuje danych i nie obiecuje przyjęcia zgłoszenia.
- `/other` — miejsce na przyszłe projekty.
- `/admin` — wyłącznie komunikat, że panel nie jest dostępny. Nie jest to prywatny panel; nie ma danych, autoryzacji ani operacji administracyjnych. Trasa nie występuje w publicznej nawigacji.
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

## Późniejsze etapy

Po zatwierdzeniu wyglądu można dodać moduły `features/tattoos`, `features/waitlist` i `features/admin` oraz osobną warstwę dostępu do Supabase. Obecnie nie ma SDK Supabase, backendu, integracji z Instagramem ani sekretów.

Docelowy statyczny build dla Cloudflare Pages to `frontend/dist`, z komendą `pnpm build` uruchamianą w `frontend/`. Plik `_redirects` dotyczy wyłącznie tego przyszłego buildu. Podłączenie projektu, domeny i konfiguracja wdrożenia pozostają poza etapem 1. Nie publikuj gałęzi `redesign` jako obecnej strony GitHub Pages bez osobnej decyzji.
