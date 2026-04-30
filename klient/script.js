const API = "http://192.168.20.117:4000"; // URL til backend-serveren (API)

let midlertidigOppgaver = []; // Oppgaver som ikke er lagret ennå
 
// --- INNLOGGING OG REGISTRERING ---
 
async function loggInn() {
    const brukernavn = document.getElementById("innBrukernavn").value; // Henter brukernavn
    const passord = document.getElementById("innPassord").value; // Henter passord
 
    const res = await fetch(API + "/login", { // Sender til backend
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brukernavn, passord })
    });
 
    const data = await res.json(); // Leser svaret
 
    if (!res.ok) {
        document.getElementById("innFeil").textContent = data.error; // Viser feilmelding
        return;
    }
 
    localStorage.setItem("token", data.token); // Lagrer token
    localStorage.setItem("navn", data.navn); // Lagrer navn
 
    visApp(); // Viser appen
}
 
async function registrer() {
    const navn = document.getElementById("regNavn").value; // Henter navn
    const brukernavn = document.getElementById("regBrukernavn").value; // Henter brukernavn
    const passord = document.getElementById("regPassord").value; // Henter passord
 
    const res = await fetch(API + "/register", { // Sender til backend
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navn, brukernavn, passord })
    });
 
    const data = await res.json(); // Leser svaret
 
    if (!res.ok) {
        document.getElementById("regFeil").textContent = data.error; // Viser feilmelding
        return;
    }
 
    document.getElementById("regOK").textContent = "Bruker opprettet! Du kan nå logge inn."; // Suksess
    visFane("loggInn"); // Bytter til innloggingsfanen
}
 
function loggUt() {
    localStorage.clear(); // Fjerner token og navn
 
    // Tømmer listene så forrige brukers data ikke vises
    document.getElementById("notatListe").innerHTML = "";
    document.getElementById("todoListe").innerHTML = "";
    midlertidigOppgaver = [];
    document.getElementById("oppgaveListe").innerHTML = "";
 
    // Nullstiller innloggingsfelter
    document.getElementById("innBrukernavn").value = "";
    document.getElementById("innPassord").value = "";
    document.getElementById("innFeil").textContent = "";
 
    visside("notater"); // Tilbakestiller til notater-siden
 
    document.getElementById("appSide").style.display = "none"; // Skjuler appen
    document.getElementById("innloggingSide").style.display = "block"; // Viser innlogging
}
 
function visFane(navn) {
    document.getElementById("loggInn").style.display = navn === "loggInn" ? "block" : "none"; // Viser/skjuler logg inn
    document.getElementById("registrer").style.display = navn === "registrer" ? "block" : "none"; // Viser/skjuler registrer
    document.getElementById("fanLoggInn").classList.toggle("aktiv", navn === "loggInn"); // Markerer aktiv fane
    document.getElementById("fanRegistrer").classList.toggle("aktiv", navn === "registrer"); // Markerer aktiv fane
}
 
function visApp() {
    document.getElementById("innloggingSide").style.display = "none"; // Skjuler innlogging
    document.getElementById("appSide").style.display = "block"; // Viser appen
    document.getElementById("velkomstTekst").textContent = "Hei, " + localStorage.getItem("navn"); // Viser navn
 
    hentNotater(); // Laster notater
}
 
// Lager headers med token for alle innloggede kall
function headers() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token") // Legger ved token
    };
}
 
// Sjekker ved sidelast om brukeren allerede er innlogget
window.onload = function() {
    if (localStorage.getItem("token")) visApp(); // Hopper rett til appen
};
 
function visside(side) {
    document.getElementById("side-notater").style.display = side === "notater" ? "block" : "none"; // Viser/skjuler notater
    document.getElementById("side-todos").style.display = side === "todos" ? "block" : "none"; // Viser/skjuler todos
    document.getElementById("navNotater").classList.toggle("aktiv", side === "notater"); // Markerer aktiv knapp
    document.getElementById("navTodos").classList.toggle("aktiv", side === "todos"); // Markerer aktiv knapp
    if (side === "todos") hentTodos(); // Laster todos når siden vises
}
 
// --- NOTATER ---
 
