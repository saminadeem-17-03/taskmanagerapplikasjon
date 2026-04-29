const API = "http://192.168.20.84:4000"; // URL til backend-serveren (API)

async function getNotes() { // Henter alle notater fra backend
    const res = await fetch(API + "/notes"); // Sender GET request til server
    const data = await res.json(); // Gjør responsen om fra JSON til JS-objekt

    const list = document.getElementById("notes"); // Henter HTML-element der notater vises
    list.innerHTML = ""; // Tømmer listen før vi legger til nye elementer

    data.forEach(note => { // Går gjennom hvert notat
        const li = document.createElement("li"); // Lager nytt listeelement

        // Setter inn HTML med tittel, innhold og sletteknapp
        li.innerHTML = `
            <strong>${note.title}</strong><br>
            ${note.content}
            <button onclick="deleteNote(${note.id})">Slett</button>
        `;

        list.appendChild(li); // Legger elementet inn i lista
    });
}

async function addNote() { // Legger til nytt notat
    const title = document.getElementById("title").value; // Henter tittel fra inputfelt
    const content = document.getElementById("content").value; // Henter innhold

    await fetch(API + "/notes", { // Sender POST request til backend
        method: "POST", // POST = opprette data
        headers: { "Content-Type": "application/json" }, // Forteller at vi sender JSON
        body: JSON.stringify({ title, content }) // Gjør JS-objekt om til JSON
    });

    getNotes(); // Oppdaterer listen etter at notatet er lagret
}

async function deleteNote(id) { // Sletter et notat basert på id
    await fetch(API + "/notes/" + id, { method: "DELETE" }); // DELETE request
    getNotes(); // Oppdaterer visningen
}

let tasks = []; // Midlertidig liste for tasks før de lagres i backend

function addTask() { // Legger til en task i listen
    const input = document.getElementById("taskInput"); // Henter inputfelt

    if (!input.value) return; // Stopper hvis input er tom

    // Legger til ny task i array
    tasks.push({ text: input.value, done: false });

    input.value = ""; // Tømmer inputfelt
    renderTasks(); // Oppdaterer visning
}

function renderTasks() { // Viser tasks i frontend
    const list = document.getElementById("taskList"); // Henter HTML liste
    list.innerHTML = ""; // Tømmer listen

    tasks.forEach(t => { // Går gjennom alle tasks
        const li = document.createElement("li"); // Lager listeelement
        li.innerText = t.text; // Setter tekst
        list.appendChild(li); // Legger til i DOM
    });
}

async function addTodo() { // Lager en todo-liste
    const title = document.getElementById("todoTitle").value; // Henter tittel

    if (!title || tasks.length === 0) return; // Stopper hvis tom

    await fetch(API + "/todos", { // Sender POST request
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, tasks }) // Sender tittel + tasks
    });

    tasks = []; // Tømmer midlertidig tasks
    renderTasks(); // Oppdaterer visning
    getTodos(); // Henter oppdaterte todos fra backend
}

async function getTodos() { // Henter alle todo-lister
    const res = await fetch(API + "/todos"); // GET request
    const data = await res.json(); // JSON → JS

    const list = document.getElementById("todos"); // HTML container
    list.innerHTML = ""; // Tømmer

    data.forEach(todo => { // Går gjennom todos
        const li = document.createElement("li"); // Lager listeelement

        let tasksHTML = ""; // Lager HTML-streng for tasks

        todo.tasks.forEach((t, index) => { // Går gjennom tasks
            tasksHTML += `
                <div>
                    <input type="checkbox"
                        ${t.done ? "checked" : ""} 
                        onchange="toggleTask(${todo.id}, ${index})">
                    
                    ${t.done ? "<s>" + t.text + "</s>" : t.text}

                    <button onclick="deleteTask(${todo.id}, ${index})">X</button>
                </div>
            `;
        });

        li.innerHTML = `
            <strong>${todo.title}</strong>
            <button onclick="deleteTodo(${todo.id})">Slett liste</button>
            ${tasksHTML}
        `;

        list.appendChild(li); // Legger til i DOM
    });
}

// Endrer status på en task (ferdig/ikke ferdig)
async function toggleTask(todoId, taskIndex) {
    await fetch(`${API}/todos/${todoId}/tasks/${taskIndex}`, {
        method: "PATCH" // PATCH = oppdatere del av data
    });

    getTodos(); // Oppdaterer visning
}

// Sletter en hel todo-liste
async function deleteTodo(id) {
    await fetch(API + "/todos/" + id, {
        method: "DELETE"
    });

    getTodos(); // Oppdaterer
}

// Sletter en enkelt task
async function deleteTask(todoId, taskIndex) {
    await fetch(`${API}/todos/${todoId}/tasks/${taskIndex}`, {
        method: "DELETE"
    });

    getTodos(); // Oppdaterer
}

getNotes(); // Henter notater når siden lastes
getTodos(); // Henter todos når siden lastes