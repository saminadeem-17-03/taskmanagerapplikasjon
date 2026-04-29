const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require("path");

const app = express();
const PORT = 4000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../klient")));

// ===== DATABASE =====
function readDB() {
    return JSON.parse(fs.readFileSync('db.json'));
}

function writeDB(data) {
    fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
}

// ===== BRUKERSYSTEM =====

// Registrer bruker
app.post("/register", (req, res) => {
    const db = readDB();

    const user = {
        id: Date.now(),
        username: req.body.username,
        password: req.body.password
    };

    db.users.push(user);
    writeDB(db);

    res.json(user);
});

// Login
app.post("/login", (req, res) => {
    const db = readDB();

    const user = db.users.find(
        u => u.username === req.body.username && u.password === req.body.password
    );

    if (!user) return res.status(401).json({ error: "Feil login" });

    res.json(user);
});

// ===== NOTES (MED USER ID) =====

// Hent kun brukerens notater
app.get('/notes/:userId', (req, res) => {
    const db = readDB();
    const notes = db.notes.filter(n => n.userId == req.params.userId);
    res.json(notes);
});

// Lag notat
app.post('/notes', (req, res) => {
    const db = readDB();

    const note = {
        id: Date.now(),
        title: req.body.title,
        content: req.body.content,
        userId: req.body.userId // NYTT
    };

    db.notes.push(note);
    writeDB(db);

    res.json(note);
});

// Slett
app.delete('/notes/:id', (req, res) => {
    const db = readDB();
    db.notes = db.notes.filter(n => n.id != req.params.id);
    writeDB(db);
    res.json({ message: "Slettet" });
});

// ===== TODOS (MED USER ID) =====

app.get('/todos/:userId', (req, res) => {
    const db = readDB();
    const todos = db.todos.filter(t => t.userId == req.params.userId);
    res.json(todos);
});

app.post('/todos', (req, res) => {
    const db = readDB();

    const todo = {
        id: Date.now(),
        title: req.body.title,
        tasks: req.body.tasks || [],
        userId: req.body.userId // NYTT
    };

    db.todos.push(todo);
    writeDB(db);

    res.json(todo);
});

app.delete('/todos/:id', (req, res) => {
    const db = readDB();
    db.todos = db.todos.filter(t => t.id != req.params.id);
    writeDB(db);
    res.json({ message: "Slettet" });
});

// ===== TICKETS =====

// Lag ticket
app.post("/tickets", (req, res) => {
    const db = readDB();

    const ticket = {
        id: Date.now(),
        title: req.body.title,
        content: req.body.content,
        fromUser: req.body.fromUser,
        toUser: req.body.toUser,
        status: "åpen", // NYTT
        messages: [] // svar
    };

    db.tickets.push(ticket);
    writeDB(db);

    res.json(ticket);
});

// Hent tickets for bruker
app.get("/tickets/:userId", (req, res) => {
    const db = readDB();

    const tickets = db.tickets.filter(
        t => t.toUser == req.params.userId || t.fromUser == req.params.userId
    );

    res.json(tickets);
});

// Svar på ticket
app.post("/tickets/:id/reply", (req, res) => {
    const db = readDB();

    const ticket = db.tickets.find(t => t.id == req.params.id);

    ticket.messages.push({
        text: req.body.text,
        userId: req.body.userId
    });

    writeDB(db);

    res.json(ticket);
});

// Endre status
app.patch("/tickets/:id/status", (req, res) => {
    const db = readDB();

    const ticket = db.tickets.find(t => t.id == req.params.id);
    ticket.status = req.body.status;

    writeDB(db);

    res.json(ticket);
});

app.listen(PORT, () => {
    console.log("Server kjører på http://localhost:" + PORT);
});