function starsText(avg) {
    if (avg == null) return "☆☆☆☆☆";
    const full = Math.round(avg); // 평균을 대충 반올림 표시
    const empty = 5 - full;
    return "★".repeat(full) + "☆".repeat(empty);
}

export function renderDetail({ els, place, avg, count }) {
    const { nameEl, descEl, avgEl, countEl, starsEl } = els;

    if (!place) {
        nameEl.textContent = "선택된 항목이 없습니다.";
        descEl.textContent = "표에서 항목을 클릭하면 표시됩니다.";
        avgEl.textContent = "-";
        countEl.textContent = "-";
        starsEl.textContent = "☆☆☆☆☆";
        return;
    }

    nameEl.textContent = `${place.name} (${place.category} · ${place.day}번)`;
    descEl.textContent = place.desc || "-";
    avgEl.textContent = (avg == null) ? "-" : String(avg);
    countEl.textContent = (count == null) ? "-" : String(count);
    starsEl.textContent = starsText(avg);
}