async function hentNotater() {
    const res = await fetch(API + "/notater", { headers: headers() }); // Henter egne notater
    const data = await res.json(); // Gjør om til JS-array
 
    const liste = document.getElementById("notatListe"); // Henter HTML-listen
    liste.innerHTML = ""; // Tømmer listen
 
    data.forEach(notat => { // Går gjennom hvert notat
        const li = document.createElement("li"); // Lager listeelement
        li.innerHTML = `
            <strong>${notat.tittel}</strong><br>
            ${notat.innhold}
            <br>
            <button onclick="slettNotat(${notat.id})">Slett</button>
        `;
        liste.appendChild(li); // Legger til i listen
    });
}
 
async function leggTilNotat() {
    const tittel = document.getElementById("notatTittel").value; // Henter tittel
    const innhold = document.getElementById("notatInnhold").value; // Henter innhold
 
    if (!tittel || !innhold) return alert("Fyll inn tittel og innhold"); // Validering
 
    await fetch(API + "/notater", { // Sender til backend
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, innhold })
    });
 
    document.getElementById("notatTittel").value = ""; // Tømmer felt
    document.getElementById("notatInnhold").value = ""; // Tømmer felt
    hentNotater(); // Oppdaterer listen
}
 
async function slettNotat(id) {
    await fetch(API + "/notater/" + id, { method: "DELETE", headers: headers() }); // Sletter notatet
    hentNotater(); // Oppdaterer listen
}
 
// --- TODO-LISTER ---
 
function leggTilOppgave() {
    const input = document.getElementById("oppgaveInput"); // Henter input
    if (!input.value) return; // Stopper hvis tom
 
    midlertidigOppgaver.push({ tekst: input.value, ferdig: false }); // Legger til i array
    input.value = ""; // Tømmer input
    visOppgaver(); // Oppdaterer visningen
}
 
function visOppgaver() {
    const liste = document.getElementById("oppgaveListe"); // Henter listen
    liste.innerHTML = ""; // Tømmer listen
    midlertidigOppgaver.forEach(o => { // Går gjennom oppgavene
        const li = document.createElement("li");
        li.textContent = o.tekst; // Setter tekst
        liste.appendChild(li);
    });
}
 
async function lagreTodo() {
    const tittel = document.getElementById("todoTittel").value; // Henter tittel
    if (!tittel || midlertidigOppgaver.length === 0) return alert("Legg til tittel og minst én oppgave"); // Validering
 
    await fetch(API + "/todos", { // Sender til backend
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, oppgaver: midlertidigOppgaver })
    });
 
    midlertidigOppgaver = []; // Tømmer midlertidig array
    visOppgaver(); // Tømmer visningen
    document.getElementById("todoTittel").value = ""; // Tømmer felt
    hentTodos(); // Oppdaterer listen
}
 
async function hentTodos() {
    const res = await fetch(API + "/todos", { headers: headers() }); // Henter egne todos
    const data = await res.json(); // Gjør om til JS-array
 
    const liste = document.getElementById("todoListe"); // Henter HTML-listen
    liste.innerHTML = ""; // Tømmer listen
 
    data.forEach(todo => { // Går gjennom hver todo
        const li = document.createElement("li");
 
        let oppgaverHTML = ""; // Bygger HTML for oppgavene
        todo.oppgaver.forEach(o => { // Går gjennom oppgavene
            oppgaverHTML += `
                <div>
                    <input type="checkbox" ${o.ferdig ? "checked" : ""} onchange="toggleOppgave(${todo.id}, ${o.id})">
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
        liste.appendChild(li); // Legger til i listen
    });
}
 
async function toggleOppgave(todoId, oppgaveId) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${oppgaveId}`, { method: "PATCH", headers: headers() }); // Bytter ferdig/ikke ferdig
    hentTodos(); // Oppdaterer listen
}
 
async function slettTodo(id) {
    await fetch(API + "/todos/" + id, { method: "DELETE", headers: headers() }); // Sletter listen
    hentTodos(); // Oppdaterer listen
}
 
async function slettOppgave(todoId, oppgaveId) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${oppgaveId}`, { method: "DELETE", headers: headers() }); // Sletter oppgaven
    hentTodos(); // Oppdaterer listen
}
 