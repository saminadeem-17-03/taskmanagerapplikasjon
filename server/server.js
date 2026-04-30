const express = require('express'); // Lager server
const cors = require('cors'); // Tillater frontend å koble til
const path = require('path'); // Hjelper med filstier
const bcrypt = require('bcryptjs'); // Hasher passord
const jwt = require('jsonwebtoken'); // Lager innloggings-tokens
const Database = require('better-sqlite3'); // SQLite-database

const app = express(); // Starter Express
const PORT = 4000; // Portnummer
const SECRET = 'hemmelig_nokkel'; // Nøkkel for JWT

app.use(express.json()); // Leser JSON fra forespørsler
app.use(cors()); // Tillater alle origins
app.use(express.static(path.join(__dirname, '../klient'))); // Serverer HTML/CSS/JS

const db = new Database('database.db'); // Åpner/lager databasefilen

// Lager tabeller hvis de ikke finnes
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

// Sjekker at brukeren er innlogget (verifiserer token)
function sjekkToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1]; // Henter token fra header
    if (!token) return res.status(401).json({ error: 'Ikke innlogget' }); // Ingen token = stopp

    try {
        req.user = jwt.verify(token, SECRET); // Verifiserer og lagrer brukerdata
        next(); // Går videre
    } catch {
        res.status(401).json({ error: 'Ugyldig token' }); // Feil token
    }
}

// Registrer ny bruker
app.post('/register', async (req, res) => {
    const { navn, brukernavn, passord } = req.body; // Henter data fra forespørselen
    if (!navn || !brukernavn || !passord) return res.status(400).json({ error: 'Fyll inn alle felt' }); // Validering

    const finnes = db.prepare('SELECT id FROM brukere WHERE brukernavn = ?').get(brukernavn); // Sjekker om brukernavn er tatt
    if (finnes) return res.status(400).json({ error: 'Brukernavnet er tatt' }); // Stopper hvis tatt

    const hashet = await bcrypt.hash(passord, 10); // Hasher passordet
    db.prepare('INSERT INTO brukere (navn, brukernavn, passord) VALUES (?, ?, ?)').run(navn, brukernavn, hashet); // Lagrer bruker

    res.json({ melding: 'Bruker opprettet' }); // Suksess
});

// Logg inn
app.post('/login', async (req, res) => {
    const { brukernavn, passord } = req.body; // Henter innloggingsdata

    const bruker = db.prepare('SELECT * FROM brukere WHERE brukernavn = ?').get(brukernavn); // Finner bruker
    if (!bruker) return res.status(401).json({ error: 'Feil brukernavn eller passord' }); // Ikke funnet

    const gyldig = await bcrypt.compare(passord, bruker.passord); // Sjekker passord
    if (!gyldig) return res.status(401).json({ error: 'Feil brukernavn eller passord' }); // Feil passord

    const token = jwt.sign({ id: bruker.id, brukernavn: bruker.brukernavn, navn: bruker.navn }, SECRET, { expiresIn: '24h' }); // Lager token
    res.json({ token, navn: bruker.navn, brukernavn: bruker.brukernavn }); // Sender token og info
});

// Hent egne notater
app.get('/notater', sjekkToken, (req, res) => {
    const notater = db.prepare('SELECT * FROM notater WHERE bruker_id = ?').all(req.user.id); // Henter kun egne
    res.json(notater); // Sender notater
});

// Lag notat
app.post('/notater', sjekkToken, (req, res) => {
    const { tittel, innhold } = req.body; // Henter data
    const ins = db.prepare('INSERT INTO notater (bruker_id, tittel, innhold) VALUES (?, ?, ?)').run(req.user.id, tittel, innhold); // Lagrer
    const notat = db.prepare('SELECT * FROM notater WHERE id = ?').get(ins.lastInsertRowid); // Henter det nye
    res.json(notat); // Sender tilbake
});

// Slett notat
app.delete('/notater/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM notater WHERE id = ? AND bruker_id = ?').run(req.params.id, req.user.id); // Sletter kun eget
    res.json({ melding: 'Slettet' }); // Bekrefter
});

// Hent egne todos med oppgaver
app.get('/todos', sjekkToken, (req, res) => {
    const todos = db.prepare('SELECT * FROM todos WHERE bruker_id = ?').all(req.user.id); // Henter egne lister
    const medOppgaver = todos.map(todo => { // Går gjennom hver todo
        const oppgaver = db.prepare('SELECT * FROM oppgaver WHERE todo_id = ?').all(todo.id); // Henter oppgavene
        return { ...todo, oppgaver }; // Returnerer todo med oppgaver
    });
    res.json(medOppgaver); // Sender alt
});

// Lag todo-liste
app.post('/todos', sjekkToken, (req, res) => {
    const { tittel, oppgaver } = req.body; // Henter data
    const ins = db.prepare('INSERT INTO todos (bruker_id, tittel) VALUES (?, ?)').run(req.user.id, tittel); // Lagrer listen
    const todoId = ins.lastInsertRowid; // ID til den nye listen

    const settInn = db.prepare('INSERT INTO oppgaver (todo_id, tekst) VALUES (?, ?)'); // Forberedt setning
    (oppgaver || []).forEach(o => settInn.run(todoId, o.tekst)); // Lagrer oppgavene

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId); // Henter listen
    const alleOppgaver = db.prepare('SELECT * FROM oppgaver WHERE todo_id = ?').all(todoId); // Henter oppgavene
    res.json({ ...todo, oppgaver: alleOppgaver }); // Sender alt
});

// Slett todo-liste
app.delete('/todos/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM oppgaver WHERE todo_id = ?').run(req.params.id); // Sletter oppgavene først
    db.prepare('DELETE FROM todos WHERE id = ? AND bruker_id = ?').run(req.params.id, req.user.id); // Sletter listen
    res.json({ melding: 'Slettet' }); // Bekrefter
});

// Toggle oppgave ferdig/ikke ferdig
app.patch('/todos/:todoId/oppgaver/:id', sjekkToken, (req, res) => {
    const oppgave = db.prepare('SELECT * FROM oppgaver WHERE id = ?').get(req.params.id); // Finner oppgaven
    if (!oppgave) return res.status(404).json({ error: 'Ikke funnet' }); // Stopper hvis ikke funnet
    db.prepare('UPDATE oppgaver SET ferdig = ? WHERE id = ?').run(oppgave.ferdig ? 0 : 1, req.params.id); // Bytter status
    res.json({ melding: 'Oppdatert' }); // Bekrefter
});

// Slett enkeltoppgave
app.delete('/todos/:todoId/oppgaver/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM oppgaver WHERE id = ?').run(req.params.id); // Sletter oppgaven
    res.json({ melding: 'Slettet' }); // Bekrefter
});

app.listen(PORT, () => console.log('Server kjører på http://192.168.20.117:4000:' + PORT)); // Starter serveren