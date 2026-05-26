// ─── API-baseURL ───────────────────────────────────────────────────────────────
// Alle fetch-kall bruker denne URL-en som prefix – peker på Express-serveren
const API = "http://192.168.20.117:4000";

// Midlertidig array som holder oppgaver mens brukeren bygger en ny todo-liste
// Nullstilles etter lagring slik at neste liste starter friskt
let midlertidigOppgaver = [];

// ─── FUNKSJON: Logg inn ────────────────────────────────────────────────────────
// Henter brukerdata fra skjemaet og sender POST til /login på serveren
async function loggInn() {
    const brukernavn = document.getElementById("innBrukernavn").value; // Leser brukernavn fra inputfeltet
    const passord    = document.getElementById("innPassord").value;    // Leser passord fra inputfeltet

    // fetch() sender en HTTP POST-request til serveren med JSON-body
    // Backend mottar dette, slår opp bruker i DB og returnerer JWT-token hvis OK
    const res = await fetch(API + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // Forteller serveren at body er JSON
        body: JSON.stringify({ brukernavn, passord })    // Konverterer JS-objekt til JSON-streng
    });

    const data = await res.json(); // Parser JSON-svaret fra serveren til JS-objekt

    if (!res.ok) {
        // res.ok er false når statuskode er 4xx/5xx – viser feilmelding fra serveren
        document.getElementById("innFeil").textContent = data.error;
        return; // Avbryter funksjonen – brukeren er ikke innlogget
    }

    // Lagrer token og brukerinfo i localStorage – overlever siderefresh
    // Token brukes i Authorization-header på alle påfølgende API-kall
    localStorage.setItem("token",      data.token);
    localStorage.setItem("navn",       data.navn);
    localStorage.setItem("brukernavn", data.brukernavn);

    visApp(); // Viser hoveddelen av appen og skjuler innloggingsskjema
}

// ─── FUNKSJON: Registrer ny bruker ────────────────────────────────────────────
// Henter data fra registreringsskjema og sender POST til /register på serveren
async function registrer() {
    const navn       = document.getElementById("regNavn").value;       // Leser fullt navn
    const brukernavn = document.getElementById("regBrukernavn").value; // Leser ønsket brukernavn
    const passord    = document.getElementById("regPassord").value;    // Leser passord

    // Backend krypterer passordet med bcrypt og lagrer bruker i databasen
    const res = await fetch(API + "/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navn, brukernavn, passord })
    });

    const data = await res.json(); // Parser serverens svar

    if (!res.ok) {
        document.getElementById("regFeil").textContent = data.error; // Viser f.eks. "Brukernavnet er tatt"
        return;
    }

    // Registrering OK – viser suksessmelding og bytter til innloggingsfanen
    document.getElementById("regOK").textContent = "Bruker opprettet! Du kan nå logge inn.";
    visFane("loggInn"); // Navigerer brukeren til innloggingsskjemaet
}

// ─── FUNKSJON: Logg ut ─────────────────────────────────────────────────────────
// Sletter all lokal data og viser innloggingsskjema igjen
function loggUt() {
    localStorage.clear(); // Fjerner token og brukerinfo – neste API-kall vil feile uten token

    // Bytter visning: skjuler app, viser innlogging
    document.getElementById("appSide").style.display        = "none";
    document.getElementById("innloggingSide").style.display = "block";

    // Nullstiller innloggingsskjema og feilmeldinger for ren tilstand
    document.getElementById("innBrukernavn").value  = "";
    document.getElementById("innPassord").value     = "";
    document.getElementById("innFeil").textContent  = "";
}

// ─── FUNKSJON: Bytt mellom innlogging og registrering ─────────────────────────
// Viser riktig skjema og markerer aktiv fane med CSS-klassen "aktiv"
function visFane(navn) {
    document.getElementById("loggInn").style.display   = navn === "loggInn"   ? "block" : "none";
    document.getElementById("registrer").style.display = navn === "registrer" ? "block" : "none";

    // Toggler CSS-klassen "aktiv" – gir visuell indikasjon på hvilken fane som er valgt
    document.getElementById("fanLoggInn").classList.toggle("aktiv",    navn === "loggInn");
    document.getElementById("fanRegistrer").classList.toggle("aktiv",  navn === "registrer");
}

// ─── FUNKSJON: Vis hoveddelen av appen ────────────────────────────────────────
// Kalles etter vellykket innlogging – viser app og henter data fra server
function visApp() {
    document.getElementById("innloggingSide").style.display = "none";  // Skjuler innlogging
    document.getElementById("appSide").style.display        = "block"; // Viser app

    // Henter navnet fra localStorage (satt ved innlogging) og viser velkomstmelding
    document.getElementById("velkomstTekst").textContent = "Hei, " + localStorage.getItem("navn");

    // Nullstiller listene slik at gamle data fra forrige sesjon ikke vises
    document.getElementById("notatListe").innerHTML = "";
    document.getElementById("todoListe").innerHTML  = "";

    visside("notater"); // Viser notat-siden som standard startside
}

