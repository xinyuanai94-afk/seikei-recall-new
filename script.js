 const STORAGE_KEY = "seikeiRecallLive_v2";

const categories = ["政治", "経済", "国際", "公共"];

const starterCards = [
  {
    id: 1,
    category: "政治",
    definition: "国会が内閣総理大臣を指名し、内閣が国会に対して連帯して責任を負う制度。",
    term: "議院内閣制",
    extra: "日本やイギリスで採用。"
  },
  {
    id: 2,
    category: "政治",
    definition: "国会が内閣総理大臣や国務大臣の出席を求め、国政について説明を求める権限。",
    term: "国政調査権",
    extra: "憲法62条。"
  },
  {
    id: 3,
    category: "政治",
    definition: "裁判所が、法律や命令などが憲法に適合するかどうかを判断する権限。",
    term: "違憲審査権",
    extra: "日本では具体的な争訟を前提とする。"
  },
  {
    id: 4,
    category: "経済",
    definition: "中央銀行が国債などを売買して、市場に流通する資金量を調整する金融政策。",
    term: "公開市場操作",
    extra: "買いオペは資金供給、売りオペは資金吸収。"
  },
  {
    id: 5,
    category: "経済",
    definition: "物価が継続的に下落し、貨幣の実質的な価値が上昇する現象。",
    term: "デフレーション",
    extra: "消費や投資が抑制され、景気悪化につながることがある。"
  },
  {
    id: 6,
    category: "経済",
    definition: "一国の一定期間における、財・サービスの生産によって新たに生み出された付加価値の合計。",
    term: "国内総生産（GDP）",
    extra: "中間生産物は二重計算を避けるため含めない。"
  },
  {
    id: 7,
    category: "国際",
    definition: "国際収支のうち、財・サービスの貿易や第一次所得収支などを記録する項目。",
    term: "経常収支",
    extra: "貿易・サービス収支、第一次所得収支、第二次所得収支からなる。"
  },
  {
    id: 8,
    category: "国際",
    definition: "国連の主要機関の一つで、国際の平和と安全の維持について主要な責任を負う機関。",
    term: "安全保障理事会",
    extra: "常任理事国は5か国。"
  },
  {
    id: 9,
    category: "公共",
    definition: "人々が社会の一員として共有し、他者と共に生きるために必要な価値や規範。",
    term: "公共性",
    extra: "自分だけでなく、他者や社会全体に関わる視点。"
  }
];

let cards = loadCards();
let queue = [];
let index = 0;
let revealed = false;
let touchStart = null;

// 保存データの読み込み
function normalizeCard(c) {
  return {
    ...c,
    category: categories.includes(c.category) ? c.category : "政治",
    status: c.status || "new",
    reviews: Number(c.reviews) || 0,
    due: Number(c.due) || 0,
    weakCount: Number(c.weakCount) || 0,
    history: Array.isArray(c.history) ? c.history : [],
    lastReviewed: Number(c.lastReviewed) || 0
  };
}

function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      return JSON.parse(raw).map(normalizeCard);
    }

    const old = localStorage.getItem("seikeiRecallLive_v1");

    if (old) {
      return JSON.parse(old).map(normalizeCard);
    }
  } catch (e) {
    console.warn("保存データを読み込めませんでした", e);
  }

  return starterCards.map(c => normalizeCard(c));
}

// 保存
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  updateStats();
  renderDashboard();
}

function el(id) {
  return document.getElementById(id);
}

// 登録数などの更新
function updateStats() {
  el("total").textContent = cards.length;

  el("mastered").textContent =
    cards.filter(c => c.status === "known").length;

  el("weak").textContent =
    cards.filter(c => c.status === "weak").length;
}

// 出題カードの取得
function getFilteredCards() {
  const cat = el("category").value;
  const mode = el("mode").value;
  const now = Date.now();

  return cards.filter(c => {
    if (cat !== "すべて" && c.category !== cat) {
      return false;
    }

    if (mode === "weak" && c.status !== "weak") {
      return false;
    }

    if (mode === "due" && c.due > now) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    if (mode === "due") {
      return (a.due || 0) - (b.due || 0);
    }

    const priority = c =>
      c.status === "weak" ? 0 :
      c.status === "new" ? 1 : 2;

    return priority(a) - priority(b) ||
      (a.due || 0) - (b.due || 0);
  });
}

