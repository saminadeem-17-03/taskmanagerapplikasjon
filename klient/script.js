// ======================================================
// NY KODE (lagt til av AI): API-URL og globale variabler
// ======================================================
const API = "http://localhost:4000"; // Adressen til backend-serveren

let åpenTicketId = null;         // Husker hvilken ticket som er åpen i modal
let midlertidigOppgaver = [];    // Holder oppgaver midlertidig før todo lagres
// SLUTT NY KODE: globale variabler


// ======================================================
// NY KODE (lagt til av AI): INNLOGGING OG REGISTRERING
// ======================================================

// Logger inn brukeren og lagrer token i nettleseren
async function loggInn() {
    const brukernavn = document.getElementById("innBrukernavn").value; // Henter brukernavn fra input
    const passord = document.getElementById("innPassord").value;       // Henter passord fra input

    const res = await fetch(API + "/login", {  // Sender POST til /login
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brukernavn, passord }) // Sender data som JSON
    });

    const data = await res.json(); // Gjør svar om til JS-objekt

    if (!res.ok) {
        document.getElementById("innFeil").textContent = data.error; // Vis feilmelding
        return;
    }

    localStorage.setItem("token", data.token);           // Lagrer token (holder deg innlogget)
    localStorage.setItem("navn", data.navn);             // Lagrer navn for visning
    localStorage.setItem("brukernavn", data.brukernavn); // Lagrer brukernavn

    visApp(); // Bytt til appen
}

// Registrerer ny bruker
async function registrer() {
    const navn = document.getElementById("regNavn").value;              // Henter fullt navn
    const brukernavn = document.getElementById("regBrukernavn").value;  // Henter brukernavn
    const passord = document.getElementById("regPassord").value;        // Henter passord

    const res = await fetch(API + "/register", { // Sender POST til /register
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ navn, brukernavn, passord })
    });

    const data = await res.json();

    if (!res.ok) {
        document.getElementById("regFeil").textContent = data.error; // Vis feilmelding
        return;
    }

    document.getElementById("regOK").textContent = "Bruker opprettet! Du kan nå logge inn."; // Suksessmelding
    visFane("loggInn"); // Bytt til innloggingsfanen
}

// Logger ut brukeren: sletter all info og viser innloggingssiden
function loggUt() {
    localStorage.clear();                                                    // Fjerner token og brukerinfo
    document.getElementById("appSide").style.display = "none";              // Skjuler appen
    document.getElementById("innloggingSide").style.display = "block";      // Viser innlogging
    document.getElementById("innBrukernavn").value = "";                    // Tømmer brukernavn-felt
    document.getElementById("innPassord").value = "";                       // Tømmer passord-felt
    document.getElementById("innFeil").textContent = "";                    // Nullstiller feilmelding
}

// Bytter mellom Logg inn og Registrer-fanene
function visFane(navn) {
    document.getElementById("loggInn").style.display = navn === "loggInn" ? "block" : "none";     // Vis/skjul innlogging
    document.getElementById("registrer").style.display = navn === "registrer" ? "block" : "none"; // Vis/skjul registrering
    document.getElementById("fanLoggInn").classList.toggle("aktiv", navn === "loggInn");           // Aktiv-stil på fane
    document.getElementById("fanRegistrer").classList.toggle("aktiv", navn === "registrer");       // Aktiv-stil på fane
}

// Viser appen etter innlogging og laster inn brukerens data på nytt
function visApp() {
    document.getElementById("innloggingSide").style.display = "none";  // Skjul innlogging
    document.getElementById("appSide").style.display = "block";        // Vis app
    document.getElementById("velkomstTekst").textContent = "Hei, " + localStorage.getItem("navn"); // Vis navn

    // FIX: Nullstiller alle lister før ny brukers data lastes inn
    // Dette løser problemet med at forrige brukers data vises
    document.getElementById("notatListe").innerHTML = "";  // Tøm notatliste
    document.getElementById("todoListe").innerHTML = "";   // Tøm todo-liste
    document.getElementById("innboks").innerHTML = "";     // Tøm ticket-innboks
    document.getElementById("sendt").innerHTML = "";       // Tøm sendte tickets

    visside("notater"); // Vis notater-siden som standard
    hentBrukere();      // Last inn brukerliste for ticket-sending
}

// Sjekker om brukeren allerede er innlogget når siden lastes
window.onload = function() {
    if (localStorage.getItem("token")) { // Hvis token finnes i nettleseren
        visApp();                        // Gå rett inn i appen
    }
};

// Lager headers med Authorization-token for alle innloggede API-kall
function headers() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token") // Token sendes med for å bevise innlogging
    };
}
// SLUTT NY KODE: innlogging og registrering


// ======================================================
// NY KODE (lagt til av AI): NAVIGASJON
// ======================================================

