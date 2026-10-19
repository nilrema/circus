/* ============================================================
   THE CIRCUS — site behaviour
   Theme · archive views · search · keyboard · reveal · motion
   ============================================================ */

(function () {
    "use strict";

    var mq = window.matchMedia ? window.matchMedia.bind(window) : null;
    var reduceMotion = mq ? mq("(prefers-reduced-motion: reduce)").matches : false;
    var inEditions = /\/editions\//.test(window.location.pathname);

    /* ---------- editions ---------- */

    // Newest first.
    var EDITIONS = [
        { file: "october-2026-1.html", title: "#05 — High Agency, Basic Economics & Maksimir", month: "Mid October 2026", number: 5 },
        { file: "september-2026-2.html", title: "#04 — Politics, economics, babies.", month: "September 2026", number: 4 },
        { file: "september-2026-1.html", title: "#03 — Adler, movie maps and a very cool restaurant.", month: "Mid September 2026", number: 3 },
        { file: "august-2026.html", title: "#02 — Complex Systems, Mating Strategies, & Pursuit of Greatness", month: "August 2026", number: 2 },
        { file: "july-2026.html", title: "#01 — Peopling, MSG Surveillance, & Modern Sensitivity", month: "July 2026", number: 1 }
    ];

    function normalize(value) {
        return String(value)
            .toLowerCase()
            .replace(/[#.,—–-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    EDITIONS.forEach(function (edition) {
        edition.search = normalize([
            edition.title,
            edition.month,
            "no " + edition.number,
            "edition " + edition.number,
            edition.number
        ].join(" "));
    });

    function editionMatches(edition, query) {
        var q = normalize(query);
        if (!q) {
            return true;
        }

        // "5", "05", "#5", "no. 5" and "edition 5" all mean "the fifth edition".
        var numeric = q.match(/^(?:no|number|edition)?\s*(\d{1,2})$/);
        if (numeric) {
            return parseInt(numeric[1], 10) === edition.number;
        }

        return edition.search.indexOf(q) !== -1;
    }

    function hrefFor(edition) {
        return inEditions ? edition.file : "editions/" + edition.file;
    }

    /* ---------- theme ---------- */

    var THEME_KEY = "circus-theme";
    var THEME_LABEL = { system: "AUTO", light: "LIGHT", dark: "DARK" };
    var root = document.documentElement;

    function currentMode() {
        return root.getAttribute("data-theme-mode") || "system";
    }

    function systemDark() {
        var m = mq ? mq("(prefers-color-scheme: dark)") : null;
        return m ? m.matches : false;
    }

    function updateThemeButtons(mode) {
        var label = THEME_LABEL[mode] || "AUTO";
        document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
            button.textContent = label;
            button.setAttribute("aria-label", "Colour theme: " + label.toLowerCase() + " (activate to change)");
        });
    }

    function applyTheme(mode) {
        var dark = mode === "dark" || (mode === "system" && systemDark());
        root.setAttribute("data-theme", dark ? "dark" : "light");
        root.setAttribute("data-theme-mode", mode);

        // Keep the browser chrome in step with a manual override.
        var themeMeta = document.querySelectorAll('meta[name="theme-color"]');
        Array.prototype.forEach.call(themeMeta, function (meta) {
            meta.removeAttribute("media");
            meta.setAttribute("content", dark ? "#0e0e0e" : "#ffffff");
        });

        try {
            localStorage.setItem(THEME_KEY, mode);
        } catch (e) { /* storage unavailable */ }
        updateThemeButtons(mode);
    }

    function cycleTheme() {
        var order = ["system", "light", "dark"];
        applyTheme(order[(order.indexOf(currentMode()) + 1) % order.length]);
    }

    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
        button.addEventListener("click", cycleTheme);
    });
    updateThemeButtons(currentMode());

    if (mq) {
        var schemeQuery = mq("(prefers-color-scheme: dark)");
        var onSchemeChange = function () {
            if (currentMode() === "system") {
                applyTheme("system");
            }
        };
        if (schemeQuery.addEventListener) {
            schemeQuery.addEventListener("change", onSchemeChange);
        } else if (schemeQuery.addListener) {
            schemeQuery.addListener(onSchemeChange);
        }
    }

    /* ---------- archive views ---------- */

    var views = {
        list: document.getElementById("list-view"),
        seal: document.getElementById("seal-view")
    };
    var viewButtons = {
        list: document.getElementById("btn-list"),
        seal: document.getElementById("btn-seal")
    };
    var hasViews = views.list && views.seal && viewButtons.list && viewButtons.seal;

    function applyView(view) {
        Object.keys(views).forEach(function (name) {
            views[name].hidden = name !== view;
        });
        Object.keys(viewButtons).forEach(function (name) {
            viewButtons[name].setAttribute("aria-pressed", String(name === view));
        });
    }

    function setView(view, persist) {
        if (!hasViews || !views[view]) {
            return;
        }

        var run = function () { applyView(view); };

        if (document.startViewTransition && !reduceMotion) {
            document.startViewTransition(run);
        } else {
            run();
        }

        if (persist) {
            try {
                localStorage.setItem("circus-view", view);
            } catch (e) { /* storage unavailable */ }
            try {
                history.replaceState(null, "", view === "seal" ? "#seals" : "#archive");
            } catch (e) { /* history unavailable */ }
        }
    }

    if (hasViews) {
        viewButtons.list.addEventListener("click", function () { setView("list", true); });
        viewButtons.seal.addEventListener("click", function () { setView("seal", true); });

        var saved = "list";
        if (window.location.hash === "#seals") {
            saved = "seal";
        } else if (window.location.hash === "#archive") {
            saved = "list";
        } else {
            try {
                saved = localStorage.getItem("circus-view") || "list";
            } catch (e) { /* default */ }
        }
        applyView(saved);

        window.addEventListener("hashchange", function () {
            applyView(window.location.hash === "#seals" ? "seal" : "list");
        });
    }

    /* ---------- prev / next edition ---------- */

    var navSlot = document.querySelector("[data-edition-nav]");
    if (navSlot) {
        var currentFile = window.location.pathname.split("/").pop();
        var currentIndex = EDITIONS.findIndex(function (edition) {
            return edition.file === currentFile;
        });

        if (currentIndex !== -1) {
            var newer = EDITIONS[currentIndex - 1];
            var older = EDITIONS[currentIndex + 1];

            if (newer) {
                navSlot.insertAdjacentHTML("beforeend",
                    '<a class="edition-nav-link" href="' + newer.file + '">' +
                    '<span class="edition-nav-dir">← NEWER</span>' +
                    '<span class="edition-nav-title">' + newer.title + "</span></a>");
            }
            if (older) {
                navSlot.insertAdjacentHTML("beforeend",
                    '<a class="edition-nav-link" href="' + older.file + '">' +
                    '<span class="edition-nav-dir">OLDER →</span>' +
                    '<span class="edition-nav-title">' + older.title + "</span></a>");
            }
        }
    }

    /* ---------- scroll reveal ---------- */

    var reveal = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (reveal.length) {
        if (!("IntersectionObserver" in window)) {
            reveal.forEach(function (element) { element.classList.add("is-in"); });
        } else {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-in");
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: "0px 0px -8% 0px" });

            reveal.forEach(function (element) { observer.observe(element); });
        }
    }

    // Signals that the reveal wiring is live; the head script un-hides content
    // if this never arrives (e.g. the bundle fails to load).
    root.setAttribute("data-js-ready", "");

    /* ---------- marquee ---------- */

    var marquee = document.querySelector("[data-marquee]");
    if (marquee && !reduceMotion) {
        var track = marquee.querySelector(".marquee-track");
        var groupWidth = 0;
        var offset = 0;
        var speed = 26;
        var lastTime = null;
        var dragging = false;
        var paused = false;
        var startX = 0;
        var startOffset = 0;

        var measure = function () {
            groupWidth = track.scrollWidth / 2;
        };
        measure();
        window.addEventListener("resize", measure);

        var tick = function (time) {
            if (lastTime === null) {
                lastTime = time;
            }
            var delta = (time - lastTime) / 1000;
            lastTime = time;
            // Avoid a big jump after the tab has been in the background.
            if (delta > 0.1) { delta = 0.1; }

            if (!dragging && !paused) {
                offset -= speed * delta;
            }
            if (groupWidth > 0) {
                while (offset <= -groupWidth) { offset += groupWidth; }
                while (offset > 0) { offset -= groupWidth; }
            }
            track.style.transform = "translateX(" + offset + "px)";
            window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);

        marquee.addEventListener("pointerdown", function (event) {
            dragging = true;
            startX = event.clientX;
            startOffset = offset;
            marquee.classList.add("is-dragging");
            if (marquee.setPointerCapture) {
                try {
                    marquee.setPointerCapture(event.pointerId);
                } catch (e) { /* synthetic pointer */ }
            }
        });
        marquee.addEventListener("pointermove", function (event) {
            if (dragging) {
                offset = startOffset + (event.clientX - startX);
            }
        });
        var endDrag = function () {
            dragging = false;
            marquee.classList.remove("is-dragging");
        };
        marquee.addEventListener("pointerup", endDrag);
        marquee.addEventListener("pointercancel", endDrag);
        marquee.addEventListener("pointerenter", function () { paused = true; });
        marquee.addEventListener("pointerleave", function () { paused = false; });
    }

    /* ---------- seal tilt ---------- */

    if (!reduceMotion && mq && mq("(hover: hover)").matches) {
        document.querySelectorAll(".seal-item").forEach(function (item) {
            var svg = item.querySelector(".seal-svg");
            if (!svg) {
                return;
            }
            var frame = null;
            var tiltX = 0;
            var tiltY = 0;

            var paint = function () {
                svg.style.setProperty("--rx", tiltX + "deg");
                svg.style.setProperty("--ry", tiltY + "deg");
            };

            item.addEventListener("pointermove", function (event) {
                var rect = item.getBoundingClientRect();
                var px = (event.clientX - rect.left) / rect.width - 0.5;
                var py = (event.clientY - rect.top) / rect.height - 0.5;
                tiltX = py * -10;
                tiltY = px * 12;
                item.classList.add("is-tilting");
                if (!frame) {
                    frame = window.requestAnimationFrame(function () {
                        frame = null;
                        paint();
                    });
                }
            });

            item.addEventListener("pointerleave", function () {
                tiltX = 0;
                tiltY = 0;
                item.classList.remove("is-tilting");
                paint();
            });
        });
    }

    /* ---------- search ---------- */

    var dialog = null;
    var input = null;
    var results = null;
    var empty = null;
    var highlighted = -1;
    var matches = [];

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function buildDialog() {
        dialog = document.createElement("dialog");
        dialog.className = "search";
        dialog.setAttribute("aria-label", "Search editions");
        dialog.innerHTML =
            '<form class="search-form" method="dialog">' +
            '<input class="search-input" type="search" autocomplete="off" spellcheck="false" ' +
            'placeholder="Search editions…" aria-label="Search editions" role="combobox" ' +
            'aria-expanded="true" aria-controls="circus-search-results" aria-autocomplete="list">' +
            "</form>" +
            '<div class="search-results" id="circus-search-results" role="listbox" aria-label="Results"></div>' +
            '<p class="search-empty" hidden></p>' +
            '<p class="search-hint">↑↓ to navigate · ↵ to open · esc to close</p>';
        document.body.appendChild(dialog);

        input = dialog.querySelector(".search-input");
        results = dialog.querySelector(".search-results");
        empty = dialog.querySelector(".search-empty");

        input.addEventListener("input", function () { render(input.value); });
        input.addEventListener("keydown", function (event) {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                move(1);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                move(-1);
            } else if (event.key === "Enter") {
                event.preventDefault();
                var target = matches[highlighted] || matches[0];
                if (target) {
                    window.location.href = hrefFor(target);
                }
            }
        });
        results.addEventListener("click", function (event) {
            var button = event.target.closest(".search-item");
            if (button) {
                window.location.href = button.getAttribute("data-href");
            }
        });
        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) {
                dialog.close();
            }
        });
        dialog.addEventListener("close", function () {
            if (lastTrigger) {
                lastTrigger.focus();
            }
        });
    }

    function render(query) {
        matches = EDITIONS.filter(function (edition) {
            return editionMatches(edition, query);
        });

        highlighted = matches.length ? 0 : -1;

        if (!matches.length) {
            results.innerHTML = "";
            results.hidden = true;
            empty.hidden = false;
            empty.textContent = "No editions match “" + query.trim() + "”.";
            input.removeAttribute("aria-activedescendant");
            return;
        }

        empty.hidden = true;
        results.hidden = false;
        results.innerHTML = matches.map(function (edition, index) {
            return '<button type="button" class="search-item" role="option" ' +
                'id="circus-search-option-' + index + '" ' +
                'data-href="' + hrefFor(edition) + '" ' +
                'aria-selected="' + (index === 0) + '">' +
                '<span class="search-item-eyebrow">' + edition.month.toUpperCase() + "</span>" +
                '<span class="search-item-title">' + escapeHtml(edition.title) + "</span>" +
                "</button>";
        }).join("");
        setActiveDescendant();
    }

    function setActiveDescendant() {
        var active = results.querySelectorAll(".search-item")[highlighted];
        if (active) {
            input.setAttribute("aria-activedescendant", active.id);
        } else {
            input.removeAttribute("aria-activedescendant");
        }
    }

    function move(step) {
        if (!matches.length) {
            return;
        }
        highlighted = (highlighted + step + matches.length) % matches.length;
        Array.prototype.forEach.call(results.querySelectorAll(".search-item"), function (button, index) {
            button.setAttribute("aria-selected", String(index === highlighted));
        });
        setActiveDescendant();
        var active = results.querySelectorAll(".search-item")[highlighted];
        if (active) {
            active.scrollIntoView({ block: "nearest" });
        }
    }

    var lastTrigger = null;

    function openSearch() {
        if (!dialog) {
            buildDialog();
        }
        if (dialog.open) {
            input.focus();
            input.select();
            return;
        }
        lastTrigger = document.activeElement;
        render("");
        if (typeof dialog.showModal === "function") {
            dialog.showModal();
        } else {
            dialog.setAttribute("open", "");
        }
        input.focus();
        input.select();
    }

    document.querySelectorAll("[data-search-open]").forEach(function (button) {
        button.addEventListener("click", openSearch);
    });

    /* ---------- keyboard ---------- */

    document.addEventListener("keydown", function (event) {
        var target = event.target;
        var typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            openSearch();
            return;
        }

        if (typing || event.metaKey || event.ctrlKey || event.altKey) {
            return;
        }

        if (dialog && dialog.open) {
            return;
        }

        if (event.key === "/") {
            event.preventDefault();
            openSearch();
        } else if (hasViews && event.key.toLowerCase() === "l") {
            setView("list", true);
        } else if (hasViews && event.key.toLowerCase() === "s") {
            setView("seal", true);
        }
    });
})();
