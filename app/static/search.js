const openBtn = document.getElementById('openSearchBtn');
const closeBtn = document.getElementById('closeModalBtn');
const modal = document.getElementById('searchModal');
const overlay = document.getElementById('modalOverlay');

const yearInput = document.getElementById('search-yearInput');
const search_yearlist = document.getElementById('search-yearlist');
const monthFrom = document.getElementById('monthFrom');
const monthTo = document.getElementById('monthTo');
const search_accountInput = document.getElementById('search-accountInput');
const search_accountlist = document.getElementById('search-accountlist');

const applyBtn = document.getElementById('applyFilterBtn');
const resetBtn = document.getElementById('resetFilterBtn');
const filterPreview = document.getElementById('filterPreview');    

function monthName(val) {
    if (!val) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[parseInt(val) - 1] || '';
}

function LoadData(applyYear) {
    const data = JSON.parse(localStorage.getItem('cfjson'));
    const uniqueYear = [...new Set(
        data.map(d => Number(d.Year_field)).filter(Boolean)
    )].sort((a, b) => b - a);

    const uniqueAccount = [...new Set(
        data.map(d => d.Account_Name).filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));


    function renderYearList(filter = "") {
        search_yearlist.innerHTML = "";

        const filtered = uniqueYear.filter(y =>
            y.toString().includes(filter)
        );

        if (!filtered.length) {
            search_yearlist.style.display = "none";
            return;
        }

        filtered.forEach(yr => {
            const div = document.createElement("div");
            div.className = "lookup-item";
            div.textContent = yr;
            div.dataset.value = yr;
            search_yearlist.appendChild(div);
        });

        search_yearlist.style.display = "block";
    }

    // yearInput.addEventListener("focus", () => renderYearList(""));
    // yearInput.addEventListener("input", () => renderYearList(yearInput.value));
    yearInput.onfocus = () => renderYearList("");
    yearInput.oninput = () => renderYearList(yearInput.value);

    // search_yearlist.addEventListener("click", e => {
    search_yearlist.onclick = e => {
        const item = e.target.closest(".lookup-item");
        if (!item) return;

        yearInput.value = item.dataset.value;
        search_yearlist.style.display = "none";
    };

    /* ---------- ACCOUNT LOOKUP ---------- */

    function renderAccountList(filter = "") {
        search_accountlist.innerHTML = "";

        const filtered = uniqueAccount.filter(a =>
            a.toLowerCase().includes(filter.toLowerCase())
        );

        if (!filtered.length) {
            search_accountlist.style.display = "none";
            return;
        }

        filtered.forEach(acc => {
            const div = document.createElement("div");
            div.className = "lookup-item";
            div.textContent = acc;
            div.dataset.value = acc;
            search_accountlist.appendChild(div);
        });

        search_accountlist.style.display = "block";
    }

    // search_accountInput.addEventListener("focus", () => renderAccountList(""));
    // search_accountInput.addEventListener("input", () =>
    //     renderAccountList(search_accountInput.value)
    // );
    search_accountInput.onfocus = () => renderAccountList("");
    search_accountInput.oninput = () => renderAccountList(search_accountInput.value);

    // search_accountlist.addEventListener("click", e => {
    search_accountlist.onclick = e => {
        const item = e.target.closest(".lookup-item");
        if (!item) return;

        search_accountInput.value = item.dataset.value;
        search_accountlist.style.display = "none";
    };

    /* ---------- APPLY FILTER ---------- */

    // applyBtn.addEventListener("click", async() => {
    applyBtn.onclick = async () => {
        const year = yearInput.value;
        const account = search_accountInput.value;
        const fromMonth = monthFrom.value; 
        const toMonth = monthTo.value;

        let filteredData = [...data];

        if (year) {
            filteredData = filteredData.filter(d =>
                String(d.Year_field) === year
            );
        }

        if (account) {
            filteredData = filteredData.filter(d =>
                d.Account_Name === account
            );
        }

        if (fromMonth && toMonth) {
            const from = monthsMap[fromMonth];
            const to = monthsMap[toMonth];

            filteredData = filteredData.filter(d => {
                const m = monthsMap[d.Month_field];
                return m >= from && m <= to;
            });
        }

        /* ---------- FILTER PREVIEW ---------- */

        const preview = [];
        if (year) preview.push(`Year: ${year}`);
        if (account) preview.push(`Account: ${account}`);
        if (fromMonth && toMonth) preview.push(`Month: ${fromMonth} → ${toMonth}`);

        filterPreview.innerHTML = preview.length
            ? preview.join(" · ")
            : "No active filters";
        closeModal();

        if(!year){
            const filteredDatas = filteredData.filter(item => item.Year_field == applyYear);
            filteredData = filteredDatas
        }
        if(preview.length > 0){
            RenderCashFlow('', '',filteredData, '', 'search')
        }else{
            const userList = await getUserDetail("All_Users_Js", "", [])
            if(userList != null){
                const orgId = userList[0];
                await RenderCashFlow("CashFlow_Report_Js", "",[], orgId, "default")
            }
        }
    };

    /* ---------- RESET FILTER ---------- */

    // resetBtn.addEventListener("click", () => {
    resetBtn.onclick = () => {
        yearInput.value = "";
        search_accountInput.value = "";
        monthFrom.value = "";
        monthTo.value = "";

        filterPreview.innerHTML = "No active filters";
    };

    /* ---------- CLOSE LOOKUPS ON OUTSIDE CLICK ---------- */
    [yearInput, search_yearlist, search_accountInput, search_accountlist]
        .forEach(el => {
            el.addEventListener("mousedown", e => e.stopPropagation());
        });
    
}
document.addEventListener("mousedown", () => {
    search_yearlist.style.display = "none";
    search_accountlist.style.display = "none";
});

