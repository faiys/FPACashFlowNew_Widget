const AppName = "fpa";

document.addEventListener("DOMContentLoaded", async () => {
    try{
        showFPALoader()
        const userList = await getUserDetail("All_Users_Js", "", [])
        if(userList != null){
            const orgId = userList[0];
            await showLoaderWhile(await RenderCashFlow("CashFlow_Report_Js", "",[], orgId, "default"))
        }
    }
    catch(err){
        console.error("Error loading Cashflow data:", err);
    }
});


// Fetch Records
async function fetch(ReportName, recordCursor, AllFetchArr, orgId){
    let Arr_merged =[];
    try{
        let criteriaVar = "";
        if(ReportName === "All_Users_Js"){
           const loginEmail = await getLoginUserID(); 
           criteriaVar = `Status == "Active" && Email == "${loginEmail}"`;
        }
        else if(ReportName === "CashFlow_Report_Js" && orgId){
           criteriaVar = `Organisation == ${orgId}`;
        }
         var config = {
            app_name: AppName,
            report_name: ReportName,
            criteria: criteriaVar,
            record_cursor : recordCursor,
            max_records : 1000
        };
        const fetchResp = await ZOHO.CREATOR.DATA.getRecords(config);
        if(fetchResp){
            if(fetchResp.code == 3000){
                var MainData =  fetchResp.data;
                // push arr for get another set of records, if data available.
                AllFetchArr.push(MainData)
                if(fetchResp.record_cursor){
                    // Get the next batch record from zoho report
                    return await fetch(ReportName, fetchResp.record_cursor, AllFetchArr);
                }
                else{
                    Arr_merged = AllFetchArr.flat();
                    return Arr_merged;
                }
            }
            else{
                console.log("No Record found - ",fetchResp)
                return Arr_merged;
            }
        }
        else{
            console.log("Fetch API Error")
            return Arr_merged;
        }
    }
    catch (err)
    {
        console.log("zoho init error = ", err)
        return Arr_merged;
    }
}

//Get Login Email ID
async function getLoginUserID() {
    try{
        const getParamResp = await ZOHO.CREATOR.UTIL.getInitParams();
        if(getParamResp){
            return getParamResp.loginUser;
        }
    }
    catch (err){
        console.log("Get User - ", err)
        return null
    }
}

// Get User and Organization
async function getUserDetail(ReportName, recordCursor, AllFetchArr){
    try{
        userResp = await fetch(ReportName, recordCursor, AllFetchArr);
        if(userResp){
            return [userResp[0]["Organisation"]["ID"], userResp[0]["Name"]];
        }
        
    }
    catch (err){
        console.error("Error user login data:", err);
        return null;
    }
}


 // Store array for searching and resue lookup
function ArrayStorage(inputArr){
    const budgetItemsData_cached = localStorage.getItem('cfjson');
    if (budgetItemsData_cached) {
        localStorage.removeItem('cfjson');
    }
    localStorage.setItem('cfjson', JSON.stringify(inputArr));
}