const express = require('express'); // Importerer Express (lager server)
const cors = require('cors'); // Tillater frontend å koble til backend
const path = require('path'); // Hjelper med filstier (filer og mapper)
const bcrypt = require('bcryptjs'); // Brukes til å hashe passord
const jwt = require('jsonwebtoken'); // Brukes til innloggingstokens (JWT)
const Database = require('better-sqlite3'); // SQLite database (lokal databasefil)

const app = express(); // Lager en Express-app (serverinstans)
const PORT = 4000; // Setter hvilken port serveren kjører på
const SECRET = 'hemmelig_nokkel'; // Hemmelig nøkkel til å signere JWT tokens

app.use(express.json()); // Lar serveren lese JSON fra requests (req.body)
app.use(cors()); // Tillater requests fra andre domener (frontend)
app.use(express.static(path.join(__dirname, '../klient'))); // Serverer frontend-filer (HTML/CSS/JS)

const db = new Database('database.db'); // Åpner eller lager SQLite databasefil

// Lager tabeller hvis de ikke finnes fra før
db.exec(`
    CREATE TABLE IF NOT EXISTS brukere (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        navn TEXT NOT NULL,
        brukernavn TEXT UNIQUE NOT NULL,
        passord TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notater (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bruker_id INTEGER NOT NULL,
        tittel TEXT NOT NULL,
        innhold TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bruker_id INTEGER NOT NULL,
        tittel TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oppgaver (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        todo_id INTEGER NOT NULL,
        tekst TEXT NOT NULL,
        ferdig INTEGER DEFAULT 0
    );
`);

// Middleware som sjekker om bruker er logget inn
function sjekkToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Henter token fra header
    if (!token) return res.status(401).json({ error: 'Ikke innlogget' }); // Stopper hvis ingen token

    try {
        req.user = jwt.verify(token, SECRET); // Verifiserer token og lagrer brukerdata
        next(); // Går videre til neste funksjon
    } catch {
        res.status(401).json({ error: 'Ugyldig token' }); // Token er ugyldig
    }
}

// Registrer ny bruker
app.post('/register', async (req, res) => {
    const { navn, brukernavn, passord } = req.body; // Henter data fra frontend

    if (!navn || !brukernavn || !passord)
        return res.status(400).json({ error: 'Fyll inn alle felt' }); // Validering

    const finnes = db.prepare('SELECT id FROM brukere WHERE brukernavn = ?').get(brukernavn); // Sjekker om brukernavn finnes
    if (finnes) return res.status(400).json({ error: 'Brukernavnet er tatt' }); // Stopper hvis opptatt

    const hashet = await bcrypt.hash(passord, 10); // Hasher passord (sikkerhet)
    db.prepare('INSERT INTO brukere (navn, brukernavn, passord) VALUES (?, ?, ?)').run(navn, brukernavn, hashet); // Lagrer bruker

    res.json({ melding: 'Bruker opprettet' }); // Sender suksessmelding
});

// Logg inn bruker
app.post('/login', async (req, res) => {
    const { brukernavn, passord } = req.body; // Henter innlogging

    const bruker = db.prepare('SELECT * FROM brukere WHERE brukernavn = ?').get(brukernavn); // Finner bruker i DB
    if (!bruker) return res.status(401).json({ error: 'Feil brukernavn eller passord' }); // Hvis ikke funnet

    const gyldig = await bcrypt.compare(passord, bruker.passord); // Sjekker passord
    if (!gyldig) return res.status(401).json({ error: 'Feil brukernavn eller passord' }); // Hvis feil passord

    const token = jwt.sign(
        { id: bruker.id, brukernavn: bruker.brukernavn, navn: bruker.navn }, // Data i token
        SECRET, // Hemmelig nøkkel
        { expiresIn: '24h' } // Token varer 24 timer
    );

    res.json({ token, navn: bruker.navn, brukernavn: bruker.brukernavn }); // Sender token til frontend
});

