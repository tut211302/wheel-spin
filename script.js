let selectedCell = null;
const selectedName = document.getElementById("selected-name");

document.querySelectorAll("td.empty").forEach(td=>{
  td.addEventListener("click",()=>{
    // 既に名前が入っているセルは選択不可
    if(td.textContent.trim() !== "") return;

    // 選択状態リセット
    document.querySelectorAll("td").forEach(c=>c.classList.remove("selected"));

    // 新しいセルを選択
    selectedCell = td;
    td.classList.add("selected");
    selectedName.textContent = "ルーレットを回してください";

    // === 追加: ここでルーレットを切り替える ===
    let row = parseInt(selectedCell.dataset.row);
    let options = row < 4 ? availableJapanese : availableForeigner;
    updateWheel(options);
  });
});

// 名簿データ
const roster = [];
for(let i=1;i<=40;i++){
  roster.push({number:i, name:"名前"+i});
}

// 利用可能番号
let availableJapanese = roster.filter(r=>r.number<=20).map(r=>r.number);
let availableForeigner = roster.filter(r=>r.number>=21).map(r=>r.number);

// ルーレット初期化（最初は 1~20 表示）
const wheel = document.getElementById("wheel");
const spinBtn = document.getElementById("spin-btn");

let myChart = new Chart(wheel,{
  type:"pie",
  data:{
    labels: availableJapanese,
    datasets:[{data: new Array(availableJapanese.length).fill(1),
               backgroundColor: availableJapanese.map(n=>n%2?"#8b35bc":"#b163da")}]
  },
  plugins:[ChartDataLabels],
  options:{
    responsive:true,
    animation:{duration:0},
    plugins:{
      tooltip:false,
      legend:{display:false},
      datalabels:{
        color:"#fff",
        formatter:(_,ctx)=>ctx.chart.data.labels[ctx.dataIndex],
        font:{size:14}
      }
    }
  }
});

// ルーレットの内容を切り替える関数
function updateWheel(options){
  let wd = options.map(n=>({label:n, color:n%2?"#8b35bc":"#b163da"}));
  myChart.data.labels = wd.map(x=>x.label);
  myChart.data.datasets[0].data = new Array(wd.length).fill(1);
  myChart.data.datasets[0].backgroundColor = wd.map(x=>x.color);
  myChart.update();
}

function spinWheel(options){
  return new Promise(resolve=>{
    let randomIndex = Math.floor(Math.random()*options.length);
    let selected = options[randomIndex];
    let count=0;
    let interval = setInterval(()=>{
      myChart.options.rotation += 10;
      myChart.update();
      count++;
      if(count>30){
        clearInterval(interval);
        resolve(selected);
      }
    },10);
  });
}

spinBtn.addEventListener("click", async ()=>{
  if(!selectedCell){ alert("セルを選んでください"); return; }

  let row = parseInt(selectedCell.dataset.row);
  let options = row<4? availableJapanese : availableForeigner;
  if(options.length===0){ alert("選択肢がありません"); return; }

  let resultNumber = await spinWheel(options);
  let name = roster.find(r=>r.number===resultNumber).name;
  selectedCell.textContent = name;
  selectedCell.classList.remove("selected"); // 選択解除
  selectedCell.classList.remove("empty");    // もう選べないようにする

  if(row<4){ availableJapanese = availableJapanese.filter(x=>x!==resultNumber); }
  else{ availableForeigner = availableForeigner.filter(x=>x!==resultNumber); }

  selectedName.textContent = "選ばれた氏名: "+name;
  selectedCell=null;
});
