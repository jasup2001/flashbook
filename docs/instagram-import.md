# Import postów Instagram

Panel `/admin` → `tattoos` importuje zdjęcia, karuzele i rolki z profesjonalnego konta **@jasup2001**. Wklejasz link `https://www.instagram.com/p/.../` lub `/reel/.../`, wybierasz `import post`, przeglądasz szkic i ustawiasz `published`. Opisy, komentarze, statystyki i wiadomości nie są pobierane. Nie ma automatycznego publikowania na Instagramie.

## Jednorazowe połączenie

Aplikacja Meta: `jasup2001 portfolio`, Meta App ID `1095874036658055`, Instagram App ID `1689174889536789`. To dwa różne identyfikatory. Jedynym dodanym uprawnieniem Instagram jest `instagram_business_basic`. Własne konto dodaje się jako Instagram Tester i akceptuje zaproszenie na Instagramie. Dla własnego konta wystarcza Standard Access; aplikacja nie musi obsługiwać cudzych kont.

1. W [konfiguracji aplikacji Meta](https://developers.facebook.com/apps/1095874036658055/use_cases/customize/API-Setup/?use_case_enum=INSTAGRAM_BUSINESS&product_route=instagram-business&selected_tab=API-Setup) rozwiń `2. Generate access tokens`.
2. Kliknij samodzielnie `Generate token` przy @jasup2001 i zatwierdź odczyt profilu i mediów. Nie dodawaj zbiorczo uprawnień do wiadomości i komentarzy.
3. Skopiuj **świeżo wygenerowany** token z dashboardu (60 dni). W lokalnym `/admin` → `tattoos` → `connect instagram` wklej go do pola hasłowego i wybierz `save connection`.
4. Zamknij okno Meta z tokenem. Nie wklejaj go do rozmowy, plików repozytorium ani zmiennych `VITE_`.

Panel sprawdza token w oficjalnym API i przyjmuje wyłącznie @jasup2001. Token trafia do Supabase Vault, zaszyfrowany w bazie; frontend nie może odczytać go ponownie. Nie potrzebujemy Instagram App Secret. Pole jest czyszczone po udanym zapisie. Przy zmianie tokenu stary sekret w Vault jest zastępowany w tej samej pozycji.

Token jest odnawiany podczas używania panelu, jeśli od ostatniego zapisu minęło 7 dni. Nie ma zadania w tle ani gwarancji odnowienia przy nieużywanym/uśpionym projekcie. Zaloguj się do panelu co najmniej raz w ciągu 60 dni, najlepiej co miesiąc. Po wygaśnięciu wygeneruj nowy token i zapisz go w `connection settings`. Początkowy lokalny termin ważności to ostrożne 59 dni od zapisu świeżego tokenu; po odnowieniu stosujemy `expires_in` zwrócone przez Meta. Połączenie można unieważnić w ustawieniach aplikacji i witryn na Instagramie.

## Wygląd i kolejność

Galeria publiczna ma trzy kolumny okładek. Po kliknięciu otwiera własny podgląd zdjęcia, rolki lub karuzeli z gestami. Import zachowuje kolejność slajdów i wybraną okładkę wideo, jeśli API ją udostępnia. Każdy nowy import trafia na sam początek, niezależnie od daty publikacji na Instagramie; kolejność pozostałych postów pozostaje zachowana. Szkic staje się widoczny na górze publicznej galerii po opublikowaniu. Kolejność można następnie zmienić strzałkami w panelu. Przypięcia i dowolna ręczna kolejność profilu Instagram nie są odtwarzane automatycznie.

Import nie synchronizuje późniejszych zmian na Instagramie i nie pobiera całego konta automatycznie. Ten sam post nie może zostać zaimportowany dwa razy, również po archiwizacji. Aby go przywrócić, użyj istniejącego posta w panelu. Post trafia do szkiców dopiero po zapisaniu wszystkich slajdów. Pliki z przerwanego importu pozostają w prywatnej bibliotece i można je wykorzystać ręcznie.

## Ograniczenia API i planu Free

- Wyszukiwanie linku obejmuje najnowsze 2500 obiektów własnego konta. Nie importujemy cudzych postów, Stories ani mediów dostępnych tylko jako współautor.
- Maksymalnie 20 slajdów, 20 MB na zdjęcie i 50 MB na wideo. Zbyt duże wideo trzeba zmniejszyć i dodać ręcznie. Brak płatnego transkodowania.
- Meta może nie zwrócić `media_url` dla wideo z licencjonowaną muzyką lub naruszeniami praw autorskich, również dla własnego konta. Panel wyświetla błąd; nie zastępuje filmu samą miniaturą i nie publikuje niepełnej karuzeli. Pozostaje ręczny upload własnego pliku.
- Pliki są kopiowane do prywatnego `portfolio-media`, więc zużywają miejsce i transfer Supabase Free. Miniatury są generowane lokalnie w przeglądarce. Nie korzystamy ze scrapingu ani płatnego serwisu pobierającego.
- Import zmienia wyłącznie nowy projekt Supabase i lokalną gałąź `redesign`. GitHub Pages i DNS pozostają bez zmian.

## Zaplecze i kontrola dostępu

`instagram-import` to Edge Function z `verify_jwt=true`. Dodatkowo sprawdza aktualną sesję przez Auth `getUser` i rolę przez `is_portfolio_admin`, zanim uzyska dostęp serwisowy do danych lub Meta. Originy to wyłącznie skonfigurowane adresy lokalne i domena portfolio. Status połączenia nie zawiera tokenu.

RPC `instagram_connection_read`, `instagram_connection_save` i `instagram_import_save` są `security invoker`, z pustym `search_path`, dostępne tylko dla `service_role`. Tabela połączenia jest w niewystawionym schemacie `private`, z RLS i bez uprawnień przeglądarkowych. Vault jest niedostępny dla `anon` i `authenticated`.

Endpoint `prepare` szuka linku w mediach własnego konta i tworzy podpisany manifest związany z UUID administratora, ważny 30 minut. `download` akceptuje wyłącznie ten manifest, sprawdza CDN Meta i każde przekierowanie, typ i rozmiar strumienia. Nie przyjmuje dowolnych adresów do pobrania i nie wysyła tokenu do CDN. `commit` weryfikuje podpis, właściciela i komplet slajdów, a RPC zapisuje źródło, szkic i slajdy w jednej transakcji. Nie zwracamy surowych błędów Meta ani bazy.

Źródła oficjalne, sprawdzone 2026-10-21: [pierwsze wywołania i tokeny dashboardu](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started), [zakresy i odnawianie tokenów](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login), [IG Media i brak plików z licencjonowanym audio](https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media), [Supabase Vault](https://supabase.com/docs/guides/database/vault). API przypięto do `v26.0`, SDK Supabase do `2.118.0`.

## Weryfikacja na połączonym koncie

2026-10-21: import [karuzeli z dwoma zdjęciami](https://www.instagram.com/p/Dere4hhDd-l/) i [rolki](https://www.instagram.com/reel/DZxSp0LNGRS/) zakończył się zapisem dwóch rzeczywistych szkiców bez opisów. Zdjęcia mają trzy warianty miniatur; rolka zachowała film MP4 i okładkę. Oba szkice pozostawiono właścicielowi do przeglądu i publikacji. Próba ponownego importu karuzeli została odrzucona bez nowych plików. Dla innej rolki bez `media_url` panel pokazał ograniczenie i nie utworzył niepełnego posta.

Przeszły 53 testy, kontrola TypeScript, build, transakcyjny test SQL, kontrola CORS/JWT i niedostępności zaimportowanej rolki dla gości. UI sprawdzono przy szerokości treści 320 px, bez poziomego przewijania. Odnowienie tokenu wymaga tokenu starszego niż 24 godziny; nie wykonano go przedwcześnie na świeżym połączeniu.
