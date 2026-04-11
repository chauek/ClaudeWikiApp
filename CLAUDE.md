# ClaudeWiki - Instrukcje dla Claude

## Czym jest ten projekt

Aplikacja desktopowa (Electron + React) do przeglądania osobistej bazy wiedzy w formie plików Markdown.

Kod aplikacji: `app/`
Dokumentacja architektury: `docs/architecture-app.md`

## Baza wiedzy

Baza wiedzy to **osobny folder**, niezależny od tego repozytorium:
`/Users/chauek/Documents/prywatne/Baza_Wiedzy/`

**Schemat bazy wiedzy, format nodów, zasady tagowania, aktualizacji graph.json i todos.json
są zdefiniowane w `Baza_Wiedzy/CLAUDE.md` — to jest jedyne źródło prawdy dla struktury danych.**

Jeśli struktura danych się zmienia (nowe pole w frontmatter, zmiana schematu graph.json itp.),
aktualizuj **tylko** `Baza_Wiedzy/CLAUDE.md`. Aplikacja dostosowuje się do danych, nie odwrotnie.

## Architektura aplikacji desktopowej

Szczegółowy opis architektury Electron app znajduje się w `docs/architecture-app.md`.
Przed rozpoczęciem pracy nad aplikacją przeczytaj ten plik.
