const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
const PORT = 4000;
const SECRET = 'hemmelig_nokkel';

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../klient')));

const db = new Database('database.db');

// FIKSET: Byttet alle // til -- inne i SQL (SQLite forstår ikke //)
db.exec(`
    CREATE TABLE IF NOT EXISTS brukere (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- Unik bruker-ID
        navn TEXT NOT NULL,                   -- Fullt navn
        brukernavn TEXT UNIQUE NOT NULL,      -- Unikt brukernavn
        passord TEXT NOT NULL                 -- Hashet passord
    );

    CREATE TABLE IF NOT EXISTS notater (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- Notat-ID
        bruker_id INTEGER NOT NULL,           -- Hvem notatet tilhører
        tittel TEXT NOT NULL,                 -- Tittel på notat
        innhold TEXT NOT NULL                 -- Selve innholdet
    );

    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- Todo-liste ID
        bruker_id INTEGER NOT NULL,           -- Eieren av listen
        tittel TEXT NOT NULL                  -- Navn på todo-liste
    );

    CREATE TABLE IF NOT EXISTS oppgaver (
        id INTEGER PRIMARY KEY AUTOINCREMENT, -- Oppgave-ID
        todo_id INTEGER NOT NULL,             -- Hvilken todo den tilhører
        tekst TEXT NOT NULL,                  -- Oppgavetekst
        ferdig INTEGER DEFAULT 0              -- 0 = ikke ferdig, 1 = ferdig
    );
`);

// Middleware som sjekker om bruker er logget inn
function sjekkToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Ikke innlogget' });

    try {
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Ugyldig token' });
    }
}

// Registrer ny bruker
app.post('/register', async (req, res) => {
    const { navn, brukernavn, passord } = req.body;

    if (!navn || !brukernavn || !passord)
        return res.status(400).json({ error: 'Fyll inn alle felt' });

    const finnes = db.prepare('SELECT id FROM brukere WHERE brukernavn = ?').get(brukernavn);
    if (finnes) return res.status(400).json({ error: 'Brukernavnet er tatt' });

    const hashet = await bcrypt.hash(passord, 10);
    db.prepare('INSERT INTO brukere (navn, brukernavn, passord) VALUES (?, ?, ?)').run(navn, brukernavn, hashet);

    res.json({ melding: 'Bruker opprettet' });
});

// Logg inn bruker
app.post('/login', async (req, res) => {
    const { brukernavn, passord } = req.body;

    const bruker = db.prepare('SELECT * FROM brukere WHERE brukernavn = ?').get(brukernavn);
    if (!bruker) return res.status(401).json({ error: 'Feil brukernavn eller passord' });

    const gyldig = await bcrypt.compare(passord, bruker.passord);
    if (!gyldig) return res.status(401).json({ error: 'Feil brukernavn eller passord' });

    const token = jwt.sign(
        { id: bruker.id, brukernavn: bruker.brukernavn, navn: bruker.navn },
        SECRET,
        { expiresIn: '24h' }
    );

    res.json({ token, navn: bruker.navn, brukernavn: bruker.brukernavn });
});

// Hent brukerens notater
app.get('/notater', sjekkToken, (req, res) => {
    const notater = db.prepare('SELECT * FROM notater WHERE bruker_id = ?').all(req.user.id);
    res.json(notater);
});

// Lag nytt notat
app.post('/notater', sjekkToken, (req, res) => {
    const { tittel, innhold } = req.body;

    if (!tittel || !innhold)
        return res.status(400).json({ error: 'Fyll inn tittel og innhold' });

    const ins = db.prepare(
        'INSERT INTO notater (bruker_id, tittel, innhold) VALUES (?, ?, ?)'
    ).run(req.user.id, tittel, innhold);

    const notat = db.prepare('SELECT * FROM notater WHERE id = ?').get(ins.lastInsertRowid);
    res.json(notat);
});

// Slett notat
app.delete('/notater/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM notater WHERE id = ? AND bruker_id = ?')
        .run(req.params.id, req.user.id);

    res.json({ melding: 'Slettet' });
});

// Hent todos med oppgaver
app.get('/todos', sjekkToken, (req, res) => {
    const todos = db.prepare('SELECT * FROM todos WHERE bruker_id = ?').all(req.user.id);

    const medOppgaver = todos.map(todo => {
        const oppgaver = db.prepare('SELECT * FROM oppgaver WHERE todo_id = ?').all(todo.id);
        return { ...todo, oppgaver };
    });

    res.json(medOppgaver);
});

// Lag todo-liste
app.post('/todos', sjekkToken, (req, res) => {
    const { tittel, oppgaver } = req.body;

    if (!tittel)
        return res.status(400).json({ error: 'Mangler tittel' });

    const ins = db.prepare('INSERT INTO todos (bruker_id, tittel) VALUES (?, ?)')
        .run(req.user.id, tittel);

    const todoId = ins.lastInsertRowid;

    const settInn = db.prepare('INSERT INTO oppgaver (todo_id, tekst) VALUES (?, ?)');
    (oppgaver || []).forEach(o => settInn.run(todoId, o.tekst));

    const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId);
    const alleOppgaver = db.prepare('SELECT * FROM oppgaver WHERE todo_id = ?').all(todoId);

    res.json({ ...todo, oppgaver: alleOppgaver });
});

// Slett todo
app.delete('/todos/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM oppgaver WHERE todo_id = ?').run(req.params.id);
    db.prepare('DELETE FROM todos WHERE id = ? AND bruker_id = ?')
        .run(req.params.id, req.user.id);

    res.json({ melding: 'Slettet' });
});

// Toggle ferdig/ikke ferdig på oppgave
app.patch('/todos/:todoId/oppgaver/:id', sjekkToken, (req, res) => {
    const oppgave = db.prepare('SELECT * FROM oppgaver WHERE id = ?').get(req.params.id);

    if (!oppgave) return res.status(404).json({ error: 'Ikke funnet' });

    db.prepare('UPDATE oppgaver SET ferdig = ? WHERE id = ?')
        .run(oppgave.ferdig ? 0 : 1, req.params.id);

    res.json({ melding: 'Oppdatert' });
});

// Slett enkelt oppgave
app.delete('/todos/:todoId/oppgaver/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM oppgaver WHERE id = ?').run(req.params.id);
    res.json({ melding: 'Slettet' });
});

// FIKSET: Global feilhåndterer – returnerer alltid JSON, aldri HTML
// Uten denne ville Express sende en HTML-feilside ved uventede feil,
// som ville krasje res.json() i klienten med "Unexpected token '<'"
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Noe gikk galt på serveren' });
});

app.listen(PORT, '0.0.0.0', () =>
    console.log('Server kjører på http://192.168.20.117:' + PORT)
);