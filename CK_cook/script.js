const filterCategories = {
    "survival": ["hp", "p_hp", "regen", "regen_b", "l_leech", "food", "food_drain", "ally_regen"],
    "defense": ["armor", "dodge", "m_barrier", "b_res", "burn_im", "mold_im", "s_slow_im", "a_dmg_im"],
    "attack": ["all_dmg", "melee", "r_dmg", "magic", "pet_dmg", "crit", "c_dmg", "b_dmg", "thorns", "speed_a", "m_speed", "r_speed", "minion", "minion_s", "minion_c"],
    "utility": ["speed", "glow", "glow_b", "m_max", "m_regen", "mining", "mining_s", "fish", "knock"]
};

const locationList = [
    "dirt_biome", "clay_caves", "forgotten_ruins", "azeos_wilderness", 
    "mold_biome", "sunken_sea", "desert_beginning", "shimmering_frontier", "lava", "grimy_water",
    "expert_gardener", "acid_water", "larva_drop", "merchant_rare", 
    "cattle_drop", "ghorm_boss", "feeding_dodo", "worm_boss", "halloween"
];

let db = [], translations = {}, currentLang = 'en'; 
let selectedPot = [null, null];
let currentFilter = 'all'; 
let filterType = 'all'; 
let currentSort = 'default';
let isSkillActive = false; 

let categoryState = JSON.parse(localStorage.getItem('categoryState')) || {};

function getInitialLang() {
    const savedLang = localStorage.getItem('siteLang');
    if (savedLang && ['ko', 'en', 'ja'].includes(savedLang)) {
        return savedLang;
    }
    const browserLang = navigator.language || navigator.userLanguage; 
    if (browserLang) {
        if (browserLang.startsWith('ko')) return 'ko';
        if (browserLang.startsWith('ja')) return 'ja';
    }
    return 'en';
}

async function init() {
    try {
        const [data, ko, en, ja] = await Promise.all([
            fetch('data.json').then(r => r.json()),
            fetch('locales/ko.json').then(r => r.json()),
            fetch('locales/en.json').then(r => r.json()),
            fetch('locales/ja.json').then(r => r.json())
        ]);
        db = data;
        
        const injectTexts = (obj, lang) => {
            if(!obj.ui) obj.ui = {};
            if(lang === 'ko') {
                obj.ui.single_notice = "재료를 하나만 선택 시, 해당 재료를 2개 넣은 결과가 표시됩니다.";
                obj.ui.sort_default = "정렬: 기본";
                obj.ui.sort_value = "정렬: 상승치 순";
                obj.ui.sort_location = "정렬: 입수처 순";
                obj.ui.sort_category = "정렬: 품목별";
            }
            if(lang === 'en') {
                obj.ui.single_notice = "Selecting one ingredient shows the result of cooking two of them.";
                obj.ui.sort_default = "Sort: Default";
                obj.ui.sort_value = "Sort: Value (High)";
                obj.ui.sort_location = "Sort: Location";
                obj.ui.sort_category = "Sort: Category";
            }
            if(lang === 'ja') {
                obj.ui.single_notice = "食材を1つだけ選択すると、その食材を2つ使った結果が表示されます。";
                obj.ui.sort_default = "並び替え: デフォルト";
                obj.ui.sort_value = "並び替え: 上昇値順";
                obj.ui.sort_location = "並び替え: 入手場所順";
                obj.ui.sort_category = "並び替え: カテゴリ順";
            }
        };

        injectTexts(ko, 'ko');
        injectTexts(en, 'en');
        injectTexts(ja, 'ja');

        translations = { ko, en, ja };
        setLang(getInitialLang());

    } catch (e) {
        console.error(e);
        document.body.innerHTML = "<h2 style='color:white;text-align:center;margin-top:20px'>Data Load Error!</h2>";
    }
}

