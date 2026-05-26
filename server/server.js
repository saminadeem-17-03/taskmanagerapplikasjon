// ─── Importer nødvendige biblioteker ───────────────────────────────────────────
const express = require('express');       // Express: HTTP-rammeverk som håndterer ruter (GET/POST/DELETE/PATCH)
const cors = require('cors');             // CORS: lar frontend (annen origin/port) snakke med denne serveren
const path = require("path");             // Path: bygger filstier på tvers av OS
const bcrypt = require('bcryptjs');       // Bcrypt: krypterer passord slik at de aldri lagres i klartekst
const jwt = require('jsonwebtoken');      // JWT: lager og verifiserer tokens som beviser at brukeren er innlogget
const Database = require('better-sqlite3'); // SQLite: lokal filbasert database – ingen ekstern server nødvendig

// ─── App-oppsett ───────────────────────────────────────────────────────────────
const app = express();                   // Oppretter Express-applikasjonen
const PORT = 4000;                       // Porten serveren lytter på (frontend kaller http://IP:4000)
const SECRET = 'hemmelig_nokkel';        // Hemmelig nøkkel brukt til å signere/verifisere JWT-tokens

app.use(express.json());                 // Middleware: parser JSON i innkommende request-body automatisk
app.use(cors());                         // Middleware: tillater alle origins å kalle API-et (nødvendig for frontend)
app.use(express.static(path.join(__dirname, '../klient'))); // Serverer frontend-filer (HTML/CSS/JS) som statiske filer

// ─── Databaseoppsett ───────────────────────────────────────────────────────────
// Åpner (eller oppretter) databasefilen database.db i samme mappe som server.js
const db = new Database(path.join(__dirname, 'database.db'));

// Oppretter brukertabellen hvis den ikke finnes – kjøres hver gang serveren starter
db.exec(`
    CREATE TABLE IF NOT EXISTS brukere (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unik ID per bruker, øker automatisk
        brukernavn TEXT UNIQUE,               -- Brukernavn må være unikt i hele tabellen
        passord TEXT,                         -- Lagrer det krypterte passordet (aldri klartekst)
        navn TEXT                             -- Visningsnavnet til brukeren
    )
`);

// Oppretter notat-tabellen – hvert notat tilhører én bruker via brukerId (fremmednøkkel)
db.exec(`
    CREATE TABLE IF NOT EXISTS notater (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unik ID per notat
        brukerId INTEGER,                     -- Kobler notatet til riktig bruker
        tittel TEXT,                          -- Tittelen på notatet
        innhold TEXT                          -- Selve teksten i notatet
    )
`);

// Oppretter todo-tabellen – oppgaver lagres som JSON-streng siden SQLite ikke har array-type
db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unik ID per todo-liste
        brukerId INTEGER,                     -- Kobler todo-listen til riktig bruker
        tittel TEXT,                          -- Tittelen på todo-listen
        oppgaver TEXT                         -- JSON-streng med array av oppgave-objekter [{tekst, ferdig}]
    )
