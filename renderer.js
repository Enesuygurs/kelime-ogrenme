const { ipcRenderer } = require('electron');

// DOM elementleri
const wordsList = document.getElementById('wordsList');
const addWordForm = document.getElementById('addWordForm');
const englishWordInput = document.getElementById('englishWord');
const turkishWordInput = document.getElementById('turkishWord');
const themeToggle = document.getElementById('themeToggle');
const bulkWordsInput = document.getElementById('bulkWords');
const bulkImportBtn = document.getElementById('bulkImportBtn');

// Çalışma bölümü elementleri
const practiceEnglishWord = document.getElementById('practiceEnglishWord');
const practiceTurkishWord = document.getElementById('practiceTurkishWord');
const showAnswerBtn = document.getElementById('showAnswerBtn');
const nextWordBtn = document.getElementById('nextWordBtn');

// Çalışma bölümü değişkenleri
let currentWords = [];
let currentWordIndex = -1;
let isWordsFinished = false;

// Tema değiştirme
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    html.setAttribute('data-bs-theme', newTheme);
    themeToggle.innerHTML = newTheme === 'light' ? 
        '<i class="fas fa-moon"></i>' : 
        '<i class="fas fa-sun"></i>';
    
    // Tema tercihini kaydet
    localStorage.setItem('theme', newTheme);
}

// Sayfa yüklendiğinde tema tercihini yükle
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
    themeToggle.innerHTML = savedTheme === 'light' ? 
        '<i class="fas fa-moon"></i>' : 
        '<i class="fas fa-sun"></i>';
    
    loadWords();
    enableFormElements();
});

// Tema değiştirme butonunu dinle
themeToggle.addEventListener('click', toggleTheme);

// Kelimeleri yükle
function loadWords() {
    ipcRenderer.send('get-words');
}

// Kelime kartı oluştur
function createWordCard(word) {
    const card = document.createElement('div');
    card.className = 'col-md-4';
    card.innerHTML = `
        <div class="word-card">
            <h3 class="english-word">${word.english}</h3>
            <p class="turkish-word text-muted">${word.turkish}</p>
            <button class="btn btn-sm btn-outline-danger delete-word" data-english="${word.english}">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    // Silme butonunu dinle
    const deleteBtn = card.querySelector('.delete-word');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Bu kelimeyi silmek istediğinizden emin misiniz?')) {
            ipcRenderer.send('delete-word', word.english);
        }
    });

    return card;
}

// Kelime ekleme formunu dinle
addWordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const englishWord = englishWordInput.value.trim();
    const turkishWord = turkishWordInput.value.trim();

    if (englishWord && turkishWord) {
        ipcRenderer.send('add-word', { english: englishWord, turkish: turkishWord });
        englishWordInput.value = '';
        turkishWordInput.value = '';
    }
});

// Toplu kelime ekleme
bulkImportBtn.addEventListener('click', () => {
    const bulkText = bulkWordsInput.value.trim();
    if (!bulkText) return;

    const wordPairs = bulkText.split('\n').map(line => {
        const [english, turkish] = line.split('|').map(word => word.trim());
        return { english, turkish };
    }).filter(pair => pair.english && pair.turkish);

    if (wordPairs.length > 0) {
        ipcRenderer.send('bulk-add-words', wordPairs);
        bulkWordsInput.value = '';
    }
});

// Çalışma bölümü fonksiyonları
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function showNextWord() {
    if (currentWords.length === 0) {
        practiceEnglishWord.textContent = 'Kelime listesi boş!';
        practiceTurkishWord.textContent = '';
        showAnswerBtn.disabled = true;
        nextWordBtn.disabled = true;
        return;
    }

    if (isWordsFinished) {
        practiceEnglishWord.textContent = 'Tüm kelimeler bitti!';
        practiceTurkishWord.textContent = 'Yeni kelimeler ekleyerek devam edebilirsiniz.';
        practiceTurkishWord.classList.add('show');
        showAnswerBtn.disabled = true;
        nextWordBtn.disabled = true;
        return;
    }

    currentWordIndex = (currentWordIndex + 1) % currentWords.length;
    const word = currentWords[currentWordIndex];
    
    practiceEnglishWord.textContent = word.english;
    practiceTurkishWord.textContent = '';
    practiceTurkishWord.classList.remove('show');
    showAnswerBtn.disabled = false;
    nextWordBtn.disabled = false;
}

function showAnswer() {
    const word = currentWords[currentWordIndex];
    practiceTurkishWord.textContent = word.turkish;
    practiceTurkishWord.classList.add('show');
    showAnswerBtn.disabled = true;
}

// Çalışma bölümü butonlarını dinle
showAnswerBtn.addEventListener('click', showAnswer);
nextWordBtn.addEventListener('click', showNextWord);

// Kelimeleri al
ipcRenderer.on('words-loaded', (event, words) => {
    wordsList.innerHTML = '';
    words.forEach(word => {
        wordsList.appendChild(createWordCard(word));
    });

    // Çalışma bölümü için kelimeleri güncelle
    currentWords = [...words];
    shuffleArray(currentWords);
    
    // Eğer çalışma sekmesindeyse, yeni kelimeyi göster
    if (document.querySelector('#practice-tab').classList.contains('active')) {
        showNextWord();
    }

    // Form elemanlarını aktif et
    enableFormElements();
});

// Form elemanlarını aktif etme fonksiyonu
function enableFormElements() {
    englishWordInput.disabled = false;
    turkishWordInput.disabled = false;
    bulkWordsInput.disabled = false;
    addWordForm.querySelector('button').disabled = false;
    bulkImportBtn.disabled = false;
}

// Kelime eklendiğinde
ipcRenderer.on('word-added', () => {
    loadWords();
    isWordsFinished = false;
    enableFormElements();
});

// Kelime silindiğinde
ipcRenderer.on('word-deleted', () => {
    loadWords();
    isWordsFinished = false;
    enableFormElements();
});

// Sekme değiştiğinde form elemanlarını kontrol et
document.querySelectorAll('.nav-link').forEach(tab => {
    tab.addEventListener('shown.bs.tab', () => {
        enableFormElements();
    });
}); 