// ─── Ved sidelast: sjekk om brukeren allerede er innlogget ────────────────────
// Kjøres automatisk når siden lastes – logger inn automatisk hvis token finnes
window.onload = function() {
    if (localStorage.getItem("token")) {
        visApp(); // Token finnes fra forrige besøk – gå rett til appen
    }
};

// ─── HJELPEFUNKSJON: Lag riktige HTTP-headers med token ───────────────────────
// Brukes i alle beskyttede API-kall – server verifiserer token i sjekkToken-middleware
function headers() {
    return {
        "Content-Type": "application/json",                              // Body er JSON
        "Authorization": "Bearer " + localStorage.getItem("token")      // JWT-token beviser hvem vi er
    };
}

// ─── FUNKSJON: Bytt mellom notat- og todo-siden ───────────────────────────────
// Viser riktig seksjon og henter fersk data fra serveren ved sidebytte
function visside(side) {
    document.getElementById("side-notater").style.display = side === "notater" ? "block" : "none";
    document.getElementById("side-todos").style.display   = side === "todos"   ? "block" : "none";

    // Oppdaterer navigasjon visuelt med "aktiv"-klassen
    document.getElementById("navNotater").classList.toggle("aktiv", side === "notater");
    document.getElementById("navTodos").classList.toggle("aktiv",   side === "todos");

    // Henter data fra server kun for den aktive siden – unngår unødvendige kall
    if (side === "notater") hentNotater();
    if (side === "todos")   hentTodos();
}

// ─── FUNKSJON: Hent alle notater fra serveren ─────────────────────────────────
// GET /notater → server slår opp i DB etter brukerId fra token → returnerer array
async function hentNotater() {
    const res  = await fetch(API + "/notater", { headers: headers() }); // GET med token i header
    if (!res.ok) return; // Avbryt hvis serveren returnerer feil (f.eks. ugyldig token)

    const data = await res.json(); // Array av {id, brukerId, tittel, innhold}

    const liste = document.getElementById("notatListe");
    liste.innerHTML = ""; // Tømmer listen før oppdatering – unngår duplikater

    // Bygger et listeelement per notat og legger til i DOM-en
    data.forEach(notat => {
        const li = document.createElement("li");
        li.innerHTML = `
            <strong>${notat.tittel}</strong><br>
            ${notat.innhold}
            <br>
            <button onclick="slettNotat(${notat.id})">Slett</button>
        `; // onclick sender DELETE til serveren med notatets ID
        liste.appendChild(li);
    });
}

// ─── FUNKSJON: Legg til nytt notat ────────────────────────────────────────────
// POST /notater → server lagrer i DB og returnerer det nye notatet med DB-generert ID
async function leggTilNotat() {
    const tittel  = document.getElementById("notatTittel").value;  // Leser tittel fra inputfelt
    const innhold = document.getElementById("notatInnhold").value; // Leser innhold fra textarea

    if (!tittel || !innhold) return alert("Fyll inn tittel og innhold"); // Klientside-validering

    const res = await fetch(API + "/notater", {
        method: "POST",
        headers: headers(),                          // Token i header sier hvem notatet tilhører
        body: JSON.stringify({ tittel, innhold })    // Sender notatdata som JSON
    });

    if (!res.ok) {
        const data = await res.json();
        return alert(data.error); // Viser feilmelding fra serveren
    }

    // Nullstiller inputfeltene etter vellykket lagring
    document.getElementById("notatTittel").value  = "";
    document.getElementById("notatInnhold").value = "";

    hentNotater(); // Henter oppdatert liste fra server – viser det nye notatet
}

// ─── FUNKSJON: Slett et notat ─────────────────────────────────────────────────
// DELETE /notater/:id → server sletter fra DB kun hvis notatet tilhører innlogget bruker
async function slettNotat(id) {
    const res = await fetch(API + "/notater/" + id, { // ID i URL – identifiserer hvilken rad som slettes
        method: "DELETE",
        headers: headers() // Token verifiserer at brukeren har lov til å slette
    });

    if (!res.ok) return alert("Kunne ikke slette notatet");
    hentNotater(); // Oppdaterer visningen etter sletting
}

