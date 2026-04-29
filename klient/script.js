const API = "http://localhost:4000";

let åpenTicketId = null; // Holder styr på hvilken ticket som er åpen i modal
let midlertidigOppgaver = []; // Oppgaver som ikke er lagret ennå

// --- INNLOGGING OG REGISTRERING ---

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

    // Lagre token og info i nettleseren
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
    localStorage.clear(); // Fjerner token og brukerinfo
    document.getElementById("appSide").style.display = "none";
    document.getElementById("innloggingSide").style.display = "block";
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

    hentNotater();
    hentBrukere();
}

// Hjelp: lager headers med token for alle innloggede kall
function headers() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
    };
}

// Sjekk om brukeren allerede er innlogget når siden lastes
window.onload = function() {
    if (localStorage.getItem("token")) {
        visApp();
    }
};

// Bytter mellom de tre sidene (notater, todos, tickets)
function visside(side) {
    document.getElementById("side-notater").style.display = side === "notater" ? "block" : "none";
    document.getElementById("side-todos").style.display = side === "todos" ? "block" : "none";
    document.getElementById("side-tickets").style.display = side === "tickets" ? "block" : "none";

    document.getElementById("navNotater").classList.toggle("aktiv", side === "notater");
    document.getElementById("navTodos").classList.toggle("aktiv", side === "todos");
    document.getElementById("navTickets").classList.toggle("aktiv", side === "tickets");

    if (side === "todos") hentTodos();
    if (side === "tickets") hentTickets();
}

// --- NOTATER ---

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
            <button onclick="åpneKonverter('notat', ${notat.id}, '${escJs(notat.tittel)}', '${escJs(notat.innhold)}')">Send som ticket</button>
        `;
        liste.appendChild(li);
    });
}

async function leggTilNotat() {
    const tittel = document.getElementById("notatTittel").value;
    const innhold = document.getElementById("notatInnhold").value;

    if (!tittel || !innhold) return alert("Fyll inn tittel og innhold");

    await fetch(API + "/notater", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, innhold })
    });

    document.getElementById("notatTittel").value = "";
    document.getElementById("notatInnhold").value = "";
    hentNotater();
}

async function slettNotat(id) {
    await fetch(API + "/notater/" + id, { method: "DELETE", headers: headers() });
    hentNotater();
}

// --- TODO-LISTER ---

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
    const res = await fetch(API + "/todos", { headers: headers() });
    const data = await res.json();

    const liste = document.getElementById("todoListe");
    liste.innerHTML = "";

    data.forEach(todo => {
        const li = document.createElement("li");

        let oppgaverHTML = "";
        todo.oppgaver.forEach((o, index) => {
            oppgaverHTML += `
                <div>
                    <input type="checkbox" ${o.ferdig ? "checked" : ""} onchange="toggleOppgave(${todo.id}, ${index})">
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
        liste.appendChild(li);
    });
}