function t(path) {
    const keys = path.split('.');
    let obj = translations[currentLang];
    for (let k of keys) obj = obj ? obj[k] : null;
    return obj || path;
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('siteLang', lang);

    document.getElementById('btn_ko').classList.toggle('active', lang === 'ko');
    document.getElementById('btn_en').classList.toggle('active', lang === 'en');
    document.getElementById('btn_ja').classList.toggle('active', lang === 'ja');
    
    document.getElementById('appTitle').innerText = t('ui.title');
    document.getElementById('searchInput').placeholder = t('ui.search_placeholder');
    document.getElementById('txt-show-all').innerText = t('ui.show_all');
    document.getElementById('btn_reset').innerText = t('ui.reset_btn');
    
    // 정렬 옵션 텍스트 갱신
    const sortSelect = document.getElementById('sortSelect');
    sortSelect.options[0].text = t('ui.sort_default');
    sortSelect.options[1].text = t('ui.sort_value');
    sortSelect.options[2].text = t('ui.sort_location');
    sortSelect.options[3].text = t('ui.sort_category');

    const disclaimerMap = {
        'ko': "* 실제 포만감 수치는 요리 조합식에 따라 달라질 수 있습니다.",
        'en': "* Actual food value may vary depending on the recipe.",
        'ja': "* 実際の満腹度はレシピによって異なる場合があります。"
    };
    document.getElementById('foodDisclaimer').innerText = disclaimerMap[lang] || disclaimerMap['ko'];

    createSidebarUI(); 
    render(); updatePot();      
}

// 정렬 설정 함수
function setSort(val) {
    currentSort = val;
    render();
}

function toggleSkillMode() {
    isSkillActive = !isSkillActive;
    updatePot(); 
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }

function toggleCategory(catId) {
    const el = document.getElementById(`cat-${catId}`);
    const isCollapsed = el.classList.contains('collapsed');
    if (isCollapsed) { el.classList.remove('collapsed'); categoryState[catId] = false; } 
    else { el.classList.add('collapsed'); categoryState[catId] = true; }
    localStorage.setItem('categoryState', JSON.stringify(categoryState));
}

function createSidebarUI() {
    const container = document.getElementById('dynamicFilters');
    container.innerHTML = '';
    for (const [catKey, stats] of Object.entries(filterCategories)) {
        createCategoryGroup(container, catKey, t('categories.' + catKey), stats, 'stat');
    }
    createCategoryGroup(container, 'locations', t('ui.loc_category'), locationList, 'loc');
}

function createCategoryGroup(container, catKey, title, items, type) {
    const div = document.createElement('div');
    div.className = 'filter-category';
    div.id = `cat-${catKey}`;
    if (categoryState[catKey]) div.classList.add('collapsed');

    const header = document.createElement('div');
    header.className = 'cat-header';
    header.onclick = () => toggleCategory(catKey);
    header.innerHTML = `<h3>${title}</h3><span class="arrow">▼</span>`;
    div.appendChild(header);

    const content = document.createElement('div');
    content.className = 'cat-content';
    items.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'stat-filter-btn';
        if (currentFilter === key) btn.classList.add('active');
        const labelKey = type === 'stat' ? `stats.${key}` : `locations.${key}`;
        btn.innerText = t(labelKey);
        btn.onclick = () => setFilter(key, type);
        content.appendChild(btn);
    });
    div.appendChild(content);
    container.appendChild(div);
}

