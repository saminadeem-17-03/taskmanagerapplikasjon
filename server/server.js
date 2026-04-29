// ============================================================
// server.js
// ============================================================

// ---------- DIN OPPRINNELIGE KODE (beholdt) ----------
const express = require('express');         // Importerer Express (lager server)
const cors = require('cors');               // Lar frontend snakke med backend
const path = require("path");              // Hjelper med filstier

// ---------- NY KODE (lagt til av AI) ----------
const bcrypt = require('bcryptjs');         // Hasher passord sikkert (aldri lagre passord i klartekst)
const jwt = require('jsonwebtoken');        // Lager innloggings-tokens (JWT)
const Database = require('better-sqlite3'); // SQLite-database (erstatter db.json som ikke fungerte)

// ---------- DIN OPPRINNELIGE KODE (beholdt) ----------
const app = express();                     // Lager Express-appen
const PORT = 4000;                         // Porten serveren kjører på

app.use(express.json());                   // Lar serveren lese JSON fra requests
app.use(cors());                           // Tillater requests fra frontend
app.use(express.static(path.join(__dirname))); // Serverer HTML/CSS/JS-filer

// ---------- NY KODE (lagt til av AI) ----------
const SECRET = 'hemmelig_nokkel';          // Nøkkel for å signere JWT-tokens

// Kobler til SQLite-databasefilen (opprettes automatisk hvis den ikke finnes)
const db = new Database('database.db');

// Oppretter tabeller hvis de ikke finnes fra før
// Brukere-tabell
db.exec(`
    CREATE TABLE IF NOT EXISTS brukere (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brukernavn TEXT UNIQUE,
        passord TEXT,
        navn TEXT
    )
`);

// Notater-tabell med brukerId som kobler notatet til en bruker
db.exec(`
    CREATE TABLE IF NOT EXISTS notater (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brukerId INTEGER,
        tittel TEXT,
        innhold TEXT
    )
`);

// Todos-tabell (oppgavene lagres som JSON-tekst inne i raden)
db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brukerId INTEGER,
        tittel TEXT,
        oppgaver TEXT
    )
`);

// Tickets-tabell (svar lagres som JSON-tekst inne i raden)
db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tittel TEXT,
        innhold TEXT,
        fraId INTEGER,
        fraNavn TEXT,
        fraBrukernavn TEXT,
        tilId INTEGER,
        tilNavn TEXT,
        tilBrukernavn TEXT,
        status TEXT DEFAULT 'åpen',
        svar TEXT DEFAULT '[]'
    )
`);

// Middleware: sjekker at brukeren har gyldig token før de får tilgang til beskyttede ruter
function sjekkToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Henter token fra Authorization-headeren
    if (!token) return res.status(401).json({ error: 'Ikke innlogget' }); // Ingen token = ikke innlogget

    try {
        req.user = jwt.verify(token, SECRET); // Verifiserer token og lagrer brukerinfo på req.user
        next();                               // Gå videre til selve ruten
    } catch {
        res.status(401).json({ error: 'Ugyldig token' }); // Token er ugyldig eller utløpt
    }
}

// --- BRUKER-RUTER ---

// Registrer ny bruker
app.post('/register', async (req, res) => {
    const { brukernavn, passord, navn } = req.body;                          // Henter data fra request
    if (!brukernavn || !passord || !navn) return res.status(400).json({ error: 'Fyll inn alle felt' }); // Sjekk at alt er fylt ut

    const hashet = await bcrypt.hash(passord, 10);                           // Hasher passordet (10 = styrke)

    try {
        db.prepare('INSERT INTO brukere (brukernavn, passord, navn) VALUES (?, ?, ?)') // Lagrer ny bruker i databasen
          .run(brukernavn, hashet, navn);
        res.json({ melding: 'Bruker opprettet' });                           // Sender suksessmelding tilbake
    } catch {
        res.status(400).json({ error: 'Brukernavnet er tatt' });             // UNIQUE-constraint i SQL gir feil hvis tatt
    }
});

