const express = require('express');
const cors = require('cors');
const path = require("path");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
const PORT = 4000;
const SECRET = 'hemmelig_nokkel';

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'klient')));

const db = new Database('database.db');

db.exec(`
    CREATE TABLE IF NOT EXISTS brukere (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brukernavn TEXT UNIQUE,
        passord TEXT,
        navn TEXT
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS notater (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brukerId INTEGER,
        tittel TEXT,
        innhold TEXT
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brukerId INTEGER,
        tittel TEXT,
        oppgaver TEXT
    )
`);

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

app.post('/register', async (req, res) => {
    const { brukernavn, passord, navn } = req.body;
    if (!brukernavn || !passord || !navn) return res.status(400).json({ error: 'Fyll inn alle felt' });

    const hashet = await bcrypt.hash(passord, 10);

    try {
        db.prepare('INSERT INTO brukere (brukernavn, passord, navn) VALUES (?, ?, ?)')
          .run(brukernavn, hashet, navn);
        res.json({ melding: 'Bruker opprettet' });
    } catch {
        res.status(400).json({ error: 'Brukernavnet er tatt' });
    }
});

app.post('/login', async (req, res) => {
    const { brukernavn, passord } = req.body;
    const bruker = db.prepare('SELECT * FROM brukere WHERE brukernavn = ?').get(brukernavn);

    if (!bruker || !(await bcrypt.compare(passord, bruker.passord))) {
        return res.status(401).json({ error: 'Feil brukernavn eller passord' });
    }

    const token = jwt.sign(
        { id: bruker.id, brukernavn: bruker.brukernavn, navn: bruker.navn },
        SECRET,
        { expiresIn: '24h' }
    );
    res.json({ token, navn: bruker.navn, brukernavn: bruker.brukernavn });
});

app.get('/notater', sjekkToken, (req, res) => {
    const notater = db.prepare('SELECT * FROM notater WHERE brukerId = ?').all(req.user.id);
    res.json(notater);
});

app.post('/notater', sjekkToken, (req, res) => {
    const info = db.prepare('INSERT INTO notater (brukerId, tittel, innhold) VALUES (?, ?, ?)')
                   .run(req.user.id, req.body.tittel, req.body.innhold);
    res.json({ id: info.lastInsertRowid, tittel: req.body.tittel, innhold: req.body.innhold });
});

app.delete('/notater/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM notater WHERE id = ? AND brukerId = ?').run(req.params.id, req.user.id);
    res.json({ melding: 'Slettet' });
});

app.get('/todos', sjekkToken, (req, res) => {
    const todos = db.prepare('SELECT * FROM todos WHERE brukerId = ?').all(req.user.id);
    todos.forEach(t => t.oppgaver = JSON.parse(t.oppgaver));
    res.json(todos);
});

app.post('/todos', sjekkToken, (req, res) => {
    const oppgaverJSON = JSON.stringify(req.body.oppgaver || []);
    const info = db.prepare('INSERT INTO todos (brukerId, tittel, oppgaver) VALUES (?, ?, ?)')
                   .run(req.user.id, req.body.tittel, oppgaverJSON);
    res.json({ id: info.lastInsertRowid, tittel: req.body.tittel, oppgaver: req.body.oppgaver });
});

app.delete('/todos/:id', sjekkToken, (req, res) => {
    db.prepare('DELETE FROM todos WHERE id = ? AND brukerId = ?').run(req.params.id, req.user.id);
    res.json({ melding: 'Todo slettet' });
});

app.patch('/todos/:todoId/oppgaver/:index', sjekkToken, (req, res) => {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND brukerId = ?')
                   .get(req.params.todoId, req.user.id);
    if (!todo) return res.status(404).json({ error: 'Ikke funnet' });

    const oppgaver = JSON.parse(todo.oppgaver);
    oppgaver[req.params.index].ferdig = !oppgaver[req.params.index].ferdig;

    db.prepare('UPDATE todos SET oppgaver = ? WHERE id = ?')
      .run(JSON.stringify(oppgaver), todo.id);
    res.json({ melding: 'Oppdatert' });
});

app.delete('/todos/:todoId/oppgaver/:index', sjekkToken, (req, res) => {
    const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND brukerId = ?')
                   .get(req.params.todoId, req.user.id);
    if (!todo) return res.status(404).json({ error: 'Ikke funnet' });

    const oppgaver = JSON.parse(todo.oppgaver);
    oppgaver.splice(req.params.index, 1);

    db.prepare('UPDATE todos SET oppgaver = ? WHERE id = ?')
      .run(JSON.stringify(oppgaver), todo.id);
    res.json({ melding: 'Slettet' });
});

app.listen(PORT, () => {
    console.log('Server kjører på http:192.168.20.117' + PORT);
});