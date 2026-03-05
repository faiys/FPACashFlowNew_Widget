const monthsMap = {
    "January": 0, "February": 1, "March": 2, "April": 3,
    "May": 4, "June": 5, "July": 6, "August": 7,
    "September": 8, "October": 9, "November": 10, "December": 11,
  };
const monthShortMap = {
    Jan:0, Feb:1, Mar:2, Apr:3,
    May:4, Jun:5, Jul:6, Aug:7,
    Sep:8, Oct:9, Nov:10, Dec:11
};

// Months for the table headers
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let globalDataStore = {
    cf: [],
    projection: []
};
async function RenderCashFlow(ReportName, recordCursor, AllFetchArr, orgId, type) {
  try {
    if(type === "default"){
        const cf_response = await fetch(ReportName, recordCursor, AllFetchArr, orgId);
        globalDataStore.cf = cf_response.sort((a, b) =>a.Account_Name.localeCompare(b.Account_Name)) || [];

        const projectionResp = await fetch("Projection_Cash_Flows_Raw_Js", recordCursor, [], orgId);
        globalDataStore.projection = projectionResp.sort((a, b) =>a.Account_Name.localeCompare(b.Account_Name)) || [];
    } 

    renderByMode("cf");

  } catch (err) {
    console.error("Load error:", err);
  }
}

function renderByMode(mode) {
  const currentYear = new Date().getFullYear();

    const source =
        mode === "projection"
        ? globalDataStore.projection
        : globalDataStore.cf;

    ArrayStorage(source)
    const filtered = (source || []).filter(
        item => String(item.Year_field) === String(currentYear)
    );
    processCashflowData(filtered, currentYear);
}

document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("dataToggle");

  toggle.addEventListener("change", function () {
    if (this.checked) {
      renderByMode("projection");
    } else {
      renderByMode("cf");
    }
    yearInput.value = "";
    search_accountInput.value = "";
    monthFrom.value = "";
    monthTo.value = "";

    filterPreview.innerHTML = "No active filters";
  });

});

