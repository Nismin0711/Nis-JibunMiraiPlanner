// ユーザー情報
let userData = {
    username: '',
    age: '',
    grade: '',
    rows: []
};

// 後のAI処理用
// 後のAI処理用
let AI_listtext = '';

const loadButton = document.getElementById('loadButton');
const saveButton = document.getElementById('saveButton');
const usernameInput = document.getElementById('username');
const ageInput = document.getElementById('age');
const gradeSelect = document.getElementById('grade');
const addRowButton = document.getElementById('addRowButton');
const inputRowsContainer = document.getElementById('inputRows');
const calculateButton = document.getElementById('calculateButton');
const totalAmountDisplay = document.getElementById('totalAmount');
const adviceBenesse = document.getElementById('advicebenesse');
const adviceBenessePage = document.getElementById('advicebenessepage');
const apiKeyInput = document.getElementById('apiKey'); // APIキー入力フォーム
const setApiKeyButton = document.getElementById('setApiKeyButton'); // APIキー設定ボタン

let API_KEY = ''; // APIキー
const URL = "https://api.openai.com/v1/chat/completions";

// API_KEY設定ボタンのクリックイベント
setApiKeyButton.addEventListener('click', () => {
    const newApiKey = apiKeyInput.value;
    if (newApiKey) {
        API_KEY = newApiKey;
        // API_KEYをJSONに保存
        userData.apiKey = newApiKey;
        saveUserDataToLocalStorage();
        alert('APIキーが設定されました。');
    } else {
        alert('APIキーを入力してください。');
    }
});

// 行を追加ボタン
addRowButton.addEventListener('click', () => {
    inputRowsContainer.appendChild(createNewRowElement());
});

