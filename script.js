// Combinations that cannot make 10 (digits in ascending order, stored as 4-char strings).
// Each entry represents a multiset of 4 digits from 1-9 for which no arithmetic expression
// using +, -, *, / and parentheses can produce exactly 10.
// Source: exhaustive search over all operator/bracket permutations.
const UNSOLVABLE = new Set([
    "1111","1112","1113","1122","1159","1169","1177","1178","1179","1188",
    "1399","1444","1499","1666","1667","1677","1699","1777",
    "2257",
    "3444","3669","3779","3999",
    "4444","4459","4477","4558","4899","4999",
    "5668","5788","5799","5899",
    "6666","6667","6677","6777","6778","6888","6899","6999",
    "7777","7788","7789","7799","7888","7999",
    "8899"
]);

// Generate all multiset combinations of 4 numbers from 1-9 (9H4 = 495),
// excluding the ones that cannot make 10.
function generateProblems() {
    const problems = [];
    for (let i = 1; i <= 9; i++) {
        for (let j = i; j <= 9; j++) {
            for (let k = j; k <= 9; k++) {
                for (let l = k; l <= 9; l++) {
                    const key = `${i}${j}${k}${l}`;
                    if (!UNSOLVABLE.has(key)) {
                        problems.push([i, j, k, l]);
                    }
                }
            }
        }
    }
    return problems;
}

const problems = generateProblems();
const TOTAL_PROBLEMS = problems.length;

// State
let currentProblemIndex = 0;
// We store the expression as an array of objects: { type: 'number'|'operator', value: string, originalIndex?: number }
let expressionParts = [];

// DOM Elements
const currentProblemNumEl = document.getElementById('current-problem-num');
const totalProblemsEl = document.getElementById('total-problems');
const expressionTextEl = document.getElementById('expression-text');
const resultIndicatorEl = document.getElementById('result-indicator');
const availableNumbersEl = document.getElementById('available-numbers');
const customMessageAreaEl = document.getElementById('message-area');
const gameContainer = document.getElementById('game-container');
const completionScreen = document.getElementById('completion-screen');
const restartBtn = document.getElementById('restart-btn');
const langSelect = document.getElementById('lang-select');
const unsolvableModal = document.getElementById('unsolvable-modal');
const unsolvableBtn = document.getElementById('unsolvable-btn');
const unsolvableCloseBtn = document.getElementById('unsolvable-close-btn');

// Localization Dictionary
const i18n = {
    ja: {
        title: "Make 10 Challenge",
        problemLabel: "問題",
        resetBtn: "最初から",
        backspaceBtn: "⌫ 1文字消す",
        clearBtn: "クリア",
        completionMsg: "全問クリア！おめでとうございます！",
        restartBtn: "初めからやる",
        successMsg: "OK! 正解！",
        confirmReset: "本当に最初からやり直しますか？",
        unsolvableBtn: "解けない問題一覧",
        unsolvableTitle: "Make 10 できない組み合わせ",
        unsolvableClose: "閉じる"
    },
    en: {
        title: "Make 10 Challenge",
        problemLabel: "Problem",
        resetBtn: "Reset",
        backspaceBtn: "⌫ Backspace",
        clearBtn: "Clear",
        completionMsg: "All problems cleared! Congratulations!",
        restartBtn: "Play Again",
        successMsg: "OK! Correct!",
        confirmReset: "Are you sure you want to restart from the beginning?",
        unsolvableBtn: "Unsolvable List",
        unsolvableTitle: "Combinations that cannot make 10",
        unsolvableClose: "Close"
    }
};

let currentLang = 'ja';

// Initialize
function init() {
    const savedIndex = localStorage.getItem('make10_problem_index');
    // Load language preference
    const savedLang = localStorage.getItem('make10_lang');
    if (savedLang && i18n[savedLang]) {
        currentLang = savedLang;
        langSelect.value = currentLang;
    } else {
        // Try to detect
        const browserLang = navigator.language.slice(0, 2);
        if (i18n[browserLang]) {
            currentLang = browserLang;
            langSelect.value = currentLang;
        }
    }
    updateLanguage();

    if (savedIndex !== null) {
        currentProblemIndex = parseInt(savedIndex, 10);
        // Validate index range
        if (currentProblemIndex >= TOTAL_PROBLEMS || currentProblemIndex < 0) {
            currentProblemIndex = 0;
        }
    } else {
        currentProblemIndex = 0;
    }

    // Set total
    totalProblemsEl.textContent = TOTAL_PROBLEMS;

    // Event Listeners
    document.querySelectorAll('.op-btn').forEach(btn => {
        btn.addEventListener('click', () => addOperator(btn.dataset.op));
    });

    document.getElementById('backspace-btn').addEventListener('click', backspace);
    document.getElementById('clear-btn').addEventListener('click', clearExpression);
    restartBtn.addEventListener('click', restartGame);
    // Unsolvable modal
    unsolvableBtn.addEventListener('click', showUnsolvable);
    unsolvableCloseBtn.addEventListener('click', hideUnsolvable);
    unsolvableModal.addEventListener('click', (e) => {
        if (e.target === unsolvableModal) hideUnsolvable();
    });
    // Language Toggle
    langSelect.addEventListener('change', (e) => {
        currentLang = e.target.value;
        localStorage.setItem('make10_lang', currentLang);
        updateLanguage();
    });

    render();
}

