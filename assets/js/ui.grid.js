export function buildGrid({
    gridBodyEl,
    categories,
    places,
    isPicked,
    onCellClick
}) {
    gridBodyEl.innerHTML = "";

    for (const cat of categories) {
        const tr = document.createElement("tr");

        const rowHead = document.createElement("th");
        rowHead.className = "rowhead";
        rowHead.textContent = cat;
        tr.appendChild(rowHead);

        for (let d = 1; d <= 5; d++) {
            const td = document.createElement("td");
            const p = places.find(x => x.category === cat && x.day === d);

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "cell-btn";
            btn.disabled = !p;

            const name = document.createElement("div");
            name.className = "place-name";
            name.textContent = p ? p.name : "-";
            btn.appendChild(name);

            if (p && isPicked(p.id)) btn.classList.add("selected");

            btn.addEventListener("click", (e) => {
                e.preventDefault();
                if (!p) return;
                onCellClick(p);
            });

            td.appendChild(btn);
            tr.appendChild(td);
        }

        gridBodyEl.appendChild(tr);
    }
}
