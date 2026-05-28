const express = require('express');
const cors = require('cors');
const path = require("path");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');

const app = express();
const PORT = 4000;
const SECRET = 'hemmelig_nokkel';

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
