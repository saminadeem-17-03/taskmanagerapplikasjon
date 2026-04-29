const API = "http://192.168.20.84:4000";

let currentUser = null; // NYTT

// ===== LOGIN =====
async function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    await fetch(API + "/register", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ username, password })
    });

    alert("Bruker opprettet");
}

async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch(API + "/login", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.error) return alert("Feil login");

    currentUser = data; // lagrer bruker
    loadData();
}

// ===== NOTES =====
async function getNotes() {
    const res = await fetch(API + "/notes/" + currentUser.id);
    const data = await res.json();

    const list = document.getElementById("notes");
    list.innerHTML = "";

    data.forEach(note => {
        const li = document.createElement("li");

        li.innerHTML = `
        <strong>${note.title}</strong><br>
        ${note.content}
        <button onclick="deleteNote(${note.id})">Slett</button>
        <button onclick="makeTicket('${note.title}', '${note.content}')">Lag ticket</button>
        `;

        list.appendChild(li);
    });
}

async function addNote() {
    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;

    await fetch(API + "/notes", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ title, content, userId: currentUser.id })
    });

    getNotes();
}

// ===== TICKETS =====
async function makeTicket(title, content) {
    const toUser = prompt("Send til userId:");

    await fetch(API + "/tickets", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            title,
            content,
            fromUser: currentUser.id,
            toUser
        })
    });

    alert("Ticket sendt");
}

async function getTickets() {
    const res = await fetch(API + "/tickets/" + currentUser.id);
    const data = await res.json();

    const list = document.getElementById("tickets");
    list.innerHTML = "";

    data.forEach(t => {
        const li = document.createElement("li");

        li.innerHTML = `
        <strong>${t.title}</strong> (${t.status})<br>
        ${t.content}
        <button onclick="changeStatus(${t.id})">Lukk</button>
        `;

        list.appendChild(li);
    });
}

async function changeStatus(id) {
    await fetch(API + "/tickets/" + id + "/status", {
        method: "PATCH",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ status: "lukket" })
    });

    getTickets();
}

// ===== LOAD =====
function loadData() {
    getNotes();
    getTickets();
}