// ─── FUNKSJON: Legg til oppgave i den midlertidige listen ────────────────────
// Kjøres lokalt – ingen server-kall her, bare oppdaterer midlertidigOppgaver-arrayet
function leggTilOppgave() {
    const input = document.getElementById("oppgaveInput");
    if (!input.value.trim()) return; // Tomme oppgaver avvises

    // Legger til et oppgave-objekt i det midlertidige arrayet
    // ferdig=false betyr oppgaven ikke er utført ennå
    midlertidigOppgaver.push({ tekst: input.value.trim(), ferdig: false });
    input.value = ""; // Tømmer inputfeltet for neste oppgave

    visOppgaver(); // Oppdaterer den lokale forhåndsvisningen
}

// ─── FUNKSJON: Vis midlertidige oppgaver i forhåndsvisningen ─────────────────
// Tegner listen på nytt basert på midlertidigOppgaver-arrayet (kun lokal visning)
function visOppgaver() {
    const liste = document.getElementById("oppgaveListe");
    liste.innerHTML = ""; // Tømmer og tegner på nytt
    midlertidigOppgaver.forEach(o => {
        const li = document.createElement("li");
        li.textContent = o.tekst; // Viser kun teksten (ferdig-status er alltid false her)
        liste.appendChild(li);
    });
}

// ─── FUNKSJON: Lagre ny todo-liste ────────────────────────────────────────────
// POST /todos → sender tittel + oppgave-array til server som lagrer det i DB
async function lagreTodo() {
    const tittel = document.getElementById("todoTittel").value;

    if (!tittel || midlertidigOppgaver.length === 0)
        return alert("Legg til tittel og minst én oppgave"); // Validering: ikke lagre tom liste

    const res = await fetch(API + "/todos", {
        method: "POST",
        headers: headers(),
        // Sender tittel og oppgave-arrayet – server konverterer til JSON-streng i DB
        body: JSON.stringify({ tittel, oppgaver: midlertidigOppgaver })
    });

    if (!res.ok) {
        const data = await res.json();
        return alert(data.error);
    }

    midlertidigOppgaver = []; // Nullstiller arrayet – neste liste starter friskt
    visOppgaver();            // Tømmer forhåndsvisningen i UI
    document.getElementById("todoTittel").value = "";

    hentTodos(); // Henter oppdatert liste fra server og viser den nye todo-listen
}

// ─── FUNKSJON: Hent alle todo-lister fra serveren ─────────────────────────────
// GET /todos → server returnerer alle lister med oppgaver (oppgaver er allerede parset til array)
async function hentTodos() {
    const res  = await fetch(API + "/todos", { headers: headers() });
    if (!res.ok) return;

    const data = await res.json(); // Array av { id, tittel, oppgaver: [{tekst, ferdig}] }

    const liste = document.getElementById("todoListe");
    liste.innerHTML = ""; // Tømmer listen før oppdatering

    data.forEach(todo => {
        const li = document.createElement("li");

        // Bygger HTML for hver oppgave med checkbox og slett-knapp
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
            // onchange → PATCH til server som snur ferdig-status
            // onclick  → DELETE til server som fjerner oppgaven
        });

        li.innerHTML = `
            <strong>${todo.tittel}</strong>
            <button onclick="slettTodo(${todo.id})">Slett liste</button>
            ${oppgaverHTML}
        `;
        liste.appendChild(li);
    });
}

// ─── FUNKSJON: Toggle ferdig/ikke-ferdig ──────────────────────────────────────
// PATCH /todos/:todoId/oppgaver/:index → server snur ferdig-flagget og lagrer tilbake i DB
async function toggleOppgave(todoId, index) {
    const res = await fetch(`${API}/todos/${todoId}/oppgaver/${index}`, {
        method: "PATCH",  // PATCH = delvis oppdatering (kun ferdig-statusen endres)
        headers: headers()
    });
    if (!res.ok) return alert("Kunne ikke oppdatere oppgaven");
    hentTodos(); // Tegner listen på nytt med oppdatert status fra server
}

// ─── FUNKSJON: Slett hele todo-listen ─────────────────────────────────────────
// DELETE /todos/:id → server sletter hele listen og alle tilhørende oppgaver
async function slettTodo(id) {
    const res = await fetch(API + "/todos/" + id, {
        method: "DELETE",
        headers: headers()
    });
    if (!res.ok) return alert("Kunne ikke slette todo-listen");
    hentTodos(); // Oppdaterer visningen – den slettede listen forsvinner
}

// ─── FUNKSJON: Slett én oppgave fra en todo-liste ─────────────────────────────
// DELETE /todos/:todoId/oppgaver/:index → server fjerner oppgaven på gitt index og lagrer
async function slettOppgave(todoId, index) {
    const res = await fetch(`${API}/todos/${todoId}/oppgaver/${index}`, {
        method: "DELETE",
        headers: headers()
    });
    if (!res.ok) return alert("Kunne ikke slette oppgaven");
    hentTodos(); // Tegner todo-listen på nytt uten den slettede oppgaven
}