function render() {
    const grid = document.getElementById('ingredientGrid');
    grid.innerHTML = '';
    const q = document.getElementById('searchInput').value.toLowerCase();
    
    // 1. 필터링
    let filteredItems = db.filter(i => {
        let match = true;
        if (filterType === 'stat') match = !!i.effects[currentFilter];
        else if (filterType === 'loc') match = (i.loc_id === currentFilter);
        const name = t('items.' + i.id).toLowerCase();
        return match && name.includes(q);
    });

    // 2. 정렬
    if (currentSort === 'value' && filterType === 'stat') {
        // 스탯 필터가 켜져있을 때만 수치 정렬 유효
        filteredItems.sort((a, b) => (b.effects[currentFilter] || 0) - (a.effects[currentFilter] || 0));
    } else if (currentSort === 'location') {
        filteredItems.sort((a, b) => locationList.indexOf(a.loc_id) - locationList.indexOf(b.loc_id));
    } else if (currentSort === 'category') {
        filteredItems.sort((a, b) => a.category.localeCompare(b.category));
    }
    // default는 DB 순서 유지

    // 3. 그리기
    filteredItems.forEach(i => {
        const card = document.createElement('div');
        const isSelected = selectedPot.includes(i);
        card.className = `item-card ${isSelected ? 'selected' : ''} ${i.isGolden ? 'is-golden' : ''}`;
        const rarityClass = i.rarity ? `rarity-${i.rarity}` : 'rarity-common';
        
        // 스탯 배지: 스탯 필터가 켜져있을 때만 표시
        let statBadge = '';
        if (filterType === 'stat' && currentFilter !== 'all') {
            const val = i.effects[currentFilter];
            if (val) {
                statBadge = `<div class="stat-badge">+${val}</div>`;
            }
        }

        card.innerHTML = `
            ${statBadge}
            <img src="${i.img}" class="item-icon" alt="${i.id}"><br>
            <span class="item-name ${rarityClass}">${t('items.' + i.id)}</span>
            <span class="item-loc">${t('locations.' + i.loc_id)}</span>
        `;
        card.onclick = () => addToPot(i);
        grid.appendChild(card);
    });
}

function addToPot(item) {
    const existingIdx = selectedPot.indexOf(item);
    if (existingIdx !== -1) {
        selectedPot[existingIdx] = null;
        updatePot();
        render(); 
        return;
    }

    if (!selectedPot[0]) {
        selectedPot[0] = item;
    } else if (!selectedPot[1]) {
        selectedPot[1] = item;
    } else {
        selectedPot[0] = selectedPot[1];
        selectedPot[1] = item;
    }
    updatePot(); render();
}

function removeFromPot(idx) { selectedPot[idx] = null; updatePot(); render(); }

function formatDuration(sec) {
    if (!sec) return "";
    if (sec >= 60) return `${(sec / 60).toFixed(1).replace('.0','')}${t('time.min')}`;
    return `${sec}${t('time.sec')}`;
}

function getDefaultDuration(statKey) {
    if (["p_hp", "food", "l_leech", "hp"].includes(statKey)) return 0;
    if (statKey.includes("regen")) return 20;
    return 600;
}

function hasSpecialIngredient(items) {
    return items.some(i => i && (i.isGolden || i.rarity === 'legendary'));
}