// 学習キュー作成
function buildQueue() {
  queue = getFilteredCards();
  index = 0;
  revealed = false;
  render();
}

function currentCard() {
  return queue[index];
}

// 画面更新
function render() {
  const card = currentCard();
  const empty = !card;

  el("emptyMessage").classList.toggle("hidden", !empty);
  el("studyCard").classList.toggle("hidden", empty);
  el("studyCard").style.transform = "";
  el("studyCard").classList.remove("swiping");

  document.querySelector(".controls")
    .classList.toggle("hidden", empty);

  if (empty) {
    el("counter").textContent = "0 / 0";
    el("progressBar").style.width = "0%";
    el("progressText").textContent =
      "出題できる問題がありません";
    return;
  }

  el("counter").textContent =
    `${index + 1} / ${queue.length}`;

  el("progressBar").style.width =
    `${((index + 1) / queue.length) * 100}%`;

  el("progressText").textContent =
    el("mode").value === "weak"
      ? "苦手カードを復習中"
      : el("mode").value === "due"
      ? "復習タイミングのカード"
      : "学習中";

  el("cardCategory").textContent = card.category;

  el("cardStatus").textContent =
    card.status === "known"
      ? "習得済み"
      : card.status === "weak"
      ? "復習"
      : "未学習";

  el("definition").textContent = card.definition;
  el("term").textContent = card.term;
  el("extra").textContent = card.extra || "";

  el("answerArea").classList.toggle("hidden", !revealed);
  el("judgeArea").classList.toggle("hidden", !revealed);
  el("reveal").classList.toggle("hidden", revealed);
  el("swipeHint").classList.toggle("hidden", !revealed);
}

// 前後のカードへ移動
function nextCard() {
  if (!queue.length) return;

  index = (index + 1) % queue.length;
  revealed = false;
  render();
}

function previousCard() {
  if (!queue.length) return;

  index = (index - 1 + queue.length) % queue.length;
  revealed = false;
  render();
}

// シャッフル
function shuffle() {
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  index = 0;
  revealed = false;
  render();
}

// 回答判定
function judge(result) {
  const card = currentCard();

  if (!card) return;

  const reviewedAt = Date.now();

  card.reviews++;
  card.lastReviewed = reviewedAt;

  card.history.push({
    at: reviewedAt,
    result
  });

  if (card.history.length > 100) {
    card.history = card.history.slice(-100);
  }

  const currentId = card.id;

  if (result === "weak") {
    card.status = "weak";
    card.weakCount++;
    card.due = reviewedAt;

    queue.splice(index, 1);

    // 4枚進んだ位置に再挿入
    const insertAt = Math.min(index + 4, queue.length);

    queue.splice(insertAt, 0, card);

    if (queue.length === 1) {
      index = 0;
      revealed = false;
      render();
      save();
      return;
    }

    if (index >= queue.length) {
      index = 0;
    }

  } else {
    card.status = "known";

    // 復習間隔
    const intervals = [1, 3, 7, 14, 30, 60, 90];

    const successfulReviews = card.history
      .slice()
      .reverse()
      .findIndex(h => h.result === "weak");

    const streak =
      successfulReviews === -1
        ? card.history.length
        : successfulReviews;

    const days = intervals[
      Math.min(Math.max(streak - 1, 0), intervals.length - 1)
    ];

    card.due = reviewedAt + days * 86400000;

    queue = queue.filter(c => c.id !== currentId);

    if (index >= queue.length) {
      index = 0;
    }
  }

  revealed = false;
  render();
  save();
}

// ページ切り替え
function showPage(page) {
  document.querySelectorAll(".tab").forEach(b => {
    b.classList.toggle("active", b.dataset.page === page);
  });

  ["study", "dashboard", "manage"].forEach(p => {
    el(p + "Page").classList.toggle("hidden", p !== page);
  });

  if (page === "manage") {
    renderList();
  }

  if (page === "dashboard") {
    renderDashboard();
  }
}

