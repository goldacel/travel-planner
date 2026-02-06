const KEY = "travel_planner_state_v2";

export function loadState() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { pickedIds: [], activeId: null, listEnabled: true };
        const p = JSON.parse(raw);
        return {
            pickedIds: Array.isArray(p.pickedIds) ? p.pickedIds : [],
            activeId: typeof p.activeId === "string" ? p.activeId : null,
            listEnabled: typeof p.listEnabled === "boolean" ? p.listEnabled : true,
        };
    } catch {
        return { pickedIds: [], activeId: null, listEnabled: true };
    }
}

export function saveState({ pickedIds, activeId, listEnabled }) {
    localStorage.setItem(KEY, JSON.stringify({
        pickedIds: Array.from(pickedIds || []),
        activeId: activeId ?? null,
        listEnabled: !!listEnabled,
    }));
}