async function toggleOppgave(todoId, index) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${index}`, { method: "PATCH", headers: headers() });
    hentTodos();
}

async function slettTodo(id) {
    await fetch(API + "/todos/" + id, { method: "DELETE", headers: headers() });
    hentTodos();
}

async function slettOppgave(todoId, index) {
    await fetch(`${API}/todos/${todoId}/oppgaver/${index}`, { method: "DELETE", headers: headers() });
    hentTodos();
}

// --- TICKETS ---

async function hentBrukere() {
    const res = await fetch(API + "/brukere", { headers: headers() });
    const brukere = await res.json();
    const mitBrukernavn = localStorage.getItem("brukernavn");

    const velg = document.getElementById("ticketMottaker");
    velg.innerHTML = '<option value="">Velg mottaker...</option>';

    brukere.filter(b => b.brukernavn !== mitBrukernavn).forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.brukernavn;
        opt.textContent = b.navn + " (" + b.brukernavn + ")";
        velg.appendChild(opt);
    });
}

async function sendTicket() {
    const tittel = document.getElementById("ticketTittel").value;
    const innhold = document.getElementById("ticketInnhold").value;
    const tilBrukernavn = document.getElementById("ticketMottaker").value;

    if (!tittel || !innhold || !tilBrukernavn) return alert("Fyll inn alle felt");

    await fetch(API + "/tickets", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, innhold, tilBrukernavn })
    });

    document.getElementById("ticketTittel").value = "";
    document.getElementById("ticketInnhold").value = "";
    document.getElementById("ticketMottaker").value = "";
    hentTickets();
}

async function hentTickets() {
    const res = await fetch(API + "/tickets", { headers: headers() });
    const tickets = await res.json();
    const mittBrukernavn = localStorage.getItem("brukernavn");

    const innboks = tickets.filter(t => t.tilBrukernavn === mittBrukernavn);
    const sendt = tickets.filter(t => t.fraBrukernavn === mittBrukernavn);

    // Oppdater badge med antall åpne tickets
    const åpne = innboks.filter(t => t.status === "åpen").length;
    const teller = document.getElementById("ticketTeller");
    teller.textContent = åpne;
    teller.style.display = åpne > 0 ? "inline" : "none";

    visnTickets("innboks", innboks, "fra");
    visnTickets("sendt", sendt, "til");
}

function visnTickets(elementId, tickets, retning) {
    const liste = document.getElementById(elementId);
    liste.innerHTML = "";

    if (tickets.length === 0) {
        liste.innerHTML = "<li style='color:#999'>Ingen tickets</li>";
        return;
    }

    tickets.forEach(t => {
        const li = document.createElement("li");

        let statusKlasse = "status-åpen";
        if (t.status === "under arbeid") statusKlasse = "status-under";
        if (t.status === "lukket") statusKlasse = "status-lukket";

        li.innerHTML = `
            <strong>${t.tittel}</strong>
            <span class="${statusKlasse}">[${t.status}]</span>
            <br>
            <small>${retning === "fra" ? "Fra: " + t.fraNavn : "Til: " + t.tilNavn}</small>
            ${t.svar.length > 0 ? " · " + t.svar.length + " svar" : ""}
            <br>
            <button onclick="åpneTicket(${t.id})">Åpne</button>
            ${retning === "fra" ? `<button onclick="slettTicket(${t.id})">Slett</button>` : ""}
        `;
        liste.appendChild(li);
    });
}

async function åpneTicket(id) {
    åpenTicketId = id;

    const res = await fetch(API + "/tickets", { headers: headers() });
    const tickets = await res.json();
    const ticket = tickets.find(t => t.id === id);

    document.getElementById("modalTittel").textContent = ticket.tittel;
    document.getElementById("modalInnhold").textContent = ticket.innhold;
    document.getElementById("modalInfo").textContent = "Fra: " + ticket.fraNavn + " → " + ticket.tilNavn;
    document.getElementById("modalStatus").value = ticket.status;

    const svarListe = document.getElementById("svarListe");
    svarListe.innerHTML = "";

    if (ticket.svar.length === 0) {
        svarListe.innerHTML = "<li style='color:#999'>Ingen svar ennå</li>";
    } else {
        // Hent egen bruker-id fra token
        const token = localStorage.getItem("token");
        const payload = JSON.parse(atob(token.split(".")[1]));

        ticket.svar.forEach(s => {
            const li = document.createElement("li");
            li.className = s.fraId === payload.id ? "eget-svar" : "";
            li.innerHTML = "<strong>" + s.fraNavn + ":</strong> " + s.melding;
            svarListe.appendChild(li);
        });
    }

    document.getElementById("modal").style.display = "flex";
}

function lukkModal() {
    document.getElementById("modal").style.display = "none";
    åpenTicketId = null;
}

async function endreStatus() {
    const status = document.getElementById("modalStatus").value;
    await fetch(API + "/tickets/" + åpenTicketId + "/status", {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ status })
    });
    hentTickets();
}

async function sendSvar() {
    const melding = document.getElementById("svarInput").value;
    if (!melding) return;

    await fetch(API + "/tickets/" + åpenTicketId + "/svar", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ melding })
    });

    document.getElementById("svarInput").value = "";
    åpneTicket(åpenTicketId); // Oppdater modal
    hentTickets();
}

async function slettTicket(id) {
    await fetch(API + "/tickets/" + id, { method: "DELETE", headers: headers() });
    hentTickets();
}

// --- KONVERTER NOTAT/TODO TIL TICKET ---

let konvertData = {}; // Midlertidig lagring av hva som skal konverteres

function åpneKonverter(type, id, tittel, innhold) {
    konvertData = { type, id, tittel, innhold };

    // Vis en enkel prompt med brukervalg
    const mottaker = prompt("Send som ticket til hvem? Skriv brukernavn:");
    if (!mottaker) return;

    fetch(API + "/tickets", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ tittel, innhold, tilBrukernavn: mottaker })
    }).then(res => {
        if (res.ok) {
            alert("Ticket sendt!");
        } else {
            alert("Fant ikke brukeren.");
        }
    });
}

// Hindrer XSS – escaper tekst som brukes i onclick-attributter
function escJs(str) {
    if (!str) return "";
    return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}