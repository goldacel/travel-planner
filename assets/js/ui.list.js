export function renderList({
    listEl,
    emptyEl,
    countEl,
    items,
    activeId,
    onSelect
}) {
    if (!listEl) return;

    listEl.innerHTML = "";

    for (const p of items) {
        const li = document.createElement("li");
        li.className = "item" + (p.id === activeId ? " active" : "");

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = `${p.category} ¡¤ ${p.day}¹ø`;

        const nm = document.createElement("div");
        nm.className = "name";
        nm.textContent = p.name;

        li.appendChild(meta);
        li.appendChild(nm);

        li.addEventListener("click", () => onSelect(p.id));
        listEl.appendChild(li);
    }

    if (emptyEl) emptyEl.style.display = items.length ? "none" : "block";
    if (countEl) countEl.textContent = `${items.length}°³`;
}