`);

// ─── Autentiserings-middleware ─────────────────────────────────────────────────
// Kjøres på alle beskyttede ruter – stopper requests uten gyldig token
function sjekkToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Henter token fra "Bearer <token>"-headeren
    if (!token) return res.status(401).json({ error: 'Ikke innlogget' }); // Avviser om ingen token finnes

    try {
        req.user = jwt.verify(token, SECRET); // Verifiserer token med SECRET – kaster feil hvis ugyldig/utløpt
        next();                               // Token OK: sender requesten videre til selve rute-handleren
    } catch {
        res.status(401).json({ error: 'Ugyldig token' }); // Token feil eller utløpt – avvis med 401
    }
}

// ─── RUTE: Registrer ny bruker ─────────────────────────────────────────────────
// Frontend sender POST /register med { brukernavn, passord, navn } i body
app.post('/register', async (req, res) => {
    const { brukernavn, passord, navn } = req.body;                        // Henter feltene fra JSON-body
    if (!brukernavn || !passord || !navn)                                  // Validerer at alle felt er fylt inn
        return res.status(400).json({ error: 'Fyll inn alle felt' });

    const hashet = await bcrypt.hash(passord, 10); // Krypterer passordet med salt-runder=10 (enveis, kan ikke reverseres)

    try {
        // Setter inn ny bruker i databasen – ? er parametre som forhindrer SQL-injeksjon
        db.prepare('INSERT INTO brukere (brukernavn, passord, navn) VALUES (?, ?, ?)')
          .run(brukernavn, hashet, navn);
        res.json({ melding: 'Bruker opprettet' }); // Suksess: frontend får beskjed om å vise innlogging
    } catch {
        res.status(400).json({ error: 'Brukernavnet er tatt' }); // UNIQUE-constraint i DB kaster feil ved duplikat
    }
});

// ─── RUTE: Logg inn ────────────────────────────────────────────────────────────
// Frontend sender POST /login med { brukernavn, passord } – får tilbake en JWT-token
app.post('/login', async (req, res) => {
    const { brukernavn, passord } = req.body;                                          // Henter innloggingsdata fra body
    const bruker = db.prepare('SELECT * FROM brukere WHERE brukernavn = ?').get(brukernavn); // Slår opp bruker i DB

    // Sjekker at bruker finnes OG at passordet matcher det krypterte (bcrypt sammenligner trygt)
    if (!bruker || !(await bcrypt.compare(passord, bruker.passord))) {
        return res.status(401).json({ error: 'Feil brukernavn eller passord' });
    }

    // Lager en JWT-token med brukerdata inni – utløper etter 24 timer
    const token = jwt.sign(
        { id: bruker.id, brukernavn: bruker.brukernavn, navn: bruker.navn }, // Payload lagret i token
        SECRET,          // Signeres med SECRET slik at ingen kan forfalske tokens
        { expiresIn: '24h' } // Token er ugyldig etter 24 timer – tvinger ny innlogging
    );
    // Sender token + brukerinfo til frontend – frontend lagrer token i localStorage
    res.json({ token, navn: bruker.navn, brukernavn: bruker.brukernavn });
});

// ─── RUTE: Hent alle notater for innlogget bruker ─────────────────────────────
// Frontend sender GET /notater med Authorization-header – sjekkToken kjører først
app.get('/notater', sjekkToken, (req, res) => {
    // Henter kun notater som tilhører denne brukeren (req.user.id fra JWT-token)
    const notater = db.prepare('SELECT * FROM notater WHERE brukerId = ?').all(req.user.id);
    res.json(notater); // Sender array av notat-objekter tilbake til frontend
});

// ─── RUTE: Legg til nytt notat ─────────────────────────────────────────────────
// Frontend sender POST /notater med { tittel, innhold } – lagrer i DB under innlogget bruker
app.post('/notater', sjekkToken, (req, res) => {
    const { tittel, innhold } = req.body;                             // Henter notatdata fra body
    if (!tittel || !innhold)                                          // Validerer at begge felt er fylt inn
        return res.status(400).json({ error: 'Fyll inn tittel og innhold' });

    // Setter inn notatet koblet til brukerens ID fra token (ikke fra body – sikkerhet!)
    const info = db.prepare('INSERT INTO notater (brukerId, tittel, innhold) VALUES (?, ?, ?)')
                   .run(req.user.id, tittel, innhold);
    // Returnerer det nye notatet med DB-generert ID så frontend kan vise det uten ny fetch
    res.json({ id: info.lastInsertRowid, tittel, innhold });
});

// ─── RUTE: Slett et notat ─────────────────────────────────────────────────────
// Frontend sender DELETE /notater/:id – :id er notatets ID i URL-en
app.delete('/notater/:id', sjekkToken, (req, res) => {
    // AND brukerId = ? sikrer at en bruker ikke kan slette andres notater
    const result = db.prepare('DELETE FROM notater WHERE id = ? AND brukerId = ?')
                     .run(req.params.id, req.user.id);
    if (result.changes === 0)                                         // changes=0 betyr ingen rader ble slettet
        return res.status(404).json({ error: 'Notat ikke funnet' }); // Notat finnes ikke eller tilhører annen bruker
    res.json({ melding: 'Slettet' });                                 // Frontend vet at slettingen gikk bra
});

// ─── RUTE: Hent alle todo-lister for innlogget bruker ─────────────────────────
// Frontend sender GET /todos – henter alle lister med oppgavene sine
app.get('/todos', sjekkToken, (req, res) => {
    const todos = db.prepare('SELECT * FROM todos WHERE brukerId = ?').all(req.user.id); // Henter todo-rader fra DB
    const resultat = todos.map(t => {
        try {
            return { ...t, oppgaver: JSON.parse(t.oppgaver) }; // Parser JSON-strengen tilbake til JS-array
        } catch {
            return { ...t, oppgaver: [] }; // Fallback til tom liste hvis JSON er korrupt (unngår serverkrasj)
        }
    });
    res.json(resultat); // Sender ferdig-parsede todo-objekter til frontend
});

// ─── RUTE: Lag ny todo-liste ───────────────────────────────────────────────────
// Frontend sender POST /todos med { tittel, oppgaver: [{tekst, ferdig}] }
app.post('/todos', sjekkToken, (req, res) => {
    const { tittel, oppgaver } = req.body;                            // Henter todo-data fra body
    if (!tittel)                                                       // Tittel er påkrevd
        return res.status(400).json({ error: 'Tittel er påkrevd' });

    const oppgaverJSON = JSON.stringify(oppgaver || []); // Konverterer oppgave-arrayet til JSON-streng for lagring
    const info = db.prepare('INSERT INTO todos (brukerId, tittel, oppgaver) VALUES (?, ?, ?)')
                   .run(req.user.id, tittel, oppgaverJSON);
    // Returnerer den nye todo-listen med ID – oppgaver returneres som array (ikke JSON-streng)
    res.json({ id: info.lastInsertRowid, tittel, oppgaver: oppgaver || [] });
});

// ─── RUTE: Slett hele todo-listen ─────────────────────────────────────────────
// Frontend sender DELETE /todos/:id – sletter hele listen med alle oppgaver
app.delete('/todos/:id', sjekkToken, (req, res) => {
    const result = db.prepare('DELETE FROM todos WHERE id = ? AND brukerId = ?')
                     .run(req.params.id, req.user.id); // AND brukerId sikrer at kun eieren kan slette
    if (result.changes === 0)
        return res.status(404).json({ error: 'Todo ikke funnet' });
    res.json({ melding: 'Todo slettet' });
});

// ─── RUTE: Toggle ferdig/ikke-ferdig på én oppgave ────────────────────────────
// Frontend sender PATCH /todos/:todoId/oppgaver/:index ved hake i checkbox
app.patch('/todos/:todoId/oppgaver/:index', sjekkToken, (req, res) => {
    // Henter todo-listen fra DB – sjekker at den tilhører innlogget bruker
    const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND brukerId = ?')
                   .get(req.params.todoId, req.user.id);
    if (!todo) return res.status(404).json({ error: 'Ikke funnet' }); // Finnes ikke eller feil eier

    const oppgaver = JSON.parse(todo.oppgaver);    // Parser JSON-strengen til array
    const index = parseInt(req.params.index, 10);  // Konverterer URL-parameter fra string til tall

    if (index < 0 || index >= oppgaver.length)     // Validerer at index er innenfor array-grensene
        return res.status(400).json({ error: 'Ugyldig index' });

    oppgaver[index].ferdig = !oppgaver[index].ferdig; // Snur ferdig-status (true→false eller false→true)

    // Lagrer oppdatert array tilbake som JSON-streng i databasen
    db.prepare('UPDATE todos SET oppgaver = ? WHERE id = ?')
      .run(JSON.stringify(oppgaver), todo.id);
    res.json({ melding: 'Oppdatert' }); // Frontend oppdaterer visningen etter svar
});

// ─── RUTE: Slett én oppgave fra en todo-liste ─────────────────────────────────
// Frontend sender DELETE /todos/:todoId/oppgaver/:index ved klikk på X-knappen
app.delete('/todos/:todoId/oppgaver/:index', sjekkToken, (req, res) => {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND brukerId = ?')
                   .get(req.params.todoId, req.user.id);
    if (!todo) return res.status(404).json({ error: 'Ikke funnet' });

    const oppgaver = JSON.parse(todo.oppgaver);   // Parser JSON-strengen til array
    const index = parseInt(req.params.index, 10); // Konverterer URL-parameter til tall

    if (index < 0 || index >= oppgaver.length)    // Validerer at index er innenfor array-grensene
        return res.status(400).json({ error: 'Ugyldig index' });

    oppgaver.splice(index, 1); // Fjerner akkurat én oppgave på riktig posisjon

    // Lagrer det oppdaterte (kortere) arrayet tilbake i databasen
    db.prepare('UPDATE todos SET oppgaver = ? WHERE id = ?')
      .run(JSON.stringify(oppgaver), todo.id);
    res.json({ melding: 'Slettet' });
});

// ─── Start serveren ────────────────────────────────────────────────────────────
// Begynner å lytte på PORT – alle enheter på nettverket kan nå nå serveren på IP:4000
app.listen(PORT, () => {
    console.log(`Server kjører på http://192.168.20.117:${PORT}`); // Fikset URL-format (manglet :// og : før port)
});