import { loadState, saveState } from "./storage.js";
import { buildGrid } from "./ui.grid.js";
import { renderList } from "./ui.list.js";
import { renderDetail } from "./ui.detail.js";

/**
 * ✅ GET(조회)용: googleusercontent (CORS 통과 잘 됨)
 *    너가 준 URL 그대로 붙여넣기 (절대 자르지 말기)
 */
const SHEET_API_GET =
    "https://script.google.com/macros/s/AKfycbxSp1RePmkKQCcUdFLvY2mv9_najLUeRpYqUryYY3Vkkab_fhLHe1PDIxGpyC0HmfakjQ/exec";

/**
 * ✅ POST(등록)용: 보통 exec (script.google.com) 가 안정적
 *    여기에는 "웹 앱 URL(/exec)" 넣어야 함.
 *    예: https://script.google.com/macros/s/XXXX/exec
 *
 * ⚠️ 지금 너는 이 값이 없으면 댓글 등록이 실패할 수 있어.
 *    (장소 불러오기만 할 거면 임시로 GET과 동일하게 둬도 되지만,
 *     댓글 등록/평점 저장까지 하려면 반드시 exec로 바꿔줘.)
 */
const SHEET_API_POST =
    "https://script.google.com/macros/s/AKfycbxSp1RePmkKQCcUdFLvY2mv9_najLUeRpYqUryYY3Vkkab_fhLHe1PDIxGpyC0HmfakjQ/exec";

// DOM
const gridBodyEl = document.getElementById("gridBody");
const pickedListEl = document.getElementById("pickedList");
const emptyMsgEl = document.getElementById("emptyMsg");
const countPillEl = document.getElementById("countPill");
const listEnableEl = document.getElementById("listEnable");
const loadStateTextEl = document.getElementById("loadStateText");

const detailEls = {
    nameEl: document.getElementById("detailName"),
    descEl: document.getElementById("detailDesc"),
    avgEl: document.getElementById("detailAvg"),
    countEl: document.getElementById("detailCount"),
    starsEl: document.getElementById("detailStars"),
};

const commentListEl = document.getElementById("commentList");
const userInputEl = document.getElementById("userInput");
const commentInputEl = document.getElementById("commentInput");
const commentSubmitEl = document.getElementById("commentSubmit");
const saveHintEl = document.getElementById("saveHint");
const starInputEl = document.getElementById("starInput");

// State
const saved = loadState();
const state = {
    pickedIds: new Set(saved.pickedIds || []),
    activeId: saved.activeId || null,
    listEnabled: typeof saved.listEnabled === "boolean" ? saved.listEnabled : true,
};

let places = [];
let placeMap = new Map();
let categories = ["숙박", "음식점", "관광"];

// 리뷰 캐시
let currentAvg = null;
let currentCount = null;
let currentReviews = [];
let draftRating = 5;

// ---------- utils ----------
function persist() {
    saveState({
        pickedIds: state.pickedIds,
        activeId: state.activeId,
        listEnabled: state.listEnabled,
    });
}

function getActivePlace() {
    if (!state.activeId) return null;
    return placeMap.get(state.activeId) || null;
}

function getPickedItems() {
    if (!state.listEnabled) return [];
    const arr = Array.from(state.pickedIds)
        .map((id) => placeMap.get(id))
        .filter(Boolean);

    arr.sort((a, b) => {
        const ca = categories.indexOf(a.category);
        const cb = categories.indexOf(b.category);
        if (ca !== cb) return ca - cb;
        return (a.day || 0) - (b.day || 0);
    });

    return arr;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[m]));
}

function paintStars(v) {
    if (!starInputEl) return;
    starInputEl.querySelectorAll("button[data-v]").forEach((btn) => {
        btn.classList.toggle("on", Number(btn.dataset.v) <= v);
    });
}

/** ✅ googleusercontent처럼 이미 쿼리가 있는 URL에도 파라미터 안전하게 붙임 */
function withParams(base, params) {
    const u = new URL(base);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.toString();
}

// ---------- API ----------
async function apiGetPlaces() {
    const url = withParams(SHEET_API_GET, { action: "places" });
    const res = await fetch(url);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "places load fail");
    return json.places;
}

async function apiGetReviews(placeId) {
    const url = withParams(SHEET_API_GET, { action: "reviews", placeId });
    const res = await fetch(url);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "reviews load fail");
    return json; // {reviews, avg, count}
}

async function apiPostReview({ placeId, rating, comment, user }) {
    const payload = JSON.stringify({
        action: "addReview",
        placeId,
        rating,
        comment,
        user,
    });

    // ⚠️ exec 쪽으로 POST
    const res = await fetch(SHEET_API_POST, { method: "POST", body: payload });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "post fail");
}