// 学習状況の表示
function renderDashboard() {
  const total = cards.length;

  const known = cards.filter(
    c => c.status === "known"
  ).length;

  const rate = total
    ? Math.round(known / total * 100)
    : 0;

  el("overallRate").textContent = rate + "%";
  el("overallBar").style.width = rate + "%";

  el("overallCaption").textContent =
    `習得済み ${known} / ${total} 問`;

  el("categoryProgress").innerHTML = "";

  categories.forEach(cat => {
    const subset = cards.filter(c => c.category === cat);

    const mastered = subset.filter(
      c => c.status === "known"
    ).length;

    const pct = subset.length
      ? Math.round(mastered / subset.length * 100)
      : 0;

    const row = document.createElement("div");
    row.className = "progress-row";

    row.innerHTML = `
      <span>${cat}</span>
      <div class="track">
        <div class="fill" style="width:${pct}%"></div>
      </div>
      <span class="pct">${pct}%</span>
    `;

    el("categoryProgress").append(row);
  });

  // 苦手ランキング
  const ranking = cards
    .filter(c => c.weakCount > 0)
    .sort((a, b) =>
      b.weakCount - a.weakCount ||
      a.term.localeCompare(b.term, "ja")
    )
    .slice(0, 10);

  el("weakRanking").innerHTML = "";

  if (!ranking.length) {
    const li = document.createElement("li");
    li.textContent = "まだ苦手判定のカードはありません。";
    el("weakRanking").append(li);
  }

  ranking.forEach(c => {
    const li = document.createElement("li");

    const strong = document.createElement("strong");
    strong.textContent = c.term;

    const small = document.createElement("small");
    small.textContent =
      `${c.category} ・ 曖昧 ${c.weakCount}回`;

    li.append(strong, small);
    el("weakRanking").append(li);
  });

  // 復習対象数
  const due = cards.filter(
    c => c.due && c.due <= Date.now()
  ).length;

  const upcoming = cards.filter(
    c => c.due > Date.now()
  ).length;

  el("reviewSummary").textContent =
    `今すぐ復習できるカード：${due}枚 ／ 次回以降に復習するカード：${upcoming}枚`;
}

// 問題一覧
function renderList() {
  const q = el("search").value.trim().toLocaleLowerCase();
  const list = el("cardList");

  list.innerHTML = "";

  const filtered = cards.filter(c =>
    `${c.term} ${c.definition} ${c.extra || ""} ${c.category}`
      .toLocaleLowerCase()
      .includes(q)
  );

  filtered.forEach(card => {
    const item = document.createElement("div");
    item.className = "item";

    const title = document.createElement("strong");
    title.textContent = `${card.term} ・ ${card.category}`;

    const desc = document.createElement("p");
    desc.textContent = card.definition;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const edit = document.createElement("button");
    edit.textContent = "編集";
    edit.onclick = () => editCard(card.id);

    const del = document.createElement("button");
    del.textContent = "削除";
    del.onclick = () => deleteCard(card.id);

    actions.append(edit, del);
    item.append(title, desc, actions);

    list.append(item);
  });

  if (!filtered.length) {
    list.textContent = "該当する問題はありません。";
  }
}

// カード追加
function addCard(data) {
  cards.push(normalizeCard({
    id: Date.now() + Math.random(),
    ...data,
    status: "new",
    reviews: 0,
    due: 0,
    weakCount: 0,
    history: []
  }));
}

// 答えを見る
el("reveal").addEventListener("click", () => {
  revealed = true;
  render();
});

// 移動ボタン
el("next").addEventListener("click", nextCard);
el("prev").addEventListener("click", previousCard);
el("shuffle").addEventListener("click", shuffle);

// 判定ボタン
el("unknown").addEventListener("click", () => {
  judge("weak");
});

el("known").addEventListener("click", () => {
  judge("known");
});

// フィルター
el("category").addEventListener("change", buildQueue);
el("mode").addEventListener("change", buildQueue);

