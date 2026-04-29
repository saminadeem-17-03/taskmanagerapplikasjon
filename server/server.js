const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 4000;
const SECRET = 'hemmelig_nokkel';

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../klient")));

// Les og skriv til database
function readDB() {
    return JSON.parse(fs.readFileSync('db.json'));
}

function writeDB(data) {
    fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
}

// Sjekker om brukeren er innlogget (verifiserer JWT-token)
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

// --- BRUKER ---

app.post('/register', async (req, res) => {
    const { brukernavn, passord, navn } = req.body;
    if (!brukernavn || !passord || !navn) return res.status(400).json({ error: 'Fyll inn alle felt' });

    const db = readDB();
    if (db.brukere.find(b => b.brukernavn === brukernavn)) {
        return res.status(400).json({ error: 'Brukernavnet er tatt' });
    }

    const hashet = await bcrypt.hash(passord, 10);
    const bruker = { id: Date.now(), brukernavn, navn, passord: hashet };
    db.brukere.push(bruker);
    writeDB(db);

    res.json({ melding: 'Bruker opprettet' });
});

app.post('/login', async (req, res) => {
    const { brukernavn, passord } = req.body;
    const db = readDB();
    const bruker = db.brukere.find(b => b.brukernavn === brukernavn);

    if (!bruker || !(await bcrypt.compare(passord, bruker.passord))) {
        return res.status(401).json({ error: 'Feil brukernavn eller passord' });
    }

    const token = jwt.sign({ id: bruker.id, brukernavn: bruker.brukernavn, navn: bruker.navn }, SECRET, { expiresIn: '24h' });
    res.json({ token, navn: bruker.navn, brukernavn: bruker.brukernavn });
});

// Hent alle brukere (for å velge mottaker i tickets)
app.get('/brukere', sjekkToken, (req, res) => {
    const db = readDB();
    res.json(db.brukere.map(b => ({ id: b.id, brukernavn: b.brukernavn, navn: b.navn })));
});

// --- NOTATER ---

app.get('/notater', sjekkToken, (req, res) => {
    const db = readDB();
    res.json(db.notater.filter(n => n.brukerId === req.user.id));
});

app.post('/notater', sjekkToken, (req, res) => {
    const db = readDB();
    const notat = {
        id: Date.now(),
        brukerId: req.user.id,
        tittel: req.body.tittel,
        innhold: req.body.innhold
    };
    db.notater.push(notat);
    writeDB(db);
    res.json(notat);
});

app.delete('/notater/:id', sjekkToken, (req, res) => {
    const db = readDB();
    db.notater = db.notater.filter(n => !(n.id == req.params.id && n.brukerId === req.user.id));
    writeDB(db);
    res.json({ melding: 'Slettet' });
});

// --- TODO-LISTER ---

app.get('/todos', sjekkToken, (req, res) => {
    const db = readDB();
    res.json(db.todos.filter(t => t.brukerId === req.user.id));
});

app.post('/todos', sjekkToken, (req, res) => {
    const db = readDB();
    const todo = {
        id: Date.now(),
        brukerId: req.user.id,
        tittel: req.body.tittel,
        oppgaver: req.body.oppgaver || []
    };
    db.todos.push(todo);
    writeDB(db);
    res.json(todo);
});

app.delete('/todos/:id', sjekkToken, (req, res) => {
    const db = readDB();
    db.todos = db.todos.filter(t => !(t.id == req.params.id && t.brukerId === req.user.id));
    writeDB(db);
    res.json({ melding: 'Slettet' });
});

app.patch('/todos/:todoId/oppgaver/:index', sjekkToken, (req, res) => {
    const db = readDB();
    const todo = db.todos.find(t => t.id == req.params.todoId && t.brukerId === req.user.id);
    if (!todo) return res.status(404).json({ error: 'Ikke funnet' });

    const oppgave = todo.oppgaver[req.params.index];
    if (!oppgave) return res.status(404).json({ error: 'Ikke funnet' });

    oppgave.ferdig = !oppgave.ferdig;
    writeDB(db);
    res.json(oppgave);
});

app.delete('/todos/:todoId/oppgaver/:index', sjekkToken, (req, res) => {
    const db = readDB();
    const todo = db.todos.find(t => t.id == req.params.todoId && t.brukerId === req.user.id);
    if (!todo) return res.status(404).json({ error: 'Ikke funnet' });

    todo.oppgaver.splice(req.params.index, 1);
    writeDB(db);
    res.json({ melding: 'Slettet' });
});

// --- TICKETS ---

app.get('/tickets', sjekkToken, (req, res) => {
    const db = readDB();
    res.json(db.tickets.filter(t => t.fraId === req.user.id || t.tilId === req.user.id));
});

app.post('/tickets', sjekkToken, (req, res) => {
    const { tittel, innhold, tilBrukernavn } = req.body;
    const db = readDB();

    const mottaker = db.brukere.find(b => b.brukernavn === tilBrukernavn);
    if (!mottaker) return res.status(404).json({ error: 'Mottaker finnes ikke' });

    const ticket = {
        id: Date.now(),
        tittel,
        innhold,
        fraId: req.user.id,
        fraNavn: req.user.navn,
        fraBrukernavn: req.user.brukernavn,
        tilId: mottaker.id,
        tilNavn: mottaker.navn,
        tilBrukernavn: mottaker.brukernavn,
        status: 'åpen',
        svar: []
    };

    db.tickets.push(ticket);
    writeDB(db);
    res.json(ticket);
});

app.patch('/tickets/:id/status', sjekkToken, (req, res) => {
    const db = readDB();
    const ticket = db.tickets.find(t => t.id == req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ikke funnet' });

    ticket.status = req.body.status;
    writeDB(db);
    res.json(ticket);
});

app.post('/tickets/:id/svar', sjekkToken, (req, res) => {
    const db = readDB();
    const ticket = db.tickets.find(t => t.id == req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ikke funnet' });

    ticket.svar.push({
        id: Date.now(),
        melding: req.body.melding,
        fraId: req.user.id,
        fraNavn: req.user.navn
    });

    writeDB(db);
    res.json(ticket);
});

app.delete('/tickets/:id', sjekkToken, (req, res) => {
    const db = readDB();
    db.tickets = db.tickets.filter(t => !(t.id == req.params.id && t.fraId === req.user.id));
    writeDB(db);
    res.json({ melding: 'Slettet' });
});

app.listen(PORT, () => {
    console.log('Server kjører på http://192.168.20.84:' + PORT);
});