function updatePot() {
    const slot0 = selectedPot[0];
    const slot1 = selectedPot[1];

    const s0Rarity = slot0 && slot0.rarity ? `rarity-${slot0.rarity}` : 'rarity-common';
    const s1Rarity = slot1 && slot1.rarity ? `rarity-${slot1.rarity}` : 'rarity-common';

    document.getElementById('slot0').innerHTML = slot0 ? `<img src="${slot0.img}">` : '?';
    document.getElementById('name0').innerHTML = slot0 ? `<span class="${s0Rarity}">${t('items.' + slot0.id)}</span>` : '';
    document.getElementById('slot1').innerHTML = slot1 ? `<img src="${slot1.img}">` : '?';
    document.getElementById('name1').innerHTML = slot1 ? `<span class="${s1Rarity}">${t('items.' + slot1.id)}</span>` : '';
    
    const res = document.getElementById('resultStats');
    const goldAlert = document.getElementById('goldAlert');
    const skillToggleContainer = document.getElementById('skillToggleContainer'); 
    const toggleLabel = document.getElementById('skillToggleLabel');
    const toggleBtn = document.getElementById('btn_skill_toggle');
    const singleNotice = document.getElementById('singleItemNotice');

    if(!slot0 && !slot1) {
        res.innerHTML = `<div style='text-align:center; padding-top:40px; color:#555'>${t('ui.empty_pot')}</div>`;
        goldAlert.style.display = 'none';
        if(skillToggleContainer) skillToggleContainer.style.display = 'none'; 
        if(singleNotice) singleNotice.style.display = 'none';
        return;
    }

    if(skillToggleContainer) skillToggleContainer.style.display = 'flex'; 

    let calcItems = [];
    const activeItems = selectedPot.filter(i => i !== null);

    if (activeItems.length === 1) {
        calcItems = [activeItems[0], activeItems[0]];
        if(singleNotice) {
            singleNotice.style.display = 'block';
            singleNotice.innerText = t('ui.single_notice');
        }
    } else {
        calcItems = activeItems;
        if(singleNotice) singleNotice.style.display = 'none';
    }

    const isGold = calcItems.some(i => i?.isGolden);
    const isSpecial = hasSpecialIngredient(calcItems); 
    
    let multiplier = 1.0;
    let gradeText = "";
    let toggleText = "";

    toggleBtn.className = 'toggle-btn';

    if (!isSpecial) {
        toggleText = isSkillActive ? "Master Chef ON (Rare)" : "Master Chef OFF";
        if (isSkillActive) {
            multiplier = 1.25; 
            gradeText = "✨ RARE Dish (x1.25)";
            toggleBtn.classList.add('active-rare'); 
        } else {
            multiplier = 1.0; 
            gradeText = "Common Dish (x1.0)";
        }
    } else {
        toggleText = isSkillActive ? "Master Chef ON (Epic)" : "Master Chef OFF";
        if (isSkillActive) {
            multiplier = 1.5; 
            gradeText = "✨ EPIC Dish (x1.5)";
            toggleBtn.classList.add('active-epic'); 
        } else {
            multiplier = 1.25; 
            gradeText = "✨ RARE Dish (x1.25)";
        }
    }

    if (toggleLabel) toggleLabel.innerText = toggleText;
    
    goldAlert.style.display = 'block';
    goldAlert.innerText = gradeText;

    let valColorClass = 'stat-value';
    if (multiplier === 1.25) valColorClass = 'stat-value val-rare';
    if (multiplier === 1.5) valColorClass = 'stat-value val-epic';

    let bestStats = {};
    let bestDurations = {};

    calcItems.forEach(i => {
        if(!i) return;
        const eff = isGold ? i.golden_effects : i.effects;
        const durs = i.durations || {}; 

        Object.keys(eff).forEach(k => {
            const val = eff[k];
            const currentBestVal = bestStats[k] || 0;

            if (val > currentBestVal) {
                bestStats[k] = val;
                bestDurations[k] = durs[k] || getDefaultDuration(k);
            } 
            else if (val === currentBestVal) {
                const currentBestDur = bestDurations[k] || 0;
                const newDur = durs[k] || getDefaultDuration(k);
                if (newDur > currentBestDur) {
                    bestDurations[k] = newDur;
                }
            }
        });
    });

    let h = `<h4 style='margin:0 0 10px 0; color:#fff; border-bottom:1px solid #333'>${t('ui.result_title')}</h4>`;
    
    Object.keys(bestStats).sort().forEach(k => {
        let val = bestStats[k];
        let dur = bestDurations[k];

        if (k !== 'p_hp') { 
            val = val * multiplier;
        }
        
        const timeStr = dur > 0 ? ` <small style='color:#888'>(${formatDuration(dur)})</small>` : "";
        
        let displayVal = Number.isInteger(val) ? val : parseFloat(val.toFixed(1));
        
        if (['food', 'hp', 'armor', 'mining', 'fish', 'skill'].includes(k)) {
            displayVal = Math.floor(val); 
        }

        h += `<div class="stat-row">
                <span>${t('stats.' + k)}</span>
                <div>
                    <span class="${valColorClass}">${displayVal}</span>
                    ${timeStr}
                </div>
              </div>`;
    });
    res.innerHTML = h;
}

function setFilter(key, type) {
    currentFilter = key;
    filterType = type; 
    const btnAll = document.getElementById('btn-all');
    if (btnAll) btnAll.classList.remove('active');
    document.querySelectorAll('.stat-filter-btn').forEach(btn => btn.classList.remove('active'));
    if (key === 'all' && btnAll) btnAll.classList.add('active');
    createSidebarUI(); 
    if(window.innerWidth <= 768) toggleSidebar(); 
    render();
}

function clearPotOnly() { 
    selectedPot = [null, null]; 
    updatePot(); 
    render(); 
}

init();