const API = "http://192.168.20.117:4000";

let midlertidigOppgaver = [];

// -------------------- INNLOGGING --------------------

async function loggInn() {
    const brukernavn = document.getElementById("innBrukernavn").value;
    const passord = document.getElementById("innPassord").value;

    const res = await fetch(API + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brukernavn, passord })
    });

    const data = await res.json();

    if (!res.ok) {
        document.getElementById("innFeil").textContent = data.error;
        return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("navn", data.navn);
    visApp();
}

// Registrering
async function registrer() {
    const navn = document.getElementById("regNavn").value;
    const brukernavn = document.getElementById("regBrukernavn").value;
    const passord = document.getElementById("regPassord").value;

    const res = await fetch(API + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navn, brukernavn, passord })
    });

    const data = await res.json();

    if (!res.ok) {
        document.getElementById("regFeil").textContent = data.error;
        return;
    }

    document.getElementById("regOK").textContent = "Bruker opprettet!";
    visFane("loggInn");
}

// -------------------- LOGG UT --------------------

function loggUt() {
    localStorage.clear();

    document.getElementById("notatListe").innerHTML = "";
    document.getElementById("todoListe").innerHTML = "";
    document.getElementById("oppgaveListe").innerHTML = "";

    midlertidigOppgaver = [];

    visside("notater");

    document.getElementById("appSide").style.display = "none";
    document.getElementById("innloggingSide").style.display = "block";
}

// -------------------- NAVIGASJON --------------------

function visFane(navn) {
    document.getElementById("loggInn").style.display = navn === "loggInn" ? "block" : "none";
    document.getElementById("registrer").style.display = navn === "registrer" ? "block" : "none";

    document.getElementById("fanLoggInn").classList.toggle("aktiv", navn === "loggInn");
    document.getElementById("fanRegistrer").classList.toggle("aktiv", navn === "registrer");
}

// -------------------- VIS APP --------------------

function visApp() {
    document.getElementById("innloggingSide").style.display = "none";
    document.getElementById("appSide").style.display = "block";
    document.getElementById("velkomstTekst").textContent = "Hei, " + localStorage.getItem("navn");
    hentNotater();
}

function headers() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
    };
}

window.onload = function () {
    if (localStorage.getItem("token")) visApp();
};

// -------------------- SIDE BYTTE --------------------

function visside(side) {
    document.getElementById("side-notater").style.display = side === "notater" ? "block" : "none";
    document.getElementById("side-todos").style.display = side === "todos" ? "block" : "none";

    document.getElementById("navNotater").classList.toggle("aktiv", side === "notater");
    document.getElementById("navTodos").classList.toggle("aktiv", side === "todos");

    if (side === "todos") hentTodos();
}

// -------------------- NOTATER --------------------

async function hentNotater() {
    const res = await fetch(API + "/notater", { headers: headers() });

    // FIKSET: Sjekker at svaret er OK før vi leser JSON
    // Uten denne ville res.json() krasje hvis serveren sendte HTML
    if (!res.ok) return console.error("Kunne ikke hente notater");

    const data = await res.json();
    const liste = document.getElementById("notatListe");
    liste.innerHTML = "";

    data.forEach(notat => {
        const li = document.createElement("li");
        li.innerHTML = `
            <strong>${notat.tittel}</strong><br>
            ${notat.innhold}
            <br>
            <button onclick="slettNotat(${notat.id})">Slett</button>
        `;
        liste.appendChild(li);
    });
}

async function leggTilNotat() {
    const tittel = document.getElementById("notatTittel").value;
    const innhold = document.getElementById("notatInnhold").value;

    if (!tittel || !innhold) return alert("Fyll inn alt");

    const res = await fetch(API + "/notater", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, innhold })
    });

    // FIKSET: Sjekker at lagringen gikk bra før vi henter listen på nytt
    if (!res.ok) return alert("Kunne ikke lagre notat");

    await hentNotater(); // FIKSET: await så vi venter på oppdatert liste
}

async function slettNotat(id) {
    const res = await fetch(API + "/notater/" + id, {
        method: "DELETE",
        headers: headers()
    });

    if (!res.ok) return alert("Kunne ikke slette notat");

    await hentNotater(); // FIKSET: await
}

// -------------------- TODOS --------------------

function leggTilOppgave() {
    const input = document.getElementById("oppgaveInput");
    if (!input.value) return;

    midlertidigOppgaver.push({ tekst: input.value, ferdig: false });
    input.value = "";
    visOppgaver();
}

function visOppgaver() {
    const liste = document.getElementById("oppgaveListe");
    liste.innerHTML = "";

    midlertidigOppgaver.forEach(o => {
        const li = document.createElement("li");
        li.textContent = o.tekst;
        liste.appendChild(li);
    });
}

async function lagreTodo() {
    const tittel = document.getElementById("todoTittel").value;

    if (!tittel || midlertidigOppgaver.length === 0)
        return alert("Mangler data");

    const res = await fetch(API + "/todos", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, oppgaver: midlertidigOppgaver })
    });

    // FIKSET: Sjekker at lagringen gikk bra
    if (!res.ok) return alert("Kunne ikke lagre todo");

    midlertidigOppgaver = [];
    visOppgaver();
    await hentTodos(); // FIKSET: await
}

async function hentTodos() {
    const res = await fetch(API + "/todos", { headers: headers() });

    if (!res.ok) return console.error("Kunne ikke hente todos");

    const data = await res.json();
    const liste = document.getElementById("todoListe");
    liste.innerHTML = "";

    data.forEach(todo => {
        const li = document.createElement("li");

        let oppgaverHTML = "";
        todo.oppgaver.forEach(o => {
            oppgaverHTML += `
                <div>
                    <input type="checkbox"
                        ${o.ferdig ? "checked" : ""}
                        onchange="toggleOppgave(${todo.id}, ${o.id})">
                    ${o.ferdig ? "<s>" + o.tekst + "</s>" : o.tekst}
                    <button onclick="slettOppgave(${todo.id}, ${o.id})">X</button>
                </div>
            `;
        });

        li.innerHTML = `
            <strong>${todo.tittel}</strong>
            <button onclick="slettTodo(${todo.id})">Slett liste</button>
            ${oppgaverHTML}
        `;
        liste.appendChild(li);
    });
}

async function toggleOppgave(todoId, oppgaveId) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${oppgaveId}`, {
        method: "PATCH",
        headers: headers()
    });
    await hentTodos(); // FIKSET: await
}

async function slettTodo(id) {
    await fetch(API + "/todos/" + id, {
        method: "DELETE",
        headers: headers()
    });
    await hentTodos(); // FIKSET: await
}

async function slettOppgave(todoId, oppgaveId) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${oppgaveId}`, {
        method: "DELETE",
        headers: headers()
    });
    await hentTodos(); // FIKSET: await
}