// Logg inn
app.post('/login', async (req, res) => {
    const { brukernavn, passord } = req.body;                                // Henter brukernavn og passord
    const bruker = db.prepare('SELECT * FROM brukere WHERE brukernavn = ?').get(brukernavn); // Finn bruker i DB

    if (!bruker || !(await bcrypt.compare(passord, bruker.passord))) {       // Sjekk passord
        return res.status(401).json({ error: 'Feil brukernavn eller passord' });
    }

    const token = jwt.sign(                                                  // Lager JWT-token
        { id: bruker.id, brukernavn: bruker.brukernavn, navn: bruker.navn },
        SECRET,
        { expiresIn: '24h' }                                                 // Token varer i 24 timer
    );
    res.json({ token, navn: bruker.navn, brukernavn: bruker.brukernavn });  // Sender token tilbake til frontend
});

// Hent alle brukere (brukes til å velge mottaker for ticket)
app.get('/brukere', sjekkToken, (req, res) => {
    const brukere = db.prepare('SELECT id, brukernavn, navn FROM brukere').all(); // Henter alle (uten passord)
    res.json(brukere);
});

// --- NOTAT-RUTER ---

// ---------- DIN OPPRINNELIGE LOGIKK (tilpasset SQLite) ----------

// Hent alle notater for innlogget bruker
app.get('/notater', sjekkToken, (req, res) => {
    const notater = db.prepare('SELECT * FROM notater WHERE brukerId = ?').all(req.user.id); // Kun brukerens egne
    res.json(notater);
});

// Opprett nytt notat
app.post('/notater', sjekkToken, (req, res) => {
    const info = db.prepare('INSERT INTO notater (brukerId, tittel, innhold) VALUES (?, ?, ?)') // Sett inn rad
                   .run(req.user.id, req.body.tittel, req.body.innhold);
    res.json({ id: info.lastInsertRowid, tittel: req.body.tittel, innhold: req.body.innhold }); // Send tilbake det nye notatet
});

// Slett notat (kun egne)
app.delete('/notater/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM notater WHERE id = ? AND brukerId = ?').run(req.params.id, req.user.id); // Slett kun hvis det er ditt
    res.json({ melding: 'Slettet' });
});

// --- TODO-RUTER ---

// ---------- DIN OPPRINNELIGE LOGIKK (tilpasset SQLite) ----------

// Hent alle todos for innlogget bruker
app.get('/todos', sjekkToken, (req, res) => {
    const todos = db.prepare('SELECT * FROM todos WHERE brukerId = ?').all(req.user.id); // Hent egne todos
    todos.forEach(t => t.oppgaver = JSON.parse(t.oppgaver));                              // Konverter JSON-tekst til objekt
    res.json(todos);
});

// Opprett ny todo-liste
app.post('/todos', sjekkToken, (req, res) => {
    const oppgaverJSON = JSON.stringify(req.body.oppgaver || []);            // Gjør oppgave-array om til tekst for lagring
    const info = db.prepare('INSERT INTO todos (brukerId, tittel, oppgaver) VALUES (?, ?, ?)')
                   .run(req.user.id, req.body.tittel, oppgaverJSON);
    res.json({ id: info.lastInsertRowid, tittel: req.body.tittel, oppgaver: req.body.oppgaver });
});

// Slett todo
app.delete('/todos/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM todos WHERE id = ? AND brukerId = ?').run(req.params.id, req.user.id);
    res.json({ melding: 'Todo slettet' });
});

// Toggle oppgave ferdig/ikke ferdig
app.patch('/todos/:todoId/oppgaver/:index', sjekkToken, (req, res) => {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND brukerId = ?') // Finn todo
                   .get(req.params.todoId, req.user.id);
    if (!todo) return res.status(404).json({ error: 'Ikke funnet' });

    const oppgaver = JSON.parse(todo.oppgaver);                              // Gjør tekst om til array
    oppgaver[req.params.index].ferdig = !oppgaver[req.params.index].ferdig; // Bytt true/false

    db.prepare('UPDATE todos SET oppgaver = ? WHERE id = ?')                 // Lagre oppdatert liste
      .run(JSON.stringify(oppgaver), todo.id);
    res.json({ melding: 'Oppdatert' });
});

