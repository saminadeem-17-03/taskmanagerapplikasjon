const express = require('express'); // Importerer Express (lager server)
const fs = require('fs'); // File system → lese/skrive filer
const cors = require('cors'); // Lar frontend snakke med backend

const app = express(); // Lager Express-app
const PORT = 3001; // Port serveren kjører på

app.use(express.json()); // Lar serveren lese JSON fra requests
app.use(cors()); // Tillater requests fra frontend (annen origin)

// Leser JSON-fil (database)
function readDB() {
    return JSON.parse(fs.readFileSync('db.json')); // Leser fil og gjør om til JS-objekt
}

// Skriver til JSON-fil
function writeDB(data) {
    fs.writeFileSync('db.json', JSON.stringify(data, null, 2)); // Lagrer data pent formatert
}

// Hent alle notater
app.get('/notes', (req, res) => {
    res.json(readDB().notes); // Sender notater som JSON
});

// Opprett nytt notat
app.post('/notes', (req, res) => {
    const db = readDB(); // Leser database

    const note = {
        id: Date.now(), // Lager unik ID
        title: req.body.title, // Data fra frontend
        content: req.body.content
    };

    db.notes.push(note); // Legger til i array
    writeDB(db); // Lagrer til fil

    res.json(note); // Sender tilbake det nye notatet
});

// Slett notat
app.delete('/notes/:id', (req, res) => {
    const db = readDB();

    // Filtrerer bort notatet med riktig ID
    db.notes = db.notes.filter(n => n.id != req.params.id);

    writeDB(db);

    res.json({ message: "Slettet" });
});

// Hent todos
app.get('/todos', (req, res) => {
    res.json(readDB().todos);
});

// Opprett todo
app.post('/todos', (req, res) => {
    const db = readDB();

    const todo = {
        id: Date.now(), // Unik ID
        title: req.body.title,
        tasks: req.body.tasks || [] // Hvis ingen tasks → tom liste
    };

    db.todos.push(todo);
    writeDB(db);

    res.json(todo);
});

// Slett todo
app.delete('/todos/:id', (req, res) => {
    const db = readDB();

    db.todos = db.todos.filter(t => t.id != req.params.id);

    writeDB(db);

    res.json({ message: "Todo slettet" });
});

// Toggle task (ferdig/ikke ferdig)
app.patch('/todos/:todoId/tasks/:taskIndex', (req, res) => {
    const db = readDB();

    const todo = db.todos.find(t => t.id == req.params.todoId); // Finn riktig todo

    if (!todo) return res.status(404).json({ error: "Fant ikke todo" });

    const task = todo.tasks[req.params.taskIndex]; // Finn task

    if (!task) return res.status(404).json({ error: "Fant ikke task" });

    task.done = !task.done; // Bytter true/false

    writeDB(db);

    res.json(task);
});

// Slett task
app.delete('/todos/:todoId/tasks/:taskIndex', (req, res) => {
    const db = readDB();

    const todo = db.todos.find(t => t.id == req.params.todoId);

    if (!todo) return res.status(404).json({ error: "Fant ikke todo" });

    todo.tasks.splice(req.params.taskIndex, 1); // Fjerner task fra array

    writeDB(db);

    res.json({ message: "Task slettet" });
});

app.listen(PORT, () => {
    console.log("Server kjører på http://192.168.30.84:" + PORT);
});