function updateLanguage() {
    const texts = i18n[currentLang];
    document.title = texts.title;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (texts[key]) {
            el.textContent = texts[key];
        }
    });
}

function render() {
    // Check completion
    if (currentProblemIndex >= TOTAL_PROBLEMS) {
        gameContainer.style.display = 'none';
        completionScreen.style.display = 'block';
        currentProblemNumEl.textContent = TOTAL_PROBLEMS;
        return;
    }

    gameContainer.style.display = 'block';
    completionScreen.style.display = 'none';
    currentProblemNumEl.textContent = currentProblemIndex + 1;

    // Render Expression
    expressionTextEl.textContent = expressionParts.map(p => {
        if (p.type === 'operator') {
            if (p.value === '*') return '×';
            if (p.value === '/') return '÷';
            return p.value;
        }
        return p.value;
    }).join(' ');

    // Calculate interim result if possible (just for user feedback, logic check is separate)
    // Only check if valid
    const currentExprString = expressionPartsToString();
    let currentVal = '';
    try {
        if (currentExprString) {
            // Very safe basic check before eval-like behavior
            if (isValidSyntaxPartial(currentExprString)) { 
                const res = new Function('return ' + currentExprString)();
                if (isFinite(res)) {
                    // Check if integer? No, could be intermediate float.
                    // Just show if it looks like a number
                    currentVal = '= ' + Math.round(res * 1000) / 1000;
                }
            }
        }
    } catch (e) {
        // ignore syntax errors during typing
    }
    resultIndicatorEl.textContent = currentVal;


    // Render Available Numbers
    const currentNumbers = problems[currentProblemIndex];
    availableNumbersEl.innerHTML = '';
    
    // Determine which original indices are used
    const usedIndices = new Set();
    expressionParts.forEach(p => {
        if (p.type === 'number' && p.originalIndex !== undefined) {
            usedIndices.add(p.originalIndex);
        }
    });

    const lastPart = expressionParts[expressionParts.length - 1];
    const isNumberInputLocked = lastPart && lastPart.type === 'number';
    const isOperatorInputLocked = lastPart && lastPart.type === 'operator';

    document.querySelectorAll('.op-btn').forEach(btn => {
        btn.disabled = isOperatorInputLocked;
    });

    currentNumbers.forEach((num, idx) => {
        const btn = document.createElement('button');
        btn.className = 'number-btn';
        btn.textContent = num;
        btn.disabled = usedIndices.has(idx) || isNumberInputLocked;
        btn.addEventListener('click', () => addNumber(num, idx));
        availableNumbersEl.appendChild(btn);
    });

    // Check if solved
    checkSolution(usedIndices.size === 4);
}

function addNumber(num, originalIndex) {
    expressionParts.push({ type: 'number', value: num, originalIndex: originalIndex });
    customMessageAreaEl.innerHTML = ''; // Clear messages
    render();
}

function addOperator(op) {
    expressionParts.push({ type: 'operator', value: op });
    customMessageAreaEl.innerHTML = '';
    render();
}

function backspace() {
    expressionParts.pop();
    customMessageAreaEl.innerHTML = '';
    render();
}

function clearExpression() {
    expressionParts = [];
    customMessageAreaEl.innerHTML = '';
    render();
}

function expressionPartsToString() {
    return expressionParts.map(p => p.value).join('');
}

// Check syntax more formally
function isValidSyntaxPartial(str) {
    // Basic check: shouldn't end with operator if we are checking for full value, 
    // but for intermediate it might. BUT `new Function` throws if invalid.
    // We rely on try-catch in render.
    return true; 
}

function checkSolution(allNumbersUsed) {
    if (!allNumbersUsed) return;

    const exprStr = expressionPartsToString();
    try {
        const result = new Function('return ' + exprStr)();
        
        // Exact 10 check, handle floating point epsilon if division is used
        if (Math.abs(result - 10) < 0.000001) {
            customMessageAreaEl.innerHTML = `<div class="success-message">${i18n[currentLang].successMsg}</div>`;
            // Disable inputs?
            
            setTimeout(() => {
                nextProblem();
            }, 1000);
        } else {
           // Not 10
           // Could show message, but maybe intrusive.
        }
    } catch (e) {
        // Invalid syntax (e.g. trailing operator or unbalanced parens)
    }
}

function nextProblem() {
    currentProblemIndex++;
    localStorage.setItem('make10_problem_index', currentProblemIndex);
    expressionParts = [];
    customMessageAreaEl.innerHTML = '';
    render();
}

function restartGame() {
    currentProblemIndex = 0;
    localStorage.setItem('make10_problem_index', currentProblemIndex);
    expressionParts = [];
    customMessageAreaEl.innerHTML = '';
    render();
}

function showUnsolvable() {
    const texts = i18n[currentLang];
    document.getElementById('unsolvable-title').textContent = texts.unsolvableTitle;
    const listEl = document.getElementById('unsolvable-list');
    listEl.innerHTML = '';
    UNSOLVABLE.forEach(key => {
        // key is a 4-char string like "1234"; display as "1, 2, 3, 4"
        const digits = key.split('').join(', ');
        const item = document.createElement('span');
        item.className = 'unsolvable-item';
        item.textContent = digits;
        listEl.appendChild(item);
    });
    unsolvableModal.style.display = 'flex';
}

function hideUnsolvable() {
    unsolvableModal.style.display = 'none';
}

// Start
init();
