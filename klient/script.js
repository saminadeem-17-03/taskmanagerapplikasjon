const API = "http://192.168.20.117:4000"; 
// Base-URL til backend-serveren din (Raspberry Pi / server)

let midlertidigOppgaver = []; 
// Midlertidig lagring av todo-oppgaver før de sendes til backend

// -------------------- INNLOGGING --------------------

async function loggInn() {
    const brukernavn = document.getElementById("innBrukernavn").value; 
    // Henter brukernavn fra inputfelt

    const passord = document.getElementById("innPassord").value; 
    // Henter passord fra inputfelt

    const res = await fetch(API + "/login", {
        method: "POST", // Sender data til server
        headers: { "Content-Type": "application/json" }, // Forteller at vi sender JSON
        body: JSON.stringify({ brukernavn, passord }) // Sender brukernavn + passord
    });

    const data = await res.json(); 
    // Leser svaret fra serveren (JSON)

    if (!res.ok) {
        document.getElementById("innFeil").textContent = data.error; 
        // Viser feilmelding hvis login feiler
        return;
    }

    localStorage.setItem("token", data.token); 
    // Lagrer JWT-token i nettleseren

    localStorage.setItem("navn", data.navn); 
    // Lagrer brukernavn/navn lokalt

    visApp(); 
    // Viser selve appen etter innlogging
}

// registrering

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
        // Viser feil hvis registrering feiler
        return;
    }

    document.getElementById("regOK").textContent = "Bruker opprettet!";
    // Viser suksessmelding

    visFane("loggInn"); 
    // Bytter til login-fanen
}

// -------------------- LOGG UT --------------------

function loggUt() {
    localStorage.clear(); 
    // Sletter token + lagret info

    document.getElementById("notatListe").innerHTML = "";
    document.getElementById("todoListe").innerHTML = "";
    document.getElementById("oppgaveListe").innerHTML = "";
    // Tømmer UI

    midlertidigOppgaver = []; 
    // Nullstiller midlertidige oppgaver

    visside("notater"); 
    // Setter tilbake til notater

    document.getElementById("appSide").style.display = "none";
    document.getElementById("innloggingSide").style.display = "block";
    // Viser login og skjuler app
}

// -------------------- NAVIGASJON (LOGIN/REGISTER) --------------------

function visFane(navn) {
    document.getElementById("loggInn").style.display = navn === "loggInn" ? "block" : "none";
    document.getElementById("registrer").style.display = navn === "registrer" ? "block" : "none";

    document.getElementById("fanLoggInn").classList.toggle("aktiv", navn === "loggInn");
    document.getElementById("fanRegistrer").classList.toggle("aktiv", navn === "registrer");
    // Marker aktiv fane
}

// -------------------- VIS APP --------------------

function visApp() {
    document.getElementById("innloggingSide").style.display = "none";
    document.getElementById("appSide").style.display = "block";

    document.getElementById("velkomstTekst").textContent =
        "Hei, " + localStorage.getItem("navn"); 
    // Viser navn på bruker

    hentNotater(); 
    // Laster notater ved innlogging
}

// Lager headers med token (må brukes for å være "logget inn")
function headers() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
        // Sender JWT-token til backend
    };
}

// Auto-login hvis token finnes
window.onload = function() {
    if (localStorage.getItem("token")) visApp();
};

// -------------------- SIDE BYTTE (NOTATER / TODOS) --------------------

function visside(side) {
    document.getElementById("side-notater").style.display = side === "notater" ? "block" : "none";
    document.getElementById("side-todos").style.display = side === "todos" ? "block" : "none";

    document.getElementById("navNotater").classList.toggle("aktiv", side === "notater");
    document.getElementById("navTodos").classList.toggle("aktiv", side === "todos");

    if (side === "todos") hentTodos(); 
    // Laster todos når man åpner siden
}

// -------------------- NOTATER --------------------

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
    const tittel = document.getElementById("notatTittel").value;
    const innhold = document.getElementById("notatInnhold").value;

    if (!tittel || !innhold) return alert("Fyll inn alt");

    await fetch(API + "/notater", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, innhold })
    });

    await hentNotater(); // FIKSET: la til await så vi venter på at listen er oppdatert
}

async function slettNotat(id) {
    await fetch(API + "/notater/" + id, {
        method: "DELETE",
        headers: headers()
    });

    await hentNotater(); // FIKSET: la til await så vi venter på at listen er oppdatert
}

// -------------------- TODOS --------------------

// Legger til midlertidig oppgave (før lagring)
function leggTilOppgave() {
    const input = document.getElementById("oppgaveInput");
    if (!input.value) return;

    midlertidigOppgaver.push({ tekst: input.value, ferdig: false });
    input.value = "";

    visOppgaver();
}

// Viser midlertidige oppgaver
function visOppgaver() {
    const liste = document.getElementById("oppgaveListe");
    liste.innerHTML = "";

    midlertidigOppgaver.forEach(o => {
        const li = document.createElement("li");
        li.textContent = o.tekst;
        liste.appendChild(li);
    });
}

// Lagrer todo-liste til backend
async function lagreTodo() {
    const tittel = document.getElementById("todoTittel").value;

    if (!tittel || midlertidigOppgaver.length === 0)
        return alert("Mangler data");

    await fetch(API + "/todos", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
            tittel,
            oppgaver: midlertidigOppgaver
        })
    });

    midlertidigOppgaver = [];
    visOppgaver();
    await hentTodos(); // FIKSET: la til await så vi venter på at listen er oppdatert
}

// Henter alle todos fra backend
async function hentTodos() {
    const res = await fetch(API + "/todos", { headers: headers() });
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

// Toggle ferdig/ikke ferdig
async function toggleOppgave(todoId, oppgaveId) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${oppgaveId}`, {
        method: "PATCH",
        headers: headers()
    });

    await hentTodos(); // FIKSET: la til await så vi venter på at listen er oppdatert
}

// Sletter todo
async function slettTodo(id) {
    await fetch(API + "/todos/" + id, {
        method: "DELETE",
        headers: headers()
    });

    await hentTodos(); // FIKSET: la til await så vi venter på at listen er oppdatert
}

// Sletter enkel oppgave
async function slettOppgave(todoId, oppgaveId) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${oppgaveId}`, {
        method: "DELETE",
        headers: headers()
    });

    await hentTodos(); // FIKSET: la til await så vi venter på at listen er oppdatert
}