// update both previews
// function updatePreviews() {
//     const yearVal = yearInput.value.trim();
//     const fromVal = monthFrom.value;
//     const toVal = monthTo.value;
    

//     // preview inside modal
//     let yearText = yearVal ? yearVal : '—';
//     let monthText = '';
//     if (fromVal && toVal) {
//         monthText = `${monthName(fromVal)} – ${monthName(toVal)}`;
//     } else if (fromVal) {
//         monthText = `from ${monthName(fromVal)}`;
//     } else if (toVal) {
//         monthText = `up to ${monthName(toVal)}`;
//     } else {
//         monthText = 'all months';
//     }

//     // main card preview
//     if (filterPreview) {
//         if (!yearVal && !fromVal && !toVal) {
//             filterPreview.innerHTML = `<i class="bi bi-funnel" style="margin-right: 6px;"></i> No active filters`;
//         } else {
//             let main = `<i class="bi bi-funnel-fill me-1"></i> `;
//             if (yearVal) main += `Year: ${yearVal} `;
//             if (fromVal || toVal) {
//                 if (yearVal) main += `· `;
//                 main += `Months: `;
//                 if (fromVal && toVal) main += `${monthName(fromVal)} – ${monthName(toVal)}`;
//                 else if (fromVal) main += `from ${monthName(fromVal)}`;
//                 else if (toVal) main += `to ${monthName(toVal)}`;
//             }
//             filterPreview.innerHTML = main;
//         }
//     }
// }

// open modal
function openModal() {
    modal.classList.add('show');
    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
}
// close modal
function closeModal() {
    modal.classList.remove('show');
    overlay.style.display = 'none';
    document.body.style.overflow = '';
}

// event listeners
openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);
 // apply: update preview and close
// applyBtn.addEventListener('click', function(e) {
//     e.preventDefault();
//     updatePreviews();
//     closeModal();
// });

// // reset: clear fields and update previews (modal stays open)
// resetBtn.addEventListener('click', function(e) {
//     e.preventDefault();
//     yearInput.value = '';
//     monthFrom.value = '';
//     monthTo.value = '';
//     updatePreviews();
// });
 // live update while typing/changing inside modal
// yearInput.addEventListener('input', updatePreviews);
// monthFrom.addEventListener('change', updatePreviews);
// monthTo.addEventListener('change', updatePreviews);

// initial preview
// updatePreviews();

// escape key to close
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
        closeModal();
    }
});

// stop propagation from modal to overlay (avoid closing when clicking inside)
modal.addEventListener('click', function(e) {
    e.stopPropagation();
});