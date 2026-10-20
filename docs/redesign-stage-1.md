# Analiza repozytorium i projekt przebudowy

Stan wejściowy: `main`, commit `c43402dd6e6c8a569513342385ad9f9064fc85e7`.

## Obecna implementacja

- `index.html` to szablon Jekyll z front matter `layout: none`. Pętla po `site.static_files` pokazuje pliki z `/img/`. Kliknięcie otwiera pełny oryginał w nowej karcie.
- `style.css` zapewnia białe tło, systemowy font i siatkę: jedna kolumna na telefonach, dwie od 768 px. Nie ma aplikacji JS, routingu, formularza, lightboxa ani systemu miniatur. Brakuje metatagu viewport i opisów obrazów w galerii.
- Nagłówek wyświetla `logo2.png` i linkuje do istniejącego profilu Instagram. Nowy Home używa tego samego logo, a nawigacja prowadzi do lokalnych podstron; nie dodano integracji Instagram.
- `_config.yml` konfiguruje Jekyll (`kramdown`, `include: img`). `CNAME` wskazuje `jasup2001.site`. W repozytorium nie ma `.github/workflows`, konfiguracji bundlera, zależności ani testów. Zawartość repozytorium nie pozwala potwierdzić ustawień wdrożenia zapisanych poza Git — nie były zmieniane.
- Oryginalny README zawiera tylko nazwę projektu.

## Assety — zweryfikowany inwentarz

W `img/` jest **51 projektów: 50 PNG i 1 JPG** oraz plik `.keep`, który nie jest grafiką. Łączna wielkość obrazów: **86,72 MiB**. Największy ma 7,82 MiB. Rozdzielczości: 48 plików 2480 × 3508, dwa 3508 × 2480 i jeden 3000 × 4000. Nie wszystkie grafiki są pionowymi arkuszami A4, więc miniatury stosują `object-fit: contain` w pionowej ramce, zachowując całą pracę.

`logo2.png` ma 1000 × 750 px i 365 562 bajty. Zachowano także `logo.png` i `favicon.png`. Nie zmieniono żadnego oryginalnego pliku. `legacy-checksums.json` zapisuje SHA-256 wszystkich 60 plików śledzonych przed przebudową; test sprawdza ich integralność, włącznie z plikami produkcyjnymi. Obrazy są porównywane bajt po bajcie; dla plików tekstowych normalizuje się wyłącznie końce linii CRLF/LF, aby test działał na Windows i Linux.

## Decyzja o strukturze

Nowa aplikacja znajduje się w `frontend/`. To pozwala rozwijać nowy frontend na `redesign` bez zastępowania oryginalnego punktu wejścia Jekyll, stylów, obrazów, `CNAME` lub `_config.yml`.

React Router obsługuje publiczne podstrony i placeholder `/admin`; współdzielone elementy są w `components`, strony w `pages`, a kod galerii w `features/flashes`. Viewer jest osobnym, ładowanym na żądanie modułem. Obecne dane pochodzą z generowanego manifestu lokalnych plików, dzięki czemu późniejsze źródło danych można podłączyć bez przebudowy kart i przeglądarki obrazów.

W kolejnych etapach przewidziano moduły funkcjonalne dla postów Tattoos (obraz/wideo i tablica slajdów), zgłoszeń i prywatnej administracji. Supabase będzie osobną warstwą dostępu do danych, z autoryzacją i regułami dostępu po stronie usługi. Żaden z tych elementów nie jest implementowany w etapie 1.

## Kierunek wizualny

Home zawiera tylko oryginalne logo i nawigację. Pozostałe strony mają duży prosty tytuł, niewielkie etykiety, cienkie linie podziału i dużo białej przestrzeni. Systemowe fonty nie wymagają zewnętrznych requestów. Responsywna galeria przechodzi z jednej kolumny do dwóch od 560 px i trzech od 960 px. Nie dodano ozdobników, fikcyjnych realizacji, recenzji ani statystyk marketingowych.

## Zakres ochrony produkcji

Nie zmieniono źródeł starej strony, ustawień repozytorium, workflow, GitHub Pages, domeny ani DNS. Nie utworzono zdalnego wdrożenia. `frontend/public/_redirects` jest wyłącznie plikiem przyszłego statycznego buildu Cloudflare Pages, bez wpływu na obecną stronę. Wszystkie zmiany istnieją lokalnie na `redesign`.

Instrukcje uruchomienia, opis tras i testów: [frontend/README.md](../frontend/README.md).

## Wynik weryfikacji etapu 1

- 11 testów przechodzi: routing i Home, 51 miniatur, viewer (oryginał na żądanie, nawigacja, swipe, zamknięcie, powrót fokusu i obsługa błędu obrazu), placeholdery, lokalny formularz oraz integralność źródeł i wygenerowanych assetów.
- TypeScript i produkcyjny build Vite przechodzą. Główny JS: 290,97 kB / 91,27 kB gzip; viewer ładowany na żądanie: 32,64 kB / 10,62 kB gzip; CSS: 8,04 kB / 2,44 kB gzip.
- Podgląd produkcyjnego buildu odpowiada HTTP 200. Sprawdzono w przeglądarce układ przy szerokościach CSS 320, 390, 768 i 1014 px; brak poziomego przewijania, odpowiednio 1, 1, 2 i 3 kolumny galerii. Toolbar podglądu mieści się na ekranie 320 px.
- W przeglądarce sprawdzono otwieranie oryginału, zoom, strzałki, Esc, modalność dialogu, powrót fokusu i konsolę (bez ostrzeżeń i błędów). Zapisano zrzuty Home, galerii i wersji mobilnej poza repozytorium.
- Swipe sprawdzono testem zdarzeń dotykowych. Gest pinch i zachowanie na fizycznym telefonie wymagają jeszcze ręcznej weryfikacji na urządzeniu; w tej sesji nie był dostępny telefon.
