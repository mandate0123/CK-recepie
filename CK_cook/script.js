const filterCategories = {
    "survival": ["hp", "p_hp", "regen", "regen_b", "l_leech", "food", "food_drain", "ally_regen"],
    "defense": ["armor", "dodge", "m_barrier", "b_res", "burn_im", "mold_im", "s_slow_im", "a_dmg_im"],
    "attack": ["all_dmg", "melee", "r_dmg", "magic", "pet_dmg", "crit", "c_dmg", "b_dmg", "thorns", "speed_a", "m_speed", "r_speed", "minion", "minion_s", "minion_c"],
    "utility": ["speed", "glow_b", "m_max", "m_regen", "mining", "mining_s", "fish", "knock"]
};

const locationList = [
    "dirt_biome", "clay_caves", "forgotten_ruins", "azeos_wilderness", 
    "mold_biome", "sunken_sea", "desert_beginning", "shimmering_frontier", "lava", "grimy_water",
    "expert_gardener", "acid_water", "larva_drop", "merchant_rare", 
    "cattle_drop", "ghorm_boss", "feeding_dodo", "worm_boss", "halloween"
];

const dishValues = {
    "soup": 20, "salad": 5, "pudding": 10, "wrap": 15, "steak": 20,
    "dip_snack": 5, "fillet": 20, "fish_balls": 20, "sushi": 15, "cake": 20,
    "cereal": 20, "cheese": 5, "smoothie": 20, "curry": 20, "sandwich": 15
};

let db = [], translations = {}, currentLang = 'en'; 
let selectedPot = [null, null];
let currentFilter = 'all'; 
let filterType = 'all'; 
let currentSort = 'default'; 
let isSkillActive = false; 

let favIngredients = JSON.parse(localStorage.getItem('favIngredients')) || [];
let savedRecipes = JSON.parse(localStorage.getItem('savedRecipes')) || [];
let categoryState = JSON.parse(localStorage.getItem('categoryState')) || {};

let isMobileDetailView = false; 

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
                obj.ui.sort_default = "기본";
                obj.ui.sort_value = "상승치";
                obj.ui.sort_location = "입수처";
                obj.ui.sort_category = "품목별";
                obj.ui.empty_pot = "재료를 선택하세요.";
                obj.ui.filter_fav = "★ 즐겨찾기";
                obj.ui.btn_save_recipe = "레시피 저장";
                obj.ui.recipe_book = "요리책";
                obj.ui.no_saved_recipe = "저장된 요리가 없습니다.";
                obj.ui.recipe_saved = "요리가 저장되었습니다!";
                obj.ui.enter_recipe_name = "이 레시피의 이름을 입력하세요:";
                obj.ui.default_recipe_name = "나만의 요리";
            }
            if(lang === 'en') {
                obj.ui.single_notice = "Selecting one ingredient shows the result of cooking two of them.";
                obj.ui.sort_default = "Default";
                obj.ui.sort_value = "Value";
                obj.ui.sort_location = "Loc";
                obj.ui.sort_category = "Cat";
                obj.ui.empty_pot = "Select ingredients.";
                obj.ui.filter_fav = "★ Favorites";
                obj.ui.btn_save_recipe = "Save Recipe";
                obj.ui.recipe_book = "Recipe Book";
                obj.ui.no_saved_recipe = "No saved recipes.";
                obj.ui.recipe_saved = "Recipe Saved!";
                obj.ui.enter_recipe_name = "Enter recipe name:";
                obj.ui.default_recipe_name = "Custom Recipe";
            }
            if(lang === 'ja') {
                obj.ui.single_notice = "食材を1つだけ選択すると、それを2つ使った結果が表示されます。";
                obj.ui.sort_default = "基本";
                obj.ui.sort_value = "値順";
                obj.ui.sort_location = "場所";
                obj.ui.sort_category = "種類";
                obj.ui.empty_pot = "食材を選択してください。";
                obj.ui.filter_fav = "★ お気に入り";
                obj.ui.btn_save_recipe = "レシピ保存";
                obj.ui.recipe_book = "レシピ本";
                obj.ui.no_saved_recipe = "保存されたレシピはありません。";
                obj.ui.recipe_saved = "レシピを保存しました！";
                obj.ui.enter_recipe_name = "レシピの名前を入力してください:";
                obj.ui.default_recipe_name = "マイレシピ";
            }
        };

        injectTexts(ko, 'ko');
        injectTexts(en, 'en');
        injectTexts(ja, 'ja');

        translations = { ko, en, ja };
        setLang(getInitialLang());
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && isMobileDetailView) {
                isMobileDetailView = false;
                const btn = document.getElementById('btn_mobile_detail');
                if(btn) btn.classList.remove('active');
            }
            render();
        });

        window.onclick = function(event) {
            if (!event.target.matches('.lang-globe-btn')) {
                var dropdowns = document.getElementsByClassName("lang-dropdown");
                for (var i = 0; i < dropdowns.length; i++) {
                    var openDropdown = dropdowns[i];
                    if (openDropdown.classList.contains('show')) {
                        openDropdown.classList.remove('show');
                    }
                }
            }
        }

    } catch (e) {
        console.error(e);
        document.body.innerHTML = `<h2 style='color:white;text-align:center;margin-top:20px'>Data Load Error!</h2>`;
    }
}

