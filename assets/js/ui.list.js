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
        // ✅ 가운데점(·)을 유니코드로 처리해서 인코딩 깨짐 방지
        meta.textContent = `${p.category} \u00B7 ${p.day}번`;

        const nm = document.createElement("div");
        nm.className = "name";
        nm.textContent = p.name;

        li.appendChild(meta);
        li.appendChild(nm);

        li.addEventListener("click", () => onSelect(p.id));
        listEl.appendChild(li);
    }

    if (emptyEl) emptyEl.style.display = items.length ? "none" : "block";
    if (countEl) countEl.textContent = `${items.length}개`;
}