async function processCashflowData(arrData, applyYear) {
   
    // Header render
    const thead = document.querySelector('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th width="30"></th>
        <th width="250">
            <i id="collapseIcon" class="bi bi-arrows-collapse" title="Collapse" style="cursor: pointer; float:left;"></i>
            <i id="expandIcon" class="bi bi-arrows-expand" title="Expand" style="display:none; cursor: pointer; float:left;"></i>
        </th>`;
    months.forEach(month => {
        const th = document.createElement('th');
        th.classList.add('month-header')
        th.textContent = month+"-"+applyYear;
        headerRow.appendChild(th);
    });
    const thGrand = document.createElement('th')
    thGrand.classList.add('total-cell');
    thGrand.textContent = 'Grand Total';
    headerRow.appendChild(thGrand);
    thead.innerHTML = '';
    thead.appendChild(headerRow);

    // pushing to Search
    LoadData(applyYear)

    const result = {
        openingBalance: 0,
        closingBalance: 0,
        categories: []
    };

    const group = {
        operations: { "cash-in": {}, "cash-out": {} },
        investing: { "cash-in": {}, "cash-out": {} },
        financing: { "cash-in": {}, "cash-out": {} }
    };

    let openingBalance = 0;
    let closingBalance = 0; 

    arrData.forEach(item => {

        const monthIndex = monthsMap[item.Month_field];
        const amount = parseFloat(item.Amount) || 0;

        if (item.CashFlow_From === "Opening Balance") {
            // First month opening
            if (monthIndex === 0 || openingBalance === 0) {
                openingBalance = amount;
            }
            return;
        }

        if (item.CashFlow_From === "Closing Balance") {
            // Latest month closing
            if (monthIndex > monthsMap[monthsMap[item.Month_field]]) { // Or just track last month
                closingBalance = amount;
            }
            return;
        }
        // Regular grouping
        const category = item.CashFlow_From.toLowerCase();
        const type = item.CashFlow_Type === "Cash In" ? "cash-in" : "cash-out";
        
        const account = item.Account_Name || "Unknown";

        if (!group[category][type][account]) {
            group[category][type][account] = Array(12).fill(0);
        }

        group[category][type][account][monthIndex] += amount;
    });

    result.openingBalance = openingBalance;
    result.closingBalance = closingBalance;

    ["operations","investing", "financing"].forEach(category => {
        const catNode = {
            id: category,
            name: `${category.charAt(0).toUpperCase() + category.slice(1)}`,
            expanded: true,
            types: []
        };

        ["cash-in", "cash-out"].forEach(type => {
            const accounts = Object.entries(group[category][type]);
            if (accounts.length === 0) return;

            const typeNode = {
                id: `${type}-${category}`,
                name: type === "cash-in" ? "Cash In" : "Cash Out",
                expanded: true,
                accounts: accounts.map(([account, months]) => ({ name: account, months }))
            };

            catNode.types.push(typeNode);
        });

        if (catNode.types.length > 0) result.categories.push(catNode);
    });
  
    calculateMonthlyBalances(result, arrData);
    renderCashflowTable(result, arrData);

    const collapseIcon = document.getElementById("collapseIcon");
    const expandIcon = document.getElementById("expandIcon");

    collapseIcon.addEventListener("click", () => {
        collapseAll(result, arrData);
        collapseIcon.style.display = "none";
        expandIcon.style.display = "inline";
    });

    expandIcon.addEventListener("click", () => {
        expandAll(result, arrData);
        expandIcon.style.display = "none";
        collapseIcon.style.display = "inline";
    });
}

// Monthly balances data
let monthlyBalances = {
    opening: new Array(12).fill(0),
    cashIn: new Array(12).fill(0),
    cashOut: new Array(12).fill(0),
    closing: new Array(12).fill(0)
};

// Calculate monthly balances based on cashflow data
function calculateMonthlyBalances(cashflowData, arrData) {
    // Reset monthly balances
    monthlyBalances = {
        opening: new Array(12).fill(0),
        cashIn: new Array(12).fill(0),
        cashOut: new Array(12).fill(0),
        closing: new Array(12).fill(0)
    };

    // Map opening and closing balances directly from input
    cashflowData.categories.forEach(category => {
        category.types.forEach(type => {
            type.accounts.forEach(account => {
                account.months.forEach((amount, monthIndex) => {
                    if (type.name === 'Cash In') {
                        monthlyBalances.cashIn[monthIndex] += amount;
                    } else {
                        monthlyBalances.cashOut[monthIndex] += amount;
                    }
                });
            });
        });
    });
    // Directly assign opening and closing from input array if available
    arrData.forEach(item => {
        const monthIndex = monthsMap[item.Month_field];
        const amount = parseFloat(item.Amount) || 0;

        if (item.CashFlow_From === "Opening Balance") {
            monthlyBalances.opening[monthIndex] = amount;
        } else if (item.CashFlow_From === "Closing Balance") {
            monthlyBalances.closing[monthIndex] = amount;
        }
    });
}

// Render the cash flow table
function renderCashflowTable(cashflowData, arrData) {
    const tbody = document.getElementById('cashflowBody');
    tbody.innerHTML = '';
    
    // Add opening balance row
    const openingRow = document.createElement('tr');
    openingRow.className = 'opening-balance-row';
    
    let openingHTML = `
        <td></td>
        <td class="fw-bold">Opening Balance</td>
    `;
    
    monthlyBalances.opening.forEach((balance, index) => {
        const formattedBalance = balance.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
        
        openingHTML += `
            <td class="balance-cell ${balance >= 0 ? 'balance-positive' : 'balance-negative'}">
                $${formattedBalance}
            </td>
        `;
    });
    
    // Add empty cell for grand total column
    openingHTML += `<td class="balance-cell"></td>`;
    
    openingRow.innerHTML = openingHTML;
    tbody.appendChild(openingRow);
    
    // Loop through each category
    cashflowData.categories.forEach(category => {
        // Add category row
        const categoryRow = document.createElement('tr');
        categoryRow.className = `category-row ${category.expanded ? '' : 'collapsed'}`;
        categoryRow.dataset.categoryId = category.id;
        
        let categoryHTML = `
            <td>
                <button class="expand-btn" data-target="${category.id}">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </td>
            <td class="fw-bold">${category.name}</td>
        `;

        // Calculate category totals
        const categoryTotals = new Array(12).fill(0);
        category.types.forEach(type => {
            type.accounts.forEach(account => {
                account.months.forEach((amount, index) => {
                    if (type.name === 'Cash In') {
                        categoryTotals[index] += amount;
                    } else {
                        categoryTotals[index] += amount;
                    }
                });
            });
        });

         // Add month totals for category
        categoryTotals.forEach(total => {
            const cellClass = total >= 0 ? 'cash-in' : 'cash-out';
            const formattedTotal = total !== 0 ? Math.abs(total).toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            }) : '';
            
            categoryHTML += `
                <td class="month-cell fw-bold ${cellClass}">
                    ${total > 0 ? '+' : (total < 0)?'-':''}${formattedTotal}
                </td>
            `;
        });
        
        // Add grand total for category
        const categoryGrandTotal = categoryTotals.reduce((sum, val) => sum + val, 0);
        const grandTotalClass = categoryGrandTotal >= 0 ? 'cash-in' : 'cash-out';
        const formattedGrandTotal = categoryGrandTotal !== 0 ? Math.abs(categoryGrandTotal).toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        }) : '';
        
        categoryHTML += `
            <td class="month-cell fw-bold ${grandTotalClass}">
                ${categoryGrandTotal >= 0 ? '+' :(categoryGrandTotal < 0)?'-':''}${formattedGrandTotal}
            </td>
        `;
        
        categoryRow.innerHTML = categoryHTML;
        tbody.appendChild(categoryRow);
        
        // Add event listener to category row for expand/collapse
        categoryRow.querySelector('.expand-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            toggleCategory(category.id, cashflowData, arrData);
        });
        
        // Loop through each type in the category
        category.types.forEach(type => {
            // Add type row (only if category is expanded) Cash In/out
            // if (category.expanded) {
            //     const typeRow = document.createElement('tr');
            //     typeRow.className = `type-row ${type.expanded ? '' : 'collapsed'}`;
            //     typeRow.dataset.typeId = type.id;
                
            //     let typeHTML = `
            //         <td></td>
            //         <td>
            //             <button class="expand-btn" data-target="${type.id}">
            //                 <i class="fas fa-chevron-down"></i>
            //             </button>
            //             <span class="ms-1">${type.name}</span>
            //         </td>
            //     `;
                
            //     // Add empty cells for months and total
            //     for (let i = 0; i < 13; i++) {
            //         typeHTML += `<td></td>`;
            //     }
                
            //     typeRow.innerHTML = typeHTML;
            //     tbody.appendChild(typeRow);
                
            //     // Add event listener to type row for expand/collapse
            //     typeRow.querySelector('.expand-btn').addEventListener('click', function(e) {
            //         e.stopPropagation();
            //         toggleType(type.id, cashflowData);
            //     });
            // }
            
            // Loop through each account in the type
            type.accounts.forEach(account => {
                // Calculate account total
                const accountTotal = account.months.reduce((sum, val) => sum + val, 0);
                
                // Add account row (only if category and type are expanded)
                if (category.expanded && type.expanded) {
                    const accountRow = document.createElement('tr');
                    accountRow.className = 'account-row';
                    
                    let accountHTML = `
                        <td></td>
                        <td class="ps-4" style="white-space: nowrap;">${account.name}</td>
                    `;
                    
                    // Add month cells
                    account.months.forEach((amount, index) => {
                        // const cellClass = type.name === 'Cash In' ? 'cash-in' : 'cash-out';
                        const cellClass = amount >= 0 ? 'cash-in' : 'cash-out';
                        const formattedAmount = amount !== 0 ? amount.toLocaleString('en-US', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                        }) : '';
                        
                        // accountHTML += `
                        //     <td class="month-cell ${cellClass}">
                        //         ${type.name === 'Cash In' ? '+' : '-'}${formattedAmount}
                        //     </td>
                        // `;
                    
                        // Render projection due date
                        const dueDates = arrData.filter(item => {
                            if (!item.Due_Date) return false;

                            const monthShort = item.Date_field.split("-")[1];
                            const monthIndex = monthShortMap[monthShort];

                            return item.Account_Name === account.name && monthIndex === index;
                        });

                        const dueText = dueDates.map(item =>
                            `Transaction: ${item.Transactions || "-"} | Customer: ${item.Customer || "-"} | Due Date: ${item.Due_Date || "-"} | Custom Due Date: ${item.Custom_Due_Date || "-"} | Amount: ${item.Amount || "0.00"}`
                        ).join("||");
                        accountHTML += `
                            <td class="month-cell ${cellClass}" ${dueText ? `data-due="${dueText}"` : ""}>
                                ${formattedAmount}
                            </td>
                            `;                        
                    });
                    
                    // Add total cell for account
                    // const totalClass = type.name === 'Cash In' ? 'cash-in' : 'cash-out';
                    const formattedTotal = accountTotal !== 0 ? accountTotal.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    }) : '';
                    // accountHTML += `
                    //     <td class="month-cell total-cell ${totalClass}">
                    //         ${type.name === 'Cash In' ? '+' : '-'}${formattedTotal}
                    //     </td>
                    // `;

                    accountHTML += `
                        <td class="month-cell">
                            ${formattedTotal}
                        </td>
                    `;
                    
                    accountRow.innerHTML = accountHTML;
                    tbody.appendChild(accountRow);
                }
            });
            
            // Update type row with totals (only if category is expanded)
            if (category.expanded) {
                // Calculate type totals for each month
                const typeTotals = new Array(12).fill(0);
                type.accounts.forEach(account => {
                    account.months.forEach((amount, index) => {
                        if (type.name === 'Cash In') {
                            typeTotals[index] += amount;
                        } else {
                            typeTotals[index] -= amount;
                        }
                    });
                });
                
                const typeTotalRow = document.createElement('tr');
                typeTotalRow.className = 'type-row';
                
                let typeTotalHTML = `
                    <td></td>
                    <td class="text-end fw-bold">${type.name}</td>
                `;
                // Add month totals for type
                typeTotals.forEach(total => {
                    const cellClass = total >= 0 ? 'cash-in' : 'cash-out';
                    const formattedTotal = total !== 0 ? Math.abs(total).toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    }) : '-';
                    
                    typeTotalHTML += `
                        <td class="month-cell fw-bold ${cellClass}">
                            ${total >= 0 ? '+' : '-'}${formattedTotal}
                        </td>
                    `;
                });
                
                // Add grand total for type
                const typeGrandTotal = typeTotals.reduce((sum, val) => sum + val, 0);
                const grandTotalClass = typeGrandTotal >= 0 ? 'cash-in' : 'cash-out';
                const formattedGrandTotal = typeGrandTotal !== 0 ? Math.abs(typeGrandTotal).toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                }) : '-';
                
                typeTotalHTML += `
                    <td class="month-cell total-cell fw-bold ${grandTotalClass}">
                        ${typeGrandTotal >= 0 ? '+' : '-'}${formattedGrandTotal}
                    </td>
                `;
                
                // Insert type total row after the type's accounts
                const typeRow = document.querySelector(`tr[data-type-id="${type.id}"]`);
                if (typeRow && category.expanded && type.expanded) {
                    typeRow.insertAdjacentElement('afterend', typeTotalRow);
                }
            }
        });
        



        // // Calculate category totals
        // const categoryTotals = new Array(12).fill(0);
        // category.types.forEach(type => {
        //     type.accounts.forEach(account => {
        //         account.months.forEach((amount, index) => {
        //             if (type.name === 'Cash In') {
        //                 categoryTotals[index] += amount;
        //             } else {
        //                 categoryTotals[index] += amount;
        //             }
        //         });
        //     });
        // });
        
        // // Add category total row
        // const categoryTotalRow = document.createElement('tr');
        // categoryTotalRow.className = 'category-row';
        
        // let categoryTotalHTML = `
        //     <td></td>
        //     <td class="text-end fw-bold">Total ${category.name}</td>
        // `;
        
        // // Add month totals for category
        // categoryTotals.forEach(total => {
        //     const cellClass = total >= 0 ? 'cash-in' : 'cash-out';
        //     const formattedTotal = total !== 0 ? Math.abs(total).toLocaleString('en-US', { 
        //         minimumFractionDigits: 2, 
        //         maximumFractionDigits: 2 
        //     }) : '-';
            
        //     categoryTotalHTML += `
        //         <td class="month-cell fw-bold ${cellClass}">
        //             ${total >= 0 ? '+' : '-'}${formattedTotal}
        //         </td>
        //     `;
        // });
        
        // // Add grand total for category
        // const categoryGrandTotal = categoryTotals.reduce((sum, val) => sum + val, 0);
        // const grandTotalClass = categoryGrandTotal >= 0 ? 'cash-in' : 'cash-out';
        // const formattedGrandTotal = categoryGrandTotal !== 0 ? Math.abs(categoryGrandTotal).toLocaleString('en-US', { 
        //     minimumFractionDigits: 2, 
        //     maximumFractionDigits: 2 
        // }) : '-';
        
        // categoryTotalHTML += `
        //     <td class="month-cell total-cell fw-bold ${grandTotalClass}">
        //         ${categoryGrandTotal >= 0 ? '+' : '-'}${formattedGrandTotal}
        //     </td>
        // `;
        
        // Insert category total row at the end of the category section
        // tbody.appendChild(categoryTotalRow);
        // categoryTotalRow.innerHTML = categoryTotalHTML;
    });
    
    // Add closing balance row
    const closingRow = document.createElement('tr');
    closingRow.className = 'closing-balance-row';
    
    let closingHTML = `
        <td></td>
        <td class="fw-bold">Closing Balance</td>
    `;
    
    monthlyBalances.closing.forEach((balance, index) => {
        const formattedBalance = balance.toLocaleString('en-US', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
        
        closingHTML += `
            <td class="balance-cell ${balance >= 0 ? 'balance-positive' : 'balance-negative'}">
                $${formattedBalance}
            </td>
        `;
    });
    
    // Add empty cell for grand total column
    closingHTML += `<td class="balance-cell"></td>`;
    
    closingRow.innerHTML = closingHTML;
    tbody.appendChild(closingRow);
}


