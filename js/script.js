"use strict";

const BACKEND = window.YUSSER_BACKEND === true;
const STORE_KEYS = { booking: "yusser_bookings", contact: "yusser_contacts" };
const PRICES = { gold: 30000, silver: 15000, economy: 8000 };

/* ---------- helpers ---------- */
function readStore(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
}

function writeStore(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); return true; }
    catch (e) { return false; }
}

function formToObject(form) {
    const data = {};
    new FormData(form).forEach(function (value, key) { data[key] = String(value).trim(); });
    return data;
}

function showStatus(message, isError) {
    const box = document.getElementById("formStatus");
    if (!box) { window.alert(message); return; }
    box.textContent = message;
    box.classList.toggle("error", !!isError);
    box.hidden = false;
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    box.focus({ preventScroll: true });
}

function formatDate(value) {
    const d = new Date(value);
    if (isNaN(d)) { return value || ""; }
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

/* ---------- validation (same rules as the server) ---------- */
const NAME_RE = /^[\p{L} ]{2,30}$/u;
const MOBILE_RE = /^[0-9]{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateCommon(d, errors, nameFields) {
    nameFields.forEach(function (f) {
        if (!NAME_RE.test(d[f.name] || "")) { errors.push(f.label + " must be 2-30 letters"); }
    });
    if (!MOBILE_RE.test(d.mobile || "")) { errors.push("Mobile must be exactly 10 digits"); }
    if (!EMAIL_RE.test(d.email || "")) { errors.push("Email format is wrong"); }
    if (!d.dob) { errors.push("Date of birth is required"); }
    else if (new Date(d.dob) > new Date()) { errors.push("Date of birth cannot be in the future"); }
}

function validateBooking(d) {
    const errors = [];
    validateCommon(d, errors, [{ name: "fullname", label: "Full name" }]);
    if (!PRICES[d.campaign_selection]) { errors.push("Please select a campaign"); }
    if (!d.trip_type) { errors.push("Trip type is required"); }
    if (!d.guide_language) { errors.push("Guide language is required"); }
    return errors;
}

function validateContact(d) {
    const errors = [];
    validateCommon(d, errors, [
        { name: "first_name", label: "First name" },
        { name: "last_name", label: "Last name" }
    ]);
    if (!d.gender) { errors.push("Gender is required"); }
    if (!d.language) { errors.push("Service language is required"); }
    if (!d.message || d.message.length < 5) { errors.push("Message must be at least 5 characters"); }
    return errors;
}

/* ---------- mobile menu ---------- */
(function () {
    const btn = document.querySelector(".menu-btn");
    const nav = document.getElementById("nav");
    if (!btn || !nav) { return; }
    btn.addEventListener("click", function () {
        const open = nav.classList.toggle("open");
        btn.setAttribute("aria-expanded", String(open));
    });
})();

/* ---------- campaign summary on the booking page ---------- */
function showSummary(key) {
    const info = window.CAMPAIGNS && window.CAMPAIGNS[key];
    const empty = document.getElementById("sumEmpty");
    const body = document.getElementById("sumBody");
    if (!empty || !body) { return; }
    empty.hidden = !!info;
    body.hidden = !info;
    if (!info) { return; }
    document.getElementById("sumName").textContent = info.name;
    document.getElementById("sumPrice").textContent = info.price.toLocaleString("en-US");
    const dl = document.getElementById("sumSpecs");
    dl.replaceChildren();
    info.rows.forEach(function (row) {
        const wrap = document.createElement("div");
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = row[0];
        dd.textContent = row[1];
        wrap.append(dt, dd);
        dl.appendChild(wrap);
    });
}

/* ---------- forms ---------- */
function setupForm(form, validate, onValid) {
    form.addEventListener("submit", function (e) {
        const data = formToObject(form);
        const errors = validate(data);

        if (errors.length > 0) {
            e.preventDefault();
            showStatus("Please fix the following:\n- " + errors.join("\n- "), true);
            return;
        }
        if (BACKEND) { return; }          // let the browser post to the server

        e.preventDefault();               // static mode: keep it in the browser
        onValid(data, form);
    });
}

const bookingForm = document.querySelector(".form.booking-form");
if (bookingForm) {
    const select = document.getElementById("campaign_type");
    const wanted = new URLSearchParams(location.search).get("campaign");
    if (wanted && PRICES[wanted]) { select.value = wanted; }   // coming from the Campaigns page
    showSummary(select.value);
    select.addEventListener("change", function () { showSummary(select.value); });

    setupForm(bookingForm, validateBooking, function (d, form) {
        const list = readStore(STORE_KEYS.booking);
        list.push(Object.assign({ created_at: new Date().toISOString() }, d));
        if (!writeStore(STORE_KEYS.booking, list)) {
            showStatus("Could not save your booking (browser storage is disabled).", true);
            return;
        }
        showStatus(
            "Thank you " + d.fullname + "!\n" +
            "Your booking for the " + capitalize(d.campaign_selection) + " campaign (" + d.trip_type + ") is confirmed.\n" +
            "Starting price: " + PRICES[d.campaign_selection].toLocaleString("en-US") + " SAR.",
            false
        );
        form.reset();
        showSummary("");
    });
}

const contactForm = document.querySelector(".form.contact-form");
if (contactForm) {
    setupForm(contactForm, validateContact, function (d, form) {
        const list = readStore(STORE_KEYS.contact);
        list.push(Object.assign({ created_at: new Date().toISOString() }, d));
        if (!writeStore(STORE_KEYS.contact, list)) {
            showStatus("Could not save your message (browser storage is disabled).", true);
            return;
        }
        showStatus("Thank you " + d.first_name + " " + d.last_name + "!\nWe have received your message and will respond as soon as possible.", false);
        form.reset();
    });
}

/* ---------- bookings table ---------- */
const bookingTable = document.getElementById("bookingTable");
if (bookingTable) {
    const tbody = bookingTable.querySelector("tbody");
    const emptyMsg = document.getElementById("emptyMsg");
    const modeNote = document.getElementById("modeNote");
    const count = document.getElementById("count");
    const search = document.getElementById("search");
    let rowsData = [];

    const render = function () {
        const q = search.value.trim().toLowerCase();
        const shown = rowsData.filter(function (item) {
            return !q || [item.fullname, item.email, item.campaign_selection, item.trip_type, item.mobile]
                .join(" ").toLowerCase().indexOf(q) !== -1;
        });
        tbody.replaceChildren();
        shown.forEach(function (item) {
            const tr = document.createElement("tr");
            [
                item.fullname,
                item.mobile,
                item.email,
                formatDate(item.dob),
                capitalize(item.campaign_selection),
                item.trip_type,
                item.guide_language,
                item.special_requests
            ].forEach(function (value, i) {
                const td = document.createElement("td");
                if (i === 3) { td.className = "date"; }
                td.textContent = value == null ? "" : value;   // textContent => no HTML injection
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        const none = rowsData.length === 0;
        emptyMsg.hidden = !none;
        bookingTable.parentElement.hidden = none;
        search.parentElement.hidden = none;
        count.textContent = none ? "" :
            (q ? shown.length + " of " + rowsData.length + " bookings" : rowsData.length + (rowsData.length === 1 ? " booking" : " bookings"));
    };

    search.addEventListener("input", render);

    if (BACKEND) {
        fetch("/viewBooking")
            .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
            .then(function (data) { rowsData = data; render(); })
            .catch(function (err) {
                console.error(err);
                emptyMsg.querySelector("p").textContent = "Could not load bookings from the server.";
                emptyMsg.hidden = false;
            });
    } else {
        rowsData = readStore(STORE_KEYS.booking);
        render();
        modeNote.textContent = "Demo mode: bookings shown here are stored only in this browser.";
        modeNote.hidden = false;
    }
}
