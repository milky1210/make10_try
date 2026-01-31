// Generate all combinations of 4 distinct numbers from 1-9
function generateProblems() {
    const problems = [];
    for (let i = 1; i <= 9; i++) {
        for (let j = i + 1; j <= 9; j++) {
            for (let k = j + 1; k <= 9; k++) {
                for (let l = k + 1; l <= 9; l++) {
                    problems.push([i, j, k, l]);
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

// Initialize
function init() {
    const savedIndex = localStorage.getItem('make10_problem_index');
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

    render();
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

    currentNumbers.forEach((num, idx) => {
        const btn = document.createElement('button');
        btn.className = 'number-btn';
        btn.textContent = num;
        btn.disabled = usedIndices.has(idx);
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
            customMessageAreaEl.innerHTML = '<div class="success-message">OK! Correct!</div>';
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

// Start
init();