// 計算ボタン
calculateButton.addEventListener('click', async() => {
    const { totalAmount, annualAmount } = calculateTotalAndAnnualAmount();
    let totalAmountDisplayMessage = '';
    if (totalAmount > 0) {
        totalAmountDisplayMessage = `月額: ${totalAmount.toLocaleString()} 円ずつ貯金<br>年額: ${annualAmount.toLocaleString()} 円貯金予定`;
    } else {
        totalAmountDisplayMessage = `月額: ${Math.abs(totalAmount).toLocaleString()} 円ずつ不足<br>年額: ${Math.abs(annualAmount).toLocaleString()} 円不足予定`;
    }
    totalAmountDisplay.innerHTML = totalAmountDisplayMessage;

    adviceBenesse.innerHTML = `
    <div class="speech-bubble-content" id="loadwait">
        あなたの収支表を評価中・・・
    </div>
`;
    adviceBenessePage.innerHTML = `
<div id="loadwait2" class="suggest">
    あなたにぴったりのトピックを検索中・・・
</div>
`;

    // left-column→AI_listtext
    const rowsData = extractInputRowsData();
    let AI_listtext = '';
    for (const row of rowsData) {
        const typeText = row.type === 'income' ? '[収入]' : '[支出]';
        AI_listtext += `${typeText}${row.description}：${row.amount.toLocaleString()}円\n`;
    }

    // アドバイス生成
    const settings = "As an employee at educational company Benesse, I'd like you to review my one-month budget as a college student from an educational standpoint and provide advice. Please analyze my personality from the budget and suggest appropriate saving methods and ways to increase income in Japanese. The content will be shown to me, so generate a reply in Japanese of about 50 characters conveying the intention to share with me.";
    const rules = 'The essential elements to include in the advice are "points to save money based on an analysis of his personality" and "advice on how to increase income based on an analysis of his personality."in Japanese';
    const question = "please make answer in Japanese" + AI_listtext;

    try {
        const response = await axios.post(
            URL, {
                "model": "gpt-3.5-turbo",
                "messages": [
                    { "role": "system", "content": settings },
                    { "role": "assistant", "content": rules },
                    { "role": "user", "content": question }
                ]
            }, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${API_KEY}`,
                },
            }
        );
        const answer = response.data.choices[0].message.content;

        let loadwait = document.getElementById('loadwait');
        loadwait.remove();
        adviceBenesse.innerHTML = `
            <div class="speech-bubble-content">
            あなたへのアドバイス：<br>
                ${answer}
            </div>
            <div class="speech-bubble-arrow"></div>
        `;
    } catch (error) {
        adviceBenesse.innerHTML = `
        <div class="speech-bubble-content">
        APIキーが正しく設定されていません
        </div>
        <div class="speech-bubble-arrow"></div>
    `;
        console.log(error);
    }


    // 分析と提案
    const settings2 = `In your capacity as an employee at the educational company Benesse, you're requested to analyze the monthly budget of a specific college student from an educational standpoint. Please assess the following keywords based on the student's budget: "Saving Skills," "Resilience," "Earning Capability," "Academic Performance," "Savings Acumen," "Financial Literacy," and "Future Projection." Assign percentage weights to each keyword, ensuring there's significant variance in values between critical and less significant aspects.Please adhere to the provided example when formatting your response.

    example:
    - Saving Skills: n%
    - Resilience: n%
    - Earning Capability: n%
    - Academic Performance: n%
    - Savings Acumen: n%
    - Financial Literacy: n%
    - Future Projection: n%`;
    const question2 = AI_listtext;

    try {
        console.log("response2生成開始")
        const response2 = await axios.post(
            URL, {
                "model": "gpt-3.5-turbo",
                "messages": [
                    { "role": "system", "content": settings2 },
                    { "role": "user", "content": question2 }
                ]
            }, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${API_KEY}`,
                },
            }
        );
        const answer2 = response2.data.choices[0].message.content;
        console.log(answer2);

        const lines = answer2.trim().split('\n');

        // テキスト→オブジェクトに格納→パーセンテージ確定
        const data = {};
        lines.forEach(line => {
            const match = line.match(/- (.+): (\d+)%/);
            if (match) {
                const skill = match[1].toLowerCase().replace(' ', '_');
                const percentage = parseInt(match[2]);
                data[skill] = percentage;
            }
        });

        const array = {};
        Object.keys(data).forEach(skill => {
            array[skill] = data[skill];
        });

        let highestPercentage = 0;
        Object.values(data).forEach(percentage => {
            if (percentage > highestPercentage) {
                highestPercentage = percentage;
            }
        });

        const skillsWithHighestPercentage = Object.keys(data).filter(skill => data[skill] === highestPercentage);
        const randomIndex = Math.floor(Math.random() * skillsWithHighestPercentage.length);
        const randomSkill = skillsWithHighestPercentage[randomIndex];

        console.log(`最も高いパーセンテージを持つスキル: ${randomSkill}`);

        let suggestname = 0;
        let suggestpage = 0;

        if (randomSkill === "saving_skills") {
            suggestname = "金欠体質改善！おこづかいの使い方を見直そう【高校生が知っておきたいお金スキル⑥】";
            suggestpage = "https://www.benesse.co.jp/mirailabo/moneyskill/moneyskill-6.html";
        } else if (randomSkill === "resilience") {
            suggestname = "【大学生のマネー事情３】お金の失敗談とリカバリー術！";
            suggestpage = "https://www.benesse.co.jp/mirailabo/moneyskill/moneyjijo-3.html";
        } else if (randomSkill === "earning_capability") {
            suggestname = "【稼ぐ力UP講座第１回】「稼ぐ力って何？」";
            suggestpage = "https://www.benesse.co.jp/mirailabo/miraipro/powerup-01.html";
        } else if (randomSkill === "academic_performance") {
            suggestname = "【教えて！ミライプロ】損をしないために！自分を守るお金の知識【なぜ今からお金を学ぶ？③】";
            suggestpage = "https://www.benesse.co.jp/mirailabo/miraipro/nazeima-03.html";
        } else if (randomSkill === "savings_acumen") {
            suggestname = "おこづかい２割貯金のススメ【高校生が知っておきたいお金スキル⑦】";
            suggestpage = "https://www.benesse.co.jp/mirailabo/moneyskill/moneyskill-7.html";
        } else if (randomSkill === "financial_literacy") {
            suggestname = "【投資のプロが高校生に伝えたい】「人生を豊かにするお金と進路の話」第１話「お金は人生の中心ではない」";
            suggestpage = "https://www.benesse.co.jp/mirailabo/miraipro/richlife-01.html";
        } else if (randomSkill === "future_projection") {
            suggestname = "【ミライをつくる専門家に聞く】キミが活躍できる進路がみつかる！ミライで注目される分野";
            suggestpage = "https://www.benesse.co.jp/mirailabo/miraipro/chumoku-0.html";
        }

        let loadwait2 = document.getElementById('loadwait2');
        loadwait2.remove();
        adviceBenessePage.innerHTML = `
                    <div class="suggest">
                    あなたにぴったりのトピックはこちら！：<br>
                    <a href="${suggestpage}">${suggestname}</a>
                    <iframe src="${suggestpage}"></iframe>
                    </div>
                `;
    } catch (error) {
        adviceBenessePage.innerHTML = `
        <div class="suggest">
        APIキーが正しく設定されていません
        </div>
    `;
        console.log(error);
    }



});