// Bytter mellom de tre sidene og laster riktig innhold
function visside(side) {
    // Vis kun riktig seksjon, skjul de andre
    document.getElementById("side-notater").style.display = side === "notater" ? "block" : "none";
    document.getElementById("side-todos").style.display   = side === "todos"   ? "block" : "none";
    document.getElementById("side-tickets").style.display = side === "tickets" ? "block" : "none";

    // Oppdater hvilken nav-knapp som ser aktiv ut
    document.getElementById("navNotater").classList.toggle("aktiv", side === "notater");
    document.getElementById("navTodos").classList.toggle("aktiv",   side === "todos");
    document.getElementById("navTickets").classList.toggle("aktiv", side === "tickets");

    // Last inn data for den valgte siden
    if (side === "notater") hentNotater();
    if (side === "todos")   hentTodos();
    if (side === "tickets") hentTickets();
}
// SLUTT NY KODE: navigasjon


// ======================================================
// DIN OPPRINNELIGE KODE: NOTATER
// (Justert til å bruke /notater og auth-headers)
// ======================================================

// Henter alle notater for innlogget bruker
async function hentNotater() {
    const res = await fetch(API + "/notater", { headers: headers() }); // GET til /notater med token
    const data = await res.json();                                       // Gjør svar om til array

    const liste = document.getElementById("notatListe"); // Henter liste-elementet
    liste.innerHTML = "";                                 // Tømmer listen

    data.forEach(notat => {               // Går gjennom hvert notat
        const li = document.createElement("li"); // Lager listeelement
        li.innerHTML = `
            <strong>${notat.tittel}</strong><br>
            ${notat.innhold}
            <br>
            <button onclick="slettNotat(${notat.id})">Slett</button>
            <button onclick="åpneKonverter('notat', ${notat.id}, '${escJs(notat.tittel)}', '${escJs(notat.innhold)}')">Send som ticket</button>
        `;
        liste.appendChild(li); // Legger til i DOM
    });
}

// Legger til nytt notat
async function leggTilNotat() {
    const tittel  = document.getElementById("notatTittel").value;   // Henter tittel
    const innhold = document.getElementById("notatInnhold").value;  // Henter innhold

    if (!tittel || !innhold) return alert("Fyll inn tittel og innhold"); // Stopp hvis tomt

    await fetch(API + "/notater", {  // POST til /notater
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, innhold })
    });

    document.getElementById("notatTittel").value  = ""; // Tøm tittel-felt
    document.getElementById("notatInnhold").value = ""; // Tøm innhold-felt
    hentNotater(); // Oppdater listen
}

// Sletter et notat
async function slettNotat(id) {
    await fetch(API + "/notater/" + id, { method: "DELETE", headers: headers() }); // DELETE med token
    hentNotater(); // Oppdater listen
}
// SLUTT DIN KODE: notater


// ======================================================
// DIN OPPRINNELIGE KODE: TODO-LISTER
// (Justert til å bruke /todos og auth-headers)
// ======================================================

// Legger til en oppgave i den midlertidige listen
function leggTilOppgave() {
    const input = document.getElementById("oppgaveInput"); // Henter input-feltet
    if (!input.value) return;                              // Stopp hvis tomt

    midlertidigOppgaver.push({ tekst: input.value, ferdig: false }); // Legg til i arrayet
    input.value = "";  // Tøm inputfeltet
    visOppgaver();     // Oppdater visningen
}

// Viser midlertidige oppgaver i skjema-listen
function visOppgaver() {
    const liste = document.getElementById("oppgaveListe"); // Henter liste
    liste.innerHTML = "";                                   // Tøm listen
    midlertidigOppgaver.forEach(o => {       // Gå gjennom oppgavene
        const li = document.createElement("li");
        li.textContent = o.tekst;            // Vis oppgaveteksten
        liste.appendChild(li);
    });
}

// Lagrer todo-listen til serveren
async function lagreTodo() {
    const tittel = document.getElementById("todoTittel").value; // Henter tittel
    if (!tittel || midlertidigOppgaver.length === 0) return alert("Legg til tittel og minst én oppgave");

    await fetch(API + "/todos", {  // POST til /todos
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, oppgaver: midlertidigOppgaver }) // Sender tittel og oppgaver
    });

    midlertidigOppgaver = [];       // Nullstill midlertidig liste
    visOppgaver();                  // Tøm visningen
    document.getElementById("todoTittel").value = ""; // Tøm tittelfeltet
    hentTodos();                    // Oppdater todo-listen
}