// ---------- comments UI ----------
function renderComments() {
    if (!commentListEl) return;

    if (!state.activeId) {
        commentListEl.innerHTML = `<div class="muted">선택된 항목이 없어요.</div>`;
        return;
    }

    if (!currentReviews.length) {
        commentListEl.innerHTML = `<div class="muted">아직 댓글이 없어요.</div>`;
        return;
    }

    commentListEl.innerHTML = "";
    for (const r of currentReviews) {
        const div = document.createElement("div");
        div.className = "comment";
        const dt = new Date(r.ts).toLocaleString();

        div.innerHTML = `
      <div class="comment-head">
        <div class="left">
          <b>${escapeHtml(r.user || "익명")}</b>
          <span class="muted">${escapeHtml(dt)}</span>
        </div>
        <span class="pill">${escapeHtml(String(r.rating))}★</span>
      </div>
      <div class="comment-body">${escapeHtml(r.comment)}</div>
    `;
        commentListEl.appendChild(div);
    }
}

async function refreshReviewsForActive() {
    const p = getActivePlace();
    currentAvg = null;
    currentCount = null;
    currentReviews = [];

    if (!p) {
        renderComments();
        return;
    }

    try {
        const { reviews, avg, count } = await apiGetReviews(p.id);
        currentAvg = avg == null ? null : avg;
        currentCount = count == null ? null : count;
        currentReviews = Array.isArray(reviews) ? reviews : [];
    } catch {
        currentAvg = null;
        currentCount = null;
        currentReviews = [];
    }

    renderComments();
}

// ---------- render ----------
function renderAll() {
    if (listEnableEl) {
        listEnableEl.checked = state.listEnabled;
        listEnableEl.onchange = () => {
            state.listEnabled = listEnableEl.checked;
            persist();
            renderAll();
        };
    }

    buildGrid({
        gridBodyEl,
        categories,
        places,
        isPicked: (id) => state.listEnabled && state.pickedIds.has(id),
        onCellClick: (place) => {
            // ✅ 클릭하면 항상 상세 표시
            state.activeId = place.id;

            // ✅ list ON일 때만 담기/해제
            if (state.listEnabled) {
                if (state.pickedIds.has(place.id)) state.pickedIds.delete(place.id);
                else state.pickedIds.add(place.id);
            }

            persist();
            refreshReviewsForActive().then(() => renderAll());
        },
    });

    const items = getPickedItems();
    renderList({
        listEl: pickedListEl,
        emptyEl: emptyMsgEl,
        countEl: countPillEl,
        items,
        activeId: state.activeId,
        onSelect: (id) => {
            state.activeId = id;
            persist();
            refreshReviewsForActive().then(() => renderAll());
        },
    });

    renderDetail({
        els: detailEls,
        place: getActivePlace(),
        avg: currentAvg,
        count: currentCount,
    });

    const active = getActivePlace();
    if (!active) {
        saveHintEl.textContent = "선택된 항목이 없어요.";
        commentSubmitEl.disabled = true;
        if (commentInputEl) commentInputEl.disabled = true;
        if (userInputEl) userInputEl.disabled = true;
        draftRating = 5;
        paintStars(draftRating);
    } else {
        saveHintEl.textContent = state.listEnabled
            ? "별 클릭 → 댓글 입력 → 등록"
            : "list OFF 상태에서도 댓글 등록은 가능";
        commentSubmitEl.disabled = false;
        if (commentInputEl) commentInputEl.disabled = false;
        if (userInputEl) userInputEl.disabled = false;
        paintStars(draftRating);
    }
}

// ---------- events ----------
if (starInputEl) {
    starInputEl.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-v]");
        if (!b) return;
        draftRating = Number(b.dataset.v);
        paintStars(draftRating);
    });
}

if (commentSubmitEl) {
    commentSubmitEl.onclick = async () => {
        const p = getActivePlace();
        if (!p) return;

        const user = (userInputEl.value || "").trim() || "익명";
        const comment = (commentInputEl.value || "").trim();
        if (!comment) return;

        commentSubmitEl.disabled = true;
        try {
            await apiPostReview({ placeId: p.id, rating: draftRating, comment, user });
            commentInputEl.value = "";
            await refreshReviewsForActive();
        } catch (e) {
            alert("댓글 저장 실패: " + (e.message || e));
        } finally {
            commentSubmitEl.disabled = false;
            renderAll();
        }
    };
}

// ---------- boot ----------
async function boot() {
    try {
        loadStateTextEl.textContent = "장소 불러오는 중…";
        places = await apiGetPlaces();

        const catSet = new Set(categories);
        for (const p of places) catSet.add(p.category);
        categories = Array.from(catSet);

        placeMap = new Map(places.map((p) => [p.id, p]));
        if (state.activeId && !placeMap.has(state.activeId)) state.activeId = null;

        loadStateTextEl.textContent = "불러오기 완료";
        await refreshReviewsForActive();
        renderAll();
    } catch (e) {
        loadStateTextEl.textContent = "불러오기 실패(시트/URL 확인)";
        alert("Places 로드 실패: " + (e.message || e));
    }
}

boot();