// 初期表示時に保存データを読み込む処理
window.addEventListener('load', () => {
    // 保存データの読み込み
    const savedData = localStorage.getItem('budgetAppData');
    if (savedData) {
        userData = JSON.parse(savedData);
        // 保存されたAPIキーをセット
        if (userData.apiKey) {
            API_KEY = userData.apiKey;
            apiKeyInput.value = API_KEY;
        }
        usernameInput.value = userData.username;
        ageInput.value = userData.age;
        gradeSelect.value = userData.grade;
        // 行データを画面に表示する処理
        renderInputRows();
    }
});


// 新しい行のHTML要素を作成する関数
function createNewRowElement() {
    const rowElement = document.createElement('div');
    rowElement.classList.add('row');

    const typeSelect = document.createElement('select');
    typeSelect.innerHTML = '<option value="expenditure">支出</option><option value="income">収入</option>';
    rowElement.appendChild(typeSelect);

    const descriptionInput = document.createElement('input');
    descriptionInput.type = 'text';
    descriptionInput.placeholder = '説明';
    rowElement.appendChild(descriptionInput);

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.placeholder = '金額';
    rowElement.appendChild(amountInput);

    const confirmButton = document.createElement('button');
    confirmButton.textContent = '〇';
    confirmButton.addEventListener('click', () => {
        if (confirmButton.textContent === '〇') {
            descriptionInput.setAttribute('readonly', true);
            amountInput.setAttribute('readonly', true);
            typeSelect.setAttribute('disabled', true);
            confirmButton.textContent = '△';
        } else {
            descriptionInput.removeAttribute('readonly');
            amountInput.removeAttribute('readonly');
            typeSelect.removeAttribute('disabled');
            confirmButton.textContent = '〇';
        }
    });
    rowElement.appendChild(confirmButton);

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', () => {
        rowElement.remove();
    });
    rowElement.appendChild(deleteButton);

    return rowElement;
}

// JSONあれこれ
function convertToJSON(data) {
    return JSON.stringify(data);
}

function parseJSON(jsonData) {
    return JSON.parse(jsonData);
}


// SAVEボタンのクリックイベント
saveButton.addEventListener('click', () => {
    const dataToSave = {
        username: usernameInput.value,
        age: ageInput.value,
        grade: gradeSelect.value,
        rows: extractInputRowsData()
    };

    const jsonData = convertToJSON(dataToSave);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const link = document.createElement('a');

    const fileName = usernameInput.value ? `${usernameInput.value}_data.json` : 'user_data.json';

    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// LOADボタン
loadButton.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.addEventListener('change', async(event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const jsonData = e.target.result;
            const loadedData = parseJSON(jsonData);
            userData = loadedData;
            usernameInput.value = userData.username;
            ageInput.value = userData.age;
            gradeSelect.value = userData.grade;
            renderInputRows();
        };
        reader.readAsText(file);
    });
    fileInput.click();
});

// 行データを抽出
function extractInputRowsData() {
    const rowsData = [];
    const rowElements = inputRowsContainer.getElementsByClassName('row');
    for (const rowElement of rowElements) {
        const type = rowElement.querySelector('select').value;
        const description = rowElement.querySelector('input[type="text"]').value;
        const amount = parseFloat(rowElement.querySelector('input[type="number"]').value);
        rowsData.push({ type, description, amount });
    }
    return rowsData;
}

// 行データを画面に表示
function renderInputRows() {
    inputRowsContainer.innerHTML = '';
    for (const row of userData.rows) {
        const newRowElement = createNewRowElement();
        newRowElement.querySelector('select').value = row.type;
        newRowElement.querySelector('input[type="text"]').value = row.description;
        newRowElement.querySelector('input[type="number"]').value = row.amount;
        newRowElement.querySelector('button').textContent = '△';
        newRowElement.querySelector('input[type="text"]').setAttribute('readonly', true);
        newRowElement.querySelector('input[type="number"]').setAttribute('readonly', true);
        newRowElement.querySelector('select').setAttribute('disabled', true);
        inputRowsContainer.appendChild(newRowElement);
    }
}

// 合計金額と年額を計算
function calculateTotalAndAnnualAmount() {
    let totalAmount = 0;
    let annualAmount = 0;

    const rowElements = inputRowsContainer.getElementsByClassName('row');
    for (const rowElement of rowElements) {
        const amount = parseFloat(rowElement.querySelector('input[type="number"]').value);
        if (rowElement.querySelector('select').value === 'expenditure') {
            totalAmount -= amount;
        } else {
            totalAmount += amount;
        }

        // 年額
        const monthlyOrAnnual = rowElement.querySelector('select').value;
        if (monthlyOrAnnual === 'expenditure') {
            annualAmount -= amount * 12;
        } else {
            annualAmount += amount * 12;
        }
    }

    return { totalAmount, annualAmount };
}