// Render monthly summary table
function renderMonthlySummary() {
    const tbody = document.getElementById('monthlySummary');
    tbody.innerHTML = '';
    
    // Calculate year totals
    const yearOpening = monthlyBalances.opening[0]; // Only January opening is the year opening
    const yearCashIn = monthlyBalances.cashIn.reduce((sum, val) => sum + val, 0);
    const yearCashOut = monthlyBalances.cashOut.reduce((sum, val) => sum + val, 0);
    const yearNetCashFlow = yearCashIn - yearCashOut;
    const yearClosing = monthlyBalances.closing[11]; // December closing is the year closing
    
    // Update year totals in the footer
    document.getElementById('yearOpening').textContent = 
        `$${yearOpening.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('yearCashIn').textContent = 
        `$${yearCashIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('yearCashOut').textContent = 
        `$${yearCashOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('yearNetCashFlow').textContent = 
        `$${yearNetCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('yearClosing').textContent = 
        `$${yearClosing.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // Add rows for each month
    months.forEach((month, index) => {
        const netCashFlow = monthlyBalances.cashIn[index] - monthlyBalances.cashOut[index];
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="fw-bold">${month}</td>
            <td>$${monthlyBalances.opening[index].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="cash-in">$${monthlyBalances.cashIn[index].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="cash-out">$${monthlyBalances.cashOut[index].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="${netCashFlow >= 0 ? 'balance-positive' : 'balance-negative'}">
                $${netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td class="fw-bold ${monthlyBalances.closing[index] >= 0 ? 'balance-positive' : 'balance-negative'}">
                $${monthlyBalances.closing[index].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Toggle category expansion
// function toggleCategory(categoryId, cashflowData) {
//     const category = cashflowData.categories.find(c => c.id === categoryId);
//     if (category) {
//         category.expanded = !category.expanded;
//         renderCashflowTable(cashflowData);
//     }
// }

function toggleCategory(categoryId, cashflowData, arrData) {
    const category = cashflowData.categories.find(c => c.id === categoryId);
    if (!category) return;

    const willExpand = !category.expanded;
    category.expanded = willExpand;

    // ⭐ IMPORTANT FIX
    if (willExpand) {
        category.types.forEach(type => {
            type.expanded = true; // reopen children
        });
    }

    renderCashflowTable(cashflowData, arrData);
}

// Toggle type expansion
// function toggleType(typeId, cashflowData) {
//     // Find the type within categories
//     for (const category of cashflowData.categories) {
//         const type = category.types.find(t => t.id === typeId);
//         if (type) {
//             type.expanded = !type.expanded;
//             renderCashflowTable(cashflowData);
//             break;
//         }
//     }
// }

// Expand all categories and types
function expandAll(cashflowData, arrData) {
    cashflowData.categories.forEach(category => {
        category.expanded = true;
        category.types.forEach(type => {
            type.expanded = true;
        });
    });
    renderCashflowTable(cashflowData, arrData);
}

// Collapse all categories and types
function collapseAll(cashflowData, arrData) {
    cashflowData.categories.forEach(category => {
        category.expanded = false;
        category.types.forEach(type => {
            type.expanded = false;
        });
    });
    renderCashflowTable(cashflowData, arrData);
}


const tooltip = document.getElementById("dueTooltip");

document.addEventListener("mouseover", function(e){

    const cell = e.target.closest(".month-cell");
    if(!cell) return;

    const due = cell.dataset.due;
    if(!due) return;

    const cards = due.split("||").map(item=>{
        const parts = item.split("|");

        const transaction = parts[0].replace("Transaction:","").trim();
        const customer = parts[1].replace("Customer:","").trim();
        const dueDate = parts[2].replace("Due Date:","").trim();
        const customDate = parts[3].replace("Custom Due Date:","").trim();
        const amount = parts[4].replace("Amount:","").trim();

        return `
        <div class="due-card">

            <div class="due-row">
                <span class="due-label">Transaction#</span>
                <span class="due-value">${transaction}</span>
            </div>

            <div class="due-row">
                <span class="due-label">Customer</span>
                <span class="due-value">${customer}</span>
            </div>

            <div class="due-row">
                <span class="due-label">Due Date</span>
                <span class="due-value">${dueDate}</span>
            </div>

            <div class="due-row">
                <span class="due-label">Custom</span>
                <span class="due-value custom">${customDate}</span>
            </div>
            <div class="due-row">
                <span class="due-label">Amount</span>
                <span class="due-value custom">${amount}</span>
            </div>

        </div>`;
    }).join("");

    tooltip.innerHTML = cards;
    tooltip.style.display = "block";

     const rect = cell.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth;
    const screenWidth = window.innerWidth;

    let left;

    // check right overflow
    if(rect.right + tooltipWidth > screenWidth){
        left = rect.left - tooltipWidth - 8;  // small gap
    }else{
        left = rect.right + 8;
    }

    tooltip.style.left = left + window.scrollX + "px";
    tooltip.style.top = rect.top + window.scrollY + "px";

});


document.addEventListener("mouseout", function(e){

    if(
        !e.relatedTarget?.closest(".month-cell") &&
        !e.relatedTarget?.closest("#dueTooltip")
    ){
        tooltip.style.display = "none";
    }

});

// document.addEventListener("mousemove", function(e){

//     if(tooltip.style.display !== "block") return;

//      if(e.target.closest("#dueTooltip")) return;

//     tooltip.style.left = (e.pageX + 15) + "px";
//     tooltip.style.top = (e.pageY + 15) + "px";

// });

// document.addEventListener("mouseover", function(e){
//     if(e.target.closest("#dueTooltip")) return;
// })

// document.addEventListener("mouseout", function(e){
//     if(e.target.closest(".month-cell")){
//         tooltip.style.display = "none";
//     }
// });