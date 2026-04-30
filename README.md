# taskmanagerapplikasjon
Notatapplikasjon
En enkel nettapplikasjon hvor brukere kan registrere seg, logge inn og lagre notater og todo-lister.

Hva er dette?
Et lite fullstack-prosjekt med innlogging, der hver bruker har sine egne notater og todo-lister lagret i en database. Ingenting deles mellom brukere.

Teknologi
Frontend

Vanlig HTML, CSS og JavaScript — ingen rammeverk, bare det grunnleggende

Backend

Node.js med Express — enkelt og raskt å sette opp en REST API med
better-sqlite3 — SQLite-database som lagrer alt lokalt i én fil, ingen ekstern database nødvendig
bcryptjs — hasher passord før de lagres, så de aldri ligger i klartekst
jsonwebtoken (JWT) — brukes til innlogging, slipper å lagre sesjoner på serveren

Valgte dette stacken fordi det er enkelt, lite avhengigheter og alt kjører lokalt uten oppsett av ekstern database.

Kom i gang
så kjører du rasberry pi serveren med pm2 restart server

Brukerguide
Registrering

Klikk på "Registrer"-fanen
Fyll inn fullt navn, brukernavn og passord
Klikk "Opprett bruker"
Logg inn med brukernavnet og passordet du valgte

Notater

Skriv inn tittel og innhold, klikk "Lag notat"
Notatet dukker opp i listen under
Klikk "Slett" for å fjerne et notat

Todo-lister

Gi listen en tittel
Skriv inn en oppgave og klikk "Legg til" — gjenta for flere oppgaver
Klikk "Lag todo-liste" for å lagre
Hak av oppgaver med checkboxen når de er ferdige
Klikk "X" ved siden av en oppgave for å slette bare den
Klikk "Slett liste" for å slette hele listen

Logg ut

Klikk "Logg ut" øverst til høyre