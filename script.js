// 要素参照
const tableEl = document.getElementById("group-table");
const selectedName = document.getElementById("selected-name");
const wheel = document.getElementById("wheel");
const spinBtn = document.getElementById("spin-btn");
const resetBtn = document.getElementById("reset-btn");

// ローカルストレージキー
const STORAGE_KEY = "roulette_group_state_v2";

// 状態
let selectedCell = null;

// 名簿（番号→氏名）
const roster = Array.from({ length: 40 }, (_, i) => ({
  number: i + 1,
  name: "名前" + (i + 1),
}));

// 候補（日本人:1-20、留学生:21-40）
let availableJapanese = roster.filter(r => r.number <= 20).map(r => r.number);
let availableForeigner = roster.filter(r => r.number >= 21).map(r => r.number);

// ====== 保存・復元 ======
function saveState() {
  const cells = Array.from(tableEl.querySelectorAll("td")).map(td => td.textContent);
  const state = {
    cells,
    availableJapanese,
    availableForeigner,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return;

    const state = JSON.parse(json);

    // セルへ反映
    const tds = tableEl.querySelectorAll("td");
    state.cells.forEach((val, i) => {
      const td = tds[i];
      td.textContent = val || "";
      if (val && val.trim() !== "") {
        td.classList.remove("empty");
      } else {
        td.classList.add("empty");
      }
      td.classList.remove("selected");
    });

    // 残り候補を反映
    if (Array.isArray(state.availableJapanese)) availableJapanese = state.availableJapanese;
    if (Array.isArray(state.availableForeigner)) availableForeigner = state.availableForeigner;
  } catch (e) {
    console.warn("状態の復元でエラーが発生しました。初期状態で続行します。", e);
  }
}

// ====== ルーレット（Chart.js） ======
let myChart = new Chart(wheel, {
  type: "pie",
  data: {
    labels: [], // 初期は下で設定
    datasets: [{
      data: [],
      backgroundColor: []
    }]
  },
  plugins: [ChartDataLabels],
  options: {
    responsive: true,
    animation: { duration: 0 },
    plugins: {
      tooltip: false,
      legend: { display: false },
      datalabels: {
        color: "#fff",
        formatter: (_, ctx) => ctx.chart.data.labels[ctx.dataIndex],
        font: { size: 14 }
      }
    }
  }
});

// ルーレット表示更新
function updateWheel(options) {
  if (!Array.isArray(options)) options = [];
  if (options.length === 0) {
    // 選択肢ゼロ時：疑似スライス1つで見た目を維持し、Spin無効化＋メッセージ
    myChart.data.labels = ["-"];
    myChart.data.datasets[0].data = [1];
    myChart.data.datasets[0].backgroundColor = ["#cccccc"];
    myChart.update();
    spinBtn.disabled = true;
    selectedName.textContent = "選択肢がありません";
    return;
  }
  myChart.data.labels = options.slice();
  myChart.data.datasets[0].data = new Array(options.length).fill(1);
  myChart.data.datasets[0].backgroundColor = options.map(n => n % 2 ? "#8b35bc" : "#b163da");
  myChart.update();
  spinBtn.disabled = false;
}

// ルーレット回転
function spinWheel(options) {
  return new Promise(resolve => {
    if (!options || options.length === 0) {
      resolve(null);
      return;
    }
    const selected = options[Math.floor(Math.random() * options.length)];
    let count = 0;
    const interval = setInterval(() => {
      myChart.options.rotation += 10;
      myChart.update();
      count++;
      if (count > 30) {
        clearInterval(interval);
        resolve(selected);
      }
    }, 10);
  });
}

// ====== セル選択（イベント委譲） ======
tableEl.addEventListener("click", (e) => {
  const td = e.target.closest("td");
  if (!td || !tableEl.contains(td)) return;

  // 既に名前が入っているセルは選択不可
  if (td.textContent.trim() !== "") return;

  // 選択の付け替え
  tableEl.querySelectorAll("td").forEach(c => c.classList.remove("selected"));
  selectedCell = td;
  td.classList.add("selected");
  selectedName.textContent = "ルーレットを回してください";

  // 行で日本人/留学生を判定してルーレット切替
  const row = parseInt(td.dataset.row, 10);
  const options = row < 4 ? availableJapanese : availableForeigner;
  updateWheel(options);
});

// ====== スピン ======
spinBtn.addEventListener("click", async () => {
  if (!selectedCell) { alert("セルを選んでください"); return; }

  const row = parseInt(selectedCell.dataset.row, 10);
  const isJapaneseRow = row < 4;
  const options = isJapaneseRow ? availableJapanese : availableForeigner;

  if (options.length === 0) {
    selectedName.textContent = "選択肢がありません";
    spinBtn.disabled = true;
    return;
  }

  const resultNumber = await spinWheel(options);
  if (resultNumber == null) {
    selectedName.textContent = "選択肢がありません";
    spinBtn.disabled = true;
    return;
  }

  const name = roster.find(r => r.number === resultNumber)?.name || ("番号" + resultNumber);
  selectedCell.textContent = name;
  selectedCell.classList.remove("selected");
  selectedCell.classList.remove("empty");
  selectedCell = null;

  // 候補から除外
  if (isJapaneseRow) {
    availableJapanese = availableJapanese.filter(n => n !== resultNumber);
  } else {
    availableForeigner = availableForeigner.filter(n => n !== resultNumber);
  }

  selectedName.textContent = "選ばれた氏名: " + name;

  // 状態保存
  saveState();

  // 直近の候補状況に合わせてホイール更新（選択セルがないので日本人側に寄せない）
  // ※次にユーザーがセルをクリックしたときに改めて切替表示されます。
});

// ====== リセット ======
resetBtn.addEventListener("click", () => {
  if (!confirm("本当にリセットしますか？\nこの操作は元に戻せません。")) return;

  localStorage.removeItem(STORAGE_KEY);

  tableEl.querySelectorAll("td").forEach(td => {
    td.textContent = "";
    td.classList.add("empty");
    td.classList.remove("selected");
  });

  availableJapanese = roster.filter(r => r.number <= 20).map(r => r.number);
  availableForeigner = roster.filter(r => r.number >= 21).map(r => r.number);

  updateWheel(availableJapanese); // リセット後は日本人(1-20)から
  selectedName.textContent = "リセットされました";
});

// ====== 初期化 ======
loadState();                 // まず復元
updateWheel(availableJapanese); // 既定で 1〜20 を表示
