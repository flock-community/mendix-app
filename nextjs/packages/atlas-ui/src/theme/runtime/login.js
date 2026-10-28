// Drives theme/web/login.html the way the Mendix runtime's login.js does: it
// posts the credentials to xas/ as a "login" action and, once signed in, goes
// to the page in ?cont= or to the app's home page.
(function () {
    "use strict";

    var texts = (window.loginI18n || {})[(document.documentElement.lang || "en_US").replace("-", "_")] || (window.loginI18n || {}).en_US || {};
    var form = document.getElementById("loginForm");
    var username = document.getElementById("usernameInput");
    var password = document.getElementById("passwordInput");
    var button = document.getElementById("loginButton");
    var message = document.getElementById("loginMessage");

    function setText(id, attribute) {
        var element = document.getElementById(id);
        if (!element || !texts[id]) return;
        if (attribute) element.setAttribute(attribute, texts[id]);
        else element.textContent = texts[id];
    }
    setText("loginHeader");
    setText("usernameLabel");
    setText("passwordLabel");
    setText("usernameInput", "placeholder");
    setText("passwordInput", "placeholder");
    setText("loginButton");

    function continuation() {
        var match = /[?&]cont=([^&#]*)/.exec(window.location.search);
        var target = match ? decodeURIComponent(match[1]) : "";
        // Only same-site paths, never an absolute URL.
        return /^\/(?!\/)/.test(target) ? target : "./";
    }

    function showMessage(text) {
        message.textContent = text;
        message.style.display = "block";
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        message.style.display = "none";
        button.disabled = true;
        fetch("xas/", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "login", params: { username: username.value, password: password.value } })
        })
            .then(function (response) {
                if (response.ok) {
                    window.location.replace(continuation());
                    return;
                }
                button.disabled = false;
                if (response.status === 401) showMessage(texts.invalidCredentials);
                else if (response.status === 403) showMessage(texts.blocked);
                else showMessage(texts.unavailable);
            })
            .catch(function () {
                button.disabled = false;
                showMessage(texts.unavailable);
            });
    });

    username.focus();
})();