function t(path) {
    const keys = path.split('.');
    let obj = translations[currentLang];
    for (let k of keys) obj = obj ? obj[k] : null;
    return obj || path;
}

function toggleLangMenu() {
    const menu = document.getElementById("langMenu");
    if(menu) menu.classList.toggle("show");
}

function selectLang(lang) {
    setLang(lang);
    const menu = document.getElementById("langMenu");
    if(menu) menu.classList.remove("show"); 
}

function setTextIfFound(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('siteLang', lang);

    ['btn_ko', 'btn_en', 'btn_ja'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('active', id === `btn_${lang}`);
    });
    
    setTextIfFound('appTitle', t('ui.title'));
    
    const pcInput = document.getElementById('searchInputPC');
    if (pcInput) pcInput.placeholder = t('ui.search_placeholder');
    
    const mobileInput = document.getElementById('searchInputMobile');
    if (mobileInput) mobileInput.placeholder = t('ui.search_placeholder');
    
    setTextIfFound('txt-show-all', t('ui.show_all'));
    setTextIfFound('sort-default', t('ui.sort_default'));
    setTextIfFound('sort-value', t('ui.sort_value'));
    setTextIfFound('sort-location', t('ui.sort_location'));
    setTextIfFound('btn_reset', t('ui.reset_btn'));
    setTextIfFound('btn_save_recipe', t('ui.btn_save_recipe'));
    
    const recipeBookBtn = document.getElementById('btn_recipe_book');
    if(recipeBookBtn) recipeBookBtn.title = t('ui.recipe_book');

    const disclaimerMap = {
        'ko': "* 계산 방식의 문제로 0.1 단위의 오차가 있을 수 있습니다.",
        'en': "* There may be a margin of error of 0.1 due to the calculation method.",
        'ja': "* 演算の都合上、0.1単位の誤差が生じる場合があります。"
    };
    setTextIfFound('foodDisclaimer', disclaimerMap[lang] || disclaimerMap['ko']);

    addFavFilterBtn(); 
    updateMobileFilterLabel();
    createSidebarUI(); 
    render(); updatePot();      
}

function toggleMobileSearch() {
    const bar = document.getElementById('mobileSearchContainer');
    const input = document.getElementById('searchInputMobile');
    if (bar && bar.style.display === 'none') {
        bar.style.display = 'flex';
        if(input) input.focus();
    } else if(bar) {
        bar.style.display = 'none';
        if(input) input.value = '';
        render(); 
    }
}

function setSort(val) {
    currentSort = val;
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-sort') === val);
    });
    render();
}

function toggleSkillMode() {
    isSkillActive = !isSkillActive;
    updatePot(); 
}

function toggleSidebar() { 
    const sb = document.getElementById('sidebar');
    if(sb) sb.classList.toggle('active'); 
}

function toggleCategory(catId) {
    const el = document.getElementById(`cat-${catId}`);
    if(!el) return;
    const isCollapsed = el.classList.contains('collapsed');
    if (isCollapsed) { el.classList.remove('collapsed'); categoryState[catId] = false; } 
    else { el.classList.add('collapsed'); categoryState[catId] = true; }
    localStorage.setItem('categoryState', JSON.stringify(categoryState));
}