// Slett enkelt oppgave
app.delete('/todos/:todoId/oppgaver/:index', sjekkToken, (req, res) => {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND brukerId = ?') // Finn todo
                   .get(req.params.todoId, req.user.id);
    if (!todo) return res.status(404).json({ error: 'Ikke funnet' });

    const oppgaver = JSON.parse(todo.oppgaver);                              // Gjør tekst om til array
    oppgaver.splice(req.params.index, 1);                                    // Fjern oppgaven på gitt indeks

    db.prepare('UPDATE todos SET oppgaver = ? WHERE id = ?')                 // Lagre oppdatert liste
      .run(JSON.stringify(oppgaver), todo.id);
    res.json({ melding: 'Slettet' });
});

// --- TICKET-RUTER ---

// ---------- NY KODE (lagt til av AI) ----------

// Hent alle tickets der brukeren er avsender eller mottaker
app.get('/tickets', sjekkToken, (req, res) => {
    const tickets = db.prepare('SELECT * FROM tickets WHERE fraId = ? OR tilId = ?') // Hent begge retninger
                      .all(req.user.id, req.user.id);
    tickets.forEach(t => t.svar = JSON.parse(t.svar));                               // Konverter svar fra JSON-tekst
    res.json(tickets);
});

// Send ny ticket
app.post('/tickets', sjekkToken, (req, res) => {
    const { tittel, innhold, tilBrukernavn } = req.body;
    const mottaker = db.prepare('SELECT * FROM brukere WHERE brukernavn = ?').get(tilBrukernavn); // Finn mottaker
    if (!mottaker) return res.status(404).json({ error: 'Mottaker finnes ikke' });

    const info = db.prepare(`
        INSERT INTO tickets (tittel, innhold, fraId, fraNavn, fraBrukernavn, tilId, tilNavn, tilBrukernavn, status, svar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'åpen', '[]')
    `).run(tittel, innhold, req.user.id, req.user.navn, req.user.brukernavn, mottaker.id, mottaker.navn, mottaker.brukernavn);

    res.json({ id: info.lastInsertRowid, melding: 'Ticket sendt' });
});

// Endre status på ticket
app.patch('/tickets/:id/status', sjekkToken, (req, res) => {
    db.prepare('UPDATE tickets SET status = ? WHERE id = ? AND (fraId = ? OR tilId = ?)') // Kun avsender/mottaker kan endre
      .run(req.body.status, req.params.id, req.user.id, req.user.id);
    res.json({ melding: 'Status oppdatert' });
});

// Svar på ticket
app.post('/tickets/:id/svar', sjekkToken, (req, res) => {
    const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id); // Finn ticket
    if (!ticket) return res.status(404).json({ error: 'Ikke funnet' });

    const svar = JSON.parse(ticket.svar);                                    // Hent eksisterende svar
    svar.push({ id: Date.now(), melding: req.body.melding, fraId: req.user.id, fraNavn: req.user.navn }); // Legg til nytt svar

    db.prepare('UPDATE tickets SET svar = ? WHERE id = ?').run(JSON.stringify(svar), ticket.id); // Lagre
    res.json({ melding: 'Svar sendt' });
});

// Slett ticket (kun avsender kan slette)
app.delete('/tickets/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM tickets WHERE id = ? AND fraId = ?').run(req.params.id, req.user.id); // Kun din egen ticket
    res.json({ melding: 'Slettet' });
});

// ---------- DIN OPPRINNELIGE KODE (beholdt) ----------
app.listen(PORT, () => {
    console.log('Server kjører på http://localhost:' + PORT); // Bekreftelse i terminalen
});