// Henter alle todo-lister for innlogget bruker
async function hentTodos() {
    const res  = await fetch(API + "/todos", { headers: headers() }); // GET med token
    const data = await res.json();

    const liste = document.getElementById("todoListe"); // Henter liste
    liste.innerHTML = "";                                // Tøm listen

    data.forEach(todo => {               // Gå gjennom todos
        const li = document.createElement("li");

        let oppgaverHTML = "";           // Samler HTML for oppgavene
        todo.oppgaver.forEach((o, index) => {  // Gå gjennom oppgavene
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
            <button onclick="åpneKonverter('todo', ${todo.id}, '${escJs(todo.tittel)}', 'Todo-liste med ${todo.oppgaver.length} oppgaver')">Send som ticket</button>
            ${oppgaverHTML}
        `;
        liste.appendChild(li); // Legg til i DOM
    });
}

// Endrer ferdig-status på en oppgave
async function toggleOppgave(todoId, index) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${index}`, { // PATCH til riktig oppgave
        method: "PATCH",
        headers: headers()
    });
    hentTodos(); // Oppdater visningen
}

// Sletter hele todo-listen
async function slettTodo(id) {
    await fetch(API + "/todos/" + id, { method: "DELETE", headers: headers() }); // DELETE
    hentTodos(); // Oppdater
}

// Sletter en enkelt oppgave fra todo-listen
async function slettOppgave(todoId, index) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${index}`, { // DELETE til riktig oppgave
        method: "DELETE",
        headers: headers()
    });
    hentTodos(); // Oppdater
}
// SLUTT DIN KODE: todos


// ======================================================
// NY KODE (lagt til av AI): TICKETS
// ======================================================

// Henter alle brukere og fyller dropdown for mottaker
async function hentBrukere() {
    const res = await fetch(API + "/brukere", { headers: headers() }); // GET med token
    const brukere = await res.json();
    const mittBrukernavn = localStorage.getItem("brukernavn"); // Eget brukernavn

    const velg = document.getElementById("ticketMottaker"); // Dropdown-elementet
    velg.innerHTML = '<option value="">Velg mottaker...</option>'; // Nullstill

    brukere
        .filter(b => b.brukernavn !== mittBrukernavn)  // Ikke vis deg selv
        .forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.brukernavn;                              // Verdien som sendes
            opt.textContent = b.navn + " (" + b.brukernavn + ")"; // Teksten som vises
            velg.appendChild(opt);
        });
}

// Sender en ny ticket
async function sendTicket() {
    const tittel        = document.getElementById("ticketTittel").value;    // Henter tittel
    const innhold       = document.getElementById("ticketInnhold").value;   // Henter innhold
    const tilBrukernavn = document.getElementById("ticketMottaker").value;  // Henter mottaker

    if (!tittel || !innhold || !tilBrukernavn) return alert("Fyll inn alle felt"); // Valider

    const res = await fetch(API + "/tickets", {  // POST til /tickets
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, innhold, tilBrukernavn })
    });

    if (!res.ok) { alert("Fant ikke brukeren"); return; } // Vis feil hvis mottaker ikke finnes

    document.getElementById("ticketTittel").value   = ""; // Tøm tittelfeltet
    document.getElementById("ticketInnhold").value  = ""; // Tøm innholdsfeltet
    document.getElementById("ticketMottaker").value = ""; // Nullstill dropdown
    hentTickets(); // Oppdater listen
}

// Henter og viser alle tickets for innlogget bruker
async function hentTickets() {
    const res = await fetch(API + "/tickets", { headers: headers() }); // GET med token
    const tickets = await res.json();
    const mittBrukernavn = localStorage.getItem("brukernavn"); // Eget brukernavn

    const innboks = tickets.filter(t => t.tilBrukernavn === mittBrukernavn);  // Mottatte tickets
    const sendt   = tickets.filter(t => t.fraBrukernavn === mittBrukernavn); // Sendte tickets

    // Oppdater badge-teller med antall åpne tickets i innboks
    const åpne = innboks.filter(t => t.status === "åpen").length;
    const teller = document.getElementById("ticketTeller");
    teller.textContent  = åpne;                                          // Oppdater tallet
    teller.style.display = åpne > 0 ? "inline" : "none";                // Vis/skjul badge

    visTickets("innboks", innboks, "fra");   // Vis innboks
    visTickets("sendt",   sendt,   "til");   // Vis sendt
}

// Bygger og viser ticket-listen i et gitt element
function visTickets(elementId, tickets, retning) {
    const liste = document.getElementById(elementId); // Henter liste-elementet
    liste.innerHTML = "";                              // Tøm listen

    if (tickets.length === 0) { // Vis melding hvis ingen tickets
        liste.innerHTML = "<li style='color:#999'>Ingen tickets</li>";
        return;
    }

    tickets.forEach(t => {
        const li = document.createElement("li");

        // Velg CSS-klasse basert på status
        let statusKlasse = "status-åpen";
        if (t.status === "under arbeid") statusKlasse = "status-under";
        if (t.status === "lukket")       statusKlasse = "status-lukket";

        li.innerHTML = `
            <strong>${t.tittel}</strong>
            <span class="${statusKlasse}">[${t.status}]</span><br>
            <small>${retning === "fra" ? "Fra: " + t.fraNavn : "Til: " + t.tilNavn}</small>
            ${t.svar.length > 0 ? " · " + t.svar.length + " svar" : ""}
            <br>
            <button onclick="åpneTicket(${t.id})">Åpne</button>
            <button onclick="slettTicket(${t.id})">Slett</button>
        `;
        // FIX: Begge parter (avsender og mottaker) kan nå slette tickets
        liste.appendChild(li); // Legg til i DOM
    });
}

// Åpner ticket i modal og viser innhold og svar
async function åpneTicket(id) {
    åpenTicketId = id; // Husk hvilken ticket som er åpen

    const res = await fetch(API + "/tickets", { headers: headers() }); // Hent alle tickets
    const tickets = await res.json();
    const ticket = tickets.find(t => t.id === id); // Finn riktig ticket

    document.getElementById("modalTittel").textContent  = ticket.tittel;  // Vis tittel
    document.getElementById("modalInnhold").textContent = ticket.innhold; // Vis innhold
    document.getElementById("modalInfo").textContent    = "Fra: " + ticket.fraNavn + " → " + ticket.tilNavn; // Vis avsender/mottaker
    document.getElementById("modalStatus").value        = ticket.status;  // Vis nåværende status

    // Vis svar-historikk
    const svarListe = document.getElementById("svarListe");
    svarListe.innerHTML = "";

    if (ticket.svar.length === 0) {
        svarListe.innerHTML = "<li style='color:#999'>Ingen svar ennå</li>"; // Vis melding hvis ingen svar
    } else {
        // Hent bruker-id fra JWT-token (for å markere egne svar)
        const token = localStorage.getItem("token");
        const payload = JSON.parse(atob(token.split(".")[1])); // Dekoder token-payload

        ticket.svar.forEach(s => {
            const li = document.createElement("li");
            li.className = s.fraId === payload.id ? "eget-svar" : ""; // Blå bakgrunn på egne svar
            li.innerHTML = "<strong>" + s.fraNavn + ":</strong> " + s.melding;
            svarListe.appendChild(li);
        });
    }

    document.getElementById("modal").style.display = "flex"; // Vis modal
}

// Lukker modal-vinduet
function lukkModal() {
    document.getElementById("modal").style.display = "none"; // Skjul modal
    åpenTicketId = null;                                       // Nullstill åpen ticket
}

// Oppdaterer status på ticket
async function endreStatus() {
    const status = document.getElementById("modalStatus").value; // Henter valgt status
    await fetch(API + "/tickets/" + åpenTicketId + "/status", {  // PATCH til riktig ticket
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ status })
    });
    hentTickets(); // Oppdater listen
}

// Sender svar på åpen ticket
async function sendSvar() {
    const melding = document.getElementById("svarInput").value; // Henter svar-teksten
    if (!melding) return;                                         // Stopp hvis tomt

    await fetch(API + "/tickets/" + åpenTicketId + "/svar", {   // POST til /svar
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ melding })
    });

    document.getElementById("svarInput").value = ""; // Tøm svar-feltet
    åpneTicket(åpenTicketId);                         // Oppdater modal med nytt svar
    hentTickets();                                     // Oppdater liste
}

// Sletter en ticket
async function slettTicket(id) {
    await fetch(API + "/tickets/" + id, { method: "DELETE", headers: headers() }); // DELETE med token
    hentTickets(); // Oppdater listen
}

// Åpner konverter-dialog: lar bruker velge mottaker og sender notat/todo som ticket
function åpneKonverter(type, id, tittel, innhold) {
    const mottaker = prompt("Send som ticket til hvem? Skriv brukernavn:"); // Enkel prompt
    if (!mottaker) return;                                                    // Avbryt hvis tomt

    fetch(API + "/tickets", {  // POST ny ticket
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, innhold, tilBrukernavn: mottaker })
    }).then(res => {
        if (res.ok) alert("Ticket sendt!");   // Suksess
        else alert("Fant ikke brukeren.");    // Feil
    });
}
// SLUTT NY KODE: tickets


// ======================================================
// NY KODE (lagt til av AI): HJELPEFUNKSJON
// ======================================================

// Escaper tekst som brukes inne i onclick="..." for å unngå feil med spesialtegn
function escJs(str) {
    if (!str) return "";
    return str
        .replace(/\\/g, "\\\\") // Escaper bakover-skråstrek
        .replace(/'/g, "\\'")   // Escaper enkelt anførselstegn
        .replace(/\n/g, "\\n"); // Escaper linjeskift
}
// SLUTT NY KODE: hjelpefunksjon