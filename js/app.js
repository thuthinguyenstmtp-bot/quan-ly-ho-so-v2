// ================================
// APP.JS
// Quản lý chuyển trang
// ================================


// Trang mặc định
const DEFAULT_PAGE = "dashboard";


// ================================
// Load trang
// ================================

async function loadPage(page){

    try{

        const response = await fetch(`pages/${page}.html`);

        if(!response.ok){

            throw new Error("Không tìm thấy trang.");

        }

        const html = await response.text();

        document.getElementById("content").innerHTML = html;

        initializePage(page);

    }

    catch(error){

        document.getElementById("content").innerHTML = `
            <h2>Lỗi</h2>
            <p>${error.message}</p>
        `;

        console.error(error);

    }
if(page === "dossier_missing"){

    loadProject();

    loadSupplier();

    loadDossier();

    renderMissingDossier();

}
if(page==="dossier_delivery"){

    loadProject();

    loadSupplier();

    loadDossier();

    renderDeliveryDossier();

}
if(page === "dossier_paid"){

    loadProject();

    loadSupplier();

    loadDossier();

    renderPaidDossier();

}
}

// ================================
// Khởi tạo dữ liệu từng trang
// ================================

function initializePage(page){

    switch(page){
        
        case "dossier_archive":

    if(typeof loadProject === "function"){
        loadProject();
    }

    if(typeof loadSupplier === "function"){
        loadSupplier();
    }

    if(typeof loadDossier === "function"){
        loadDossier();
    }

    if(typeof initializeArchivePage === "function"){
        initializeArchivePage();
    }

    break;

            if(typeof loadProject === "function"){
                loadProject();
            }       

            if(typeof loadSupplier === "function"){
                loadSupplier();
            }

            if(typeof initializeArchivePage === "function"){
            initializeArchivePage();
            }

        break;
        
        case "backup":

    if(
        typeof initializeBackupPage ===
        "function"
    ){

        initializeBackupPage();

    }

    break;
    
        case "dashboard":

            if(typeof loadDashboard === "function"){
                loadDashboard();
            }

            break;


        case "supplier":

            if(typeof loadSupplier === "function"){
                loadSupplier();
            }

            if(typeof renderSupplier === "function"){
                renderSupplier();
            }

            break;


        case "project":

            if(typeof loadProject === "function"){
                loadProject();
            }

            if(typeof renderProject === "function"){
                renderProject();
            }

            break;


        case "dossier":

            if(typeof loadProject === "function"){
                loadProject();
            }

            if(typeof loadSupplier === "function"){
                loadSupplier();
            }

            if(typeof loadDossier === "function"){
                loadDossier();
            }

            if(typeof renderDossier === "function"){
                renderDossier();
            }

            break;
        
            case "dossier_paid":

                loadProject();

                loadSupplier();

                loadDossier();

                loadPaidDossierFilters();

                filterPaidDossier();

            break;


            case "dossier_missing":

    if(typeof loadProject === "function"){
        loadProject();
    }

    if(typeof loadSupplier === "function"){
        loadSupplier();
    }

    if(typeof loadDossier === "function"){
        loadDossier();
    }

    if(typeof loadMissingDossierFilters === "function"){
        loadMissingDossierFilters();
    }

    if(typeof filterMissingDossier === "function"){
        filterMissingDossier();
    }

    break;


     case "dossier_delivery":

    if(typeof loadProject === "function"){
        loadProject();
    }

    if(typeof loadSupplier === "function"){
        loadSupplier();
    }

    if(typeof loadDossier === "function"){
        loadDossier();
    }

    if(typeof loadDeliveryDossierFilters === "function"){
        loadDeliveryDossierFilters();
    }

    if(typeof filterDeliveryDossier === "function"){
        filterDeliveryDossier();
    }

    break;

        case "dossier_paid":

    if(typeof loadProject === "function"){
        loadProject();
    }

    if(typeof loadSupplier === "function"){
        loadSupplier();
    }

    if(typeof loadDossier === "function"){
        loadDossier();
    }

    if(typeof loadPaidDossierFilters === "function"){
        loadPaidDossierFilters();
    }

    if(typeof filterPaidDossier === "function"){
        filterPaidDossier();
    }

    break;
        
        case "letter":

            if(typeof loadSupplier === "function"){

            loadSupplier();

            }

            if(typeof initializeLetterPage === "function"){

            initializeLetterPage();

        }

    break;
    }

}
// ================================
// Khởi động hệ thống
// ================================

document.addEventListener("DOMContentLoaded",()=>{

    loadPage(DEFAULT_PAGE);

});
// =========================
// MENU HỒ SƠ
// =========================

function toggleMenu(menuId, element){

    const menu = document.getElementById(menuId);

    const arrow = element.querySelector(".arrow");

    if(menu.style.display === "block"){

        menu.style.display = "none";

        arrow.innerHTML = "▶";

    }else{

        menu.style.display = "block";

        arrow.innerHTML = "▼";

    }

}
// =========================
// MENU ACTIVE
// =========================

function selectMenu(element){

    document.querySelectorAll(".submenu li")
    .forEach(item=>{

        item.classList.remove("active");

    });

    element.classList.add("active");

}