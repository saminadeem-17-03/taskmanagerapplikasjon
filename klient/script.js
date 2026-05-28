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