function createSidebarUI() {
    const container = document.getElementById('dynamicFilters');
    if(!container) return;
    container.innerHTML = '';
    
    addFavFilterBtn();

    for (const [catKey, stats] of Object.entries(filterCategories)) {
        createCategoryGroup(container, catKey, t('categories.' + catKey), stats, 'stat');
    }
    createCategoryGroup(container, 'locations', t('ui.loc_category'), locationList, 'loc');
}

function addFavFilterBtn() {
    const container = document.querySelector('.pc-filters .filter-category');
    if(!container) return;
    
    let btn = document.getElementById('btn-fav');
    if(!btn) {
        btn = document.createElement('button');
        btn.className = 'stat-filter-btn fav-filter-btn';
        btn.id = 'btn-fav';
        btn.onclick = () => setFilter('fav', 'special');
        container.appendChild(btn); 
    }
    btn.innerHTML = `<span id="txt-fav">${t('ui.filter_fav')}</span>`;
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

function openFilterModal() {
    closeResultPanel(); 

    const modal = document.getElementById('filterModal');
    const body = document.getElementById('modalBody');
    const title = document.getElementById('modalTitle');
    if(!modal || !body) return;
    
    title.innerText = t('ui.modal_title') || "Select Category";
    body.innerHTML = ''; 

    const gridDiv = document.createElement('div');
    gridDiv.className = 'modal-grid-container';

    const allBtn = document.createElement('button');
    allBtn.className = `modal-btn ${currentFilter === 'all' ? 'active' : ''}`;
    allBtn.style.gridColumn = "1 / -1"; 
    allBtn.innerText = t('ui.show_all') || "All Ingredients";
    allBtn.onclick = () => { setFilter('all', 'all'); closeModal(); };
    gridDiv.appendChild(allBtn);
    
    const favBtn = document.createElement('button');
    favBtn.className = `modal-btn fav-filter-btn ${currentFilter === 'fav' ? 'active' : ''}`;
    favBtn.style.gridColumn = "1 / -1";
    favBtn.innerText = t('ui.filter_fav');
    favBtn.onclick = () => { setFilter('fav', 'special'); closeModal(); };
    gridDiv.appendChild(favBtn);

    const appendGroup = (catKey, items, type) => {
        const groupTitle = document.createElement('div');
        groupTitle.className = 'modal-group-title';
        groupTitle.innerText = catKey === 'locations' ? t('ui.loc_category') : t('categories.' + catKey);
        gridDiv.appendChild(groupTitle);

        items.forEach(key => {
            const btn = document.createElement('button');
            const isActive = (currentFilter === key);
            btn.className = `modal-btn ${isActive ? 'active' : ''}`;
            const labelKey = type === 'stat' ? `stats.${key}` : `locations.${key}`;
            btn.innerText = t(labelKey);
            btn.onclick = () => { setFilter(key, type); closeModal(); };
            gridDiv.appendChild(btn);
        });
    };

    for (const [catKey, stats] of Object.entries(filterCategories)) {
        appendGroup(catKey, stats, 'stat');
    }
    appendGroup('locations', locationList, 'loc');

    body.appendChild(gridDiv);
    modal.style.display = 'flex';
}

function closeModal(e) {
    const modal = document.getElementById('filterModal');
    if(!modal) return;
    if (!e || e.target.id === 'filterModal' || e.target.className === 'close-modal') {
        modal.style.display = 'none';
    }
}

function setFilter(key, type) {
    currentFilter = key;
    filterType = type; 
    
    const btnAll = document.getElementById('btn-all');
    if (btnAll) btnAll.classList.remove('active');
    
    document.querySelectorAll('.stat-filter-btn').forEach(btn => btn.classList.remove('active'));

    if (key === 'fav') {
        const favBtn = document.getElementById('btn-fav');
        if(favBtn) favBtn.classList.add('active');
        const mobLabel = document.getElementById('mobileFilterLabel');
        if(mobLabel) mobLabel.innerText = t('ui.filter_fav');
    }
    else if (key === 'all') {
        if(btnAll) btnAll.classList.add('active');
        updateMobileFilterLabel();
    } else {
        document.querySelectorAll('.stat-filter-btn').forEach(btn => {
            const labelKey = (type === 'stat' ? 'stats.' : 'locations.') + key;
            if (btn.innerText === t(labelKey)) btn.classList.add('active');
        });
        updateMobileFilterLabel();
    }

    render();
}

function updateMobileFilterLabel() {
    const label = document.getElementById('mobileFilterLabel');
    if (!label) return;
    if (currentFilter === 'all') {
        label.innerText = t('ui.show_all');
    } else if (currentFilter === 'fav') {
        label.innerText = t('ui.filter_fav');
    } else {
        const labelKey = filterType === 'stat' ? `stats.${currentFilter}` : `locations.${currentFilter}`;
        label.innerText = t(labelKey);
    }
}

function toggleMobileDetailView() {
    isMobileDetailView = !isMobileDetailView;
    document.getElementById('btn_mobile_detail').classList.toggle('active', isMobileDetailView);
    render();
}

function render() {
    const grid = document.getElementById('ingredientGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    const searchPC = document.getElementById('searchInputPC');
    const searchMobile = document.getElementById('searchInputMobile');
    
    let q = "";
    if (window.innerWidth >= 769) {
        q = searchPC ? searchPC.value.toLowerCase() : "";
    } else {
        q = searchMobile ? searchMobile.value.toLowerCase() : "";
    }
    
    let filteredItems = db.filter(i => {
        let match = true;
        if (currentFilter === 'fav') {
            match = favIngredients.includes(i.id);
        }
        else if (filterType === 'stat') match = !!i.effects[currentFilter];
        else if (filterType === 'loc') match = (i.loc_id === currentFilter);
        
        const name = t('items.' + i.id).toLowerCase();
        return match && name.includes(q);
    });

    if (currentSort === 'value' && filterType === 'stat') {
        filteredItems.sort((a, b) => (b.effects[currentFilter] || 0) - (a.effects[currentFilter] || 0));
    } else if (currentSort === 'location') {
        filteredItems.sort((a, b) => locationList.indexOf(a.loc_id) - locationList.indexOf(b.loc_id));
    }

    filteredItems.forEach(i => {
        const card = document.createElement('div');
        const isSelected = selectedPot.includes(i);
        card.className = `item-card ${isSelected ? 'selected' : ''} ${i.isGolden ? 'is-golden' : ''} ${isMobileDetailView ? 'expanded' : ''}`;
        const rarityClass = i.rarity ? `rarity-${i.rarity}` : 'rarity-common';
        
        const isFav = favIngredients.includes(i.id);
        const favClass = isFav ? 'active' : '';

        let statBadge = '';
        if (filterType === 'stat' && currentFilter !== 'all' && currentFilter !== 'fav') {
            const val = i.effects[currentFilter];
            if (val) {
                statBadge = `<div class="stat-badge">+${val}</div>`;
            }
        }

        let detailStatsHtml = '';
        if (isMobileDetailView) {
            detailStatsHtml = `<div class="mobile-stats-container">`;
            Object.keys(i.effects).forEach(k => {
                let val = i.effects[k];
                const isHighlight = (filterType === 'stat' && k === currentFilter);
                const nameKey = `stats.${k}`;
                const statName = t(nameKey).includes('stats.') ? k : t(nameKey);
                const highlightClass = isHighlight ? 'stat-highlight' : '';
                detailStatsHtml += `<span class="mobile-stat-item ${highlightClass}">${statName}: ${val}</span>`;
            });
            detailStatsHtml += `</div>`;
        }

        card.innerHTML = `
            <div class="fav-star ${favClass}" onclick="toggleFavIng(event, '${i.id}')">★</div>
            ${statBadge}
            <img src="${i.img}" class="item-icon" alt="${i.id}">
            <span class="item-name ${rarityClass}">${t('items.' + i.id)}</span>
            <span class="item-loc">${t('locations.' + i.loc_id)}</span>
            ${detailStatsHtml}
        `;
        
        card.onclick = (e) => {
            if(e.target.classList.contains('fav-star')) return;
            addToPot(i);
        };

        if(window.innerWidth > 768) {
            card.onmouseenter = () => showTooltip(i);
            card.onmousemove = (e) => moveTooltip(e);
            card.onmouseleave = () => hideTooltip();
        }

        grid.appendChild(card);
    });
}

function toggleResultPanel() {
    const panel = document.getElementById('resultPanel');
    if(panel) panel.classList.toggle('open');
}

function openResultPanel() {
    const panel = document.getElementById('resultPanel');
    if(panel) panel.classList.add('open');
}

function closeResultPanel() {
    const panel = document.getElementById('resultPanel');
    if(panel) panel.classList.remove('open');
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
    
    updatePot(); 
    render();
    
    if (window.innerWidth <= 768) {
        openResultPanel();
    }
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

    const elSlot0 = document.getElementById('slot0');
    const elSlot1 = document.getElementById('slot1');
    const elName0 = document.getElementById('name0');
    const elName1 = document.getElementById('name1');
    const elSlot0Mobile = document.getElementById('slot0_mobile');
    const elSlot1Mobile = document.getElementById('slot1_mobile');

    if(elSlot0) elSlot0.innerHTML = slot0 ? `<img src="${slot0.img}">` : '?';
    if(elSlot0Mobile) elSlot0Mobile.innerHTML = slot0 ? `<img src="${slot0.img}">` : '?';
    if(elName0) elName0.innerHTML = slot0 ? `<span class="${slot0.rarity ? `rarity-${slot0.rarity}` : 'rarity-common'}">${t('items.' + slot0.id)}</span>` : '';
    
    if(elSlot1) elSlot1.innerHTML = slot1 ? `<img src="${slot1.img}">` : '?';
    if(elSlot1Mobile) elSlot1Mobile.innerHTML = slot1 ? `<img src="${slot1.img}">` : '?';
    if(elName1) elName1.innerHTML = slot1 ? `<span class="${slot1.rarity ? `rarity-${slot1.rarity}` : 'rarity-common'}">${t('items.' + slot1.id)}</span>` : '';
    
    const res = document.getElementById('resultStats');
    const goldAlert = document.getElementById('goldAlert');
    const mobileBadge = document.getElementById('mobileRarityBadge');
    const skillToggleContainer = document.getElementById('skillToggleContainer'); 
    const singleNotice = document.getElementById('singleItemNotice');

    if(!slot0 && !slot1) {
        if(res) res.innerHTML = `<div class="empty-msg-container"><div class="empty-msg">${t('ui.empty_pot')}</div></div>`;
        if(goldAlert) goldAlert.style.display = 'none';
        if(mobileBadge) mobileBadge.style.display = 'none';
        if(skillToggleContainer) skillToggleContainer.style.display = 'none'; 
        if(singleNotice) singleNotice.style.display = 'none';
        return;
    }

    if(skillToggleContainer) skillToggleContainer.style.display = 'flex'; 

    let calcItems = [];
    const activeItems = selectedPot.filter(i => i !== null);
    if (activeItems.length === 1) {
        calcItems = [activeItems[0], activeItems[0]];
        if(singleNotice) { singleNotice.style.display = 'block'; singleNotice.innerText = t('ui.single_notice'); }
    } else {
        calcItems = activeItems;
        if(singleNotice) singleNotice.style.display = 'none';
    }

    const countSpecial = calcItems.filter(i => i && (i.isGolden || i.rarity === 'legendary')).length;
    const isBothSpecial = (countSpecial === 2);
    const hasAnySpecial = (countSpecial >= 1);
    
    let multiplier = 1.0;
    let gradeText = "";
    let shortGradeText = "";
    let bgClass = ""; 

    if (hasAnySpecial) {
        if (isSkillActive) {
            multiplier = 1.5; 
            gradeText = "✨ EPIC Dish (x1.5)";
            shortGradeText = "Epic x1.5";
            bgClass = "bg-epic";
        } else {
            multiplier = 1.25; 
            gradeText = "✨ RARE Dish (x1.25)";
            shortGradeText = "Rare x1.25";
            bgClass = "bg-rare";
        }
    } else {
        if (isSkillActive) {
            multiplier = 1.25; 
            gradeText = "✨ RARE Dish (x1.25)";
            shortGradeText = "Rare x1.25";
            bgClass = "bg-rare";
        } else {
            multiplier = 1.0; 
            gradeText = "Common Dish (x1.0)";
            shortGradeText = "Common x1.0";
            bgClass = "bg-common";
        }
    }

    if (isBothSpecial) {
        multiplier = multiplier * 1.15;
    }
    
    if(goldAlert) {
        goldAlert.style.display = 'block';
        goldAlert.innerText = gradeText;
        goldAlert.className = `golden-notice pc-only-alert ${bgClass}`; 
    }

    if(mobileBadge) {
        mobileBadge.style.display = 'block';
        mobileBadge.innerText = shortGradeText;
        mobileBadge.className = `mobile-rarity-badge ${bgClass}`;
    }

    const mobBtn = document.getElementById('btn_skill_toggle_mobile');
    const mobLabel = document.getElementById('skillToggleLabel_mobile');
    if(mobBtn) {
        let btnClass = 'toggle-btn';
        if (isSkillActive) {
            btnClass += (multiplier >= 1.5) ? ' active-epic' : ' active-rare';
        }
        mobBtn.className = btnClass;
    }
    if(mobLabel) {
        mobLabel.innerText = isSkillActive ? "Chef ON" : "Chef OFF";
    }

    const pcBtn = document.getElementById('btn_skill_toggle');
    if(pcBtn) {
        let btnClass = 'toggle-btn';
        if (isSkillActive) {
            btnClass += (multiplier >= 1.5) ? ' active-epic' : ' active-rare';
        }
        pcBtn.className = btnClass;
    }

    let valColorClass = 'stat-value';
    if (multiplier >= 1.25 && multiplier < 1.5) valColorClass = 'stat-value val-rare';
    if (multiplier >= 1.5) valColorClass = 'stat-value val-epic';

    let bestStats = {};
    let bestDurations = {};

    calcItems.forEach(i => {
        if(!i) return;
        const eff = i.effects; 
        const durs = i.durations || {}; 
        Object.keys(eff).forEach(k => {
            const val = eff[k];
            
            if (k === 'food') return;

            if (k === 'p_hp') {
                bestStats[k] = Math.max((bestStats[k] || 0), val);
            } else {
                const currentBestVal = bestStats[k] || 0;
                if (val > currentBestVal) {
                    bestStats[k] = val;
                    bestDurations[k] = durs[k] || getDefaultDuration(k);
                } else if (val === currentBestVal) {
                    const currentBestDur = bestDurations[k] || 0;
                    const newDur = durs[k] || getDefaultDuration(k);
                    if (newDur > currentBestDur) bestDurations[k] = newDur;
                }
            }
        });
    });

    let dominantItem = null;
    let maxFoodInIng = -1;

    calcItems.forEach(i => {
        const f = i.effects.food || 0;
        if (f > maxFoodInIng) {
            maxFoodInIng = f;
            dominantItem = i;
        }
    });

    let baseFood = 0;
    if (dominantItem && dominantItem.dish_type) {
        const hiddenFood = dishValues[dominantItem.dish_type] || 0;
        const f1 = calcItems[0] ? (calcItems[0].effects.food || 0) : 0;
        const f2 = calcItems[1] ? (calcItems[1].effects.food || 0) : 0;
        baseFood = Math.max(f1, f2, hiddenFood);
    } else {
        baseFood = maxFoodInIng;
    }
    
    bestStats['food'] = baseFood;

    let h = "";
    Object.keys(bestStats).sort().forEach(k => {
        let val = bestStats[k];
        let dur = bestDurations[k];
        
        if (k !== 'p_hp') val = val * multiplier;
        
        if (val <= 0.001) return;

        const timeStr = dur > 0 ? ` <small style='color:#888'>(${formatDuration(dur)})</small>` : "";
        
        let displayVal;

        if (k.endsWith('_im')) {
             if (val < 1) return; 
             displayVal = "✔"; 
        } 

        else if (['armor', 'food', 'glow_b', 'hp', 'mining'].includes(k)) {
             displayVal = Math.ceil(val - 0.5);
        } 

        else {
             displayVal = Math.ceil(val * 10) / 10;
        }

        h += `<div class="stat-row">
                <span>${t('stats.' + k)}</span>
                <div>
                    <span class="${valColorClass}">${displayVal}</span>
                    ${timeStr}
                </div>
              </div>`;
    });
    if(res) res.innerHTML = h;
}

function clearPotOnly() { 
    selectedPot = [null, null]; 
    updatePot(); 
    render(); 
}

function toggleFavIng(e, id) {
    e.stopPropagation(); 
    const idx = favIngredients.indexOf(id);
    if (idx > -1) {
        favIngredients.splice(idx, 1);
    } else {
        favIngredients.push(id);
    }
    localStorage.setItem('favIngredients', JSON.stringify(favIngredients));
    render();
}

function saveCurrentRecipe() {
    if (!selectedPot[0] && !selectedPot[1]) return;
    
    const ids = [
        selectedPot[0] ? selectedPot[0].id : null, 
        selectedPot[1] ? selectedPot[1].id : null
    ].sort();

    const exists = savedRecipes.some(r => {
        const rIds = [r.id1, r.id2].sort();
        return rIds[0] === ids[0] && rIds[1] === ids[1];
    });

    if (exists) {
        alert(t('ui.recipe_saved')); 
        return;
    }

    const defaultName = t('ui.default_recipe_name');
    const nameInput = prompt(t('ui.enter_recipe_name'), defaultName);

    if (nameInput === null) return;

    const finalName = nameInput.trim() || defaultName;

    savedRecipes.push({ 
        id1: ids[0], 
        id2: ids[1],
        name: finalName 
    });
    
    localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
    openRecipeBook();
}

function openRecipeBook() {
    const modal = document.getElementById('filterModal'); 
    const body = document.getElementById('modalBody');
    const title = document.getElementById('modalTitle');
    
    title.innerText = t('ui.recipe_book');
    body.innerHTML = '';

    if (savedRecipes.length === 0) {
        body.innerHTML = `<div style="text-align:center; padding:20px; color:#888;">${t('ui.no_saved_recipe')}</div>`;
    } else {
        const list = document.createElement('div');
        list.className = 'recipe-list';
        
        savedRecipes.forEach((recipe, idx) => {
            const item1 = db.find(i => i.id === recipe.id1);
            const item2 = db.find(i => i.id === recipe.id2);
            
            const recipeName = recipe.name || t('ui.default_recipe_name');

            const row = document.createElement('div');
            row.className = 'recipe-row';
            row.innerHTML = `
                <div class="recipe-info" onclick="loadRecipe(${idx})">
                    <div class="recipe-name">${recipeName}</div>
                    <div class="recipe-imgs">
                        ${item1 ? `<img src="${item1.img}">` : '<div class="empty-slot">?</div>'}
                        <span>+</span>
                        ${item2 ? `<img src="${item2.img}">` : '<div class="empty-slot">?</div>'}
                    </div>
                </div>
                <button class="recipe-del-btn" onclick="removeRecipe(${idx})">🗑️</button>
            `;
            list.appendChild(row);
        });
        body.appendChild(list);
    }
    
    modal.style.display = 'flex';
}

function loadRecipe(idx) {
    const recipe = savedRecipes[idx];
    selectedPot = [
        recipe.id1 ? db.find(i => i.id === recipe.id1) : null,
        recipe.id2 ? db.find(i => i.id === recipe.id2) : null
    ];
    updatePot();
    render();
    closeModal();
    if (window.innerWidth <= 768) openResultPanel();
}

function removeRecipe(idx) {
    savedRecipes.splice(idx, 1);
    localStorage.setItem('savedRecipes', JSON.stringify(savedRecipes));
    openRecipeBook(); 
}

const tooltipEl = document.getElementById('hoverTooltip');

function showTooltip(item) {
    if(!tooltipEl) return;
    
    let statsHtml = '';
    Object.keys(item.effects).forEach(k => {
        let val = item.effects[k];
        let displayVal = val;
        if (['food', 'hp', 'mining', 'armor'].includes(k)) displayVal = Math.floor(val);
        
        const nameKey = `stats.${k}`;
        const statName = t(nameKey).includes('stats.') ? k : t(nameKey);

        statsHtml += `
            <div class="tooltip-row">
                <span>${statName}</span>
                <span class="tooltip-val">+${displayVal}</span>
            </div>`;
    });

    tooltipEl.innerHTML = `
        <div class="tooltip-title">${t('items.' + item.id)}</div>
        ${statsHtml}
    `;
    tooltipEl.style.display = 'block';
}

function moveTooltip(e) {
    if(!tooltipEl) return;
    tooltipEl.style.left = (e.clientX + 15) + 'px';
    tooltipEl.style.top = (e.clientY + 15) + 'px';
}

function hideTooltip() {
    if(tooltipEl) tooltipEl.style.display = 'none';
}

init();