// タブ
document.querySelectorAll(".tab").forEach(b => {
  b.addEventListener("click", () => {
    showPage(b.dataset.page);
  });
});

// 問題追加フォーム
el("addForm").addEventListener("submit", e => {
  e.preventDefault();

  const definition = el("newDefinition").value.trim();
  const term = el("newTerm").value.trim();

  if (!definition || !term) return;

  addCard({
    definition,
    term,
    category: el("newCategory").value,
    extra: el("newExtra").value.trim()
  });

  save();
  e.target.reset();
  renderList();
  buildQueue();

  alert("問題を追加しました！");
});

// 一括登録
el("bulkAdd").addEventListener("click", () => {
  const input = el("bulkInput").value.trim();
  const result = el("bulkResult");

  if (!input) {
    result.textContent = "登録するデータを貼り付けてね。";
    return;
  }

  let added = 0;
  let errors = 0;

  input.split(/\r?\n/).forEach(line => {
    if (!line.trim()) return;

    const parts = line.split("\t").map(s => s.trim());

    const [category, definition, term, extra = ""] = parts;

    if (
      parts.length < 3 ||
      !categories.includes(category) ||
      !definition ||
      !term
    ) {
      errors++;
      return;
    }

    addCard({
      category,
      definition,
      term,
      extra
    });

    added++;
  });

  if (added) {
    save();
    buildQueue();
    renderList();
    el("bulkInput").value = "";
  }

  result.textContent = added
    ? `${added}問を登録しました。${errors ? `（${errors}行は形式不備のためスキップ）` : ""}`
    : "登録できるデータがありません。形式を確認してね。";
});

// 編集
function editCard(id) {
  const c = cards.find(x => x.id === id);

  if (!c) return;

  const term = prompt("用語", c.term);
  if (term === null) return;

  const definition = prompt("意味・説明", c.definition);
  if (definition === null) return;

  const extra = prompt("補足", c.extra || "");
  if (extra === null) return;

  const category = prompt(
    "分野（政治・経済・国際・公共）",
    c.category
  );

  if (category === null) return;

  if (!categories.includes(category.trim())) {
    alert("分野は政治・経済・国際・公共から選んでね。");
    return;
  }

  c.term = term.trim();
  c.definition = definition.trim();
  c.extra = extra.trim();
  c.category = category.trim();

  save();
  buildQueue();
  renderList();
}

// 削除
function deleteCard(id) {
  if (!confirm("この問題を削除しますか？")) return;

  cards = cards.filter(c => c.id !== id);

  save();
  buildQueue();
  renderList();
}

// 検索
el("search").addEventListener("input", renderList);

// スワイプ操作
const studyCard = el("studyCard");

studyCard.addEventListener("pointerdown", e => {
  if (!revealed || e.target.closest("button")) return;

  touchStart = {
    x: e.clientX,
    y: e.clientY,
    id: e.pointerId
  };

  studyCard.classList.add("swiping");
  studyCard.setPointerCapture(e.pointerId);
});

studyCard.addEventListener("pointermove", e => {
  if (!touchStart || touchStart.id !== e.pointerId) return;

  const dx = e.clientX - touchStart.x;
  const dy = e.clientY - touchStart.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    studyCard.style.transform =
      `translateX(${dx}px) rotate(${dx / 24}deg)`;
  }
});

function finishSwipe(e) {
  if (!touchStart) return;

  const dx = e.clientX - touchStart.x;
  const dy = e.clientY - touchStart.y;

  touchStart = null;

  studyCard.classList.remove("swiping");
  studyCard.style.transform = "";

  if (
    Math.abs(dx) < 80 ||
    Math.abs(dx) < Math.abs(dy) ||
    !revealed
  ) {
    return;
  }

  judge(dx > 0 ? "known" : "weak");
}

studyCard.addEventListener("pointerup", finishSwipe);

studyCard.addEventListener("pointercancel", () => {
  touchStart = null;
  studyCard.classList.remove("swiping");
  studyCard.style.transform = "";
});

// 初期表示
updateStats();
buildQueue();
renderDashboard();