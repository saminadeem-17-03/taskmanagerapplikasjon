const API = "http://192.168.20.117:4000";

let midlertidigOppgaver = [];

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
    localStorage.setItem("brukernavn", data.brukernavn);

    visApp();
}

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

    document.getElementById("regOK").textContent = "Bruker opprettet! Du kan nå logge inn.";
    visFane("loggInn");
}

function loggUt() {
    localStorage.clear();
    document.getElementById("appSide").style.display = "none";
    document.getElementById("innloggingSide").style.display = "block";
    document.getElementById("innBrukernavn").value = "";
    document.getElementById("innPassord").value = "";
    document.getElementById("innFeil").textContent = "";
}

function visFane(navn) {
    document.getElementById("loggInn").style.display = navn === "loggInn" ? "block" : "none";
    document.getElementById("registrer").style.display = navn === "registrer" ? "block" : "none";
    document.getElementById("fanLoggInn").classList.toggle("aktiv", navn === "loggInn");
    document.getElementById("fanRegistrer").classList.toggle("aktiv", navn === "registrer");
}

function visApp() {
    document.getElementById("innloggingSide").style.display = "none";
    document.getElementById("appSide").style.display = "block";
    document.getElementById("velkomstTekst").textContent = "Hei, " + localStorage.getItem("navn");

    document.getElementById("notatListe").innerHTML = "";
    document.getElementById("todoListe").innerHTML = "";

    visside("notater");
}

window.onload = function() {
    if (localStorage.getItem("token")) {
        visApp();
    }
};

function headers() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
    };
}

function visside(side) {
    document.getElementById("side-notater").style.display = side === "notater" ? "block" : "none";
    document.getElementById("side-todos").style.display   = side === "todos"   ? "block" : "none";

    document.getElementById("navNotater").classList.toggle("aktiv", side === "notater");
    document.getElementById("navTodos").classList.toggle("aktiv",   side === "todos");

    if (side === "notater") hentNotater();
    if (side === "todos")   hentTodos();
}

async function hentNotater() {
    const res = await fetch(API + "/notater", { headers: headers() });
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
    const tittel  = document.getElementById("notatTittel").value;
    const innhold = document.getElementById("notatInnhold").value;

    if (!tittel || !innhold) return alert("Fyll inn tittel og innhold");

    await fetch(API + "/notater", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, innhold })
    });

    document.getElementById("notatTittel").value  = "";
    document.getElementById("notatInnhold").value = "";
    hentNotater();
}

async function slettNotat(id) {
    await fetch(API + "/notater/" + id, { method: "DELETE", headers: headers() });
    hentNotater();
}

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
    if (!tittel || midlertidigOppgaver.length === 0) return alert("Legg til tittel og minst én oppgave");

    await fetch(API + "/todos", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, oppgaver: midlertidigOppgaver })
    });

    midlertidigOppgaver = [];
    visOppgaver();
    document.getElementById("todoTittel").value = "";
    hentTodos();
}

async function hentTodos() {
    const res  = await fetch(API + "/todos", { headers: headers() });
    const data = await res.json();

    const liste = document.getElementById("todoListe");
    liste.innerHTML = "";

    data.forEach(todo => {
        const li = document.createElement("li");

        let oppgaverHTML = "";
        todo.oppgaver.forEach((o, index) => {
            oppgaverHTML += `
                <div>
                    <input type="checkbox"
                        ${o.ferdig ? "checked" : ""}
                        onchange="toggleOppgave(${todo.id}, ${index})">
                    ${o.ferdig ? "<s>" + o.tekst + "</s>" : o.tekst}
                    <button onclick="slettOppgave(${todo.id}, ${index})">X</button>
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

async function toggleOppgave(todoId, index) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${index}`, {
        method: "PATCH",
        headers: headers()
    });
    hentTodos();
}

async function slettTodo(id) {
    await fetch(API + "/todos/" + id, { method: "DELETE", headers: headers() });
    hentTodos();
}

async function slettOppgave(todoId, index) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${index}`, {
        method: "DELETE",
        headers: headers()
    });
    hentTodos();
}