// Hent brukerens notater
app.get('/notater', sjekkToken, (req, res) => {
    const notater = db.prepare('SELECT * FROM notater WHERE bruker_id = ?').all(req.user.id); // Henter kun egne notater
    res.json(notater); // Sender til frontend
});

// Lag nytt notat
app.post('/notater', sjekkToken, (req, res) => {
    const { tittel, innhold } = req.body; // Henter data

    const ins = db.prepare(
        'INSERT INTO notater (bruker_id, tittel, innhold) VALUES (?, ?, ?)'
    ).run(req.user.id, tittel, innhold); // Lagrer notat

    const notat = db.prepare('SELECT * FROM notater WHERE id = ?').get(ins.lastInsertRowid); // Henter ny notat
    res.json(notat); // Sender tilbake
});

// Slett notat
app.delete('/notater/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM notater WHERE id = ? AND bruker_id = ?')
        .run(req.params.id, req.user.id); // Sletter kun hvis det er ditt notat

    res.json({ melding: 'Slettet' }); // Bekrefter
});

// Hent todos med oppgaver
app.get('/todos', sjekkToken, (req, res) => {
    const todos = db.prepare('SELECT * FROM todos WHERE bruker_id = ?').all(req.user.id); // Henter lister

    const medOppgaver = todos.map(todo => {
        const oppgaver = db.prepare('SELECT * FROM oppgaver WHERE todo_id = ?').all(todo.id); // Henter oppgaver
        return { ...todo, oppgaver }; // Slår sammen todo + oppgaver
    });

    res.json(medOppgaver); // Sender alt
});

// Lag todo-liste
app.post('/todos', sjekkToken, (req, res) => {
    const { tittel, oppgaver } = req.body; // Henter data

    const ins = db.prepare('INSERT INTO todos (bruker_id, tittel) VALUES (?, ?)')
        .run(req.user.id, tittel); // Lager todo

    const todoId = ins.lastInsertRowid; // Henter ID til ny todo

    const settInn = db.prepare('INSERT INTO oppgaver (todo_id, tekst) VALUES (?, ?)'); // Forbereder insert
    (oppgaver || []).forEach(o => settInn.run(todoId, o.tekst)); // Lager oppgaver

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId); // Henter todo
    const alleOppgaver = db.prepare('SELECT * FROM oppgaver WHERE todo_id = ?').all(todoId); // Henter oppgaver

    res.json({ ...todo, oppgaver: alleOppgaver }); // Sender alt tilbake
});

// Slett todo
app.delete('/todos/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM oppgaver WHERE todo_id = ?').run(req.params.id); // Sletter oppgaver først
    db.prepare('DELETE FROM todos WHERE id = ? AND bruker_id = ?')
        .run(req.params.id, req.user.id); // Sletter todo

    res.json({ melding: 'Slettet' }); // Bekrefter
});

// Toggle ferdig/ikke ferdig på oppgave
app.patch('/todos/:todoId/oppgaver/:id', sjekkToken, (req, res) => {
    const oppgave = db.prepare('SELECT * FROM oppgaver WHERE id = ?').get(req.params.id); // Henter oppgave

    if (!oppgave) return res.status(404).json({ error: 'Ikke funnet' }); // Hvis ikke finnes

    db.prepare('UPDATE oppgaver SET ferdig = ? WHERE id = ?')
        .run(oppgave.ferdig ? 0 : 1, req.params.id); // Bytter status

    res.json({ melding: 'Oppdatert' }); // Bekrefter
});

// Slett enkelt oppgave
app.delete('/todos/:todoId/oppgaver/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM oppgaver WHERE id = ?').run(req.params.id); // Sletter oppgave
    res.json({ melding: 'Slettet' }); // Bekrefter
});

// Starter serveren
app.listen(PORT, '0.0.0.0', () =>
    console.log('Server kjører på http://192.168.20.117:' + PORT) // Logger URL
);